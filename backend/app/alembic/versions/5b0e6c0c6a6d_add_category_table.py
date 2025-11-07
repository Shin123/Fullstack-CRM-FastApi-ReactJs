"""Add category table

Revision ID: 5b0e6c0c6a6d
Revises: 1a31ce608336
Create Date: 2024-08-01 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = "5b0e6c0c6a6d"
down_revision = "1a31ce608336"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "category",
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("slug", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("description", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_category_slug"), "category", ["slug"], unique=True)
    op.create_index(op.f("ix_category_name"), "category", ["name"])


def downgrade():
    op.drop_index(op.f("ix_category_name"), table_name="category")
    op.drop_index(op.f("ix_category_slug"), table_name="category")
    op.drop_table("category")
