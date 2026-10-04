#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
	printf 'Usage: %s [start|stop|down|status|build|--help] [--verbose]\n' "${0##*/}" >&2
	printf 'Use the existing infra Compose project and root .env; volumes are retained.\n' >&2
	printf 'Setup: cp .env.example .env (only when absent); edit POSTGRES_PASSWORD.\n' >&2
	printf 'First use: ./preview.sh build; docker compose --env-file .env -f infra/docker-compose.yml pull db\n' >&2
	printf 'start: background readiness checks; never builds or installs.\n' >&2
	printf 'status: probe owned services and host publications; never starts.\n' >&2
	printf 'stop/down: stop this Compose project; preserve database/media volumes.\n' >&2
	printf 'Wildcard access requires host iproute2; start/status also require curl and jq.\n' >&2
	printf '--verbose shows Compose lifecycle diagnostics. Shell values override dotenv.\n' >&2
}

die() {
	printf 'preview: %s\n' "$*" >&2
	exit 1
}

require_command() {
	command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"
}

compose() {
	"${compose_command[@]}" "$@"
}

published_mappings() {
	docker inspect --format '{{range (index .NetworkSettings.Ports "'"$1"'/tcp")}}{{printf "%s:%s\n" .HostIp .HostPort}}{{end}}' "$web_container"
}

probe_host() {
	local host=$1
	host=${host#[}
	host=${host%]}
	case "$host" in
	0.0.0.0) host=127.0.0.1 ;;
	::) host=::1 ;;
	esac
	[[ $host != *:* ]] || host="[$host]"
	printf '%s' "$host"
}

check_services() {
	local service container state failed=false
	for service in db api web; do
		container=$(compose ps --all -q "$service") || return 1
		if [[ -z $container ]]; then
			printf 'Preview status: %s stopped.\n' "$service" >&2
			failed=true
			continue
		fi
		state=$(docker inspect --format '{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$container") || return 1
		case "$service:$state" in
		db:running\|healthy | api:running\|healthy | web:running\|none | web:running\|healthy) ;;
		*)
			printf 'Preview status: %s %s; inspect Compose logs.\n' "$service" "$state" >&2
			failed=true
			;;
		esac
	done
	[[ $failed == false ]]
}

ready_summary() {
	local db_endpoint api_endpoint web_listeners web_ports scheme endpoint port mapping bindings web_container
	local http_port https_port probe_base health seen_ports=' ' internal_probe
	local -a preview_entries=() preview_listeners=() preview_publications=()
	local -a preview_internal=() preview_notes=()
	check_services || return 1
	# shellcheck disable=SC2016 # Variables expand only inside the database container.
	db_endpoint=$(compose exec -T db sh -c 'PGCONNECT_TIMEOUT=3 psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -p "$TABI_DB_PORT" -Atc "SELECT current_setting('\''listen_addresses'\'') || '\'':'\'' || current_setting('\''port'\'')"') || die 'db listener probe failed; inspect ./preview.sh status and Compose logs'
	api_endpoint=$(compose exec -T api python -c 'from pathlib import Path; a=Path("/proc/1/cmdline").read_bytes().decode().split("\0"); print(a[a.index("--host")+1]+":"+a[a.index("--port")+1])') || die 'cannot read api listener; inspect image/configuration'
	web_listeners=$(compose exec -T web wget -T 3 -q -O - http://127.0.0.1:2019/config/apps/http/servers | compose exec -T api python -c '
import json, sys
for server in json.load(sys.stdin).values():
    scheme = "https" if server.get("tls_connection_policies") else "http"
    for address in server.get("listen", []):
        print(scheme + "|" + ("0.0.0.0" + address if address.startswith(":") else address))
') || die 'cannot query active web listeners; inspect Caddy configuration'
	[[ -n $web_listeners ]] || die 'web has no active browser listeners'
	# shellcheck disable=SC2016 # Variables expand only inside the web container.
	web_ports=$(compose exec -T web sh -c 'printf "%s %s" "$TABI_WEB_HTTP_PORT" "$TABI_WEB_HTTPS_PORT"') || die 'cannot read configured web ports'
	read -r http_port https_port <<<"$web_ports"
	[[ $http_port =~ ^[0-9]+$ && $https_port =~ ^[0-9]+$ ]] || die 'web ports must be numeric'
	web_container=$(compose ps -q web) || die 'cannot identify the running web container'
	[[ -n $web_container ]] || die 'web container is missing'
	preview_listeners+=("Listening db: $db_endpoint (container only; PostgreSQL/TCP)"
		"Listening api: $api_endpoint (container only; HTTP)"
		'Listening web control: 127.0.0.1:2019 (container loopback only; Caddy admin API)')
	while IFS='|' read -r scheme endpoint; do
		port=${endpoint##*:}
		[[ $port =~ ^[0-9]+$ ]] || die 'unsupported web listener port'
		compose exec -T web wget -T 3 -q -O /dev/null "$scheme://127.0.0.1:$port/" || die "web container readiness failed on $scheme port $port; check TABI_SITE_ADDRESS and TLS"
		compose exec -T web wget -T 3 -q -O - "$scheme://127.0.0.1:$port/api/health" | compose exec -T api python -c 'import json,sys; sys.exit(0 if json.load(sys.stdin).get("status") == "ok" else 1)' || die 'api readiness through web failed; inspect Compose logs'
		bindings=$(published_mappings "$port") || die 'cannot query web published mappings'
		[[ -n $bindings ]] || die 'active web listener has no host mapping; align web listener/publication ports'
		preview_listeners+=("Listening web: $endpoint (container; ${scheme^^})")
		while IFS= read -r mapping; do
			probe_base="$scheme://$(probe_host "${mapping%:*}"):${mapping##*:}"
			curl --silent --show-error --fail --noproxy '*' --connect-timeout 2 --max-time 3 "$probe_base/" >/dev/null 2>&1 || die 'web host publication is not ready; inspect host bind and Docker mapping'
			health=$(curl --silent --show-error --fail --noproxy '*' --connect-timeout 2 --max-time 3 "$probe_base/api/health") || die 'api health through host publication failed'
			printf '%s' "$health" | compose exec -T api python -c 'import json,sys; sys.exit(0 if json.load(sys.stdin).get("status") == "ok" else 1)' || die 'api health through host publication is invalid'
			preview_publications+=("Published web: $mapping -> $endpoint (active listener)")
			preview_entries+=("Website|web|$scheme|${mapping%:*}|${mapping##*:}||"
				"Admin|web|$scheme|${mapping%:*}|${mapping##*:}|/admin|"
				"API docs|web|$scheme|${mapping%:*}|${mapping##*:}|/api/docs|")
		done <<<"$bindings"
		seen_ports+="$port "
	done <<<"$web_listeners"
	for port in "$http_port" "$https_port"; do
		[[ $seen_ports != *" $port "* ]] || continue
		bindings=$(published_mappings "$port") || die 'cannot query reserved web mappings'
		while IFS= read -r mapping; do
			[[ -n $mapping ]] || continue
			preview_publications+=("Published web: $mapping -> container port $port (no active listener)")
		done <<<"$bindings"
	done
	preview_internal+=("API docs (api): http://api:${api_endpoint##*:}/api/docs (Compose network only)")
	printf -v internal_probe '%q ' "${compose_command[@]}" exec -T web wget -qO- "http://api:${api_endpoint##*:}/api/health"
	preview_internal+=("Internal probe: $internal_probe")
	preview_console_render
}

start_services() (
	local startup_directory status=0
	startup_directory=$(mktemp -d /tmp/tabi-preview-start.XXXXXXXX)
	trap 'rm -f -- "$startup_directory/start.log"; rmdir -- "$startup_directory"' EXIT
	trap 'exit 130' INT
	trap 'exit 143' TERM
	compose up --no-build --pull never --wait --wait-timeout "$ready_timeout" -d >"$startup_directory/start.log" 2>&1 || status=$?
	if [[ $preview_verbose == true || $status -ne 0 ]]; then
		# Lifecycle progress is useful; application logs and expanded config are not printed.
		awk '/Container .* (Created|Started|Running|Healthy|Waiting|Error|Unhealthy|Stopped)|Network .* (Created|Removed)/' "$startup_directory/start.log" >&2
	fi
	if ((status != 0)); then
		printf 'preview: startup/readiness failed; inspect ./preview.sh status and Compose logs. Prepare images with ./preview.sh build and pull db on first use.\n' >&2
		return "$status"
	fi
	ready_summary
)

main() {
	local action=start script_dir env_file configuration ready_timeout preview_verbose=false
	if [[ $# -gt 0 && $1 != -* ]]; then
		action=$1
		shift
	fi
	while (($#)); do
		case "$1" in
		--verbose)
			preview_verbose=true
			shift
			;;
		--help | -h)
			usage
			return 0
			;;
		*) die 'unknown argument; use --help' ;;
		esac
	done
	case "$action" in start | stop | down | status | build) ;; *) die 'unknown command; use --help' ;; esac
	script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P) || die 'cannot locate repository root'
	# shellcheck source=infra/preview-console.sh
	source "$script_dir/infra/preview-console.sh"
	env_file=$script_dir/.env
	[[ -f $env_file ]] || die "missing root .env; run cp '$script_dir/.env.example' '$env_file', then edit POSTGRES_PASSWORD"
	require_command docker
	docker compose version >/dev/null 2>&1 || die 'Docker Compose is unavailable'
	local -a compose_command=(docker compose --env-file "$env_file" --project-directory "$script_dir/infra" -f "$script_dir/infra/docker-compose.yml")
	compose config --quiet || die 'invalid root .env/Compose configuration; check required keys'
	case "$action" in
	build) exec "${compose_command[@]}" build api web ;;
	stop | down) exec "${compose_command[@]}" down ;;
	esac
	require_command jq
	require_command curl
	_preview_local_daemon || return 1
	configuration=$(compose config --format json) || die 'cannot resolve preview configuration'
	ready_timeout=$(jq -r '.services.web.environment.TABI_PREVIEW_READY_TIMEOUT // "60"' <<<"$configuration") || die 'cannot read readiness timeout'
	[[ $ready_timeout =~ ^[1-9][0-9]{0,3}$ ]] || die 'TABI_PREVIEW_READY_TIMEOUT must be 1..9999 seconds'
	local hosts
	hosts=$(jq -r '.services.web.ports[] | .host_ip // "0.0.0.0"' <<<"$configuration") || die 'cannot read web host bindings'
	local -a configured_hosts=()
	mapfile -t configured_hosts <<<"$hosts"
	preview_prepare_addresses "${configured_hosts[@]}" || return 1
	case "$action" in start) start_services ;; status) ready_summary ;; esac
}

main "$@"
