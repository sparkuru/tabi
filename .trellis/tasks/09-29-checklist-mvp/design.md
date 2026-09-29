# Design

## Boundaries

- `backend/`: FastAPI, Pydantic request/response contracts, SQLAlchemy models, Alembic migrations, PostgreSQL. Auth uses secure password hashes and server-controlled sessions. Routes call focused domain functions; authorization remains in the API/service boundary.
- `frontend/`: React + TypeScript + TanStack Router/Query, Tailwind and shadcn-style components. The API client is generated from FastAPI OpenAPI with HeyAPI and never hand-edited.
- `infra/`: Docker Compose runs PostgreSQL, API, and web behind one HTTPS-capable reverse-proxy boundary for local/production adaptation. Media live in private storage with protected reads.

## Core data flow

`list -> item -> checkin` uses immutable item/list IDs for relationships. Creating a check-in validates ownership of the idempotency key, active item status, note/media presence, experienced time, and optional coordinates; a unique `(user_id, idempotency_key)` constraint makes retries return the original record. Reads group active check-ins by item and count distinct item IDs for progress. A soft delete keeps history relationships but excludes deleted records from progress and public results.

Public record and share endpoints use dedicated response schemas that omit private position and media originals. Visibility checks run on every request; the share ID is a stable random identifier, not authorization. A moderation hide takes immediate effect. Photos are validated and processed before becoming visible, stripped of EXIF, and served only through authorized or public derivative endpoints.

List/item publication is independent of personal history. Public browsing filters published content. Owner history joins archived content by ID and labels it unavailable to the public. Admin edits and hides write audit records.

## Compatibility and migration

Alembic migrations create and evolve the PostgreSQL schema. The user confirmed `archive/ocr.md` is the complete first-batch source. A tracked seed manifest preserves all 172 rows and source line numbers; repeated runs append only missing stable IDs. Explicit `--publish-reference` exposes untouched rows with source and outdated-content warnings, leaving fact verification dates empty. The separate reviewed import endpoint accepts later individually reviewed rows with provenance.

## Risks and rollback

Auth, visibility, upload, and idempotency boundaries require focused tests. Changes are reversible while unpublished; migration rollback should be tested against an empty local database before production data exists. Imported media and database must be backed up together.
