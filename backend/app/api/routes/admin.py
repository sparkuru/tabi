"""Administrator content management endpoints."""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, require_admin, require_admin_view
from app.db.session import get_db
from app.models.tables import AuditLog, Checklist, ImportBatch, Item, ItemLink, ItemRelation
from app.schemas.catalog import (
    ChecklistOut,
    ChecklistWrite,
    ItemDetailOut,
    ItemWrite,
    Page,
    RelationIn,
)
from app.schemas.imports import ReviewedImportIn, ReviewedImportOut
from app.services.catalog import checklist_out, item_detail
from app.services.imports import item_dedupe_key

router = APIRouter(prefix="/admin", tags=["admin"])


def _audit(
    db: Session,
    auth: AuthContext,
    action: str,
    target_type: str,
    target_id: str,
    reason: str | None = None,
) -> None:
    """Record a management mutation in the same transaction."""
    db.add(
        AuditLog(
            actor_id=auth.user.id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            reason=reason,
        )
    )


def _require_list(db: Session, list_id: str) -> Checklist:
    """Load a checklist for management."""
    checklist = db.get(Checklist, list_id)
    if checklist is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Checklist not found")
    return checklist


def _require_item(db: Session, item_id: str) -> Item:
    """Load an item for management."""
    item = db.get(Item, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")
    return item


def _preserve_ocr_warning(previous: str, updated: str) -> str:
    """Keep a published OCR list's provenance notice across admin edits."""
    warning = next(
        (
            line
            for line in previous.splitlines()
            if line.startswith("本清单整理自 archive/ocr.md") and "仅供参考" in line
        ),
        None,
    )
    if warning is None or warning in updated:
        return updated
    combined = f"{updated.rstrip()}\n{warning}".strip()
    if len(combined) > 5000:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Checklist summary is too long")
    return combined


@router.get("/lists", response_model=Page[ChecklistOut])
def admin_lists(
    auth: Annotated[AuthContext, Depends(require_admin_view)],
    db: Annotated[Session, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[ChecklistOut]:
    """Page through published and draft checklists."""
    total = db.scalar(select(func.count()).select_from(Checklist)) or 0
    rows = db.scalars(
        select(Checklist)
        .order_by(Checklist.sort_order, Checklist.title)
        .limit(limit)
        .offset(offset)
    )
    return Page(
        items=[checklist_out(db, row, auth.user.id) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("/lists", response_model=ChecklistOut, status_code=status.HTTP_201_CREATED)
def create_list(
    payload: ChecklistWrite,
    auth: Annotated[AuthContext, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> ChecklistOut:
    """Create a draft checklist."""
    checklist = Checklist(**payload.model_dump(), created_by=auth.user.id)
    db.add(checklist)
    db.flush()
    _audit(db, auth, "list.create", "list", checklist.id)
    db.commit()
    return checklist_out(db, checklist, auth.user.id)


@router.put("/lists/{list_id}", response_model=ChecklistOut)
def edit_list(
    list_id: str,
    payload: ChecklistWrite,
    auth: Annotated[AuthContext, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> ChecklistOut:
    """Replace editable checklist content."""
    checklist = _require_list(db, list_id)
    values = payload.model_dump()
    values["summary"] = _preserve_ocr_warning(checklist.summary, values["summary"])
    for key, value in values.items():
        setattr(checklist, key, value)
    _audit(db, auth, "list.edit", "list", list_id)
    db.commit()
    return checklist_out(db, checklist, auth.user.id)


@router.post("/lists/{list_id}/publish", response_model=ChecklistOut)
def publish_list(
    list_id: str,
    auth: Annotated[AuthContext, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> ChecklistOut:
    """Publish a checklist and preserve its identity."""
    checklist = _require_list(db, list_id)
    checklist.status = "published"
    checklist.published_at = checklist.published_at or datetime.now(UTC)
    checklist.removed_at = None
    _audit(db, auth, "list.publish", "list", list_id)
    db.commit()
    return checklist_out(db, checklist, auth.user.id)


@router.post("/lists/{list_id}/unpublish", response_model=ChecklistOut)
def unpublish_list(
    list_id: str,
    auth: Annotated[AuthContext, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> ChecklistOut:
    """Unpublish without deleting personal history."""
    checklist = _require_list(db, list_id)
    checklist.status = "unpublished"
    checklist.removed_at = datetime.now(UTC)
    _audit(db, auth, "list.unpublish", "list", list_id)
    db.commit()
    return checklist_out(db, checklist, auth.user.id)


@router.get("/lists/{list_id}/items", response_model=Page[ItemDetailOut])
def admin_items(
    list_id: str,
    auth: Annotated[AuthContext, Depends(require_admin_view)],
    db: Annotated[Session, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[ItemDetailOut]:
    """Page through draft and published entries in a checklist."""
    _require_list(db, list_id)
    total = db.scalar(select(func.count()).select_from(Item).where(Item.list_id == list_id)) or 0
    rows = db.scalars(
        select(Item)
        .where(Item.list_id == list_id)
        .order_by(Item.sort_order, Item.name)
        .limit(limit)
        .offset(offset)
    )
    return Page(
        items=[item_detail(db, row, auth.user.id) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/lists/{list_id}/items", response_model=ItemDetailOut, status_code=status.HTTP_201_CREATED
)
def create_item(
    list_id: str,
    payload: ItemWrite,
    auth: Annotated[AuthContext, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> ItemDetailOut:
    """Create a draft item in one checklist."""
    _require_list(db, list_id)
    values = payload.model_dump(exclude={"links"})
    values["online_url"] = str(payload.online_url) if payload.online_url else None
    values["dedupe_key"] = item_dedupe_key(payload.name, payload.address)
    item = Item(list_id=list_id, **values)
    db.add(item)
    try:
        db.flush()
        for link in payload.links:
            db.add(ItemLink(item_id=item.id, title=link.title, url=str(link.url), kind=link.kind))
        _audit(db, auth, "item.create", "item", item.id)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Item already exists in this list") from exc
    return item_detail(db, item, auth.user.id)


@router.put("/items/{item_id}", response_model=ItemDetailOut)
def edit_item(
    item_id: str,
    payload: ItemWrite,
    auth: Annotated[AuthContext, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> ItemDetailOut:
    """Replace current item details without changing check-in history."""
    item = _require_item(db, item_id)
    if (
        item.source
        and "OCR Markdown transcription only" in item.source
        and payload.source != item.source
    ):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "OCR source cannot be changed")
    values = payload.model_dump(exclude={"links"})
    values["online_url"] = str(payload.online_url) if payload.online_url else None
    values["dedupe_key"] = item_dedupe_key(payload.name, payload.address)
    for key, value in values.items():
        setattr(item, key, value)
    try:
        item.links.clear()
        db.flush()
        for link in payload.links:
            item.links.append(ItemLink(title=link.title, url=str(link.url), kind=link.kind))
        _audit(db, auth, "item.edit", "item", item_id)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Item already exists in this list") from exc
    return item_detail(db, item, auth.user.id)


@router.post("/items/{item_id}/publish", response_model=ItemDetailOut)
def publish_item(
    item_id: str,
    auth: Annotated[AuthContext, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> ItemDetailOut:
    """Publish an item independently of its parent checklist."""
    item = _require_item(db, item_id)
    item.status = "published"
    item.removed_at = None
    _audit(db, auth, "item.publish", "item", item_id)
    db.commit()
    return item_detail(db, item, auth.user.id)


@router.post("/items/{item_id}/unpublish", response_model=ItemDetailOut)
def unpublish_item(
    item_id: str,
    auth: Annotated[AuthContext, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> ItemDetailOut:
    """Hide an item from browsing while retaining check-in history."""
    item = _require_item(db, item_id)
    item.status = "unpublished"
    item.removed_at = datetime.now(UTC)
    _audit(db, auth, "item.unpublish", "item", item_id)
    db.commit()
    return item_detail(db, item, auth.user.id)


@router.post("/items/{item_id}/relations", status_code=status.HTTP_201_CREATED)
def add_relation(
    item_id: str,
    payload: RelationIn,
    auth: Annotated[AuthContext, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, str]:
    """Relate two distinct entries in the same checklist."""
    item = _require_item(db, item_id)
    related = _require_item(db, payload.related_item_id)
    if item.id == related.id or item.list_id != related.list_id:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "Relation must stay within a list"
        )
    relation = ItemRelation(
        item_id=item_id,
        related_item_id=payload.related_item_id,
        relation_kind=payload.relation_kind,
    )
    db.add(relation)
    _audit(db, auth, "item.relate", "item", item_id)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Relation already exists") from exc
    return {"id": relation.id}


@router.post(
    "/lists/{list_id}/imports",
    response_model=ReviewedImportOut,
    status_code=status.HTTP_201_CREATED,
)
def import_reviewed_items(
    list_id: str,
    payload: ReviewedImportIn,
    auth: Annotated[AuthContext, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> ReviewedImportOut:
    """Import OCR material only after explicit human transcription review."""
    _require_list(db, list_id)
    keys: set[str] = set()
    for row in payload.rows:
        if not row.transcription_reviewed:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unreviewed OCR row")
        if row.item.latitude is not None and not row.coordinates_checked:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Coordinates need review")
        key = item_dedupe_key(row.item.name, row.item.address)
        if key in keys:
            raise HTTPException(status.HTTP_409_CONFLICT, "Duplicate item in import")
        keys.add(key)
    batch = ImportBatch(
        list_id=list_id,
        source=payload.source,
        reviewed_by=auth.user.id,
        reviewed_at=payload.reviewed_at,
    )
    db.add(batch)
    item_ids: list[str] = []
    try:
        db.flush()
        for row in payload.rows:
            values = row.item.model_dump(exclude={"links", "source"})
            values["online_url"] = str(row.item.online_url) if row.item.online_url else None
            values["dedupe_key"] = item_dedupe_key(row.item.name, row.item.address)
            values["source"] = payload.source
            item = Item(list_id=list_id, **values)
            db.add(item)
            db.flush()
            item_ids.append(item.id)
            for link in row.item.links:
                db.add(
                    ItemLink(item_id=item.id, title=link.title, url=str(link.url), kind=link.kind)
                )
        _audit(db, auth, "list.import", "list", list_id, f"batch={batch.id}; count={len(item_ids)}")
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Item already exists in this list") from exc
    return ReviewedImportOut(batch_id=batch.id, item_ids=item_ids)
