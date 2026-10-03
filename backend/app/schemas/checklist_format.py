"""Versioned, strict file contract for one administrator-owned checklist."""

from datetime import datetime
from typing import Annotated, Literal

from pydantic import (
    AfterValidator,
    AnyHttpUrl,
    BaseModel,
    ConfigDict,
    Field,
    StrictInt,
    UrlConstraints,
    field_validator,
)

from app.schemas.catalog import ChecklistWrite, ItemLinkIn, ItemWrite


def _validate_stored_url(value: AnyHttpUrl) -> AnyHttpUrl:
    """Percent encoding may expand a short Unicode URL beyond its storage limit."""
    if len(str(value)) > 2048:
        raise ValueError("Normalized URL must not exceed 2048 characters")
    return value


ImportUrl = Annotated[
    AnyHttpUrl, UrlConstraints(max_length=2048), AfterValidator(_validate_stored_url)
]

PackageKey = Annotated[str, Field(min_length=1, max_length=80, pattern=r"^[a-z0-9][a-z0-9._-]*$")]
ImportSortOrder = Annotated[StrictInt, Field(ge=-2147483648, le=2147483647)]


class ChecklistContent(ChecklistWrite):
    """Importable list content without IDs or publication state."""

    model_config = ConfigDict(extra="forbid", strict=True)
    sort_order: ImportSortOrder = 0

    @field_validator("title")
    @classmethod
    def trim_title(cls, value: str) -> str:
        """Reject blank names after trimming."""
        value = value.strip()
        if not value:
            raise ValueError("Title must not be blank")
        return value


class ChecklistLink(ItemLinkIn):
    """Strict nested link contract using existing URL validation."""

    model_config = ConfigDict(extra="forbid", strict=True)
    url: ImportUrl

    @field_validator("title")
    @classmethod
    def trim_title(cls, value: str) -> str:
        """Require a visible link label."""
        value = value.strip()
        if not value:
            raise ValueError("Link title must not be blank")
        return value


class ChecklistItem(ItemWrite):
    """Item data and references local to one import document."""

    model_config = ConfigDict(extra="forbid", strict=True)
    key: PackageKey
    sort_order: ImportSortOrder = 0
    reference_as_of: datetime | None = Field(default=None, strict=False)
    verified_at: datetime | None = Field(default=None, strict=False)
    online_url: ImportUrl | None = None
    links: list[ChecklistLink] = Field(default_factory=list, max_length=20)
    related_keys: list[PackageKey] = Field(default_factory=list, max_length=199)

    @field_validator("name")
    @classmethod
    def trim_name(cls, value: str) -> str:
        """Require a name after whitespace normalization."""
        value = value.strip()
        if not value:
            raise ValueError("Name must not be blank")
        return value

    @field_validator("reference_as_of", "verified_at", mode="before")
    @classmethod
    def validate_date_type(cls, value: object) -> object:
        """Accept date strings or datetime values, never numeric timestamps."""
        if value is not None and not isinstance(value, (str, datetime)):
            raise ValueError("Date must be an ISO 8601 string")
        return value


class ChecklistDocument(BaseModel):
    """One UTF-8 JSON file, limited to 200 items and 2 MiB in transport."""

    model_config = ConfigDict(extra="forbid", strict=True)
    format: Literal["tabi.checklist"]
    version: Literal[1]
    key: PackageKey
    list: ChecklistContent
    items: list[ChecklistItem] = Field(min_length=1, max_length=200)
    source: str | None = Field(default=None, max_length=2000)

    @field_validator("version", mode="before")
    @classmethod
    def integer_version(cls, value: object) -> object:
        """Do not coerce boolean or string versions to v1."""
        if type(value) is not int:
            raise ValueError("Version must be integer 1")
        return value


class ChecklistPreviewOut(BaseModel):
    """Validated import preview; it is not a write authorization token."""

    key: str
    title: str
    item_count: int
    items: list[ChecklistItem]
    state: Literal["ready", "existing", "conflict"]
    existing_list_id: str | None


class ChecklistImportOut(BaseModel):
    """Stable IDs from the original import, including a reuse indicator."""

    list_id: str
    item_ids_by_key: dict[str, str]
    reused: bool
