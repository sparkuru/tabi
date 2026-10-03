"""Add universal checklist import identities without changing existing rows.

Revision ID: a748bd701acf
Revises: cf8b4151f81e
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a748bd701acf"
down_revision: str | None = "cf8b4151f81e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create additive import identities and their foreign keys."""
    op.create_table(
        "checklist_imports",
        sa.Column("id", sa.Uuid(as_uuid=False), nullable=False),
        sa.Column("package_key", sa.String(80), nullable=False),
        sa.Column("format_version", sa.Integer(), nullable=False),
        sa.Column("payload_hash", sa.String(64), nullable=False),
        sa.Column("list_id", sa.Uuid(as_uuid=False), nullable=False),
        sa.Column("item_ids_by_key", sa.JSON(), nullable=False),
        sa.Column("imported_by", sa.Uuid(as_uuid=False), nullable=False),
        sa.Column("imported_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["list_id"], ["lists.id"]),
        sa.ForeignKeyConstraint(["imported_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("package_key", name="uq_checklist_import_package"),
    )


def downgrade() -> None:
    """Drop only import metadata in an explicitly disposable test database."""
    op.drop_table("checklist_imports")
