#!/usr/bin/env bash
set -Eeuo pipefail

# Exercise the real wrapper using only isolated command fixtures, never Docker.
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
workspace=$(mktemp -d /tmp/tabi-preview-test.XXXXXXXX)
trap 'rm -rf -- "$workspace"' EXIT
mkdir -p "$workspace/repo/infra" "$workspace/bin"
cp "$root/preview.sh" "$workspace/repo/preview.sh"
cp "$root/infra/preview-console.sh" "$workspace/repo/infra/preview-console.sh"
cp "$root/infra/docker-compose.yml" "$workspace/repo/infra/docker-compose.yml"
printf 'POSTGRES_PASSWORD=fixture-only\n' >"$workspace/repo/.env"
printf 'retain\n' >"$workspace/persistence-marker"
export FIXTURE_ROOT=$workspace
export PATH="$workspace/bin:$PATH"
unset DOCKER_HOST DOCKER_CONTEXT

cat >"$workspace/bin/docker" <<'STUB'
#!/usr/bin/env bash
set -Eeuo pipefail
printf '%q ' "$@" >>"$FIXTURE_ROOT/commands"
printf '\n' >>"$FIXTURE_ROOT/commands"
if [[ $1 == context ]]; then
	printf '%s\n' "${FIXTURE_ENDPOINT:-unix:///fixture/docker.sock}"
	exit 0
fi
if [[ $1 == inspect ]]; then
	if [[ $3 == *'.State.Status'* ]]; then
		if [[ ${FIXTURE_UNHEALTHY:-false} == true ]]; then printf 'running|unhealthy\n'; else printf 'running|healthy\n'; fi
	elif [[ $3 == *'80/tcp'* ]]; then
		printf '%s:7081\n' "${FIXTURE_BIND:-0.0.0.0}"
	else
		printf '%s:7082\n' "${FIXTURE_BIND:-0.0.0.0}"
	fi
	exit 0
fi
[[ $1 == compose ]] || exit 30
shift
if [[ $1 == version ]]; then exit 0; fi
while [[ $1 == --* || $1 == -f ]]; do shift 2; done
case $1 in
config)
	if [[ $2 == --format ]]; then
		printf '{"services":{"web":{"environment":{"TABI_PREVIEW_READY_TIMEOUT":"%s"},"ports":[{"host_ip":"%s"}]}}}\n' "${FIXTURE_TIMEOUT:-60}" "${FIXTURE_BIND:-0.0.0.0}"
	fi
	;;
up)
	[[ $* == *'--no-build --pull never --wait --wait-timeout '* ]] || exit 31
	printf 'Container fixture-web Started\n'
	[[ ${FIXTURE_UP_FAIL:-false} == false ]] || exit 1
	touch "$FIXTURE_ROOT/running"
	;;
ps)
	[[ -e $FIXTURE_ROOT/running ]] || exit 0
	printf 'fixture-%s\n' "${@: -1}"
	;;
exec)
	service=$3
	case $service in
	db) printf '0.0.0.0:5432\n' ;;
	api)
		if [[ $* == *'/proc/1/cmdline'* ]]; then
			printf '0.0.0.0:8000\n'
		elif [[ $* == *tls_connection_policies* ]]; then
			cat >/dev/null
			printf 'http|0.0.0.0:80\n'
		else
			value=$(cat)
			[[ $value == *'"status":"ok"'* ]] || exit 1
		fi
		;;
	web)
		[[ ${FIXTURE_INTERNAL_FAIL:-false} == false ]] || exit 1
		if [[ $* == *'/config/apps/http/servers'* ]]; then
			printf '{"srv0":{"listen":[":80"]}}\n'
		elif [[ $* == *'/api/health'* ]]; then
			printf '{"status":"ok"}\n'
		elif [[ $4 == sh ]]; then
			printf '80 443\n'
		fi
		;;
	esac
	;;
down) rm -f "$FIXTURE_ROOT/running" ;;
build) ;;
*) exit 32 ;;
esac
STUB
cat >"$workspace/bin/ip" <<'STUB'
#!/usr/bin/env bash
[[ ${FIXTURE_IP_FAIL:-false} == false ]] || exit 1
[[ $* == '-br a' ]] || exit 1
printf 'lo UNKNOWN 127.0.0.1/8 ::1/128\neth0 UP 192.0.2.10/24 192.0.2.11/24 2001:db8::10/64\ntun0 UNKNOWN 198.51.100.20/32 192.0.2.10/24\nbr0 UP 172.18.0.1/16\ndown DOWN 203.0.113.99/24\n'
STUB
cat >"$workspace/bin/curl" <<'STUB'
#!/usr/bin/env bash
[[ ${FIXTURE_HOST_FAIL:-false} == false ]] || exit 1
printf '{"status":"ok"}\n'
STUB
chmod +x "$workspace/bin/"* "$workspace/repo/preview.sh"
preview=$workspace/repo/preview.sh

fail() {
	printf 'FAIL: %s\n' "$*" >&2
	exit 1
}
run_ready() {
	"$preview" "$@" >"$workspace/out" 2>"$workspace/err" || {
		cat "$workspace/err" >&2
		fail "expected ready: $*"
	}
	[[ $(head -n 1 "$workspace/out") == 'System is ready.' ]] || fail 'missing ready banner'
}
run_failed() {
	if "$preview" "$@" >"$workspace/out" 2>"$workspace/err"; then fail "expected failure: $*"; fi
	! rg -q 'System is ready\.' "$workspace/out" || fail 'false ready banner'
}

cd /tmp
run_ready start
[[ ! -s $workspace/err ]] || fail 'default startup diagnostics leaked'
cp "$workspace/out" "$workspace/ready"
for address in 192.0.2.10 192.0.2.11 198.51.100.20 172.18.0.1; do
	for suffix in '' /admin /api/docs; do
		[[ $(rg -Fxc "http://$address:7081$suffix" "$workspace/out") == 1 ]] || fail "missing or duplicated URL $address$suffix"
	done
done
rg -q '^http://127\.0\.0\.1:7081$' "$workspace/out" || fail 'missing local URL'
! rg -q '^http://(0\.0\.0\.0|203\.0\.113\.99|\[2001:db8).*|^http://.*:7082' "$workspace/out" || fail 'wrong address or inactive port URL'
rg -q '7082 -> container port 443 \(no active listener\)' "$workspace/out" || fail 'inactive publication missing'
[[ $(rg '^(Open:|Local only \(preview host\):|Listeners:|Published:|Internal only:|Notes:)$' "$workspace/out") == $'Open:\nLocal only (preview host):\nListeners:\nPublished:\nInternal only:\nNotes:' ]] || fail 'section order'
run_ready status
cmp "$workspace/out" "$workspace/ready" || fail 'status output differs'
run_ready start
run_ready start --verbose
rg -q 'Container fixture-web Started' "$workspace/err" || fail 'verbose diagnostics missing'
FIXTURE_HOST_FAIL=true run_failed status
FIXTURE_INTERNAL_FAIL=true run_failed status
FIXTURE_UNHEALTHY=true run_failed status
"$preview" stop >"$workspace/out" 2>"$workspace/err"
[[ ! -e $workspace/running ]] || fail 'stop did not stop owned fixture'
run_failed status
"$preview" down >/dev/null
"$preview" build >/dev/null
[[ ! -e $workspace/running ]] || fail 'build started services'
FIXTURE_IP_FAIL=true run_failed start
[[ ! -e $workspace/running ]] || fail 'IP failure started services'
FIXTURE_ENDPOINT=ssh://remote run_failed start
[[ ! -e $workspace/running ]] || fail 'remote daemon started services'
FIXTURE_TIMEOUT=0 run_failed start
FIXTURE_UP_FAIL=true run_failed start
FIXTURE_BIND=127.0.0.1 run_ready start
! rg -q '^Open:' "$workspace/out" || fail 'loopback became remotely accessible'
FIXTURE_BIND=192.0.2.10 run_ready status
rg -q '^http://192\.0\.2\.10:7081$' "$workspace/out" || fail 'specific bind URL missing'
rg -q 'Access from other devices is unverified' "$workspace/out" || fail 'unverified access note missing'
mv "$workspace/repo/.env" "$workspace/repo/.env.saved"
run_failed start
[[ ! -e $workspace/repo/.env ]] || fail 'created local configuration'
[[ $(cat "$workspace/persistence-marker") == retain ]] || fail 'persistent data changed'
printf 'Tabi preview lifecycle fixtures passed.\n'
