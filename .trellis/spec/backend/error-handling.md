# Backend Error Handling

## Error model and response shape

There is no application-wide custom exception hierarchy or JSON error wrapper.
`backend/app/main.py` uses FastAPI's default handlers. Routes, dependencies and
some services raise `HTTPException`; Pydantic input validation produces `422`
with located error entries. `backend/app/api/import_body_limit.py` returns
`JSONResponse` directly because it rejects requests before FastAPI decoding.

Expected business errors usually have a string `detail`, for example the
dependency in `backend/app/api/deps.py`:

```python
if auth is None:
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Login required")
```

The response is `{"detail": "Login required"}`. Validation errors have a list
under `detail`. Same-document import validation deliberately matches that shape;
`_field_error` in `backend/app/services/checklist_imports.py` returns:

```python
return HTTPException(422, [{"type": "value_error", "loc": ["body", *path], "msg": message}])
```

The `path` identifies the offending field/index, for example
`["items", index, "related_keys", related_index]`. Keep these locations usable by
the admin UI instead of replacing them with a generic validation message.

## Status conventions

| Condition | Response and evidence |
| --- | --- |
| Missing/expired account session | `401`; `backend/app/api/deps.py` |
| Invalid CSRF or insufficient role | `403`; `backend/app/api/deps.py` |
| Missing/unpublished content, revoked share, another user's record or inaccessible media | `404`; `backend/app/api/routes/catalog.py`, `checkins.py`, `media.py`, `backend/app/services/checkins.py` |
| Duplicate email/item/relation, changed retry payload or import key content | `409`; `backend/app/api/routes/auth.py`, `admin.py`, `checkins.py`, `backend/app/services/checklist_imports.py` |
| Oversized image or universal import body | `413`; `backend/app/storage/images.py`, `backend/app/api/import_body_limit.py` |
| Invalid fields/JSON/UTF-8, relationship or reviewed-import data | `422`; schemas, `backend/app/services/checklist_imports.py`, `backend/app/api/import_body_limit.py`, `backend/app/api/routes/admin.py` |
| Sliding-window rate limit | `429` with `Retry-After`; `backend/app/core/rate_limit.py` |

For owned objects, `_own_record` in `backend/app/api/routes/checkins.py` uses
`404` for missing, deleted or foreign records. `public_checkin` in
`backend/app/services/checkins.py` also returns `404` when visibility is revoked.
Preserve this distinction from role checks returning `403`.

## Catching failures and transaction cleanup

- Handle the known failure at its existing boundary. Registration translates
  duplicate persistence to `409` after `db.rollback()` in
  `backend/app/api/routes/auth.py`; admin writes use the same rollback/translation
  pattern in `backend/app/api/routes/admin.py`.
- Retry-aware writes roll back and look up the winner before deciding reuse or
  conflict. Examples are `create_checkin`/`complete_item` in
  `backend/app/api/routes/checkins.py` and `import_document` in
  `backend/app/services/checklist_imports.py`. The import service re-raises an
  integrity error if no winning package identity exists; it does not label every
  SQL failure as a content conflict.
- `get_db` in `backend/app/db/session.py` catches request exceptions to roll back
  and re-raise, not to return success. Unexpected errors are not converted into
  successful empty responses or exposed as raw database details by API code.
- `store_image` in `backend/app/storage/images.py` converts image decoding/type
  errors into `422` and oversized uploads into `413`. Filesystem write failures
  remove the partial original/thumbnail and re-raise; `_save_jpeg` cleans its
  temporary path in `finally`.

Actual duplicate-email handling in `backend/app/api/routes/auth.py`:

```python
except IntegrityError as exc:
    db.rollback()
    raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered") from exc
```

Validation belongs before writes when possible. Universal preview is read-only,
and import validates again; a successful preview does not bypass later validation
or authorization.

## Diagnostics and command failures

Expected API errors are not separately logged by these handlers; runtime request
and failure diagnostics currently come from Uvicorn. Do not claim an existing
structured application logger or correlation-ID middleware. See
[logging guidelines](logging-guidelines.md).

CLI behavior differs from HTTP: `backend/app/bootstrap_admin.py` prints invalid
input/database failures to stderr and returns nonzero status;
`backend/app/seed_ocr.py` reports validation/conflict/database failures and rolls
back database writes. The bootstrap CLI currently includes the SQLAlchemy
exception text in its database diagnostic, so treat captured output as potentially
sensitive rather than claiming all command diagnostics are sanitized.

## Common mistakes and verification

- Do not swallow an unexpected exception, commit after a failed flush without
  rollback, or turn a partial write into a normal success response.
- Do not return `403` or entity details for a foreign/private record where the
  existing contract requires `404`.
- Preserve string business errors and list validation errors; avoid assuming
  every `detail` value is a string.
- Keep the import body bound before JSON decoding, including chunked bodies;
  invalid UTF-8 must remain a located `422`, not an unhandled decode exception.

Relevant behavior is covered by `backend/tests/test_core_flow.py` (ownership,
share revocation, rate limit), `backend/tests/test_media_import.py` (media and
moderation) and `backend/tests/test_checklist_format.py` (field locations,
permissions, malformed/oversized input, conflicts and rollback). For import
errors, run `./hako python pytest -q tests/test_checklist_format.py` after changing
that behavior. Concurrency and late SQL failures additionally require the isolated
PostgreSQL tests described in [database guidelines](database-guidelines.md).
For this documentation alone, verify source references and `git diff --check`.
