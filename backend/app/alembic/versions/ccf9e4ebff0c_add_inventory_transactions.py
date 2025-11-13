"""add inventory transactions table

Revision ID: ccf9e4ebff0c
Revises: 7fef6e4d37d8
Create Date: 2025-01-18 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "ccf9e4ebff0c"
down_revision = "7fef6e4d37d8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "inventory_transaction",
        sa.Column(
            "id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column(
            "order_id",
            sa.UUID(),
            nullable=True,
        ),
        sa.Column(
            "type",
            sa.String(length=32),
            nullable=False,
        ),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column(
            "actor_id",
            sa.UUID(),
            nullable=True,
        ),
        sa.Column("memo", sa.String(length=1024), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("timezone('utc', now())"),
        ),
        sa.ForeignKeyConstraint(
            ["actor_id"],
            ["user.id"],
            name="inventory_transaction_actor_id_fkey",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["order_id"],
            ["sales_order.id"],
            name="inventory_transaction_order_id_fkey",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["product.id"],
            name="inventory_transaction_product_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_inventory_transaction_product_id",
        "inventory_transaction",
        ["product_id"],
        unique=False,
    )
    op.create_index(
        "ix_inventory_transaction_order_id",
        "inventory_transaction",
        ["order_id"],
        unique=False,
    )
    op.create_index(
        "ix_inventory_transaction_created_at",
        "inventory_transaction",
        ["created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_inventory_transaction_created_at", table_name="inventory_transaction")
    op.drop_index("ix_inventory_transaction_order_id", table_name="inventory_transaction")
    op.drop_index("ix_inventory_transaction_product_id", table_name="inventory_transaction")
    op.drop_table("inventory_transaction")
