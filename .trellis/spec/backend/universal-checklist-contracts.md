# Universal checklist and completion contracts

## 1. Scope / Trigger

Use this contract for versioned checklist import, batch publication, empty records and direct completion. These are shared API/database/Web boundaries; preserve the existing OCR seed, reviewed-import route, record ownership and share/media revocation contracts in `mvp-contracts.md`.

## 2. Signatures

- `POST /api/admin/checklist-imports/preview`: `ChecklistDocument` → `ChecklistPreviewOut`, `200`; no content or audit writes.
- `POST /api/admin/checklist-imports`: same input → `{list_id, item_ids_by_key, reused}`; first import `201`, matching retry `200`, different content `409`.
- `GET /api/admin/lists/{list_id}` and admin list responses: `AdminChecklistOut` adds `total_item_count`, `draft_item_count`, `published_item_count`, `unpublished_item_count` without changing public `item_count`.
- `POST /api/admin/lists/{list_id}/publish-all`: `{list, published_count, already_published_count, skipped_unpublished_count}`, `200`.
- `POST /api/items/{item_id}/complete`: bodyless, `Idempotency-Key` length 16–80; `OwnCheckinOut`, `200` for creation and reuse.
- Additive migration head `a748bd701acf`: `checklist_imports` stores globally unique `package_key`, `format_version`, original `payload_hash`, `list_id`, `item_ids_by_key`, operator and timestamp. No old IDs or records are rewritten.

## 3. Contracts

The file is UTF-8 JSON with `format="tabi.checklist"`, integer `version=1`, a stable `key`, `list.title` and 1–200 `items`, each with `key` and `name`. Keys match `^[a-z0-9][a-z0-9._-]*$`, maximum 80 characters. See the authoritative `docs/checklist-format.md`, generated `docs/checklist.schema.json` and four `backend/data/examples/` files for field definitions. Unknown fields, coerced types, IDs, media keys and publication/user-record state are rejected. Transport buffers at most 2 MiB before decoding, including chunked requests.

Validate both input and effective storage values: URLs must fit 2048 characters after normalization, normalized name/address identity must fit 512, and import sort values fit signed 32-bit SQL integers. Coordinates and dated reference text follow existing paired-field rules. Same-file duplicate keys/name-address identities, unknown/self/duplicate relations return located errors before writes.

Canonicalization resolves default sorting by array index, inherits top-level source into items and clears the consumed top-level source before hashing. Sorted-object UTF-8 JSON over effective validated fields produces the SHA-256 digest. Whitespace/object field order and equivalent source inheritance do not change it; item array order can. Compare the original digest, never current administrator edits. A retry returns original IDs without restoring content/status or touching user records. All content, links, relations, import identity and audit commit together. The DB unique constraint is the concurrent arbiter; rollback the loser transaction before reading/reusing the winner.

Every admin preview/import/publication request validates role and CSRF. Preview is not an authorization token; import validates again. Batch publication locks the list/items, publishes only drafts, leaves intentionally unpublished items alone, and rejects a list with no draft/published items. Existing single-level publication and reviewed OCR semantics remain available.

An active empty `Checkin` is a valid completed record. Creation/editing may omit or clear note/photos; removing the last photo is valid. Direct completion locks the item before checking public state and active records, creates a private empty row only if none exists, and otherwise returns an existing row unchanged. Its operation fingerprint distinguishes completion from deliberate record creation. User/key uniqueness protects retries; deleted-key reuse conflicts. Deliberate new records with distinct keys remain separate; progress still counts distinct active item IDs. Deleting the last record restores incomplete state. Privacy, hidden/deleted shares and original-photo permissions retain existing checks.

Frontend raw import sends exact source text through the generated client's transport and generated response types so malformed JSON diagnostics and byte limits reach the server. Input changes invalidate preview. Generate API files from actual `app.openapi()`; do not hand-edit generated SDKs. Vite emits/serves the six download assets directly from authoritative docs/examples; Docker copies those sources into the same relative layout.

Browser request keys use shared `createRequestKey()` with `crypto.getRandomValues` (32 hex characters), which works on the supported HTTP preview. Failed completion retains its key; confirmed success rotates it. Catalog projections control completion state. Guest completion accepts raw and normalized router flags, consumes the flag by URL replacement, then runs once. Explicit textarea `htmlFor`/`id` labels remain stable after populated values.

## 4. Validation & Error Matrix

| Condition | Result |
| --- | --- |
| Missing login / non-admin or wrong CSRF | `401` / `403` |
| JSON over 2 MiB | `413` before JSON decoding |
| Invalid UTF-8/JSON, fields/version/type, duplicate/local relation, normalized storage bounds | `422` with field path; no partial content |
| Same package key with different effective content | `409`; no overwrite or republish |
| No draft/published items in batch publication | `422`; no state change |
| Direct completion on an unpublished/missing item | `404` |
| Reused key for another operation/content or deleted record | `409` |
| Valid empty record or last-photo removal | Success; counts as completed |
| Revoked/hidden/deleted public share or unauthorized original photo | `404` |

## 5. Good / Base / Bad Cases

- Base: import the minimal example, inspect draft counts, explicitly publish, then privately complete a no-location item without note/photos.
- Good: retry reordered/pretty JSON after admin edits; original IDs/content/status remain. Complete twice concurrently with different keys; one private record and one completed item remain.
- Bad: auto-overwrite a changed file, republish removed items, require fake location/OCR review data, or return a database error for a short Unicode value whose normalized representation exceeds storage.

## 6. Tests Required

- `backend/tests/test_checklist_format.py`: located errors, strict/normalized bounds, examples/Schema equality, preview no-write, permission/CSRF, reuse/conflict/retained edits, batch counts/skip, empty completion/content/last-photo/progress and revoked sharing.
- `backend/tests/test_postgres_checklist.py`: force concurrent absent-identity reads for equal/different payloads, verify one content/audit set, inject a late SQL failure and verify zero residue, run distinct-key completion sessions and verify one private row. Use explicit `TABI_TEST_DATABASE_URL` and UUID-owned schemas; SQLite cannot prove locking.
- Existing core/media/OCR regressions remain required. After model changes, isolated PostgreSQL `alembic upgrade head` / `alembic check`; after API changes, regenerate OpenAPI/HeyAPI and run type/build.
- `frontend/e2e/`: both configured viewports run actual import/publication/download/privacy/media flows, guest one-shot handoff, same-mounted re-completion, original 172 OCR ID/source/state preservation, errors/busy/empty states, labels/keyboard/44px targets and overflow. Profile/commands live in `../trellis-plus/validation.md`.

## 7. Wrong vs Correct

Wrong: check only source URL length or original name length, rely on SQLite for row locks, use `crypto.randomUUID()` on every HTTP host, or hash current edited database content on retries.

Correct: validate normalized storage values with located errors, exercise concurrent production transactions on isolated PostgreSQL, use the shared secure browser key helper, and compare the immutable import digest. Keep new empty records when considering rollback; older code's nonempty assumption is not a reason to delete history.
