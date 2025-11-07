"""Add tax_rate to product

Revision ID: 5d1c8fdf8e4d
Revises: 8bb4a7a65f3c
Create Date: 2025-11-07 00:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "5d1c8fdf8e4d"
down_revision = "8bb4a7a65f3c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "product",
        sa.Column("tax_rate", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("product", "tax_rate")
