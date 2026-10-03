#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
	printf 'Usage: %s [start|stop|down|status|build|--help]\n' "${0##*/}" >&2
	printf 'Use the existing infra Compose project and root .env; volumes are retained.\n' >&2
	printf 'Setup: cp .env.example .env (only when absent); edit POSTGRES_PASSWORD.\n' >&2
	printf 'First build/source changes: ./preview.sh build\n' >&2
	printf 'First setup also needs: docker compose --env-file .env -f infra/docker-compose.yml pull db\n' >&2
	printf 'Start/default: background startup with readiness checks; never builds or installs.\n' >&2
	printf 'stop/down: remove this project containers/network; preserve database/media volumes.\n' >&2
	printf 'status: show this project services. Shell environment overrides Compose dotenv values.\n' >&2
}

die() {
	printf 'Error: %s\n' "$*" >&2
	exit 1
}

compose() {
	"${compose_command[@]}" "$@"
}

published_mappings() {
	docker inspect --format '{{range (index .NetworkSettings.Ports "'"$1"'/tcp")}}{{printf "%s:%s\n" .HostIp .HostPort}}{{end}}' "$web_container"
}

lan_address() {
	local route field next=false
	command -v ip >/dev/null 2>&1 || return 0
	route=$(ip -4 route get 1.1.1.1 2>/dev/null) || return 0
	for field in $route; do
		if [[ $next == true ]]; then
			printf '%s' "$field"
			return 0
		fi
		[[ $field != src ]] || next=true
	done
	return 0
}

browser_urls() {
	local scheme=$1 mapping=$2 lan=$3 host port base
	host=${mapping%:*}
	port=${mapping##*:}
	case "$host" in
	0.0.0.0) host=127.0.0.1 ;;
	:: | '[::]') host='[::1]' ;;
	*:*) [[ $host == \[*\] ]] || host="[$host]" ;;
	esac
	base="$scheme://$host:$port"
	printf 'Website:  %s\nAdmin:    %s/admin\nAPI docs: %s/api/docs\n' "$base" "$base" "$base"
	if [[ ${mapping%:*} == 0.0.0.0 && -n $lan ]]; then
		base="$scheme://$lan:$port"
		printf 'Host/LAN Website: %s\nHost/LAN Admin: %s/admin\nHost/LAN API docs: %s/api/docs\n' "$base" "$base" "$base"
	elif [[ ${mapping%:*} == 0.0.0.0 && -z $lan ]]; then
		printf 'LAN access: use the reachable address of this Docker host with port %s.\n' "$port"
	fi
}

ready_summary() {
	local db_endpoint api_endpoint web_listeners web_ports lan scheme endpoint port mapping bindings web_container
	local http_port https_port mappings='' inactive='' seen_ports=' '
	# shellcheck disable=SC2016 # Variables expand inside the database container.
	db_endpoint=$(compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -p "$TABI_DB_PORT" -Atc "SELECT current_setting('\''listen_addresses'\'') || '\'':'\'' || current_setting('\''port'\'')"') || die 'database probe failed; inspect ./preview.sh status and Compose logs'
	api_endpoint=$(compose exec -T api python -c 'from pathlib import Path; a=Path("/proc/1/cmdline").read_bytes().decode().split("\0"); print(a[a.index("--host")+1]+":"+a[a.index("--port")+1])') || die 'cannot read API listener; rebuild application images with ./preview.sh build'
	web_listeners=$(compose exec -T web wget -q -O - http://127.0.0.1:2019/config/apps/http/servers | compose exec -T api python -c '
import json, sys
for server in json.load(sys.stdin).values():
    scheme = "https" if server.get("tls_connection_policies") else "http"
    for address in server.get("listen", []):
        print(scheme + "|" + ("0.0.0.0" + address if address.startswith(":") else address))
') || die 'cannot query active Caddy listeners; rebuild application images with ./preview.sh build'
	[[ -n $web_listeners ]] || die 'Caddy has no active browser listeners'
	# shellcheck disable=SC2016 # Variables expand inside the web container.
	web_ports=$(compose exec -T web sh -c 'printf "%s %s" "$TABI_WEB_HTTP_PORT" "$TABI_WEB_HTTPS_PORT"') || die 'cannot read configured web ports; rebuild with ./preview.sh build'
	read -r http_port https_port <<<"$web_ports"
	[[ $http_port =~ ^[0-9]+$ && $https_port =~ ^[0-9]+$ ]] || die 'web ports must be numeric'
	web_container=$(compose ps -q web) || die 'cannot identify the running web container'
	[[ -n $web_container ]] || die 'web container is missing'
	while IFS='|' read -r scheme endpoint; do
		port=${endpoint##*:}
		[[ $port =~ ^[0-9]+$ ]] || die "unsupported Caddy listener: $endpoint"
		compose exec -T web wget -q -O /dev/null "$scheme://127.0.0.1:$port/" || die "web readiness failed on $scheme port $port; check TABI_SITE_ADDRESS and TLS configuration"
		compose exec -T web wget -q -O - "$scheme://127.0.0.1:$port/api/health" | compose exec -T api python -c 'import json,sys; sys.exit(0 if json.load(sys.stdin).get("status") == "ok" else 1)' || die "API readiness through web failed on $scheme port $port; inspect Compose logs"
		bindings=$(published_mappings "$port") || die "cannot query published mappings for web port $port"
		[[ -n $bindings ]] || die "no published mapping for active web port $port; align TABI_SITE_ADDRESS and TABI_WEB_HTTP_PORT/TABI_WEB_HTTPS_PORT"
		while IFS= read -r mapping; do
			mappings+="$scheme|$endpoint|$mapping"$'\n'
		done <<<"$bindings"
		seen_ports+="$port "
	done <<<"$web_listeners"
	for port in "$http_port" "$https_port"; do
		[[ $seen_ports != *" $port "* ]] || continue
		bindings=$(published_mappings "$port") || die "cannot query reserved mapping for web port $port"
		while IFS= read -r mapping; do
			[[ -n $mapping ]] || continue
			inactive+="web: $mapping -> container port $port (published mapping; no active listener)"$'\n'
		done <<<"$bindings"
	done
	lan=$(lan_address)
	printf '\nSystem is ready.\n'
	printf 'Listening db: %s (container only; PostgreSQL/TCP)\n' "$db_endpoint"
	printf 'Listening api: %s (container only; HTTP)\n' "$api_endpoint"
	printf 'Listening web control: 127.0.0.1:2019 (container loopback only; Caddy admin API)\n'
	while IFS='|' read -r scheme endpoint mapping; do
		[[ -n $scheme ]] || continue
		printf 'Listening web: %s (container; %s)\n' "$endpoint" "$scheme"
		printf 'Published web: %s -> %s\n' "$mapping" "$endpoint"
		browser_urls "$scheme" "$mapping" "$lan"
	done <<<"$mappings"
	[[ -z $inactive ]] || printf '%s' "$inactive"
	printf 'Internal API docs: http://api:%s/api/docs (Compose network only).\n' "${api_endpoint##*:}"
	printf 'Internal probe: '
	printf '%q ' "${compose_command[@]}" exec -T web wget -qO- "http://api:${api_endpoint##*:}/api/health"
	printf '\n'
}

main() {
	[[ $# -le 1 ]] || die 'too many arguments; use --help'
	local action=${1:-start} script_dir env_file
	case "$action" in
	--help | -h)
		usage
		return 0
		;;
	start | stop | down | status | build) ;;
	*)
		usage
		die "unknown argument: $action"
		;;
	esac
	script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P) || die 'cannot locate repository root'
	env_file=$script_dir/.env
	[[ -f $env_file ]] || die "missing $env_file; run: cp '$script_dir/.env.example' '$env_file', then edit POSTGRES_PASSWORD"
	command -v docker >/dev/null 2>&1 || die 'Docker is not installed'
	docker compose version >/dev/null 2>&1 || die 'Docker Compose is unavailable'
	# Keep the original infra project directory so existing named volumes are reused.
	local -a compose_command=(docker compose --env-file "$env_file" --project-directory "$script_dir/infra" -f "$script_dir/infra/docker-compose.yml")
	compose config --quiet || die 'invalid root .env/Compose configuration; check required keys (including POSTGRES_PASSWORD)'
	case "$action" in
	start)
		compose up --no-build --pull never --wait -d || die 'startup failed; first run ./preview.sh build and docker compose --env-file .env -f infra/docker-compose.yml pull db if images are missing; inspect status/logs for readiness failures'
		ready_summary
		;;
	build) exec "${compose_command[@]}" build api web ;;
	stop | down) exec "${compose_command[@]}" down ;;
	status) exec "${compose_command[@]}" ps ;;
	esac
}

main "$@"
