# Backend Directory Structure

## Scope and layout

The API is a Python 3.12+ FastAPI application rooted at `backend/`, with imports
under `app`. Runtime dependencies, Ruff settings and pytest discovery live in
`backend/pyproject.toml`.

```text
backend/
├── app/
│   ├── main.py                 # FastAPI assembly, routers and health endpoint
│   ├── api/
│   │   ├── deps.py             # Session, CSRF and role dependencies
│   │   ├── import_body_limit.py
│   │   └── routes/             # auth, catalog, checkins, admin, media, users, imports
│   ├── core/                  # Settings, password/token helpers, rate limiter
│   ├── db/                    # Declarative base, engine and request sessions
│   ├── models/tables.py        # SQLAlchemy entities and database constraints
│   ├── schemas/               # Pydantic input and output contracts
│   ├── services/              # Projections, normalization and reusable import logic
│   ├── storage/images.py      # Image validation, derivatives and private paths
│   ├── bootstrap_admin.py     # Interactive first-admin CLI
│   └── seed_ocr.py             # Stable-ID OCR seed and reference publication CLI
├── migrations/
│   ├── env.py                 # Configured connection and model metadata
│   └── versions/              # Ordered Alembic revisions
├── data/
│   ├── ocr_seed.json           # Provenance-preserving OCR input
│   └── examples/              # Four universal-checklist JSON examples
├── tests/                     # API, import, media, seed and PostgreSQL tests
├── alembic.ini
└── pyproject.toml
```

Container assembly and service lifecycle remain outside this package in
`infra/docker/`, `infra/docker-compose.yml`, `preview.sh`, `dev.sh` and `hako`.
Private uploaded files live beneath the configured `TABI_MEDIA_ROOT`, not in
`backend/data/` or a public static directory.

## Where to put a change

| Responsibility | Existing examples |
| --- | --- |
| HTTP paths, dependency injection, status codes | `backend/app/api/routes/catalog.py`, `checkins.py`, `checklist_imports.py` |
| Request/response validation and field types | `backend/app/schemas/catalog.py`, `checkins.py`, `checklist_format.py` |
| Reusable projections and domain operations | `backend/app/services/catalog.py`, `checkins.py`, `checklist_imports.py` |
| Persisted columns, relationships and constraints | `backend/app/models/tables.py`; matching revisions in `backend/migrations/versions/` |
| Configuration and shared infrastructure | `backend/app/core/config.py`, `security.py`, `rate_limit.py`, `backend/app/db/session.py` |
| Image processing and storage paths | `backend/app/storage/images.py`; authorization stays in `backend/app/api/routes/media.py` |

This is not a repository-layer architecture: routes currently perform queries
and own several write transactions. For example, `checkins.py` owns record
creation/completion, while `services/checklist_imports.py` owns the atomic import
transaction. Follow the nearby implementation rather than adding an abstraction
solely to move existing code.

`backend/app/main.py` registers each router with `/api`. Route modules supply
their own path or local prefix. A new route module must be explicitly registered;
placing a file in `routes/` does not expose endpoints automatically.

## Examples and naming

From `backend/app/api/routes/checklist_imports.py`, a handler receives validated
data, request authorization and a shared database dependency:

```python
def preview_checklist(
    payload: ChecklistDocument,
    auth: Annotated[AuthContext, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> ChecklistPreviewOut:
```

The handler delegates normalization to `normalize_document`; the import handler
delegates its transaction to `import_document` in
`backend/app/services/checklist_imports.py`. Another example is
`backend/app/api/routes/catalog.py`, which calls projection helpers from
`backend/app/services/catalog.py` and returns schemas from
`backend/app/schemas/catalog.py`.

Use snake_case module/function names, PascalCase classes, and underscore-prefixed
private helpers, as in `checklist_imports.py`, `ChecklistDocument` and
`_own_record` in `backend/app/api/routes/checkins.py`. Tests use `test_*.py`
files and `test_*` functions; fixtures are shared through
`backend/tests/conftest.py`.

## Common mistakes and verification

- Do not put ORM models in response schemas or expose entities directly instead
  of the existing owner/public projections.
- Do not relocate media into source-controlled data or bypass
  `storage/images.py` to create another image-processing path.
- Keep the reviewed OCR import, universal JSON import and stable-ID seed distinct:
  `api/routes/admin.py`, `services/checklist_imports.py` and `seed_ocr.py` have
  different validation/provenance contracts.
- A model change needs a migration; an API schema change needs regenerated Web
  API artifacts. See [database guidelines](database-guidelines.md) and
  [runtime and data](../product/runtime-and-data.md).

For Python changes use `./hako python ruff check app tests migrations` and
`./hako python ruff format --check app tests migrations`, then the relevant tests.
For directory documentation alone, check referenced paths and `git diff --check`;
application tests are not evidence required by a path-only edit.
