# Backend Quality Guidelines

## Tooling and local conventions

`backend/pyproject.toml` requires Python 3.12+, configures pytest under `tests/`,
and uses Ruff with a 100-column limit, `py312` target, and `E`, `F`, `I`, `UP`,
`B` lint rules. The repository does not configure mypy or Pyright. Functions
normally carry type annotations and short docstrings, as demonstrated by
`backend/app/api/deps.py`, `backend/app/services/checklist_imports.py`, and
`backend/app/storage/images.py`.

Run the existing Docker development commands from the repository root:

```sh
./hako python ruff check app tests migrations
./hako python ruff format --check app tests migrations
./hako python pytest -q
```

The equivalent host commands, dependency setup, PostgreSQL/browser checks,
and actual-preview acceptance are documented in
[the validation profile](../trellis-plus/validation.md) and
[the development profile](../trellis-plus/development.md). Documentation-only
changes require source/link/placeholder checks and `git diff --check`, not an
unrelated full application run. Report which checks actually ran.

## Request and transaction review

- Use Pydantic request schemas and declared FastAPI response models. See
  `backend/app/schemas/checklist_format.py` and the import/catalog routers.
- Reuse `backend/app/api/deps.py` for authentication, administrator roles and
  mutation CSRF checks. A hidden frontend control is not server authorization.
- Keep import identity, content, relations and audit atomic; roll back before
  resolving uniqueness conflicts. Read
  [database-guidelines.md](database-guidelines.md) and
  [universal-checklist-contracts.md](universal-checklist-contracts.md).
- Preserve private-by-default records, ownership checks, revoked-share 404s,
  thumbnail/original access distinctions, historical snapshots and OCR provenance.
  These are tested behavior, not optional cleanup targets.
- API changes require exporting actual `app.openapi()` to
  `frontend/openapi.json` and regenerating the client. Never hand-edit generated
  TypeScript or let the schema and consumer drift.

## Isolated test patterns

`backend/tests/conftest.py::client` uses a per-test SQLite file and media
directory, overrides `get_db`, replaces auth/media limiters, and clears settings
caches. Reuse this fixture rather than connecting tests to the preview database
or disabling the real application's security rules.

`backend/tests/test_core_flow.py` provides `register`, `csrf`, `create_list`,
and `create_item` helpers. Its repeat-checkin test verifies both record identity
and aggregate behavior:

```python
assert repeated.json()["id"] == first.json()["id"]
assert client.get(f"/api/lists/{first_list}").json()["completed_count"] == 1
assert client.get(f"/api/lists/{first_list}").json()["record_count"] == 2
```

Follow existing behavior-focused coverage:

| Change | Relevant source of assertions |
| --- | --- |
| Auth, CSRF, ownership, sharing, history | `backend/tests/test_core_flow.py` |
| Media privacy, EXIF stripping, reviewed import, moderation | `backend/tests/test_media_import.py` |
| JSON normalization, preview, import reuse/conflict, empty completion | `backend/tests/test_checklist_format.py` |
| Stable seed IDs, source transcription, reference publication | `backend/tests/test_seed_ocr.py` |
| Unique races, row locks, late rollback | `backend/tests/test_postgres_checklist.py` |

The PostgreSQL fixture requires explicit `TABI_TEST_DATABASE_URL`, rejects a
non-PostgreSQL connection, and creates/drops only its own UUID-named schema.
Without that variable those tests skip; SQLite success must not be reported as
PostgreSQL concurrency evidence. Migration changes also need Alembic upgrade/check
against an isolated PostgreSQL instance, not the user's preview data.

## Common mistakes to avoid

Do not count HTTP 200 as proof of authorization or transactional correctness;
assert forbidden responses and resulting database state. Do not weaken rate
limits, remove assertions, mock the transaction under test, or use shared real
accounts to make tests pass. Do not log private payloads or secrets when debugging.

Review the diff against the applicable contracts and regenerate API consumers
when necessary. A formatter or successful build proves only its own boundary;
browser coverage, database behavior and real-preview acceptance retain the
separate requirements in the validation profile. No CI pipeline is currently
configured, so local checks must not be described as CI results.
