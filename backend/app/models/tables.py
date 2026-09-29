"""Persistent entities and domain constraints."""

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def new_id() -> str:
    """Create an opaque primary key."""
    return str(uuid4())


def now_utc() -> datetime:
    """Create an aware UTC timestamp."""
    return datetime.now(UTC)


class User(Base):
    """Account identity; email never appears in public responses."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(80), nullable=False)
    avatar_key: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(24), nullable=False, default="user")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    sessions: Mapped[list["LoginSession"]] = relationship(back_populates="user")


class LoginSession(Base):
    """Revocable browser session with a separate CSRF secret."""

    __tablename__ = "login_sessions"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    csrf_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    user: Mapped[User] = relationship(back_populates="sessions")


class Checklist(Base):
    """Administrator-owned theme or checklist."""

    __tablename__ = "lists"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_id)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    cover_key: Mapped[str | None] = mapped_column(String(255))
    category: Mapped[str | None] = mapped_column(String(80))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="draft")
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    removed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    items: Mapped[list["Item"]] = relationship(back_populates="checklist")


class Item(Base):
    """One independent checklist entry, including optional place data."""

    __tablename__ = "items"
    __table_args__ = (
        Index("ix_items_list_sort", "list_id", "sort_order"),
        UniqueConstraint("list_id", "dedupe_key", name="uq_item_within_list"),
        CheckConstraint("latitude BETWEEN -90 AND 90 OR latitude IS NULL", name="item_latitude"),
        CheckConstraint(
            "longitude BETWEEN -180 AND 180 OR longitude IS NULL", name="item_longitude"
        ),
    )

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_id)
    list_id: Mapped[str] = mapped_column(ForeignKey("lists.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    dedupe_key: Mapped[str] = mapped_column(String(512), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    cover_key: Mapped[str | None] = mapped_column(String(255))
    category: Mapped[str | None] = mapped_column(String(80))
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    suggested_action: Mapped[str | None] = mapped_column(Text)
    recommendation: Mapped[str | None] = mapped_column(Text)
    reference_note: Mapped[str | None] = mapped_column(Text)
    reference_as_of: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    missing_fields: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="draft")
    place_kind: Mapped[str] = mapped_column(String(24), nullable=False, default="none")
    place_name: Mapped[str | None] = mapped_column(String(160))
    address: Mapped[str | None] = mapped_column(String(255))
    area: Mapped[str | None] = mapped_column(String(160))
    online_url: Mapped[str | None] = mapped_column(String(2048))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    coordinate_system: Mapped[str | None] = mapped_column(String(24))
    source: Mapped[str | None] = mapped_column(Text)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    removed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    checklist: Mapped[Checklist] = relationship(back_populates="items")
    links: Mapped[list["ItemLink"]] = relationship(
        back_populates="item", cascade="all, delete-orphan"
    )


class ItemLink(Base):
    """Titled external reference for an item."""

    __tablename__ = "item_links"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_id)
    item_id: Mapped[str] = mapped_column(ForeignKey("items.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    kind: Mapped[str] = mapped_column(String(24), nullable=False, default="reference")

    item: Mapped[Item] = relationship(back_populates="links")


class ItemRelation(Base):
    """Same-list relationship between two distinct items."""

    __tablename__ = "item_relations"
    __table_args__ = (
        UniqueConstraint("item_id", "related_item_id", name="uq_item_relation"),
        CheckConstraint("item_id != related_item_id", name="no_self_relation"),
    )

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_id)
    item_id: Mapped[str] = mapped_column(ForeignKey("items.id"), nullable=False)
    related_item_id: Mapped[str] = mapped_column(ForeignKey("items.id"), nullable=False)
    relation_kind: Mapped[str] = mapped_column(String(24), nullable=False, default="related")


class Checkin(Base):
    """One experience; repeat visits create separate rows."""

    __tablename__ = "checkins"
    __table_args__ = (
        UniqueConstraint("user_id", "idempotency_key", name="uq_checkin_idempotency"),
        Index("ix_checkins_item_public", "item_id", "visibility", "deleted_at", "hidden_at"),
        CheckConstraint("latitude BETWEEN -90 AND 90 OR latitude IS NULL", name="checkin_latitude"),
        CheckConstraint(
            "longitude BETWEEN -180 AND 180 OR longitude IS NULL", name="checkin_longitude"
        ),
    )

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    item_id: Mapped[str] = mapped_column(ForeignKey("items.id"), nullable=False, index=True)
    idempotency_key: Mapped[str] = mapped_column(String(80), nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    share_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    experienced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    visibility: Mapped[str] = mapped_column(String(24), nullable=False, default="private")
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    accuracy_m: Mapped[float | None] = mapped_column(Float)
    coordinate_system: Mapped[str | None] = mapped_column(String(24))
    located_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    hidden_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship()
    item: Mapped[Item] = relationship()
    media: Mapped[list["Media"]] = relationship(
        back_populates="checkin", cascade="all, delete-orphan"
    )


class Media(Base):
    """Private original and stripped public derivative for a check-in."""

    __tablename__ = "media"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_id)
    checkin_id: Mapped[str] = mapped_column(ForeignKey("checkins.id"), nullable=False, index=True)
    storage_key: Mapped[str] = mapped_column(String(255), nullable=False)
    thumbnail_key: Mapped[str] = mapped_column(String(255), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    checkin: Mapped[Checkin] = relationship(back_populates="media")


class PendingUpload(Base):
    """Validated private image awaiting attachment to one record."""

    __tablename__ = "pending_uploads"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    storage_key: Mapped[str] = mapped_column(String(255), nullable=False)
    thumbnail_key: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class AuditLog(Base):
    """Administrator content action trail."""

    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_id)
    actor_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    target_type: Mapped[str] = mapped_column(String(40), nullable=False)
    target_id: Mapped[str] = mapped_column(String(64), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class ImportBatch(Base):
    """Trace reviewed source material imported by an administrator."""

    __tablename__ = "import_batches"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_id)
    list_id: Mapped[str] = mapped_column(ForeignKey("lists.id"), nullable=False, index=True)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    reviewed_by: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
