"""Experience and sharing API contracts."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Visibility = Literal["private", "public"]
CoordinateSystem = Literal["WGS84", "GCJ02", "BD09"]


class PositionIn(BaseModel):
    """Explicitly supplied browser location, never proof of arrival."""

    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy_m: float = Field(ge=0)
    coordinate_system: CoordinateSystem
    located_at: datetime


class CheckinCreate(BaseModel):
    """One new experience with optional staged images."""

    note: str | None = Field(default=None, max_length=30000)
    experienced_at: datetime | None = None
    visibility: Visibility = "private"
    position: PositionIn | None = None
    upload_ids: list[str] = Field(default_factory=list, max_length=8)


class CheckinEdit(BaseModel):
    """Fields editable on one existing experience."""

    note: str | None = Field(default=None, max_length=30000)
    experienced_at: datetime | None = None
    visibility: Visibility | None = None
    position: PositionIn | None = None


class MediaOut(BaseModel):
    """Safe media URLs bound to one experience."""

    id: str
    thumbnail_url: str
    original_url: str | None
    sort_order: int


class PublicCheckinOut(BaseModel):
    """Public experience projection with no private position or email."""

    id: str
    share_id: str
    item_id: str
    item_name: str
    list_id: str
    list_title: str
    author_id: str
    author_name: str
    author_avatar_url: str | None
    note: str | None
    experienced_at: datetime
    created_at: datetime
    media: list[MediaOut]


class OwnCheckinOut(PublicCheckinOut):
    """Owner view including private state and optional position."""

    visibility: Visibility
    hidden: bool
    position: PositionIn | None
    updated_at: datetime
    item_status: str
    list_status: str


class HideIn(BaseModel):
    """Administrator moderation reason."""

    reason: str = Field(min_length=1, max_length=2000)
