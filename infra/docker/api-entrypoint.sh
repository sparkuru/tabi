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

	command -v python >/dev/null 2>&1 || {
		printf 'Error: python is unavailable\n' >&2
		return 1
	}
	# Encode credentials without treating the dotenv file as executable shell.
	TABI_DATABASE_URL=$(python -c 'import os; from urllib.parse import quote; e = os.environ; print("postgresql+psycopg://" + quote(e["POSTGRES_USER"], safe="") + ":" + quote(e["POSTGRES_PASSWORD"], safe="") + "@db:" + e["TABI_DB_PORT"] + "/" + quote(e["POSTGRES_DB"], safe=""))')
	export TABI_DATABASE_URL

	alembic upgrade head
	exec uvicorn app.main:app --host "${TABI_API_HOST:-0.0.0.0}" --port "${TABI_API_PORT:-8000}"
}

main "$@"
