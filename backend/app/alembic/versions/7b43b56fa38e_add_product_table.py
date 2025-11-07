"""Add product table

Revision ID: 7b43b56fa38e
Revises: 5b0e6c0c6a6d
Create Date: 2024-08-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "7b43b56fa38e"
down_revision = "5b0e6c0c6a6d"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "product",
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("slug", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("thumbnail_image", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("images", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("description", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("price", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("price_origin", sa.Numeric(10, 2), nullable=True),
        sa.Column("badge", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("stock", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default="draft"),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("timezone('utc', now())"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("timezone('utc', now())"),
            nullable=False,
        ),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("category_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["category.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_product_slug"), "product", ["slug"], unique=True)
    op.create_index(op.f("ix_product_status"), "product", ["status"])
    op.create_index(op.f("ix_product_category_id"), "product", ["category_id"])


def downgrade():
    op.drop_index(op.f("ix_product_category_id"), table_name="product")
    op.drop_index(op.f("ix_product_status"), table_name="product")
    op.drop_index(op.f("ix_product_slug"), table_name="product")
    op.drop_table("product")
