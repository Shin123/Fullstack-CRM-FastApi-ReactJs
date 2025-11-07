"""Add SKU column to product

Revision ID: 8bb4a7a65f3c
Revises: 70260ca691a5
Create Date: 2025-11-07 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "8bb4a7a65f3c"
down_revision = "70260ca691a5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "product",
        sa.Column("sku", sa.String(length=64), nullable=True),
    )
    op.create_index(op.f("ix_product_sku"), "product", ["sku"], unique=True)
    op.execute("UPDATE product SET sku = 'SKU-' || id::text WHERE sku IS NULL")
    op.alter_column(
        "product",
        "sku",
        existing_type=sa.String(length=64),
        nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "product",
        "sku",
        existing_type=sa.String(length=64),
        nullable=True,
    )
    op.drop_index(op.f("ix_product_sku"), table_name="product")
    op.drop_column("product", "sku")
