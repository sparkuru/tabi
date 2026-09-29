"""OCR seed data and repeatable reference publication tests."""

import json
from hashlib import sha256
from pathlib import Path
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.tables import AuditLog, Checklist, ImportBatch, Item, User
from app.seed_ocr import SeedConflictError, load_manifest, publish_reference, seed_manifest


def _manifest_path() -> Path:
    """Locate the bundled seed data independently of the current directory."""
    return Path(__file__).resolve().parents[1] / "data" / "ocr_seed.json"


def _engine() -> Engine:
    """Create an isolated database with the complete domain schema."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return engine


def test_manifest_counts_and_source_trace() -> None:
    """Keep the curated rows aligned with the two known OCR tables."""
    manifest = load_manifest(_manifest_path())
    food, travel = manifest.lists
    assert len(food.rows) == 96
    assert len(travel.rows) == 76
    assert [row.number for row in food.rows] == list(range(1, 97))
    assert [row.number for row in travel.rows] == list(range(1, 25)) + list(range(55, 107))
    assert all(row.original_address and row.original_remark for row in food.rows[:70])
    assert all(row.original_district and row.source_section for row in food.rows[70:])
    assert all(not row.original_address and not row.original_remark for row in food.rows[70:])
    assert all(row.original_duration and row.original_fare for row in travel.rows)
    assert all(row.source_line > 0 and row.missing_fields for row in food.rows + travel.rows)
    assert all("verified_at" in row.missing_fields for row in food.rows + travel.rows)

    source_path = Path(__file__).resolve().parents[2] / manifest.source_file
    if source_path.is_file():
        source = source_path.read_bytes()
        assert sha256(source).hexdigest() == manifest.source_sha256
        source_lines = source.decode("utf-8").splitlines()
        for row in food.rows[:70]:
            cells = [
                cell.strip() for cell in source_lines[row.source_line - 1].strip("|").split("|")
            ]
            assert cells == [str(row.number), row.name, row.original_address, row.original_remark]
        for row in food.rows[70:]:
            assert source_lines[row.source_line - 1] == f"- {row.name}"
            assert row.original_district in row.source_section
            prior_heading = next(
                line
                for line in reversed(source_lines[: row.source_line - 1])
                if line.startswith("### ")
            )
            assert prior_heading[4:] == row.original_district
        for row in travel.rows:
            cells = [
                cell.strip() for cell in source_lines[row.source_line - 1].strip("|").split("|")
            ]
            assert cells == [
                str(row.number),
                row.name,
                row.original_duration,
                row.original_fare,
                row.original_specialties or "\u2014",
                "\u3001".join(row.original_attractions or []) or "\u2014",
            ]


def test_seed_is_repeatable_and_leaves_candidates_unpublished() -> None:
    """Repeated seeding keeps identities and never claims image or fact review."""
    engine = _engine()
    manifest = load_manifest(_manifest_path())
    with Session(engine) as db, db.begin():
        db.add(
            User(
                email="admin@example.com",
                display_name="Admin",
                password_hash="unused",
                role="system_admin",
            )
        )
    with Session(engine) as db, db.begin():
        first = seed_manifest(db, manifest, "admin@example.com")
    with Session(engine) as db, db.begin():
        second = seed_manifest(db, manifest, "admin@example.com")
        lists = list(db.scalars(select(Checklist).order_by(Checklist.sort_order)))
        items = list(db.scalars(select(Item)))
        assert [checklist.title for checklist in lists] == [row.title for row in manifest.lists]
        assert all(checklist.status == "draft" for checklist in lists)
        assert all(item.status == "draft" for item in items)
        assert all(item.verified_at is None for item in items)
        assert all(item.reference_as_of is None for item in items)
        assert all(item.latitude is None and item.longitude is None for item in items)
        assert all(
            item.source and "OCR Markdown transcription only" in item.source for item in items
        )
        food_items = [item for item in items if item.list_id == lists[0].id]
        assert all("\u5143" not in item.description for item in food_items)
        travel_items = [item for item in items if item.list_id == lists[1].id]
        travel_duration = {row.number: row.original_duration for row in manifest.lists[1].rows}
        assert all(
            travel_duration[item.sort_order] not in item.description for item in travel_items
        )
        assert db.scalar(select(func.count()).select_from(ImportBatch)) == 0
        assert db.scalar(select(func.count()).select_from(AuditLog)) == 0
    assert first.created_lists == 2
    assert first.created_items == 172
    assert second.existing_lists == 2
    assert second.existing_items == 172
    engine.dispose()


def test_duplicate_source_rows_roll_back_without_partial_seed() -> None:
    """A same-list normalized duplicate fails before creating any checklist."""
    engine = _engine()
    manifest = load_manifest(_manifest_path()).model_copy(deep=True)
    manifest.lists[0].rows[-1].name = manifest.lists[0].rows[0].name
    manifest.lists[0].rows[-1].original_address = manifest.lists[0].rows[0].original_address
    with Session(engine) as db, db.begin():
        db.add(
            User(
                email="admin@example.com",
                display_name="Admin",
                password_hash="unused",
                role="system_admin",
            )
        )
    with pytest.raises(SeedConflictError, match="Duplicate normalized item"):
        with Session(engine) as db, db.begin():
            seed_manifest(db, manifest, "admin@example.com")
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(Checklist)) == 0
        assert db.scalar(select(func.count()).select_from(Item)) == 0
    engine.dispose()


def test_existing_item_with_same_identity_is_not_silently_merged() -> None:
    """A preexisting same-list name and address needs administrator review."""
    engine = _engine()
    manifest = load_manifest(_manifest_path())
    with Session(engine) as db, db.begin():
        db.add(
            User(
                email="admin@example.com",
                display_name="Admin",
                password_hash="unused",
                role="system_admin",
            )
        )
    with Session(engine) as db, db.begin():
        seed_manifest(db, manifest, "admin@example.com")
    with Session(engine) as db, db.begin():
        food_list = db.scalar(select(Checklist).where(Checklist.title == manifest.lists[0].title))
        assert food_list is not None
        original = db.scalar(select(Item).where(Item.list_id == food_list.id, Item.sort_order == 1))
        assert original is not None
        replacement = Item(
            id=str(uuid4()),
            list_id=food_list.id,
            name=original.name,
            dedupe_key=original.dedupe_key,
            status="draft",
        )
        db.delete(original)
        db.flush()
        db.add(replacement)
    with pytest.raises(SeedConflictError, match="collides with an existing item"):
        with Session(engine) as db, db.begin():
            seed_manifest(db, manifest, "admin@example.com")
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(Item)) == 172
    engine.dispose()


def test_updated_manifest_appends_district_rows_without_replacing_admin_edits() -> None:
    """A database seeded from the earlier 146 rows gains only the 26 new rows."""
    engine = _engine()
    manifest = load_manifest(_manifest_path())
    prior_manifest = manifest.model_copy(deep=True)
    prior_manifest.lists[0].rows = prior_manifest.lists[0].rows[:70]
    with Session(engine) as db, db.begin():
        db.add(
            User(
                email="admin@example.com",
                display_name="Admin",
                password_hash="unused",
                role="system_admin",
            )
        )
    with Session(engine) as db, db.begin():
        first = seed_manifest(db, prior_manifest, "admin@example.com")
    assert first.created_items == 146
    with Session(engine) as db, db.begin():
        customized = db.scalar(
            select(Item).where(Item.sort_order == 1, Item.name == manifest.lists[0].rows[0].name)
        )
        assert customized is not None
        customized.description = "Administrator edited this entry"
        original_id = customized.id
    with Session(engine) as db, db.begin():
        upgrade = seed_manifest(db, manifest, "admin@example.com")
    assert upgrade.created_items == 26
    assert upgrade.existing_items == 146
    with Session(engine) as db:
        customized = db.get(Item, original_id)
        assert customized is not None
        assert customized.description == "Administrator edited this entry"
        assert db.scalar(select(func.count()).select_from(Item)) == 172
    engine.dispose()


def test_explicit_reference_publication_preserves_admin_changes() -> None:
    """Only untouched drafts publish, with an unverified OCR warning on both lists."""
    engine = _engine()
    manifest = load_manifest(_manifest_path())
    with Session(engine) as db, db.begin():
        db.add(
            User(
                email="admin@example.com",
                display_name="Admin",
                password_hash="unused",
                role="system_admin",
            )
        )
    with Session(engine) as db, db.begin():
        seed_manifest(db, manifest, "admin@example.com")
    with Session(engine) as db, db.begin():
        food_list = db.scalar(select(Checklist).where(Checklist.title == manifest.lists[0].title))
        assert food_list is not None
        food_list.summary = "Custom administrator note"
        first, second, third = list(
            db.scalars(
                select(Item).where(Item.list_id == food_list.id).order_by(Item.sort_order).limit(3)
            )
        )
        first.description = "Administrator edited this entry"
        second.status = "unpublished"
        third.sort_order = 900
        first_id, second_id, third_id = first.id, second.id, third.id
    with Session(engine) as db, db.begin():
        published = publish_reference(db, manifest, "admin@example.com")
    assert published.published_lists == 2
    assert published.published_items == 169
    assert published.skipped_items == 3
    with Session(engine) as db, db.begin():
        repeated = publish_reference(db, manifest, "admin@example.com")
        lists = list(db.scalars(select(Checklist).order_by(Checklist.sort_order)))
        assert all(checklist.status == "published" for checklist in lists)
        assert all(checklist.published_at is not None for checklist in lists)
        assert all(
            seed_list.publication_warning in checklist.summary
            for seed_list, checklist in zip(manifest.lists, lists, strict=True)
        )
        assert "Custom administrator note" in lists[0].summary
        assert lists[0].summary.count(manifest.lists[0].publication_warning) == 1
        assert db.get(Item, first_id).status == "draft"
        assert db.get(Item, second_id).status == "unpublished"
        assert db.get(Item, third_id).status == "draft"
        assert (
            db.scalar(select(func.count()).select_from(Item).where(Item.status == "published"))
            == 169
        )
        assert db.scalar(select(func.count()).select_from(ImportBatch)) == 0
        audit_rows = list(db.scalars(select(AuditLog)))
        assert len(audit_rows) == 2
        actor = db.scalar(select(User).where(User.email == "admin@example.com"))
        assert actor is not None
        assert all(row.actor_id == actor.id for row in audit_rows)
        assert all(row.action == "list.publish_ocr_reference" for row in audit_rows)
        audit_reasons = [json.loads(row.reason) for row in audit_rows]
        assert sum(reason["published_items"] for reason in audit_reasons) == 169
        assert sum(reason["skipped_items"] for reason in audit_reasons) == 3
        assert all(
            reason["review_status"] == "transcribed_markdown_only" for reason in audit_reasons
        )
    assert repeated.published_lists == 0
    assert repeated.published_items == 0
    assert repeated.skipped_items == 3
    engine.dispose()


def test_generated_legacy_summaries_are_replaced_on_publish_and_rerun() -> None:
    """Remove obsolete draft-only wording without changing customized summaries."""
    engine = _engine()
    manifest = load_manifest(_manifest_path())
    prior_manifest = manifest.model_copy(deep=True)
    prior_manifest.lists[0].rows = prior_manifest.lists[0].rows[:70]
    with Session(engine) as db, db.begin():
        db.add(
            User(
                email="admin@example.com",
                display_name="Admin",
                password_hash="unused",
                role="system_admin",
            )
        )
    with Session(engine) as db, db.begin():
        first_seed = seed_manifest(db, prior_manifest, "admin@example.com")
        lists = list(db.scalars(select(Checklist).order_by(Checklist.sort_order)))
        for seed_list, checklist in zip(manifest.lists, lists, strict=True):
            checklist.summary = seed_list.legacy_generated_summaries[0]
    assert first_seed.created_items == 146
    with Session(engine) as db, db.begin():
        upgraded_seed = seed_manifest(db, manifest, "admin@example.com")
        initial = publish_reference(db, manifest, "admin@example.com")
        lists = list(db.scalars(select(Checklist).order_by(Checklist.sort_order)))
        assert [checklist.summary for checklist in lists] == [
            seed_list.summary for seed_list in manifest.lists
        ]
    assert upgraded_seed.created_items == 26
    assert initial.published_lists == 2
    assert initial.published_items == 172
    with Session(engine) as db, db.begin():
        lists = list(db.scalars(select(Checklist).order_by(Checklist.sort_order)))
        for seed_list, checklist in zip(manifest.lists, lists, strict=True):
            checklist.summary = (
                f"{seed_list.legacy_generated_summaries[0]}\n{seed_list.publication_warning}"
            )
    with Session(engine) as db, db.begin():
        cleaned = publish_reference(db, manifest, "admin@example.com")
        lists = list(db.scalars(select(Checklist).order_by(Checklist.sort_order)))
        assert [checklist.summary for checklist in lists] == [
            seed_list.summary for seed_list in manifest.lists
        ]
        audit_rows = list(db.scalars(select(AuditLog)))
        assert len(audit_rows) == 4
        assert sum(json.loads(row.reason)["summary_updated"] for row in audit_rows) == 4
    assert cleaned.published_lists == 0
    assert cleaned.published_items == 0
    with Session(engine) as db, db.begin():
        repeated = publish_reference(db, manifest, "admin@example.com")
        assert db.scalar(select(func.count()).select_from(AuditLog)) == 4
    assert repeated.published_lists == 0
    assert repeated.published_items == 0
    engine.dispose()
