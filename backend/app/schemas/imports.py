"""Reviewed item import contracts."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.catalog import ItemWrite


class ReviewedImportRow(BaseModel):
    """One OCR-transcribed item with explicit human review flags."""

    item: ItemWrite
    transcription_reviewed: bool
    coordinates_checked: bool = False


class ReviewedImportIn(BaseModel):
    """One human-reviewed import batch with source provenance."""

    source: str = Field(min_length=1, max_length=2000)
    reviewed_at: datetime
    rows: list[ReviewedImportRow] = Field(min_length=1, max_length=200)


class ReviewedImportOut(BaseModel):
    """IDs created by one reviewed import batch."""

    batch_id: str
    item_ids: list[str]
