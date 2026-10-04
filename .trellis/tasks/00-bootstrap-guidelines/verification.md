# Bootstrap guideline completion and dirty-file verification

Date: 2026-10-04. The user requested committing the current dirty files and
handling `00-bootstrap-guidelines`, declined a new task, then explicitly chose
to fill this existing task's guidelines before committing and archiving.

## Bootstrap scope

The initial review found all eleven PRD-named guides were unfilled scaffolds.
Five backend and six frontend guides now document current source, with short
real examples, source/test references, anti-patterns and validation boundaries.
Both indexes now describe the actual stack and provide pre-development and
quality-check entry points. The original task scope remains documentation-only.

Final independent read-only acceptance: all three PRD items passed. Thirteen
guideline/index documents, thirty-six local Markdown links/anchors, seventy-five
explicit source paths and seventeen source-language code examples were checked
against current files; no substantive contradiction or scaffold remained.
Primary additionally checked twenty-one specification documents and sixty-two
local links/anchors, confirmed the Trellis-managed AGENTS block is unchanged,
and reviewed all eleven guide contents against source.

Examples cover FastAPI routers/dependencies, synchronous SQLAlchemy sessions,
explicit transactions and race recovery, FastAPI field errors, transactional
audits, isolated pytest fixtures, React component composition, Query cache keys,
session/completion hooks, retry refs and generated OpenAPI types. Current
limitations are explicit: no repository abstraction, project-level structured
logger, configured backend static type checker, frontend unit-test framework,
accessibility scanner, approved pixel baseline or CI job.

Implement/check manifests each explicitly register the applicable Trellis Plus
details and mainline, plus both layer indexes. Helpers loaded current sources and
the task/policy context; do not interpret manifest validation as proof of native
hook injection. Task context validation passed with ten unique existing entries
in each manifest before the documentation pass.

## Existing dirty work, checked separately

The user also authorized the eighteen original dirty paths: preview lifecycle
and console helpers/tests, Compose/timeout example, project policies, runtime/data
documentation, third-party inventory, the page title, and the existing README
deletion. README content is retained in the new runtime/data spec with corrected
current commands; its provenance references the original `README.md`.
The Trellis-managed AGENTS block is unchanged. Local dotenv, credentials,
platform files, caches and test/build outputs are excluded from Git.

Two additional paths appeared during checking and were not part of the initial
eighteen: `backend/data/ocr_seed.json` and deletion of `backups/.gitignore`.
Their inclusion requires a separate user decision; they are not modified by
the bootstrap workers. `./hako python python -m app.seed_ocr --check-only`
failed on the new seed input: required `source_file`/`source_sha256` are absent
and the first `source_note_prefix` is empty. Deleting the backup ignore file
also removes that directory's local ignore protection. These observations are
outside the accepted guide scope and are not counted as passing checks.

Executed checks:

- `git diff --check`: passed.
- `bash -n preview.sh infra/preview-console.sh infra/test-preview.sh
  infra/test-preview-console.sh`: passed.
- `shellcheck -x -P infra` on those four scripts: passed. The initial invocation
  without source following reported sourced-helper warnings; source resolution
  cleared them without suppressing rules or editing the scripts.
- `shfmt -d` on those four scripts: passed.
- `bash infra/test-preview.sh`: lifecycle/configuration/address/failure fixtures
  passed without Docker or persistent data writes.
- `bash infra/test-preview-console.sh`: output layout, eligible addresses,
  exposure, dependency and daemon-locality fixtures passed.
- `docker compose --env-file .env -f infra/docker-compose.yml config --quiet`:
  passed; no resolved secrets printed.
- `./hako node npm run typecheck`, `format:check`, `build`: all passed using the
  existing Node 22 Docker wrapper. Host Node is 20, so it was not used for the
  application checks.
- `./preview.sh status`: actual preview healthy; advertised HTTP port 7081,
  all eligible wildcard-host candidates, loopback URLs and inactive HTTPS
  mapping separately. No real service restart or data mutation.
- Temporary real-container smoke in `/tmp/tabi-commit-preview.agdq7jRT/`:
  unique Compose project, random loopback host ports, cached application/DB
  images and synthetic empty database. Start/status/repeated start, website,
  admin, docs and health HTTP requests, repeated stop, port release and
  restart with database/media markers retained all passed. Existing `infra`
  and `tabi-checklist-dev` container ID sets matched before/after. The test
  stack was stopped and only its own four volumes removed. An earlier smoke
  reached restart but failed the temporary harness's ordered-ID comparison;
  comparing sorted ID sets resolved that harness assumption.
- Actual user entrance `http://192.168.9.4:7081`: HTTP document matches the built
  frontend title/assets. Chromium desktop 1280x800 and mobile 375x812 verified
  title `旅々`, public page, accessible login inputs and no horizontal overflow;
  browser requests were restricted to same-origin GET/HEAD. Initial default
  Chromium navigation returned connection refused; host/container health
  requests then passed and the same entrance passed with `--no-proxy-server`.

## Limits and review decision

No backend source, API schema, migration, permission flow or business behavior
was changed by this documentation completion. The full backend, writable E2E
and PostgreSQL concurrency suites were not rerun; their existing tests were read
as evidence for the guides, not counted as fresh passes.

The historical owner-only `/tmp/tabi-preview-review/credentials.json` is absent,
so authenticated `test:preview` was not rerun. The actual-entry checks above
prove title/public-page/login-form availability, not current administrator login
or authenticated JSON preview. Historical login results remain historical.
No account was created or reset for this commit request. Cross-device access,
domain HTTPS and physical-phone behavior remain unverified.

For the bootstrap guides, review is `human-not-needed`: claims and examples are
checked against source and no product decision is introduced. The mechanical
title/console changes have fixture, real lifecycle and actual-entry evidence;
the user explicitly authorized their submission. Authenticated acceptance is
reported as unavailable, rather than replacing it with isolated-suite evidence.
