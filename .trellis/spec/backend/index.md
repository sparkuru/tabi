# Backend Development Guidelines

> Source-backed conventions for the Python API, persistence, and operational commands.

---

## Overview

The backend is a synchronous FastAPI application using Pydantic schemas,
SQLAlchemy 2 sessions, Alembic migrations, and PostgreSQL. These guidelines
describe the current implementation; the contract documents define the
product behavior that changes must preserve.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Routers, schemas, services, models, storage and tests | Documented |
| [Database Guidelines](./database-guidelines.md) | Sessions, transaction ownership, migrations and concurrency | Documented |
| [Error Handling](./error-handling.md) | HTTP errors, field validation, rollback and CLI failures | Documented |
| [Quality Guidelines](./quality-guidelines.md) | Ruff, isolated tests, privacy and API generation | Documented |
| [Logging Guidelines](./logging-guidelines.md) | Runtime diagnostics, transactional audits and CLI output | Documented |
| [MVP Contracts](./mvp-contracts.md) | Executable API, database, OCR seed and runtime boundaries | Implemented |
| [Runtime and Seed Data](../product/runtime-and-data.md) | Preview setup, administrator bootstrap, OCR provenance, seed commands and development checks | Documented |
| [Universal Checklist Contracts](./universal-checklist-contracts.md) | Versioned imports, atomic reuse, batch publication, empty completion and Web contracts | Implemented |

---

## Pre-Development Checklist

Read directory structure and quality guidance before backend changes. Read
database/error handling for persistence and API work, and logging guidance for
audits or operational commands. Read the MVP and universal checklist contracts
for affected product behavior; preview or seed operations also require the
runtime/data guide and the applicable Trellis Plus policies.

## Quality Check

Use the commands and change-specific test mapping in quality-guidelines.md.
Verify contract, migration and generated-client consistency for the affected
boundary. Documentation changes must retain real source references, working
links, and no template scaffolding.

---

**Language**: All documentation should be written in **English**.
