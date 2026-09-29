"""Load the bundled OCR transcription as checklist reference material."""

import argparse
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal, Self
from uuid import NAMESPACE_URL, uuid5

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.models.tables import AuditLog, Checklist, Item, User
from app.schemas.catalog import ItemWrite
from app.services.imports import item_dedupe_key


class SeedConflictError(ValueError):
    """A seed identity conflicts with existing administrator-managed content."""


class SeedRow(BaseModel):
    """One OCR Markdown table row, including fields withheld from public data."""

    model_config = ConfigDict(extra="forbid")

    number: int = Field(ge=1)
    source_line: int = Field(ge=1)
    source_section: str | None = None
    name: str = Field(min_length=1, max_length=160)
    original_address: str | None = None
    original_remark: str | None = None
    original_district: str | None = None
    original_duration: str | None = None
    original_fare: str | None = None
    original_specialties: str | None = None
    original_attractions: list[str] | None = None
    missing_fields: list[str] = Field(min_length=1, max_length=20)


class SeedList(BaseModel):
    """One checklist and its OCR candidates."""

    model_config = ConfigDict(extra="forbid")

    key: Literal["beijing_food", "weekend_travel"]
    title: str = Field(min_length=1, max_length=160)
    summary: str = Field(max_length=5000)
    legacy_generated_summaries: list[str] = Field(default_factory=list, max_length=5)
    category: str = Field(min_length=1, max_length=80)
    section: str = Field(min_length=1)
    source_note_prefix: str = Field(min_length=1)
    publication_warning: str = Field(min_length=1, max_length=5000)
    specialty_note_prefix: str | None = None
    suggested_action: str = Field(min_length=1)
    rows: list[SeedRow] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_rows(self) -> Self:
        """Ensure row identities and source shapes are unambiguous."""
        expected = (
            list(range(1, 97))
            if self.key == "beijing_food"
            else list(range(1, 25)) + list(range(55, 107))
        )
        if [row.number for row in self.rows] != expected:
            raise ValueError(f"Unexpected source row numbers for {self.key}")
        if len({row.source_line for row in self.rows}) != len(self.rows):
            raise ValueError(f"Repeated source line in {self.key}")
        for row in self.rows:
            if self.key == "beijing_food" and row.number <= 70:
                if not (row.original_address and row.original_remark):
                    raise ValueError(f"Incomplete food table row {row.number}")
            if self.key == "beijing_food" and row.number > 70:
                if not (row.original_district and row.source_section):
                    raise ValueError(f"Incomplete district food row {row.number}")
                if row.original_address or row.original_remark:
                    raise ValueError(f"Invented address or remark for district row {row.number}")
            if self.key == "weekend_travel" and not (
                row.original_duration and row.original_fare and row.original_attractions is not None
            ):
                raise ValueError(f"Incomplete travel source row {row.number}")
        return self


class SeedManifest(BaseModel):
    """Frozen OCR transcription; no original image or current-fact review is claimed."""

    model_config = ConfigDict(extra="forbid")

    schema_version: Literal[2]
    source_file: str = Field(min_length=1, max_length=1000)
    source_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    review_status: Literal["transcribed_markdown_only"]
    lists: list[SeedList] = Field(min_length=2, max_length=2)

    @model_validator(mode="after")
    def validate_lists(self) -> Self:
        """Require exactly the two agreed initial themes."""
        if [seed_list.key for seed_list in self.lists] != ["beijing_food", "weekend_travel"]:
            raise ValueError("Manifest must contain food and travel lists in that order")
        return self


class SeedResult(BaseModel):
    """Number of rows created or left in place on one run."""

    created_lists: int = 0
    created_items: int = 0
    existing_lists: int = 0
    existing_items: int = 0


class PublicationResult(BaseModel):
    """Reference rows made public or deliberately left in their current state."""

    published_lists: int = 0
    published_items: int = 0
    already_published_lists: int = 0
    already_published_items: int = 0
    skipped_lists: int = 0
    skipped_items: int = 0


def load_manifest(path: Path) -> SeedManifest:
    """Decode and validate the curated JSON before opening a write transaction."""
    return SeedManifest.model_validate_json(path.read_text(encoding="utf-8"))


def _stable_id(kind: str, key: str) -> str:
    """Keep OCR row identity stable across repeated seed runs."""
    return str(uuid5(NAMESPACE_URL, f"tabi:ocr:v1:{kind}:{key}"))


def _item_write(manifest: SeedManifest, seed_list: SeedList, row: SeedRow) -> ItemWrite:
    """Map only nonvolatile, attributed OCR content into a draft item."""
    section = row.source_section or f"{seed_list.section} #{row.number}"
    source = (
        f"{manifest.source_file}:{row.source_line} [{section}; OCR Markdown transcription only]"
    )
    if seed_list.key == "beijing_food":
        address = row.original_address
        district = row.original_district
        if address is None and district is None:
            raise ValueError(f"Missing food place for source row {row.number}")
        address_is_specific = bool(address and any(character.isdigit() for character in address))
        description = ""
        if row.original_remark and "\u5143" not in row.original_remark:
            description = f"{seed_list.source_note_prefix}{row.original_remark}"
        return ItemWrite(
            name=row.name,
            description=description,
            category=seed_list.category,
            suggested_action=seed_list.suggested_action,
            sort_order=row.number,
            place_kind="physical" if address_is_specific else "area",
            place_name=row.name,
            address=address if address_is_specific else None,
            area=None if address_is_specific else district or address,
            source=source,
            missing_fields=row.missing_fields,
        )
    attractions = row.original_attractions or []
    return ItemWrite(
        name=row.name,
        description=(
            f"{seed_list.source_note_prefix}{'\u3001'.join(attractions)}" if attractions else ""
        ),
        category=seed_list.category,
        suggested_action=seed_list.suggested_action,
        recommendation=(
            f"{seed_list.specialty_note_prefix}{row.original_specialties}"
            if seed_list.specialty_note_prefix and row.original_specialties
            else None
        ),
        sort_order=row.number,
        place_kind="area",
        place_name=row.name,
        area=row.name,
        source=source,
        missing_fields=row.missing_fields,
    )


def seed_manifest(db: Session, manifest: SeedManifest, owner_email: str) -> SeedResult:
    """Add missing draft rows without editing existing administrator changes.

    The caller owns commit or rollback. No reviewed import batch or actor audit
    is created because the original images and current facts were not reviewed.
    """
    owner = db.scalar(select(User).where(User.email == owner_email.strip().lower()))
    if owner is None or owner.role != "system_admin":
        raise SeedConflictError("An existing system administrator owner is required")
    result = SeedResult()
    for seed_list in manifest.lists:
        prepared = [(row, _item_write(manifest, seed_list, row)) for row in seed_list.rows]
        keys = [item_dedupe_key(item.name, item.address) for _, item in prepared]
        if len(set(keys)) != len(keys):
            raise SeedConflictError(f"Duplicate normalized item in {seed_list.title}")
        list_id = _stable_id("list", seed_list.key)
        checklist = db.get(Checklist, list_id)
        if checklist is None:
            title_owner = db.scalar(select(Checklist).where(Checklist.title == seed_list.title))
            if title_owner is not None:
                raise SeedConflictError(f"Checklist title already exists: {seed_list.title}")
            checklist = Checklist(
                id=list_id,
                title=seed_list.title,
                summary=seed_list.summary,
                category=seed_list.category,
                sort_order=manifest.lists.index(seed_list),
                created_by=owner.id,
                status="draft",
            )
            db.add(checklist)
            db.flush()
            result.created_lists += 1
        else:
            result.existing_lists += 1
        existing = list(db.scalars(select(Item).where(Item.list_id == list_id)))
        by_id = {item.id: item for item in existing}
        by_key = {item.dedupe_key: item for item in existing}
        for row, payload in prepared:
            item_id = _stable_id("item", f"{seed_list.key}:{row.number}")
            if item_id in by_id:
                result.existing_items += 1
                continue
            dedupe_key = item_dedupe_key(payload.name, payload.address)
            if dedupe_key in by_key:
                raise SeedConflictError(
                    f"Source row {seed_list.key}:{row.number} collides with an existing item"
                )
            item = Item(
                id=item_id,
                list_id=list_id,
                dedupe_key=dedupe_key,
                status="draft",
                **payload.model_dump(exclude={"links", "online_url"}),
            )
            db.add(item)
            by_id[item_id] = item
            by_key[dedupe_key] = item
            result.created_items += 1
        db.flush()
    return result


def _untouched_reference(item: Item, payload: ItemWrite) -> bool:
    """Limit bulk publication to unmodified OCR draft content."""
    comparable_fields = (
        "name",
        "summary",
        "description",
        "category",
        "tags",
        "suggested_action",
        "recommendation",
        "reference_note",
        "reference_as_of",
        "missing_fields",
        "sort_order",
        "place_kind",
        "place_name",
        "address",
        "area",
        "online_url",
        "latitude",
        "longitude",
        "coordinate_system",
        "source",
        "verified_at",
    )
    return (
        item.cover_key is None
        and not item.links
        and all(getattr(item, field) == getattr(payload, field) for field in comparable_fields)
    )


def publish_reference(db: Session, manifest: SeedManifest, owner_email: str) -> PublicationResult:
    """Publish untouched OCR candidates only when an operator explicitly opts in.

    Existing administrator edits and unpublished rows keep their state. The
    checklist summary always receives a source and currency warning.
    """
    owner = db.scalar(select(User).where(User.email == owner_email.strip().lower()))
    if owner is None or owner.role != "system_admin":
        raise SeedConflictError("An existing system administrator owner is required")
    result = PublicationResult()
    for seed_list in manifest.lists:
        checklist = db.get(Checklist, _stable_id("list", seed_list.key))
        if checklist is None:
            raise SeedConflictError(f"Seed checklist does not exist: {seed_list.key}")
        if checklist.status == "unpublished":
            result.skipped_lists += 1
            result.skipped_items += len(seed_list.rows)
            continue
        if checklist.status not in {"draft", "published"}:
            raise SeedConflictError(f"Unsupported checklist status: {checklist.status}")
        legacy_summaries = set(seed_list.legacy_generated_summaries)
        legacy_summaries.update(
            f"{legacy}\n{seed_list.publication_warning}" for legacy in legacy_summaries.copy()
        )
        if checklist.summary in legacy_summaries:
            updated_summary = seed_list.summary
        elif seed_list.publication_warning not in checklist.summary:
            updated_summary = (
                f"{checklist.summary.rstrip()}\n{seed_list.publication_warning}".strip()
            )
        else:
            updated_summary = checklist.summary
        if len(updated_summary) > 5000:
            raise SeedConflictError(f"Checklist summary is too long: {seed_list.key}")
        warning_added = (
            seed_list.publication_warning not in checklist.summary
            and seed_list.publication_warning in updated_summary
        )
        summary_updated = updated_summary != checklist.summary
        checklist.summary = updated_summary
        published_items_for_list = 0
        skipped_items_for_list = 0
        for row in seed_list.rows:
            item = db.get(Item, _stable_id("item", f"{seed_list.key}:{row.number}"))
            if item is None or item.list_id != checklist.id:
                raise SeedConflictError(f"Seed item does not exist: {seed_list.key}:{row.number}")
            if item.status == "published":
                result.already_published_items += 1
                continue
            if item.status == "unpublished" or not _untouched_reference(
                item, _item_write(manifest, seed_list, row)
            ):
                result.skipped_items += 1
                skipped_items_for_list += 1
                continue
            if item.status != "draft":
                raise SeedConflictError(f"Unsupported item status: {item.status}")
            item.status = "published"
            result.published_items += 1
            published_items_for_list += 1
        list_was_published = checklist.status == "draft"
        if checklist.status == "draft":
            checklist.status = "published"
            checklist.published_at = checklist.published_at or datetime.now(UTC)
            result.published_lists += 1
        else:
            result.already_published_lists += 1
        if list_was_published or summary_updated or published_items_for_list:
            db.add(
                AuditLog(
                    actor_id=owner.id,
                    action="list.publish_ocr_reference",
                    target_type="list",
                    target_id=checklist.id,
                    reason=json.dumps(
                        {
                            "source": manifest.source_file,
                            "review_status": manifest.review_status,
                            "list_published": list_was_published,
                            "published_items": published_items_for_list,
                            "skipped_items": skipped_items_for_list,
                            "warning_added": warning_added,
                            "summary_updated": summary_updated,
                        },
                        ensure_ascii=False,
                    ),
                )
            )
    db.flush()
    return result


class CLIStyle:
    """Color terminal status consistently with the bootstrap command."""

    COLORS = {"TITLE": 7, "CONTENT": 3, "ERROR": 2}

    @staticmethod
    def color(message: str, color: int) -> str:
        """Add an ANSI status color."""
        return f"\033[1;3{color}m{message}\033[0m"


class ColoredArgumentParser(argparse.ArgumentParser):
    """Colorize the command help heading."""

    def format_help(self) -> str:
        """Return terminal-friendly help text."""
        return CLIStyle.color(super().format_help(), CLIStyle.COLORS["TITLE"])


def main() -> int:
    """Validate or seed the bundled OCR candidates after migrations."""
    default_data = Path(__file__).resolve().parents[1] / "data" / "ocr_seed.json"
    parser = ColoredArgumentParser(
        description="Seed two OCR checklists as drafts or publish OCR references",
        epilog=(
            "Example: python -m app.seed_ocr --owner-email admin@example.com\n"
            "Publish: python -m app.seed_ocr --owner-email admin@example.com --publish-reference"
        ),
    )
    parser.add_argument("--data", type=Path, default=default_data, help="Curated OCR JSON path")
    parser.add_argument(
        "--owner-email",
        help="Your system administrator account; recorded as publication actor",
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--check-only", action="store_true", help="Validate JSON without database writes"
    )
    mode.add_argument(
        "--publish-reference",
        action="store_true",
        help="Explicitly publish untouched OCR rows with source warnings",
    )
    parser.add_argument("--log", action="store_true", help="Show source and row counts")
    args = parser.parse_args()
    try:
        manifest = load_manifest(args.data)
        if args.log:
            print(
                CLIStyle.color(
                    f"Source: {manifest.source_file}; rows: "
                    f"{sum(len(seed_list.rows) for seed_list in manifest.lists)}",
                    CLIStyle.COLORS["CONTENT"],
                )
            )
        if args.check_only:
            print(CLIStyle.color("OCR manifest valid", CLIStyle.COLORS["CONTENT"]))
            return 0
        if not args.owner_email:
            parser.error("--owner-email is required unless --check-only is used")
        with Session(get_engine()) as db, db.begin():
            result = seed_manifest(db, manifest, args.owner_email)
            publication = (
                publish_reference(db, manifest, args.owner_email)
                if args.publish_reference
                else None
            )
        print(
            CLIStyle.color(
                f"Drafts seeded: {result.created_lists} lists and {result.created_items} items; "
                f"already present: {result.existing_lists} lists and {result.existing_items} items",
                CLIStyle.COLORS["CONTENT"],
            )
        )
        if publication is not None:
            print(
                CLIStyle.color(
                    f"Reference published: {publication.published_lists} lists and "
                    f"{publication.published_items} items; skipped: "
                    f"{publication.skipped_lists} lists and {publication.skipped_items} items",
                    CLIStyle.COLORS["CONTENT"],
                )
            )
        return 0
    except (
        FileNotFoundError,
        OSError,
        json.JSONDecodeError,
        ValidationError,
        ValueError,
        SQLAlchemyError,
    ) as exc:
        print(CLIStyle.color(f"Seed failed: {exc}", CLIStyle.COLORS["ERROR"]), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
