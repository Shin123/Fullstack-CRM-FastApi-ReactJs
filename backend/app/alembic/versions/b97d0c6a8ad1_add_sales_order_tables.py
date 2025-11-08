"""Add sales order tables

Revision ID: b97d0c6a8ad1
Revises: a7c6d4f9e2ab
Create Date: 2025-11-07 12:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b97d0c6a8ad1"
down_revision = "a7c6d4f9e2ab"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sales_order",
        sa.Column("customer_id", sa.UUID(), nullable=False),
        sa.Column(
            "payment_method",
            sa.String(length=50),
            nullable=False,
            server_default="cash",
        ),
        sa.Column(
            "payment_status",
            sa.String(length=50),
            nullable=False,
            server_default="unpaid",
        ),
        sa.Column(
            "status",
            sa.String(length=50),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("assigned_to", sa.UUID(), nullable=True),
        sa.Column("shipping_address", sa.Text(), nullable=True),
        sa.Column("billing_address", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "discount_total",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "tax_total",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "shipping_fee",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "order_number",
            sa.String(length=32),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "subtotal",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "grand_total",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0",
        ),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("updated_by", sa.UUID(), nullable=True),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fulfilled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("timezone('utc', now())"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("timezone('utc', now())"),
        ),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(
            ["assigned_to"],
            ["user.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["user.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customer.id"],
        ),
        sa.ForeignKeyConstraint(
            ["updated_by"],
            ["user.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_sales_order_assigned_to", "sales_order", ["assigned_to"], unique=False
    )
    op.create_index(
        "ix_sales_order_created_at", "sales_order", ["created_at"], unique=False
    )
    op.create_index(
        "ix_sales_order_customer_id", "sales_order", ["customer_id"], unique=False
    )
    op.create_index("ix_sales_order_status", "sales_order", ["status"], unique=False)

    op.create_table(
        "sales_order_item",
        sa.Column("product_id", sa.UUID(), nullable=True),
        sa.Column("product_name", sa.String(length=255), nullable=False),
        sa.Column("sku", sa.String(length=64), nullable=True),
        sa.Column("thumbnail_image", sa.String(length=2048), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column(
            "unit_price",
            sa.Numeric(10, 2),
            nullable=False,
        ),
        sa.Column(
            "total_price",
            sa.Numeric(10, 2),
            nullable=False,
        ),
        sa.Column("order_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(
            ["order_id"],
            ["sales_order.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["product.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_sales_order_item_order_id",
        "sales_order_item",
        ["order_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_sales_order_item_order_id", table_name="sales_order_item")
    op.drop_table("sales_order_item")
    op.drop_index("ix_sales_order_status", table_name="sales_order")
    op.drop_index("ix_sales_order_customer_id", table_name="sales_order")
    op.drop_index("ix_sales_order_created_at", table_name="sales_order")
    op.drop_index("ix_sales_order_assigned_to", table_name="sales_order")
    op.drop_table("sales_order")
