'''Dependency-free liveness and read-only readiness endpoints.'''

from time import monotonic

from django.conf import settings
from django.db import connections
from django.http import JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET
from redis import Redis


def _elapsed_ms(started_at):
    return round((monotonic() - started_at) * 1000, 2)


@never_cache
@require_GET
def healthcheck(request):
    '''Liveness probe: verifies that the Django process can serve requests.'''
    return JsonResponse({
        'status': 'ok',
        'service': 'trungtamtrienlam-backend',
    })


@never_cache
@require_GET
def readiness(request):
    '''Readiness probe: verifies required services without modifying data.'''
    checks = {}

    started_at = monotonic()
    try:
        with connections['default'].cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
        checks['database'] = {
            'status': 'ok',
            'latency_ms': _elapsed_ms(started_at),
        }
    except Exception:
        checks['database'] = {
            'status': 'error',
            'latency_ms': _elapsed_ms(started_at),
        }

    started_at = monotonic()
    redis_client = None
    try:
        redis_client = Redis.from_url(
            settings.REDIS_URL,
            socket_connect_timeout=1,
            socket_timeout=1,
        )
        redis_client.ping()
        checks['redis'] = {
            'status': 'ok',
            'latency_ms': _elapsed_ms(started_at),
        }
    except Exception:
        checks['redis'] = {
            'status': 'error',
            'latency_ms': _elapsed_ms(started_at),
        }
    finally:
        if redis_client is not None:
            try:
                redis_client.close()
            except Exception:
                pass

    is_ready = all(check['status'] == 'ok' for check in checks.values())
    return JsonResponse(
        {
            'status': 'ready' if is_ready else 'not_ready',
            'checks': checks,
        },
        status=200 if is_ready else 503,
    )
