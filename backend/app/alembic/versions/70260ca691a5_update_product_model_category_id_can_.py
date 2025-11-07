"""Update: Product Model -  category_id can null

Revision ID: 70260ca691a5
Revises: 8ebfbe431741
Create Date: 2025-11-07 20:09:07.266974

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "70260ca691a5"
down_revision = "8ebfbe431741"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column(
        "product",
        "category_id",
        existing_type=sa.UUID(),
        nullable=True,
    )


def downgrade():
    op.alter_column(
        "product",
        "category_id",
        existing_type=sa.UUID(),
        nullable=False,
    )
