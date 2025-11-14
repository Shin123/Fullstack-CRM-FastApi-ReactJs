"""add media table

Revision ID: d4a0d1b6c9dd
Revises: ccf9e4ebff0c
Create Date: 2025-01-18 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "d4a0d1b6c9dd"
down_revision = "ccf9e4ebff0c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "media",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("file_name", sa.String(length=512), nullable=False),
        sa.Column("file_url", sa.String(length=1024), nullable=False),
        sa.Column("file_path", sa.String(length=1024), nullable=False),
        sa.Column("mime_type", sa.String(length=128), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("original_name", sa.String(length=512), nullable=True),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("timezone('utc', now())"),
        ),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["user.id"],
            name="media_created_by_fkey",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_media_created_at", "media", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_media_created_at", table_name="media")
    op.drop_table("media")
