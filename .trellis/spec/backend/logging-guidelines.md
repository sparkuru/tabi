# Logging and Audit Guidelines

## Current runtime

The API has no project-level structured logger, request-ID middleware, or
configured logging formatter. `backend/app/main.py` assembles FastAPI routers;
`infra/docker/api-entrypoint.sh` runs Alembic and then Uvicorn. Runtime diagnostics
come from those processes and are inspected through Compose logs. Do not describe
JSON logging or a centralized observability service as existing infrastructure.

Operational output, persistent administrator audits, and user-facing HTTP errors
are separate mechanisms. Use the existing mechanism for the operation rather
than adding prints to successful request handlers.

## Persistent administrator audit

`backend/app/models/tables.py::AuditLog` stores `actor_id`, `action`,
`target_type`, `target_id`, optional `reason`, and a UTC `created_at`. Keep an audit
in the same transaction as its content mutation so a rollback leaves no false
success trail.

`backend/app/api/routes/admin.py::_audit` adds the row without committing;
`create_list` flushes the checklist to obtain its ID, records the action, and
commits once:

```python
db.add(checklist)
db.flush()
_audit(db, auth, "list.create", "list", checklist.id)
db.commit()
```

Other real examples:

- `backend/app/services/checklist_imports.py::import_document` writes
  `list.import-checklist`, with package key and item count, inside the atomic
  import transaction.
- `backend/app/seed_ocr.py::publish_reference` records `list.publish_ocr_reference`
  and JSON-encoded source/review/count metadata. This JSON is an audit reason,
  not a runtime log format.
- `backend/app/api/routes/users.py` audits system-administrator role changes;
  `backend/app/api/routes/media.py` audits cover changes.

Reuse the actor and action conventions of the surrounding handler. Do not commit
an audit before the corresponding content succeeds, or attach a fabricated
review status to unverified OCR data.

## CLI output and failures

`backend/app/bootstrap_admin.py` and `backend/app/seed_ocr.py` use `CLIStyle`
and `print` for terminal status. Success goes to stdout; caught operational
failures go to stderr and return nonzero. Seed validation/configuration errors
must not print a successful import result.

The existing optional seed diagnostic is deliberately small:

```python
if args.log:
    print(
        CLIStyle.color(
            f"Source: {manifest.source_file}; rows: "
            f"{sum(len(seed_list.rows) for seed_list in manifest.lists)}",
            CLIStyle.COLORS["CONTENT"],
        )
    )
```

The current CLI color helpers always emit ANSI sequences; they do not implement
TTY/`NO_COLOR` detection. That limitation is existing behavior, not an approved
refactor in this documentation task. Existing SQLAlchemy exception text may
contain database details: inspect and redact diagnostics before sharing them.

## Sensitive data and verification

Never add passwords, session/CSRF/share tokens, connection URLs, dotenv contents,
private notes, uploaded image bytes, or location payloads to routine diagnostics.
Bootstrap obtains its password with `getpass`; the entrypoint constructs and
exports the database URL without printing it. Audit reasons should contain the
minimum operation metadata, not a copy of a private request body.

For transactional audit behavior, inspect
`backend/tests/test_postgres_checklist.py::test_pg_late_failure_has_no_residue`
and `test_pg_import_unique_race`: they assert audit counts alongside all affected
content tables. For CLI source/count behavior, use `python -m app.seed_ocr
--check-only --log` on the bundled manifest; this validates without database
writes. General check commands are in [quality-guidelines.md](quality-guidelines.md).
