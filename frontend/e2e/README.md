# Browser regression suite

Run from the repository root using the Docker development wrappers. The suite
requires a dedicated deployment. Do not point it at a personal or production
instance: it creates lists, records, synthetic photos and share links.

```sh
./hako python python -m venv /app/.devhome/python
./hako python pip install -e '.[dev]'
./hako node npm ci
./dev.sh
./infra/e2e-seed.sh
./hako node npm run typecheck:e2e
./hako browser npm run test:e2e:list
./hako browser npm run test:e2e
./dev.sh down
```

`hako compose` reuses `infra/docker-compose.yml` with project
`tabi-checklist-dev`, independent named database/media volumes and loopback
HTTP `18080`/HTTPS `18443` bindings. It ignores the local `infra/.env` and supplies
only synthetic local settings. `dev.sh down` targets that Compose project and
retains volumes. To get a fresh database, choose a new project rather than
deleting unknown volumes:

```sh
export TABI_DEV_PROJECT=tabi-checklist-review-20261001
export WEB_HOST_PORT=18081 HTTPS_HOST_PORT=18444
./dev.sh
./infra/e2e-seed.sh
./hako browser npm run test:e2e
./dev.sh down
```

The seed script creates synthetic administrator/user accounts for each browser
project and spec file (for example `admin-desktop-import@e2e.example.com`), plus
the OCR seed owner `admin@e2e.example.com`, with password
`E2e-Checklist-Password-42`. Separate accounts respect the production per-email
login limiter. Repeated runs within 15 minutes may still reach that limiter;
use a new project or restart only this isolated API with
`./hako compose restart api` before another full run. It imports the original 172 OCR rows
as drafts through the existing seed command. It never publishes those rows.
Browser scenarios use unique package keys and preserve the old OCR snapshot.
Failed runs leave only this test project's data for diagnosis; use a new project
when the original draft fixtures have been deliberately changed.

Developer commands run in Python 3.12 and Node 22 containers as the host UID.
The ignored `.devhome` contains HOME, caches and the Python development venv.
Browser commands use the official `mcr.microsoft.com/playwright:v1.62.1-noble`
image with its bundled Node runtime and Chromium revision, matching exactly the
`@playwright/test` dependency. The browser runner joins the private Compose
network and requests `http://web`; no database/API host ports are published.

The single shared execution profile is `docker-wrapper`. Tests run sequentially
in Chromium with Chinese locale and Asia/Shanghai timezone. Every scenario runs
in desktop `1280 × 800` and mobile `375 × 812` viewports; the latter enables
mobile/touch emulation at device scale 1. Emulation does not establish physical
device or mobile-engine behavior.

For a focused run:

```sh
./hako browser npm run test:e2e -- completion.spec.ts --project=mobile
./hako browser npm run test:e2e -- --grep 'uploads, previews' --project=desktop
```

The real API/database paths cover preview/import/reuse/conflict, atomic field
validation, authorization, publication and removed-item skipping, direct
completion, progress, empty records, photo addition/removal, repeat records,
share privacy/revocation and deletion. Readiness waits for Compose healthchecks
and verifies `/api/health` through web before the tests. A few loading/busy
assertions delay real requests without substituting their responses. Labels,
roles, keyboard activation, 44px completion/import buttons and horizontal
overflow are checked; there is no claim of complete accessibility auditing.

`frontend/playwright-report/` holds the HTML report and
`frontend/test-results/` holds failure screenshots, traces, videos and attached
console/network errors. Both are ignored. Success screenshots are diagnostic
review evidence, not pixel baselines. No snapshot update workflow or CI job is
configured. A direct project-local run is possible with matching Chromium
installed and explicit `TABI_E2E_ISOLATED=1` plus `TABI_E2E_BASE_URL` for a dedicated
test deployment; the marker is a guard against accidental execution, not a
production authorization mechanism.
