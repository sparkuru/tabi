"""add_item_tags

Revision ID: cf8b4151f81e
Revises: d10311bdf0be
Create Date: 2026-09-29 23:03:13.267279
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "cf8b4151f81e"
down_revision: str | None = "d10311bdf0be"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add tags while backfilling existing items with an empty array."""
    op.add_column(
        "items",
        sa.Column("tags", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
    )


def downgrade() -> None:
    """Remove item tags."""
    op.drop_column("items", "tags")
