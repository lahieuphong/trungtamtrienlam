from urllib.parse import parse_qs

from channels.auth import AuthMiddlewareStack
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.exceptions import TokenError


def _header_value(scope, header_name):
    wanted = header_name.lower().encode()
    for key, value in scope.get('headers', []):
        if key.lower() == wanted:
            return value.decode(errors='ignore')
    return ''


def _query_value(scope, *names):
    query = parse_qs(scope.get('query_string', b'').decode(errors='ignore'))
    for name in names:
        values = query.get(name)
        if values:
            return values[0]
    return ''


def _token_from_scope(scope):
    token = _query_value(scope, 'token', 'access_token')
    if token:
        return token

    authorization = _header_value(scope, 'authorization')
    if authorization.lower().startswith('bearer '):
        return authorization.split(' ', 1)[1].strip()
    if authorization.lower().startswith('token '):
        return authorization.split(' ', 1)[1].strip()

    return ''


@database_sync_to_async
def _user_from_token(token):
    if not token:
        return AnonymousUser()

    jwt_auth = JWTAuthentication()
    try:
        validated_token = jwt_auth.get_validated_token(token)
        return jwt_auth.get_user(validated_token)
    except (InvalidToken, TokenError):
        pass
    except Exception:
        pass

    return AnonymousUser()


class JwtOrTokenAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        scope = dict(scope)
        scope['legacy_user_id'] = _query_value(scope, 'userID', 'userId', 'userid')

        token = _token_from_scope(scope)
        if token:
            scope['user'] = await _user_from_token(token)

        return await self.app(scope, receive, send)


def JwtOrTokenAuthMiddlewareStack(inner):
    return AuthMiddlewareStack(JwtOrTokenAuthMiddleware(inner))


