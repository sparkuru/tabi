#!/bin/sh
set -eu

main() {
    command -v alembic >/dev/null 2>&1 || {
        printf 'Error: alembic is unavailable\n' >&2
        return 1
    }
    command -v uvicorn >/dev/null 2>&1 || {
        printf 'Error: uvicorn is unavailable\n' >&2
        return 1
    }

    alembic upgrade head
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000
}

main "$@"
