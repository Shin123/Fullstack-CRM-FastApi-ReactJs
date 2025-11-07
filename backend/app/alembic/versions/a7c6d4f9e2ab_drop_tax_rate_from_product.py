"""Drop tax_rate from product

Revision ID: a7c6d4f9e2ab
Revises: 8bb4a7a65f3c
Create Date: 2025-11-07 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a7c6d4f9e2ab"
down_revision = "8bb4a7a65f3c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("product")}
    if "tax_rate" in columns:
        op.drop_column("product", "tax_rate")


def downgrade() -> None:
    op.add_column(
        "product",
        sa.Column("tax_rate", sa.Integer(), nullable=False, server_default="0"),
    )
