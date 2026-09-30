#!/bin/sh
set -eu

usage() {
	printf 'Usage: %s [--help]\n' "${0##*/}"
	printf 'Start the complete local system using infra/.env and show its URLs.\n'
}

die() {
	printf 'Error: %s\n' "$*" >&2
	exit 1
}

main() {
	[ "$#" -le 1 ] || die 'too many arguments'
	case "${1:-}" in
	--help | -h)
		usage
		return 0
		;;
	'') ;;
	*)
		usage >&2
		die "unknown argument: $1"
		;;
	esac
	script_dir=$(CDPATH='' cd "$(dirname "$0")" && pwd -P) || die 'cannot locate repository root'
	env_file=$script_dir/infra/.env
	compose_file=$script_dir/infra/docker-compose.yml

	[ -f "$env_file" ] || die "missing $env_file; run: cp '$script_dir/infra/.env.example' '$env_file', then edit POSTGRES_PASSWORD"
	command -v docker >/dev/null 2>&1 || die 'Docker is not installed'
	docker compose version >/dev/null 2>&1 || die 'Docker Compose is unavailable'

	docker compose --env-file "$env_file" -f "$compose_file" up --build --wait -d
	docker compose --env-file "$env_file" -f "$compose_file" exec -T web wget -q -O /dev/null http://127.0.0.1:80/ || die 'web is not serving HTTP on container port 80; check TABI_SITE_ADDRESS in infra/.env'

	port_output=$(docker compose --env-file "$env_file" -f "$compose_file" port web 80) || die 'cannot find the web port'
	newline='
'
	port_line=${port_output%%"$newline"*}
	case "$port_line" in
	*:*) ;;
	*) die "unexpected web port: $port_line" ;;
	esac
	host=${port_line%:*}
	port=${port_line##*:}
	case "$port" in
	'' | *[!0-9]*) die "unexpected web port: $port_line" ;;
	esac
	case "$host" in
	'' | 0.0.0.0 | :: | '[::]') host=127.0.0.1 ;;
	*:*) host="[$host]" ;;
	esac

	base_url="http://$host:$port"
	printf '\nSystem is ready.\n'
	printf 'Listening: %s\n' "$port_line"
	printf 'Website:  %s\n' "$base_url"
	printf 'Admin:    %s/admin\n' "$base_url"
	printf 'API docs: %s/api/docs\n' "$base_url"
}

main "$@"
