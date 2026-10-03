#!/usr/bin/env bash
# Start/stop the existing full-stack Compose runtime through ./hako.
# Uses isolated tabi-checklist-dev volumes and loopback HTTP 18080 / HTTPS 18443.
# Override TABI_DEV_PROJECT, WEB_HOST_PORT and HTTPS_HOST_PORT for parallel runs.
# down targets only this Compose project and retains its database/media volumes.
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT
readonly WEB_HOST_PORT="${WEB_HOST_PORT:-18080}"

usage() {
	printf 'Usage: ./dev.sh [start|down|status|--help]\n' >&2
}

main() {
	[[ $# -le 1 ]] || {
		usage
		return 2
	}
	case "${1:-start}" in
	start)
		"$REPO_ROOT/hako" compose up --build --wait -d
		"$REPO_ROOT/hako" compose exec -T web wget -q -O /dev/null http://127.0.0.1:80/api/health
		printf 'Website: http://127.0.0.1:%s\n' "$WEB_HOST_PORT"
		;;
	down | stop) "$REPO_ROOT/hako" compose down ;;
	status) "$REPO_ROOT/hako" compose ps ;;
	--help | -h) usage ;;
	*)
		usage
		return 2
		;;
	esac
}

main "$@"
