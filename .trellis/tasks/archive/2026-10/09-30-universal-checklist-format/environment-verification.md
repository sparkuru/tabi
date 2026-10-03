# Isolated development and browser verification

## Environment boundary

- Execution profile: `docker-wrapper`; no local `infra/.env` read or modification.
- Runtime: existing `infra/docker-compose.yml`, explicit project
  `tabi-checklist-dev`; PostgreSQL and private media use new project-owned named
  volumes. HTTP `127.0.0.1:18080`, HTTPS bind `127.0.0.1:18443`. Database/API
  ports remain private to the Compose network.
- `hako` runs disposable commands with host UID/GID, ignored `.devhome` HOME and
  Python development venv. Python 3.12 and Node 22 developer commands;
  Playwright exactly 1.62.1 in matching official Noble image (bundled Node
  24.18.1), Chromium, Docker network `tabi-checklist-dev_default`, base URL
  `http://web`.
- Persistent suite: `frontend/playwright.config.ts`, `frontend/e2e/`; sequential
  desktop 1280×800 and mobile/touch 375×812 projects, device scale 1, zh-CN and
  Asia/Shanghai. `TABI_E2E_ISOLATED=1` is an accidental-target guard, not an
  authorization mechanism.
- Synthetic accounts only, separated by project/spec to respect the production
  login limiter. Synthetic 1-pixel PNG is decoded by the application's Pillow
  before browser use. Original OCR command creates the agreed 172 drafts,
  without publishing or replacing them.

## Commands actually run

Passed:

```sh
bash -n hako dev.sh infra/e2e-seed.sh
shellcheck hako dev.sh infra/e2e-seed.sh
shfmt -d hako dev.sh infra/e2e-seed.sh
./hako compose config --quiet
./hako node npm --version
WEB_HOST_PORT=18082 ./hako node npm --version
./hako python python -m venv /app/.devhome/python
./hako python pip install -e '.[dev]'
./hako node npm ci
./hako node npm run typecheck:e2e
./hako node npm run format:check
./hako browser npm run test:e2e:list
./hako browser npm run test:e2e -- completion.spec.ts --grep 'guest completion'
./hako browser npm run test:e2e
./dev.sh
./infra/e2e-seed.sh
TABI_DEV_PROJECT=tabi-checklist-wrapper-empty ./dev.sh down
git diff --check
```

The no-service teardown targeted a separate empty project. After the complete
browser suite passed, actual `./dev.sh down` stopped only `tabi-checklist-dev`;
`./hako compose ps --quiet` returned no containers and the loopback health URL
stopped serving. `./hako compose up --wait -d` then restarted the same project
with retained volumes and its existing images. Web `/api/health` and
`./dev.sh status` passed: API/database healthy and web ready on the same loopback
bindings. The project remains running for main-session inspection. No unknown
volumes or default-runtime containers were removed. Docker daemon access initially failed under
the sandbox and succeeded with task-scoped escalation; no automatic approval
rejection occurred.

## Browser iterations and fixes

`./hako browser npm run test:e2e` initially found `crypto.randomUUID` unavailable
on the HTTP Docker alias. This reproduced a real HTTP-preview problem;
frontend replaced browser request-key creation with secure `getRandomValues`.
Exact label-based input assertions also led to explicit stable textarea labels.
The synthetic account fixture was split to respect the unchanged production
rate limiter. Test expectations were aligned to completion's intentional 200
contract, actual `complete=1` handoff and item card link names that include
record counts; the final import assertion identifies the exact title heading
inside its link and verifies the item href.

An intermediate full iteration passed 12/14 scenarios, with both guest handoff tests
failing because no completion request followed successful login. Browser trace
showed `/items/{id}?complete=1` and normal item requests but no complete POST.
Frontend fixed normalization to accept the router's boolean form as well as the
incoming flag. The same-mounted refetch fixture respects the existing 30-second
query freshness window with a browser-clock advance and sends a bubbling
visibility event to the query library's window listener. No timeout increase
or substitute response was used to bypass the assertions.

Definitive frozen API and web were rebuilt together with `./dev.sh`. Build
output contained final `index-Bs-eXz8F.js`, docs 6.94 kB and Schema 9.16 kB.
Focused guest continuation/deletion tests passed **2/2 (2.4 s)**. The definitive
full invocation `./hako browser npm run test:e2e` passed **14/14 (19.9 s)**,
exit 0, one worker. Complete output is saved at
`/tmp/tabi-universal-e2e-final.log`; report is
`frontend/playwright-report/index.html`. Final test TypeScript/format and shell
syntax/ShellCheck/shfmt checks passed after the last fixture changes.

## Coverage and artifacts

Fourteen scenario/project combinations cover real upload/paste preview/import,
field-error retention and no partial write, administrator boundaries, publish,
same-content reuse and changed-content conflict, authentic document downloads,
removed-item skip, original 172 OCR ID/source/verification/status snapshots,
loading/error/empty states, direct completion busy protection and server reuse,
private defaults, progress, empty-record rendering, photo addition/removal,
repeat records, public projection privacy and original-media denial,
private/delete revocation, last-record deletion and completion again. Guest
handoff coverage additionally checks one-shot continuation and real refetch
after deletion on the same mounted page.

Horizontal overflow compares DOM width to the configured viewport, including
mobile layout viewport expansion. Semantic names, exact textarea labels,
keyboard activation and relevant 44px targets are asserted. Busy/loading checks
only delay real requests; transaction/privacy paths use the actual API and
PostgreSQL, not substituted responses. There is no full accessibility audit,
pixel baseline, physical-device claim or CI job.

Reports/traces/screenshots/videos/console-network diagnostics are in ignored
`frontend/playwright-report/` and `frontend/test-results/`. Success screenshots
from the final passing flows were copied to `/tmp/tabi-universal-review/` for
visual review; they do not replace assertions. The readable browser-region
admin preview is `desktop-admin-import-preview-viewport.png`; mobile examples
are `mobile-no-location-item.png`, `mobile-completion-record.png` and
`mobile-completion-history.png`.
