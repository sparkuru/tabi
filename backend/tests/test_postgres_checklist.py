"""Real PostgreSQL race/rollback tests, isolated in a generated disposable schema.

Set TABI_TEST_DATABASE_URL explicitly; SQLite cannot prove these contracts.
The fixture drops only its own randomly named schema, never public or app data.
"""

import os
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from threading import Barrier, local
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, event, func, select, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import AuthContext
from app.api.routes.checkins import complete_item
from app.db.base import Base
from app.models.tables import (
    AuditLog,
    Checkin,
    Checklist,
    ChecklistImport,
    Item,
    ItemLink,
    ItemRelation,
    User,
)
from app.schemas.checklist_format import ChecklistDocument
from app.services import checklist_imports
from tests.test_checklist_format import document


@pytest.fixture
def pg_engine() -> Iterator[Engine]:
    """Create all tables in a private generated schema on the explicit test DB."""
    url = os.environ.get("TABI_TEST_DATABASE_URL")
    if not url:
        pytest.skip("TABI_TEST_DATABASE_URL required for actual PostgreSQL concurrency")
    control = create_engine(url)
    if control.dialect.name != "postgresql":
        control.dispose()
        pytest.fail("PostgreSQL required; SQLite must not count as concurrency evidence")
    schema = "test_checklist_" + uuid4().hex
    with control.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_engine(url, connect_args={"options": f"-csearch_path={schema}"})
    try:
        Base.metadata.create_all(engine)
        yield engine
    finally:
        engine.dispose()
        with control.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        control.dispose()


def owner(engine: Engine) -> str:
    """Insert a synthetic account without any production authentication state."""
    with Session(engine) as db:
        user = User(
            email="pg-fixture@example.com",
            display_name="PG fixture",
            password_hash="unused",
            role="content_admin",
        )
        db.add(user)
        db.commit()
        return user.id


def synchronize_initial_read(monkeypatch: pytest.MonkeyPatch) -> None:
    """Make both requests observe absence before competing on the unique key."""
    initial = Barrier(2)
    thread_state = local()
    original = checklist_imports.find_import

    def racing_read(db: Session, key: str) -> ChecklistImport | None:
        """Pause each thread's initial read only; rollback reads are unblocked."""
        result = original(db, key)
        if not getattr(thread_state, "read", False):
            thread_state.read = True
            initial.wait(timeout=10)
        return result

    monkeypatch.setattr(checklist_imports, "find_import", racing_read)


@pytest.mark.parametrize("changed", [False, True])
def test_pg_import_unique_race(
    pg_engine: Engine, monkeypatch: pytest.MonkeyPatch, changed: bool
) -> None:
    """Race losers reuse equal content, or conflict; no orphan list/item/audit remains."""
    actor_id = owner(pg_engine)
    synchronize_initial_read(monkeypatch)
    first = document()
    second = deepcopy(first)
    if changed:
        second["list"]["title"] = "Different content"

    def run(payload: dict) -> dict:
        """Execute the production import transaction on an independent connection."""
        with Session(pg_engine) as db:
            try:
                return checklist_imports.import_document(
                    db, ChecklistDocument.model_validate(payload), actor_id
                ).model_dump()
            except HTTPException as error:
                return {"status": error.status_code}

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(run, [first, second]))
    successful = [entry for entry in outcomes if "list_id" in entry]
    if changed:
        assert len(successful) == 1
        assert {"status": 409} in outcomes
    else:
        assert len(successful) == 2
        assert successful[0]["list_id"] == successful[1]["list_id"]
        assert sorted(entry["reused"] for entry in successful) == [False, True]
        assert successful[0]["item_ids_by_key"] == successful[1]["item_ids_by_key"]
    with Session(pg_engine) as db:
        for model, count in (
            (Checklist, 1),
            (Item, 2),
            (ChecklistImport, 1),
            (AuditLog, 1),
            (ItemLink, 1),
            (ItemRelation, 1),
        ):
            assert db.scalar(select(func.count()).select_from(model)) == count


def test_pg_late_failure_has_no_residue(pg_engine: Engine) -> None:
    """An actual late NOT NULL failure rolls back every content table together."""
    actor_id = owner(pg_engine)
    with Session(pg_engine) as db:

        def poison_identity(session: Session, context: object, instances: object) -> None:
            """Fail only after list, items and links have been flushed."""
            for record in session.new:
                if isinstance(record, ChecklistImport):
                    record.payload_hash = None

        event.listen(db, "before_flush", poison_identity)
        with pytest.raises(IntegrityError):
            checklist_imports.import_document(
                db, ChecklistDocument.model_validate(document()), actor_id
            )
        event.remove(db, "before_flush", poison_identity)
        for model in (Checklist, Item, ItemLink, ItemRelation, ChecklistImport, AuditLog):
            assert db.scalar(select(func.count()).select_from(model)) == 0
        assert not checklist_imports.import_document(
            db, ChecklistDocument.model_validate(document()), actor_id
        ).reused


def test_pg_completion_row_lock_distinct_keys(pg_engine: Engine) -> None:
    """Concurrent complete requests with distinct keys create exactly one private row."""
    actor_id = owner(pg_engine)
    with Session(pg_engine) as db:
        result = checklist_imports.import_document(
            db, ChecklistDocument.model_validate(document()), actor_id
        )
        item_id = result.item_ids_by_key["functions"]
        db.get(Checklist, result.list_id).status = "published"
        db.get(Item, item_id).status = "published"
        db.commit()
    start = Barrier(2)

    def run(key: str) -> dict:
        """Call the real handler with independent PostgreSQL sessions."""
        with Session(pg_engine) as db:
            user = db.get(User, actor_id)
            auth = AuthContext(user=user, session=None)
            start.wait(timeout=10)
            return complete_item(
                item_id=item_id, idempotency_key=key, auth=auth, db=db
            ).model_dump()

    with ThreadPoolExecutor(max_workers=2) as pool:
        records = list(pool.map(run, [uuid4().hex, uuid4().hex]))
    assert records[0]["id"] == records[1]["id"]
    assert all(record["visibility"] == "private" and record["note"] is None for record in records)
    with Session(pg_engine) as db:
        assert db.scalar(select(func.count()).select_from(Checkin)) == 1
