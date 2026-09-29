"""Public checklist and item discovery endpoints."""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, optional_auth
from app.db.session import get_db
from app.models.tables import Checklist, Item
from app.schemas.catalog import ChecklistOut, ItemDetailOut, ItemSummaryOut, Page
from app.services.catalog import checklist_out, item_counts, item_detail, item_summary

router = APIRouter(tags=["catalog"])


@router.get("/lists", response_model=Page[ChecklistOut])
def lists(
    auth: Annotated[AuthContext | None, Depends(optional_auth)],
    db: Annotated[Session, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[ChecklistOut]:
    """Page through published checklists."""
    criterion = Checklist.status == "published"
    total = db.scalar(select(func.count()).select_from(Checklist).where(criterion)) or 0
    rows = db.scalars(
        select(Checklist)
        .where(criterion)
        .order_by(Checklist.sort_order, Checklist.published_at.desc(), Checklist.id)
        .limit(limit)
        .offset(offset)
    )
    return Page(
        items=[checklist_out(db, row, auth.user.id if auth else None) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/lists/{list_id}", response_model=ChecklistOut)
def list_detail(
    list_id: str,
    auth: Annotated[AuthContext | None, Depends(optional_auth)],
    db: Annotated[Session, Depends(get_db)],
) -> ChecklistOut:
    """Read a published checklist and current progress."""
    checklist = db.get(Checklist, list_id)
    if checklist is None or checklist.status != "published":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Checklist not found")
    return checklist_out(db, checklist, auth.user.id if auth else None)


@router.get("/lists/{list_id}/items", response_model=Page[ItemSummaryOut])
def list_items(
    list_id: str,
    auth: Annotated[AuthContext | None, Depends(optional_auth)],
    db: Annotated[Session, Depends(get_db)],
    q: Annotated[str | None, Query(max_length=160)] = None,
    category: Annotated[str | None, Query(max_length=80)] = None,
    sort: Literal["order", "name", "newest"] = "order",
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[ItemSummaryOut]:
    """Search, filter, and order published items in one checklist."""
    checklist = db.get(Checklist, list_id)
    if checklist is None or checklist.status != "published":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Checklist not found")
    filters = [Item.list_id == list_id, Item.status == "published"]
    if q:
        filters.append(Item.name.ilike(f"%{q.strip()}%"))
    if category:
        filters.append(Item.category == category)
    total = db.scalar(select(func.count()).select_from(Item).where(*filters)) or 0
    ordering = {
        "order": (Item.sort_order, Item.name, Item.id),
        "name": (Item.name, Item.id),
        "newest": (Item.created_at.desc(), Item.id),
    }[sort]
    rows = list(
        db.scalars(select(Item).where(*filters).order_by(*ordering).limit(limit).offset(offset))
    )
    counts = item_counts(db, auth.user.id if auth else None, [item.id for item in rows])
    return Page(
        items=[item_summary(item, counts) for item in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/items/{item_id}", response_model=ItemDetailOut)
def item_details(
    item_id: str,
    auth: Annotated[AuthContext | None, Depends(optional_auth)],
    db: Annotated[Session, Depends(get_db)],
) -> ItemDetailOut:
    """Read a published item, its place and related entries."""
    item = db.get(Item, item_id)
    if item is None or item.status != "published" or item.checklist.status != "published":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")
    return item_detail(db, item, auth.user.id if auth else None)
