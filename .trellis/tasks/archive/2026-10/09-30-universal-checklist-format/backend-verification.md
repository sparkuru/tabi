# Backend implementation verification — 2026-10-01

Backend stages 1–3 are implemented. Work stays within `backend/**`, `docs/checklist-format.md`, `docs/checklist.schema.json`; this task-local evidence note was requested by the coordinator. No commit, archive, default-instance data import, or public deployment was performed.

## Delivered behavior

- Strict `tabi.checklist` v1 contract with nested unknown-field rejection, integer-only version/sort, 1–200 items, bounded UTF-8 JSON transport (2 MiB), ordinary located `422` errors, safe titled URLs and existing place/reference validation.
- Read-only admin preview, atomic full draft import, inherited-source/effective-order normalization, immutable original digest/ID mapping, same-content reuse without restoring later edits/publication state, different-content conflict, DB unique-key race loser rollback/reload.
- Independent admin total/draft/published/unpublished counts, admin detail endpoint, and transactional list+draft publication that skips deliberately unpublished items and rejects a list without draft/published entries.
- Bodyless direct completion returns `200` for both creation and reuse. It validates role/CSRF/public state, locks the item row before rechecking effective records, creates private empty records, rejects cross-operation idempotency-key reuse, and preserves deliberate repeat records. Empty create/edit and removal of the last photo are valid.
- Existing public projections retain privacy and revocation. Later multipart photo attachment is the existing `POST /api/media/checkins/{id}`. Original media remains owner-only.
- Additive migration `cf8b4151f81e` → `a748bd701acf`; existing OCR seed IDs/data and reviewed import route are unchanged.
- Generated JSON Schema, four examples (minimal/tasks/learning/two real OCR-source records), format documentation, and actual backend `app.openapi()` supplied to frontend at `/tmp/tabi-openapi.json`.

## Checks and actual results

All development validation ran through the project Docker wrapper with Python 3.12 and `.[dev]`. Docker needed sandbox escalation; the first unprivileged attempt failed on daemon socket access and is not counted as a test result.

```sh
./hako python pytest -q
./hako python ruff check app tests migrations
./hako python ruff format --check app tests migrations
git diff --check -- backend docs
```

Final full suite: **39 passed, 4 skipped**, 8.68 seconds. The four skips require an explicit PostgreSQL test URL and were run separately below. Lint passed; formatting reported **49 files already formatted**; diff whitespace check passed. Existing OCR source/172-row/seed-upgrade/provenance and reviewed-import/moderation regressions are included in the full suite.

The new API tests exercise preview with no rows/audit, normalization and source inheritance, original-ID reuse after admin edit/unpublish, source-file whitespace/object order, same-key conflicts, independent lists, located duplicate/relationship/type errors, invalid JSON/UTF-8, size/item/URL limits, authentication/CSRF, batch skip/count/empty behavior, private empty completion/retry/repeat/progress, cross-operation idempotency, public empty sharing/revocation, last-record deletion, real late transaction failure, later photo attachment/authorization/last-photo removal, schema-generation equality, and all four examples.

A final full run exposed rate-limiter state shared between isolated TestClient tests after more than 30 registrations. The fixture now gives each isolated client a new **real `SlidingWindowLimiter`** shared by the auth/media route consumers. Production limits and algorithms are unchanged; the existing repeated-login `429` regression still runs and passes.

### Actual PostgreSQL migration and concurrency

Explicit isolated project: `tabi-checklist-dev`, network `tabi-checklist-dev_default`, PostgreSQL service `db`. Use the synthetic development credentials already configured by the environment worker; do not point these commands at the default application instance. Reproducible recipe (the environment variables below must use the dedicated test DB connection):

```sh
./hako compose up --wait -d db
HAKO_NETWORK=tabi-checklist-dev_default TABI_DATABASE_URL="$ISOLATED_PG_URL" ./hako python alembic upgrade head
HAKO_NETWORK=tabi-checklist-dev_default TABI_DATABASE_URL="$ISOLATED_PG_URL" ./hako python alembic check
HAKO_NETWORK=tabi-checklist-dev_default TABI_TEST_DATABASE_URL="$ISOLATED_PG_URL" ./hako python pytest -q tests/test_postgres_checklist.py
```

`ISOLATED_PG_URL` is a task-specific synthetic PostgreSQL DSN using host `db`, database/user `tabi`; it is not a production secret. The actual executed commands used that dedicated DSN inline but wrapper output forwards variable names rather than values.

- `alembic upgrade head`: passed all initial/additive revisions through **a748bd701acf**.
- `alembic check`: **No new upgrade operations detected**.
- PostgreSQL suite: **4 passed**, 0.63 seconds.
- Each PostgreSQL test creates a random schema `test_checklist_<UUID>` and explicitly selects that search path. Cleanup drops **only that generated schema**. It never drops `public`, the database, app tables, or any default-instance volumes.
- Two concurrent import sessions are synchronized after the first absent identity read. Same-content requests return one original and one reused ID mapping; different-content requests produce one winner and one `409`. Counts verify exactly one list, two items, one link, one relation, one identity, one audit with no orphan loser rows.
- Late failure sets the newly inserted identity's digest to NULL after list/items have flushed, producing a real PostgreSQL NOT NULL error. All six content/metadata/audit tables remain empty; a subsequent retry succeeds.
- Two independent PostgreSQL sessions start completion together using different keys. Both return the same private empty record; only one Checkin row exists, proving item row-lock serialization beyond idempotency-key collision handling.

## Limits and handoff

Deprecation warnings from the installed FastAPI/Starlette TestClient and legacy HTTP 422 constant remain informational; no dependency upgrade was added. Browser integration is the environment/frontend workers' responsibility and is not claimed by these backend results. Frontend must copy the final regenerated schema/OpenAPI and generate HeyAPI from it. New empty records require compatibility consideration before rolling back to older code that required content; no user records should be deleted for rollback.
