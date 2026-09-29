"""Experience projections and visibility checks."""

from fastapi import HTTPException, status

from app.models.tables import Checkin
from app.schemas.checkins import MediaOut, OwnCheckinOut, PositionIn, PublicCheckinOut


def is_public(checkin: Checkin) -> bool:
    """Decide whether a record may be shown to any guest."""
    return (
        checkin.visibility == "public"
        and checkin.deleted_at is None
        and checkin.hidden_at is None
        and checkin.item.status == "published"
        and checkin.item.checklist.status == "published"
    )


def public_checkin(checkin: Checkin) -> PublicCheckinOut:
    """Return an intentionally restricted public projection."""
    if not is_public(checkin):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Experience not found")
    return PublicCheckinOut(
        id=checkin.id,
        share_id=checkin.share_id,
        item_id=checkin.item_id,
        item_name=checkin.item.name,
        list_id=checkin.item.list_id,
        list_title=checkin.item.checklist.title,
        author_id=checkin.user_id,
        author_name=checkin.user.display_name,
        author_avatar_url=(
            f"/api/media/avatar/{checkin.user_id}" if checkin.user.avatar_key else None
        ),
        note=checkin.note,
        experienced_at=checkin.experienced_at,
        created_at=checkin.created_at,
        media=[
            MediaOut(
                id=media.id,
                thumbnail_url=f"/api/media/{media.id}/thumbnail",
                original_url=None,
                sort_order=media.sort_order,
            )
            for media in sorted(checkin.media, key=lambda media: media.sort_order)
        ],
    )


def own_checkin(checkin: Checkin) -> OwnCheckinOut:
    """Return owner-only fields, retaining archived item labels."""
    position = None
    if checkin.latitude is not None and checkin.longitude is not None:
        position = PositionIn(
            latitude=checkin.latitude,
            longitude=checkin.longitude,
            accuracy_m=checkin.accuracy_m or 0,
            coordinate_system=checkin.coordinate_system,
            located_at=checkin.located_at,
        )
    return OwnCheckinOut(
        id=checkin.id,
        share_id=checkin.share_id,
        item_id=checkin.item_id,
        item_name=checkin.item.name,
        list_id=checkin.item.list_id,
        list_title=checkin.item.checklist.title,
        author_id=checkin.user_id,
        author_name=checkin.user.display_name,
        author_avatar_url=(
            f"/api/media/avatar/{checkin.user_id}" if checkin.user.avatar_key else None
        ),
        note=checkin.note,
        experienced_at=checkin.experienced_at,
        created_at=checkin.created_at,
        media=[
            MediaOut(
                id=media.id,
                thumbnail_url=f"/api/media/{media.id}/thumbnail",
                original_url=f"/api/media/{media.id}/original",
                sort_order=media.sort_order,
            )
            for media in sorted(checkin.media, key=lambda media: media.sort_order)
        ],
        visibility=checkin.visibility,
        hidden=checkin.hidden_at is not None,
        position=position,
        updated_at=checkin.updated_at,
        item_status=checkin.item.status,
        list_status=checkin.item.checklist.status,
    )
