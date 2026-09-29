# MVP API, database and seed contracts

## 1. Scope / Trigger

Use this contract when changing authentication, list/item publication, check-ins, OCR seed data, media storage, or the Compose runtime. These boundaries share IDs, visibility, and storage rules across API, Web, PostgreSQL, and private media files. Product behavior is defined in `../product/requirements.md`.

## 2. Signatures

- Migrations: `cd backend && .venv/bin/alembic upgrade head`; Compose API entrypoint runs the same command before Uvicorn. Current head: `cf8b4151f81e`.
- Seed: `python -m app.seed_ocr --check-only --log`, `python -m app.seed_ocr --owner-email ADMIN_EMAIL`, or `python -m app.seed_ocr --owner-email ADMIN_EMAIL --publish-reference` after the system admin exists. It reads `backend/data/ocr_seed.json` by default.
- Session: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET/PATCH /api/auth/me`.
- Catalog: `GET /api/lists`, `GET /api/lists/{list_id}`, `GET /api/lists/{list_id}/items`, `GET /api/items/{item_id}`; admin writes under `/api/admin`.
- Experiences: `POST /api/items/{item_id}/checkins` with `Idempotency-Key`; `GET/PATCH/DELETE /api/checkins/{id}`; `GET /api/me/checkins`; `GET /api/shares/{share_id}`.
- Storage: PostgreSQL tables in `app/models/tables.py`; private media under `TABI_MEDIA_ROOT`, surfaced only by authorized `/api/media/...` routes.

## 3. Contracts

- Browser auth sets `tabi_session` (HttpOnly) and `tabi_csrf` (readable) cookies. Mutations after login send `X-CSRF-Token` equal to the readable cookie. Sessions store only token hashes and expire after `TABI_SESSION_DAYS` (default 30).
- The default single-worker API applies in-process sliding windows: registration 30/hour/client, login 60/15 minutes/client and 10/15 minutes/email, media upload 120/hour/account. It sends `429` and `Retry-After` when exceeded. The client address comes from Caddy's forwarded header; the API container must remain private behind Caddy. A multi-worker or multi-instance deployment needs a shared limiter.
- Passwords need at least 12 characters; public display names are trimmed and cannot be blank. `UserOut` includes email only for the account owner or system admin user list; public check-in projections expose nickname/avatar, not email.
- A checklist and each item have independent `draft`, `published`, or `unpublished` status. Public catalog requires both levels published. Existing check-ins remain readable by their author after unpublish.
- `ItemWrite` requires paired latitude/longitude and a `coordinate_system` in `WGS84`, `GCJ02`, or `BD09`; dated `reference_note` and `reference_as_of` must also be paired. `ChecklistOut.sort_order` and `ItemSummaryOut.sort_order` let admin edits preserve ordering.
- `POST .../checkins` requires a unique per-user idempotency key. Repeating the same key and payload returns the original record; changing the payload with that key conflicts. At least note or one photo is needed. Repeated visits with different keys are separate rows; progress counts distinct active item IDs.

```http
POST /api/items/{item_id}/checkins
Idempotency-Key: 7b46c641-d111-4526-8b9f-6a0b76f8edb2
X-CSRF-Token: <value of tabi_csrf cookie>
Content-Type: application/json

{"note":"First visit"}
```
- Public check-ins require explicit `visibility=public`, no `deleted_at`, and no `hidden_at`; changing visibility or moderation revokes the share view immediately. Original media is owner-only; public readers may receive reencoded thumbnails.
- The OCR seed has 96 food and 76 travel candidates, source line numbers and SHA-256. It creates stable-ID drafts, omits unverified fares/durations from displayed item text, and leaves `verified_at`/`reference_as_of` null. `--publish-reference` publishes untouched drafts with an OCR/outdated notice, skips edited or deliberately unpublished rows, and records an operator audit per changed list. It does not create `ImportBatch` because the Markdown is the complete user-supplied record and current facts have not been verified. The `/api/admin/lists/{id}/imports` endpoint is a separate path for individually reviewed rows.
- The public item page shows source and review state for source-attributed items; published OCR rows must remain labeled as reference material while `verified_at` is null.
- Admin item edits cannot erase or replace an OCR item's source marker (`OCR Markdown transcription only`); the API returns `422`. Admin list edits preserve the OCR/outdated warning line in the summary. This keeps the public provenance visible after ordinary content maintenance.
- Compose environment: required `POSTGRES_PASSWORD`; API receives `TABI_DATABASE_URL`, `TABI_MEDIA_ROOT`, `TABI_COOKIE_SECURE`; Web receives `TABI_SITE_ADDRESS`. Database and media use distinct named volumes. Public HTTPS requires `TABI_COOKIE_SECURE=true`.

## 4. Validation & Error Matrix

| Condition | Expected result |
| --- | --- |
| No session on an owned route | `401` |
| Missing/wrong CSRF on a mutation | `403` |
| User attempts admin write, or content admin attempts system role write | `403` |
| Other user's record or private media | `404` without disclosure |
| Same-list normalized item name/address collision | `409` |
| Same idempotency key with changed request | `409` |
| Empty check-in, mismatched coordinates, unreviewed OCR import row | `422` |
| Admin attempts to clear or replace an OCR item's source marker | `422` |
| Registration/login/upload exceeds its sliding window | `429` with `Retry-After` |
| Unpublished catalog item or revoked share | `404` |
| Seed collides with an existing admin-created title/item | command fails and rolls back |

## 5. Good / Base / Bad Cases

- Good: two check-ins on one item with different keys yield two history rows and one completed item.
- Base: a photo-only private check-in without coordinates succeeds and remains owner-only.
- Bad: reusing one key for a different note returns `409`; importing an OCR row with `transcription_reviewed=false` returns `422`.

## 6. Tests Required

- `backend/tests/test_core_flow.py`: assert repeat/idempotent IDs, progress versus record counts, same-name cross-list isolation, unpublish history, ownership, share revocation, list sort round-trip, login retry limit, and OCR provenance when published.
- `backend/tests/test_media_import.py`: assert photo-only records, thumbnail versus original authorization, EXIF removal, OCR review guard, moderation, and cover cleanup.
- `backend/tests/test_seed_ocr.py`: assert source hash/line match when archive exists, 172 rows, no false verification metadata, stable 146-row upgrade, idempotent publication audit, and conflict rollback.
- After model changes: `alembic upgrade head` then `alembic check` against PostgreSQL. After API changes: regenerate `frontend/openapi.json` and `frontend/src/api/generated/`, run frontend typecheck/build.

## 7. Wrong vs Correct

Wrong: set `verified_at` to the seed command's run time and publish the OCR fare as a current price. That timestamp proves only when a command ran.

Correct: keep the raw fare in the seed provenance file, leave `verified_at` and `reference_as_of` null, and publish the stable OCR list only with an explicit reference label. Publish a dated price or duration only after checking a dated source.
