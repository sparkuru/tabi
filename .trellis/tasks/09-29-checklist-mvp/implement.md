# Implementation plan

1. Establish backend packaging, configuration, SQLAlchemy schema, initial migration, and local PostgreSQL test runtime.
2. Add auth/session/profile and protected ownership/role dependencies.
3. Add public lists/items and admin CRUD/publishing, search/filter/order, and progress calculations.
4. Add check-ins, edit/delete/history, idempotency, sharing, moderation, and audit.
5. Add private image ingestion/derivatives and reviewed import.
6. Build responsive frontend for guest browsing, auth, check-in form, history, share pages, and admin actions using generated API types.
7. Add local delivery setup, sample seed/import path, database and media backup/restore instructions.
8. Verify all acceptance scenarios with focused backend tests, frontend type/lint/build, integration smoke flow, and manual/mobile accessibility checks. Update Trellis specs with actual conventions once code exists.

## Review gates

- After schema/auth: migration + auth/authorization tests.
- After check-ins: duplicate submission, progress, privacy, archived-history tests.
- After frontend: generated client stays in sync, build passes, browser flow matches API.
- Final pass: full task artifacts and product specification against current code and runtime.
