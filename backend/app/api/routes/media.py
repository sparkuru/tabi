"""Private image upload and authorized media access."""

from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, optional_auth, require_admin, require_csrf
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.models.tables import AuditLog, Checkin, Checklist, Item, Media, PendingUpload, User
from app.services.checkins import is_public
from app.storage.images import media_path, store_image

router = APIRouter(prefix="/media", tags=["media"])


def _file_response(key: str) -> FileResponse:
    """Return one private image without browser caching."""
    path = media_path(key)
    if not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image not found")
    return FileResponse(path, media_type="image/jpeg", headers={"Cache-Control": "no-store"})


async def _store_thumbnail(file: UploadFile) -> str:
    """Keep only the processed derivative for covers and avatars."""
    original_key, thumbnail_key = await store_image(file)
    media_path(original_key).unlink(missing_ok=True)
    return thumbnail_key


@router.post("/uploads", status_code=status.HTTP_201_CREATED)
async def upload_photo(
    file: Annotated[UploadFile, File()],
    auth: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, str]:
    """Stage one validated image for a future experience."""
    limiter.check(f"upload:{auth.user.id}", 120, 3600)
    original_key, thumbnail_key = await store_image(file)
    pending = PendingUpload(
        user_id=auth.user.id,
        storage_key=original_key,
        thumbnail_key=thumbnail_key,
        expires_at=datetime.now(UTC) + timedelta(hours=24),
    )
    db.add(pending)
    db.commit()
    return {"upload_id": pending.id}


@router.post("/checkins/{checkin_id}", status_code=status.HTTP_201_CREATED)
async def add_photo(
    checkin_id: str,
    file: Annotated[UploadFile, File()],
    auth: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, str]:
    """Append a validated image to one owned experience."""
    checkin = db.get(Checkin, checkin_id)
    if checkin is None or checkin.user_id != auth.user.id or checkin.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Experience not found")
    if len(checkin.media) >= 8:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Photo limit reached")
    limiter.check(f"upload:{auth.user.id}", 120, 3600)
    original_key, thumbnail_key = await store_image(file)
    media = Media(
        checkin_id=checkin.id,
        storage_key=original_key,
        thumbnail_key=thumbnail_key,
        sort_order=max((photo.sort_order for photo in checkin.media), default=-1) + 1,
    )
    db.add(media)
    db.commit()
    return {"id": media.id}


@router.delete("/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_photo(
    media_id: str,
    auth: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Remove one owned photo, retaining a valid completion record."""
    media = db.get(Media, media_id)
    if media is None or media.checkin.user_id != auth.user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image not found")
    checkin = media.checkin
    if checkin.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image not found")
    keys = (media.storage_key, media.thumbnail_key)
    db.delete(media)
    db.commit()
    for key in keys:
        media_path(key).unlink(missing_ok=True)


@router.get("/{media_id}/thumbnail")
def thumbnail(
    media_id: str,
    auth: Annotated[AuthContext | None, Depends(optional_auth)],
    db: Annotated[Session, Depends(get_db)],
) -> FileResponse:
    """Serve a thumbnail to its owner or while the experience is public."""
    media = db.get(Media, media_id)
    if media is None or media.checkin.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image not found")
    if not (auth and auth.user.id == media.checkin.user_id) and not is_public(media.checkin):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image not found")
    return _file_response(media.thumbnail_key)


@router.get("/{media_id}/original")
def original(
    media_id: str,
    auth: Annotated[AuthContext | None, Depends(optional_auth)],
    db: Annotated[Session, Depends(get_db)],
) -> FileResponse:
    """Serve a processed full-size image only to its author."""
    media = db.get(Media, media_id)
    if media is None or media.checkin.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image not found")
    if auth is None or auth.user.id != media.checkin.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image not found")
    return _file_response(media.storage_key)


@router.post("/lists/{list_id}/cover", status_code=status.HTTP_204_NO_CONTENT)
async def list_cover(
    list_id: str,
    file: Annotated[UploadFile, File()],
    auth: Annotated[AuthContext, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Set a checklist's processed cover image."""
    checklist = db.get(Checklist, list_id)
    if checklist is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Checklist not found")
    thumbnail_key = await _store_thumbnail(file)
    previous_key = checklist.cover_key
    checklist.cover_key = thumbnail_key
    db.add(
        AuditLog(
            actor_id=auth.user.id,
            action="list.cover",
            target_type="list",
            target_id=list_id,
        )
    )
    db.commit()
    if previous_key:
        media_path(previous_key).unlink(missing_ok=True)


@router.get("/lists/{list_id}/cover")
def get_list_cover(list_id: str, db: Annotated[Session, Depends(get_db)]) -> FileResponse:
    """Serve a published checklist cover."""
    checklist = db.get(Checklist, list_id)
    if checklist is None or checklist.status != "published" or not checklist.cover_key:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image not found")
    return _file_response(checklist.cover_key)


@router.post("/items/{item_id}/cover", status_code=status.HTTP_204_NO_CONTENT)
async def item_cover(
    item_id: str,
    file: Annotated[UploadFile, File()],
    auth: Annotated[AuthContext, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Set an item's processed cover image."""
    item = db.get(Item, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")
    thumbnail_key = await _store_thumbnail(file)
    previous_key = item.cover_key
    item.cover_key = thumbnail_key
    db.add(
        AuditLog(
            actor_id=auth.user.id,
            action="item.cover",
            target_type="item",
            target_id=item_id,
        )
    )
    db.commit()
    if previous_key:
        media_path(previous_key).unlink(missing_ok=True)


@router.get("/items/{item_id}/cover")
def get_item_cover(item_id: str, db: Annotated[Session, Depends(get_db)]) -> FileResponse:
    """Serve a published item's cover."""
    item = db.get(Item, item_id)
    if item is None or item.status != "published" or item.checklist.status != "published":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image not found")
    if not item.cover_key:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image not found")
    return _file_response(item.cover_key)


@router.post("/avatar", status_code=status.HTTP_204_NO_CONTENT)
async def avatar(
    file: Annotated[UploadFile, File()],
    auth: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Set the signed-in account's public avatar."""
    thumbnail_key = await _store_thumbnail(file)
    previous_key = auth.user.avatar_key
    auth.user.avatar_key = thumbnail_key
    db.commit()
    if previous_key:
        media_path(previous_key).unlink(missing_ok=True)


@router.get("/avatar/{user_id}")
def get_avatar(user_id: str, db: Annotated[Session, Depends(get_db)]) -> FileResponse:
    """Serve a processed public avatar without exposing account details."""
    user = db.get(User, user_id)
    if user is None or not user.avatar_key:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image not found")
    return _file_response(user.avatar_key)
