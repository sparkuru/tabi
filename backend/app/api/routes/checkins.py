"""Experience creation, history, sharing and moderation."""

from datetime import UTC, datetime
from hashlib import sha256
from json import dumps
from secrets import token_urlsafe
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, require_admin, require_auth, require_csrf
from app.db.session import get_db
from app.models.tables import AuditLog, Checkin, Checklist, Item, Media, PendingUpload
from app.schemas.catalog import Page
from app.schemas.checkins import (
    CheckinCreate,
    CheckinEdit,
    HideIn,
    OwnCheckinOut,
    PublicCheckinOut,
)
from app.services.checkins import own_checkin, public_checkin

router = APIRouter(tags=["checkins"])


def _own_record(db: Session, checkin_id: str, user_id: str) -> Checkin:
    """Resolve one active record by both ID and owner."""
    checkin = db.scalar(
        select(Checkin).where(
            Checkin.id == checkin_id,
            Checkin.user_id == user_id,
            Checkin.deleted_at.is_(None),
        )
    )
    if checkin is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Experience not found")
    return checkin


def _fingerprint(item_id: str, payload: CheckinCreate) -> str:
    """Detect accidental reuse of an idempotency key for different content."""
    encoded = dumps(
        {"item_id": item_id, "payload": payload.model_dump(mode="json")},
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return sha256(encoded).hexdigest()


@router.post(
    "/items/{item_id}/checkins", response_model=OwnCheckinOut, status_code=status.HTTP_201_CREATED
)
def create_checkin(
    item_id: str,
    payload: CheckinCreate,
    idempotency_key: Annotated[str, Header(min_length=16, max_length=80)],
    auth: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_db)],
) -> OwnCheckinOut:
    """Create one experience and return the original row on a matching retry."""
    fingerprint = _fingerprint(item_id, payload)
    existing = db.scalar(
        select(Checkin).where(
            Checkin.user_id == auth.user.id,
            Checkin.idempotency_key == idempotency_key,
        )
    )
    if existing is not None:
        if existing.request_hash != fingerprint or existing.deleted_at is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Idempotency key already used")
        return own_checkin(existing)

    item = db.get(Item, item_id)
    if item is None or item.status != "published" or item.checklist.status != "published":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")
    note = payload.note.strip() if payload.note else None
    if len(set(payload.upload_ids)) != len(payload.upload_ids):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Duplicate upload IDs")

    uploads = (
        list(db.scalars(select(PendingUpload).where(PendingUpload.id.in_(payload.upload_ids))))
        if payload.upload_ids
        else []
    )
    if len(uploads) != len(payload.upload_ids) or any(
        upload.user_id != auth.user.id or upload.expires_at.replace(tzinfo=UTC) <= datetime.now(UTC)
        for upload in uploads
    ):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid or expired upload")
    upload_by_id = {upload.id: upload for upload in uploads}
    position = payload.position
    checkin = Checkin(
        user_id=auth.user.id,
        item_id=item_id,
        idempotency_key=idempotency_key,
        request_hash=fingerprint,
        share_id=token_urlsafe(24),
        experienced_at=payload.experienced_at or datetime.now(UTC),
        note=note,
        visibility=payload.visibility,
        latitude=position.latitude if position else None,
        longitude=position.longitude if position else None,
        accuracy_m=position.accuracy_m if position else None,
        coordinate_system=position.coordinate_system if position else None,
        located_at=position.located_at if position else None,
    )
    db.add(checkin)
    try:
        db.flush()
        for index, upload_id in enumerate(payload.upload_ids):
            upload = upload_by_id[upload_id]
            db.add(
                Media(
                    checkin_id=checkin.id,
                    storage_key=upload.storage_key,
                    thumbnail_key=upload.thumbnail_key,
                    sort_order=index,
                )
            )
            db.delete(upload)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        prior = db.scalar(
            select(Checkin).where(
                Checkin.user_id == auth.user.id,
                Checkin.idempotency_key == idempotency_key,
            )
        )
        if prior is None or prior.request_hash != fingerprint or prior.deleted_at is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Idempotency key already used") from exc
        return own_checkin(prior)
    db.refresh(checkin)
    return own_checkin(checkin)


@router.post("/items/{item_id}/complete", response_model=OwnCheckinOut)
def complete_item(
    item_id: str,
    idempotency_key: Annotated[str, Header(min_length=16, max_length=80)],
    auth: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_db)],
) -> OwnCheckinOut:
    """Complete once; serialize concurrent clicks and reuse an active record."""
    fingerprint = sha256(
        dumps({"operation": "complete", "item_id": item_id}, sort_keys=True).encode()
    ).hexdigest()
    item = db.scalar(select(Item).where(Item.id == item_id).with_for_update())
    if item is None:
        raise HTTPException(404, "Item not found")
    checklist = db.scalar(select(Checklist).where(Checklist.id == item.list_id))
    if item.status != "published" or checklist.status != "published":
        raise HTTPException(404, "Item not found")
    prior = db.scalar(
        select(Checkin).where(
            Checkin.user_id == auth.user.id, Checkin.idempotency_key == idempotency_key
        )
    )
    if prior is not None:
        if prior.request_hash != fingerprint or prior.deleted_at is not None:
            raise HTTPException(409, "Idempotency key already used")
        return own_checkin(prior)
    existing = db.scalar(
        select(Checkin)
        .where(
            Checkin.user_id == auth.user.id,
            Checkin.item_id == item_id,
            Checkin.deleted_at.is_(None),
        )
        .order_by(Checkin.created_at, Checkin.id)
        .limit(1)
    )
    if existing is not None:
        return own_checkin(existing)
    checkin = Checkin(
        user_id=auth.user.id,
        item_id=item_id,
        idempotency_key=idempotency_key,
        request_hash=fingerprint,
        share_id=token_urlsafe(24),
        experienced_at=datetime.now(UTC),
        visibility="private",
    )
    db.add(checkin)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        prior = db.scalar(
            select(Checkin).where(
                Checkin.user_id == auth.user.id, Checkin.idempotency_key == idempotency_key
            )
        )
        if prior is None or prior.request_hash != fingerprint or prior.deleted_at is not None:
            raise HTTPException(409, "Idempotency key already used") from exc
        return own_checkin(prior)
    db.refresh(checkin)
    return own_checkin(checkin)


@router.get("/me/checkins", response_model=Page[OwnCheckinOut])
def history(
    auth: Annotated[AuthContext, Depends(require_auth)],
    db: Annotated[Session, Depends(get_db)],
    list_id: str | None = None,
    category: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[OwnCheckinOut]:
    """Read own active records, including archived checklist entries."""
    filters = [Checkin.user_id == auth.user.id, Checkin.deleted_at.is_(None)]
    if list_id:
        filters.append(Item.list_id == list_id)
    if category:
        filters.append(Item.category == category)
    query = select(Checkin).join(Item).where(*filters)
    total = db.scalar(select(func.count()).select_from(Checkin).join(Item).where(*filters)) or 0
    rows = db.scalars(
        query.order_by(Checkin.experienced_at.desc(), Checkin.created_at.desc(), Checkin.id)
        .limit(limit)
        .offset(offset)
    )
    return Page(
        items=[own_checkin(checkin) for checkin in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/checkins/{checkin_id}", response_model=OwnCheckinOut)
def own_detail(
    checkin_id: str,
    auth: Annotated[AuthContext, Depends(require_auth)],
    db: Annotated[Session, Depends(get_db)],
) -> OwnCheckinOut:
    """Read one owned experience."""
    return own_checkin(_own_record(db, checkin_id, auth.user.id))


@router.patch("/checkins/{checkin_id}", response_model=OwnCheckinOut)
def edit_checkin(
    checkin_id: str,
    payload: CheckinEdit,
    auth: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_db)],
) -> OwnCheckinOut:
    """Edit one owned experience without affecting other visits."""
    checkin = _own_record(db, checkin_id, auth.user.id)
    if "note" in payload.model_fields_set:
        note = payload.note.strip() if payload.note else None
        checkin.note = note
    if "experienced_at" in payload.model_fields_set:
        checkin.experienced_at = payload.experienced_at or datetime.now(UTC)
    if "visibility" in payload.model_fields_set and payload.visibility is not None:
        checkin.visibility = payload.visibility
    if "position" in payload.model_fields_set:
        position = payload.position
        checkin.latitude = position.latitude if position else None
        checkin.longitude = position.longitude if position else None
        checkin.accuracy_m = position.accuracy_m if position else None
        checkin.coordinate_system = position.coordinate_system if position else None
        checkin.located_at = position.located_at if position else None
    checkin.updated_at = datetime.now(UTC)
    db.commit()
    return own_checkin(checkin)


@router.delete("/checkins/{checkin_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_checkin(
    checkin_id: str,
    auth: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Soft-delete one record and immediately remove it from progress/shares."""
    checkin = _own_record(db, checkin_id, auth.user.id)
    checkin.deleted_at = datetime.now(UTC)
    db.commit()


@router.get("/items/{item_id}/checkins/public", response_model=Page[PublicCheckinOut])
def public_experiences(
    item_id: str,
    db: Annotated[Session, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[PublicCheckinOut]:
    """Page through visible experiences on a published item."""
    item = db.get(Item, item_id)
    if item is None or item.status != "published" or item.checklist.status != "published":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")
    filters = [
        Checkin.item_id == item_id,
        Checkin.visibility == "public",
        Checkin.deleted_at.is_(None),
        Checkin.hidden_at.is_(None),
    ]
    total = db.scalar(select(func.count()).select_from(Checkin).where(*filters)) or 0
    rows = db.scalars(
        select(Checkin)
        .where(*filters)
        .order_by(Checkin.experienced_at.desc(), Checkin.id)
        .limit(limit)
        .offset(offset)
    )
    return Page(
        items=[public_checkin(row) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/shares/{share_id}", response_model=PublicCheckinOut)
def shared_experience(share_id: str, db: Annotated[Session, Depends(get_db)]) -> PublicCheckinOut:
    """Resolve a stable share ID only while the record remains public."""
    checkin = db.scalar(select(Checkin).where(Checkin.share_id == share_id))
    if checkin is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Experience not found")
    return public_checkin(checkin)


@router.post("/admin/checkins/{checkin_id}/hide", status_code=status.HTTP_204_NO_CONTENT)
def hide_experience(
    checkin_id: str,
    payload: HideIn,
    auth: Annotated[AuthContext, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Hide a public record and record why it was moderated."""
    checkin = db.get(Checkin, checkin_id)
    if checkin is None or checkin.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Experience not found")
    checkin.hidden_at = datetime.now(UTC)
    db.add(
        AuditLog(
            actor_id=auth.user.id,
            action="checkin.hide",
            target_type="checkin",
            target_id=checkin_id,
            reason=payload.reason,
        )
    )
    db.commit()


@router.get("/admin/audit", response_model=Page[dict])
def audit_history(
    auth: Annotated[AuthContext, Depends(require_auth)],
    db: Annotated[Session, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[dict]:
    """Read content audit entries as a system administrator."""
    if auth.user.role != "system_admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "System administrator role required")
    total = db.scalar(select(func.count()).select_from(AuditLog)) or 0
    rows = db.scalars(
        select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
    )
    return Page(
        items=[
            {
                "id": row.id,
                "actor_id": row.actor_id,
                "action": row.action,
                "target_type": row.target_type,
                "target_id": row.target_id,
                "reason": row.reason,
                "created_at": row.created_at.isoformat(),
            }
            for row in rows
        ],
        total=total,
        limit=limit,
        offset=offset,
    )
