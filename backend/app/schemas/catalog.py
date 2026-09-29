"""Checklist and item API contracts."""

from datetime import datetime
from typing import Literal

from pydantic import AnyHttpUrl, BaseModel, Field, model_validator

PlaceKind = Literal["none", "physical", "area", "online"]
CoordinateSystem = Literal["WGS84", "GCJ02", "BD09"]


class ChecklistWrite(BaseModel):
    """Editable checklist content."""

    title: str = Field(min_length=1, max_length=160)
    summary: str = Field(default="", max_length=5000)
    category: str | None = Field(default=None, max_length=80)
    sort_order: int = 0


class ChecklistOut(BaseModel):
    """Checklist card with viewer-specific progress."""

    id: str
    title: str
    summary: str
    category: str | None
    sort_order: int
    cover_url: str | None
    status: str
    item_count: int
    completed_count: int
    record_count: int


class ItemLinkIn(BaseModel):
    """Titled safe external link."""

    title: str = Field(min_length=1, max_length=160)
    url: AnyHttpUrl
    kind: str = Field(default="reference", max_length=24)


class ItemLinkOut(BaseModel):
    """External link response."""

    id: str
    title: str
    url: str
    kind: str


class ItemWrite(BaseModel):
    """Editable item content and optional structured place."""

    name: str = Field(min_length=1, max_length=160)
    summary: str = Field(default="", max_length=5000)
    description: str = Field(default="", max_length=30000)
    category: str | None = Field(default=None, max_length=80)
    tags: list[str] = Field(default_factory=list, max_length=20)
    suggested_action: str | None = Field(default=None, max_length=5000)
    recommendation: str | None = Field(default=None, max_length=5000)
    reference_note: str | None = Field(default=None, max_length=5000)
    reference_as_of: datetime | None = None
    missing_fields: list[str] = Field(default_factory=list, max_length=20)
    sort_order: int = 0
    place_kind: PlaceKind = "none"
    place_name: str | None = Field(default=None, max_length=160)
    address: str | None = Field(default=None, max_length=255)
    area: str | None = Field(default=None, max_length=160)
    online_url: AnyHttpUrl | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    coordinate_system: CoordinateSystem | None = None
    source: str | None = Field(default=None, max_length=2000)
    verified_at: datetime | None = None
    links: list[ItemLinkIn] = Field(default_factory=list, max_length=20)

    @model_validator(mode="after")
    def validate_place(self) -> "ItemWrite":
        """Require complete, labeled coordinates when supplied."""
        has_latitude = self.latitude is not None
        has_longitude = self.longitude is not None
        if has_latitude != has_longitude:
            raise ValueError("Latitude and longitude must be supplied together")
        if has_latitude != (self.coordinate_system is not None):
            raise ValueError("Coordinates require a coordinate system")
        if bool(self.reference_note) != (self.reference_as_of is not None):
            raise ValueError("Dated reference information requires both text and date")
        return self


class ItemSummaryOut(BaseModel):
    """Item card with viewer-specific status."""

    id: str
    list_id: str
    name: str
    summary: str
    category: str | None
    tags: list[str]
    cover_url: str | None
    sort_order: int
    status: str
    completed: bool
    checkin_count: int


class ItemDetailOut(ItemSummaryOut):
    """Full item details with place and related content."""

    description: str
    suggested_action: str | None
    recommendation: str | None
    reference_note: str | None
    reference_as_of: datetime | None
    missing_fields: list[str]
    place_kind: PlaceKind
    place_name: str | None
    address: str | None
    area: str | None
    online_url: str | None
    latitude: float | None
    longitude: float | None
    coordinate_system: CoordinateSystem | None
    source: str | None
    verified_at: datetime | None
    links: list[ItemLinkOut]
    related: list[ItemSummaryOut]


class RelationIn(BaseModel):
    """Same-list related item reference."""

    related_item_id: str
    relation_kind: str = Field(default="related", max_length=24)


class Page[T](BaseModel):
    """Offset-paginated response."""

    items: list[T]
    total: int
    limit: int
    offset: int
