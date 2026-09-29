"""Viewer-specific checklist and item projections."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.tables import Checkin, Checklist, Item, ItemLink, ItemRelation
from app.schemas.catalog import (
    ChecklistOut,
    ItemDetailOut,
    ItemLinkOut,
    ItemSummaryOut,
)


def item_counts(db: Session, user_id: str | None, item_ids: list[str]) -> dict[str, int]:
    """Count a viewer's active experiences by item in one query."""
    if not user_id or not item_ids:
        return {}
    rows = db.execute(
        select(Checkin.item_id, func.count(Checkin.id))
        .where(
            Checkin.user_id == user_id,
            Checkin.item_id.in_(item_ids),
            Checkin.deleted_at.is_(None),
        )
        .group_by(Checkin.item_id)
    )
    return {item_id: count for item_id, count in rows}


def checklist_out(db: Session, checklist: Checklist, user_id: str | None) -> ChecklistOut:
    """Project published item totals and viewer progress."""
    ids = list(
        db.scalars(select(Item.id).where(Item.list_id == checklist.id, Item.status == "published"))
    )
    counts = item_counts(db, user_id, ids)
    return ChecklistOut(
        id=checklist.id,
        title=checklist.title,
        summary=checklist.summary,
        category=checklist.category,
        sort_order=checklist.sort_order,
        cover_url=f"/api/media/lists/{checklist.id}/cover" if checklist.cover_key else None,
        status=checklist.status,
        item_count=len(ids),
        completed_count=len(counts),
        record_count=sum(counts.values()),
    )


def item_summary(item: Item, counts: dict[str, int]) -> ItemSummaryOut:
    """Project an item card for the current viewer."""
    count = counts.get(item.id, 0)
    return ItemSummaryOut(
        id=item.id,
        list_id=item.list_id,
        name=item.name,
        summary=item.summary,
        category=item.category,
        tags=item.tags,
        cover_url=f"/api/media/items/{item.id}/cover" if item.cover_key else None,
        sort_order=item.sort_order,
        status=item.status,
        completed=count > 0,
        checkin_count=count,
    )


def item_detail(db: Session, item: Item, user_id: str | None) -> ItemDetailOut:
    """Project full details and same-list published relations."""
    relation_ids = list(
        db.scalars(select(ItemRelation.related_item_id).where(ItemRelation.item_id == item.id))
    )
    related = (
        list(
            db.scalars(
                select(Item).where(
                    Item.id.in_(relation_ids),
                    Item.list_id == item.list_id,
                    Item.status == "published",
                )
            )
        )
        if relation_ids
        else []
    )
    counts = item_counts(db, user_id, [item.id, *(entry.id for entry in related)])
    links = list(db.scalars(select(ItemLink).where(ItemLink.item_id == item.id)))
    summary = item_summary(item, counts)
    return ItemDetailOut(
        **summary.model_dump(),
        description=item.description,
        suggested_action=item.suggested_action,
        recommendation=item.recommendation,
        reference_note=item.reference_note,
        reference_as_of=item.reference_as_of,
        missing_fields=item.missing_fields,
        place_kind=item.place_kind,
        place_name=item.place_name,
        address=item.address,
        area=item.area,
        online_url=item.online_url,
        latitude=item.latitude,
        longitude=item.longitude,
        coordinate_system=item.coordinate_system,
        source=item.source,
        verified_at=item.verified_at,
        links=[
            ItemLinkOut(id=link.id, title=link.title, url=link.url, kind=link.kind)
            for link in links
        ],
        related=[item_summary(entry, counts) for entry in related],
    )
