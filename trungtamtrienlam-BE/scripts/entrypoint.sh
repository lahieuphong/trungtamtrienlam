#!/bin/sh

set -eu

is_enabled() {
    case "${1:-}" in
        1|true|TRUE|yes|YES|on|ON) return 0 ;;
        *) return 1 ;;
    esac
}

if is_enabled "${WAIT_FOR_DATABASE:-true}" && [ -n "${DB_HOST:-}" ]; then
    db_port="${DB_PORT:-5432}"
    max_attempts="${DB_WAIT_MAX_ATTEMPTS:-30}"
    retry_delay="${DB_WAIT_RETRY_SECONDS:-2}"

    case "$max_attempts" in
        ''|*[!0-9]*) max_attempts=30 ;;
    esac
    case "$retry_delay" in
        ''|*[!0-9]*) retry_delay=2 ;;
    esac

    attempt=1
    echo "Waiting for database at ${DB_HOST}:${db_port}..."
    until python - "$DB_HOST" "$db_port" <<'PY'
import socket
import sys

try:
    connection = socket.create_connection((sys.argv[1], int(sys.argv[2])), timeout=2)
except OSError:
    raise SystemExit(1)
else:
    connection.close()
PY
    do
        if [ "$attempt" -ge "$max_attempts" ]; then
            echo "Database did not become reachable after ${max_attempts} attempts." >&2
            exit 1
        fi
        attempt=$((attempt + 1))
        sleep "$retry_delay"
    done
    echo "Database is reachable."
fi

if is_enabled "${RUN_MIGRATIONS:-false}"; then
    echo "Applying database migrations (explicitly enabled)."
    python manage.py migrate --noinput
fi

if is_enabled "${RUN_COLLECTSTATIC:-false}"; then
    echo "Collecting static files (explicitly enabled)."
    python manage.py collectstatic --noinput
fi

exec "$@"
