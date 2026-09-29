# MVP verification — 2026-09-29

## Automated gates

- `backend/.venv/bin/ruff check app tests migrations` and `ruff format --check ...`: pass.
- `backend/.venv/bin/pytest -q`: **15 passed**. Tests ran outside the filesystem sandbox because its TestClient worker threads hang; no test failure was observed there.
- `frontend/npm run typecheck`, `npm run build`, `npm run format:check`: pass.
- `frontend/openapi.json` equals `app.openapi()`; generated HeyAPI client typechecks.
- `POSTGRES_PASSWORD=tabi-config-check docker compose -f infra/docker-compose.yml config --quiet`, POSIX shell syntax/ShellCheck for entrypoint, `alembic upgrade head`, and PostgreSQL `alembic check`: pass. Migration head `cf8b4151f81e` has no autogenerate drift.

## OCR source and publication

- User confirmed `archive/ocr.md` is the full source. The tracked manifest has **96 food** rows (70 table + 26 district names) and **76 travel** rows, each preserving source line and original fields. Source SHA-256 and line content match the local Markdown in tests. The original archive remains ignored by the user's root `.gitignore`.
- Fresh checkouts can seed all 172 rows from the tracked manifest, but cannot independently recompute its source Markdown hash unless the local-only archive is supplied. README documents that limit.
- In disposable project `tabi-mvp-smoke`, seed upgraded an existing 146-row draft dataset by appending exactly 26 rows. `--publish-reference` published the 172 untouched OCR rows and both lists; a repeat run created/published 0. All 172 retain `verified_at=NULL`. Public summaries and item detail identify OCR source and unverified current facts. Undated fares and train durations remain only in the source manifest.
- CLI reference publication writes one audit row per changed list. Upgrading an old generated summary replaces its now contradictory wording while preserving truly customized summaries.

## Runtime flows

- Through Caddy at loopback `127.0.0.1:8080`: API health returned 200; admin saw 2 lists and the initial 70/76 OCR rows; admin publication, user registration, idempotent retry, intentional second check-in, distinct-item progress, share revocation, and personal history passed. After the user clarified OCR scope, the full 172-row `--publish-reference` flow and its idempotent rerun passed separately.
- After full OCR publication, the public API exposed 2 OCR lists; a weekend destination accepted a note-only check-in through the same endpoint and appeared in progress/history.
- After the final provenance edit, the rebuilt Docker stack returned 422 when an administrator tried to clear an OCR item's source, retained the public source and null `verified_at`, and preserved the OCR warning when the list summary was edited. The food list still held all 96 OCR entries plus one disposable smoke item.
- A private photo-only check-in returned its original and thumbnail to the author, and 404 to a guest.
- Headless Chrome mobile captures at 390 px were inspected for home, list, and OCR item detail. Source/outdated warnings and core actions were visible; the list controls fit the viewport.

## Backup and restore drill

- `pg_dump -Fc` and media `tar` archives were created from the disposable stack; `pg_restore --list` and `tar -tzf` validated their structure.
- The archives were restored into separate project `tabi-mvp-restore` on alternate loopback ports, with API writes stopped during restore and PostgreSQL restore in one transaction.
- Restored counts were 2 lists, 147 items (146 seed rows plus 1 test item), 3 check-ins, and 1 media row; two media files existed. The restored API became healthy. Via its proxy, the author could read history/original/thumbnail, and a guest received 404 for the private files.

## Limits of this evidence

- OCR content is presented as source-attributed reference material; restaurant operation, precise addresses, attraction geography, prices, and train schedules were not independently checked against current outside sources.
- Smoke data and photos were disposable test records. No external deployment was performed.
