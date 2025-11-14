import uuid
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Annotated, Optional

import sqlalchemy as sa
from pydantic import EmailStr, field_validator
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=40)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=40)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=40)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(ItemBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str = Field(max_length=255)
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


# Shared properties
class CategoryBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=255, unique=True, index=True)
    description: str | None = Field(default=None, max_length=1024)


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore
    slug: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore
    description: str | None = Field(default=None, max_length=1024)


class Category(CategoryBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(
        default_factory=utc_now,
        nullable=False,
        sa_column_kwargs={"server_default": "timezone('utc', now())"},
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        nullable=False,
        sa_column_kwargs={"server_default": "timezone('utc', now())"},
    )
    products: list["Product"] = Relationship(
        back_populates="category", cascade_delete=True
    )


class CategoryPublic(CategoryBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class CategoriesPublic(SQLModel):
    data: list[CategoryPublic]
    count: int


class ProductStatus(str, Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class ProductBadge(str, Enum):
    new = "new"
    sale = "sale"
    featured = "featured"


class ProductBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    sku: str = Field(min_length=1, max_length=64)
    thumbnail_image: str | None = Field(default=None, max_length=2048)
    images: list[str] = Field(default_factory=list)
    description: str | None = Field(default=None, max_length=2048)
    price: Decimal = Field(default=Decimal("0"), ge=0)
    price_origin: Decimal | None = Field(default=None, ge=0)
    badge: ProductBadge | None = Field(default=None)
    stock: int = Field(default=0)
    status: ProductStatus = Field(default=ProductStatus.draft)


class ProductCreate(ProductBase):
    category_id: uuid.UUID | None = None


class ProductUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore
    sku: str | None = Field(default=None, min_length=1, max_length=64)
    thumbnail_image: str | None = Field(default=None, max_length=2048)
    images: list[str] | None = None
    description: str | None = Field(default=None, max_length=2048)
    price: Decimal | None = Field(default=None, ge=0)
    price_origin: Decimal | None = Field(default=None, ge=0)
    badge: ProductBadge | None = Field(default=None)
    stock: int | None = Field(default=None)
    status: ProductStatus | None = Field(default=None)
    category_id: uuid.UUID | None = None


class Product(ProductBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    category_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="category.id",
        nullable=True,
        ondelete="CASCADE",
        index=True,
    )
    slug: str = Field(
        min_length=1,
        max_length=255,
        sa_column=Column(sa.String(length=255), nullable=False, unique=True),
    )
    sku: str = Field(
        min_length=1,
        max_length=64,
        sa_column=Column(sa.String(length=64), nullable=False, unique=True),
    )
    thumbnail_image: str | None = Field(
        default=None,
        sa_column=Column(sa.String(length=2048), nullable=True),
    )
    description: str | None = Field(
        default=None,
        sa_column=Column(sa.String(length=2048), nullable=True),
    )
    price: Decimal = Field(
        default=Decimal("0"),
        ge=0,
        sa_column=Column(sa.Numeric(10, 2), nullable=False, server_default="0"),
    )
    price_origin: Decimal | None = Field(
        default=None,
        ge=0,
        sa_column=Column(sa.Numeric(10, 2), nullable=True),
    )
    badge: ProductBadge | None = Field(
        default=None,
        sa_column=Column(sa.String(length=50), nullable=True),
    )
    stock: int = Field(
        default=0,
        ge=0,
        sa_column=Column(sa.Integer, nullable=False, server_default="0"),
    )
    status: ProductStatus = Field(
        default=ProductStatus.draft,
        sa_column=Column(
            sa.String(length=50),
            nullable=False,
            server_default=ProductStatus.draft.value,
        ),
    )
    images: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
    )
    created_at: datetime = Field(
        default_factory=utc_now,
        nullable=False,
        sa_column_kwargs={"server_default": "timezone('utc', now())"},
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        nullable=False,
        sa_column_kwargs={"server_default": "timezone('utc', now())"},
    )
    category: Category | None = Relationship(back_populates="products")


class ProductPublic(ProductBase):
    id: uuid.UUID
    category_id: uuid.UUID | None = None
    slug: str
    created_at: datetime
    updated_at: datetime


class ProductsPublic(SQLModel):
    data: list[ProductPublic]
    count: int


# Customer
class CustomerBase(SQLModel):
    name: str = Field(max_length=255)
    phone: str = Field(max_length=50, unique=True, index=True)
    email: EmailStr | None = Field(
        default=None, max_length=255, unique=False, index=True
    )
    address: str | None = Field(default=None, sa_column=Column(sa.Text))


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(SQLModel):
    name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    email: EmailStr | None = Field(default=None, max_length=255)
    address: str | None = Field(default=None)


class Customer(CustomerBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(
        default_factory=utc_now,
        nullable=False,
        sa_column_kwargs={"server_default": "timezone('utc', now())"},
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        nullable=False,
        sa_column_kwargs={"server_default": "timezone('utc', now())"},
    )


class CustomerPublic(CustomerBase):
    id: uuid.UUID


class CustomersPublic(SQLModel):
    data: list[CustomerPublic]
    count: int


class AppConfigPublic(SQLModel):
    default_currency: str


class OrderStatus(str, Enum):
    draft = "draft"
    confirmed = "confirmed"
    paid = "paid"
    fulfilled = "fulfilled"
    cancelled = "cancelled"


class PaymentMethod(str, Enum):
    cash = "cash"
    cod = "cod"
    card = "card"
    bank_transfer = "bank_transfer"


class PaymentStatus(str, Enum):
    unpaid = "unpaid"
    pending = "pending"
    paid = "paid"
    refunded = "refunded"


class OrderItemCreate(SQLModel):
    product_id: uuid.UUID
    quantity: int = Field(gt=0)


class OrderItemBase(SQLModel):
    product_id: uuid.UUID | None = None
    product_name: str = Field(min_length=1, max_length=255)
    sku: str | None = Field(default=None, max_length=64)
    thumbnail_image: str | None = Field(default=None, max_length=2048)
    quantity: int = Field(ge=1)
    unit_price: Decimal = Field(default=Decimal("0"), ge=0)
    total_price: Decimal = Field(default=Decimal("0"), ge=0)


class OrderItem(OrderItemBase, table=True):
    __tablename__ = "sales_order_item"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    order_id: uuid.UUID = Field(
        foreign_key="sales_order.id", nullable=False, ondelete="CASCADE", index=True
    )
    product_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="product.id",
        nullable=True,
        ondelete="SET NULL",
    )
    order: Optional["Order"] = Relationship(back_populates="items")


class OrderItemPublic(OrderItemBase):
    id: uuid.UUID
    order_id: uuid.UUID


class OrderBase(SQLModel):
    customer_id: Annotated[
        uuid.UUID,
        Field(
            foreign_key="customer.id",
            nullable=False,
        ),
    ]
    payment_method: PaymentMethod = Field(
        default=PaymentMethod.cash,
        sa_column=Column(
            sa.String(length=50),
            nullable=False,
            server_default=PaymentMethod.cash.value,
        ),
    )
    payment_status: PaymentStatus = Field(
        default=PaymentStatus.unpaid,
        sa_column=Column(
            sa.String(length=50),
            nullable=False,
            server_default=PaymentStatus.unpaid.value,
        ),
    )
    status: OrderStatus = Field(
        default=OrderStatus.draft,
        sa_column=Column(
            sa.String(length=50), nullable=False, server_default=OrderStatus.draft.value
        ),
    )
    assigned_to: Annotated[
        uuid.UUID | None,
        Field(
            default=None,
            foreign_key="user.id",
            nullable=True,
        ),
    ]
    shipping_address: str | None = Field(
        default=None, sa_column=Column(sa.Text, nullable=True)
    )
    billing_address: str | None = Field(
        default=None, sa_column=Column(sa.Text, nullable=True)
    )
    notes: str | None = Field(default=None, sa_column=Column(sa.Text, nullable=True))
    discount_total: Decimal = Field(default=Decimal("0"), ge=0)
    tax_total: Decimal = Field(default=Decimal("0"), ge=0)
    shipping_fee: Decimal = Field(default=Decimal("0"), ge=0)


class OrderCreate(OrderBase):
    items: list[OrderItemCreate]


class OrderUpdate(SQLModel):
    payment_method: PaymentMethod | None = None
    payment_status: PaymentStatus | None = None
    status: OrderStatus | None = None
    assigned_to: uuid.UUID | None = None
    shipping_address: str | None = Field(default=None, sa_column=Column(sa.Text))
    billing_address: str | None = Field(default=None, sa_column=Column(sa.Text))
    notes: str | None = Field(default=None, sa_column=Column(sa.Text))
    discount_total: Decimal | None = Field(default=None, ge=0)
    tax_total: Decimal | None = Field(default=None, ge=0)
    shipping_fee: Decimal | None = Field(default=None, ge=0)


class Order(OrderBase, table=True):
    __tablename__ = "sales_order"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    order_number: str = Field(
        max_length=32,
        sa_column=Column(sa.String(length=32), unique=True, nullable=False, index=True),
    )
    subtotal: Decimal = Field(
        default=Decimal("0"),
        ge=0,
        sa_column=Column(sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    grand_total: Decimal = Field(
        default=Decimal("0"),
        ge=0,
        sa_column=Column(sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    created_by: uuid.UUID | None = Field(
        default=None, foreign_key="user.id", nullable=True, ondelete="SET NULL"
    )
    updated_by: uuid.UUID | None = Field(
        default=None, foreign_key="user.id", nullable=True, ondelete="SET NULL"
    )
    confirmed_at: datetime | None = None
    paid_at: datetime | None = None
    fulfilled_at: datetime | None = None
    cancelled_at: datetime | None = None
    created_at: datetime = Field(
        default_factory=utc_now,
        nullable=False,
        sa_column_kwargs={"server_default": "timezone('utc', now())"},
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        nullable=False,
        sa_column_kwargs={"server_default": "timezone('utc', now())"},
    )
    items: list[OrderItem] = Relationship(
        back_populates="order",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class OrderPublic(OrderBase):
    id: uuid.UUID
    order_number: str
    subtotal: Decimal
    grand_total: Decimal
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None
    confirmed_at: datetime | None = None
    paid_at: datetime | None = None
    fulfilled_at: datetime | None = None
    cancelled_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemPublic]


class OrdersPublic(SQLModel):
    data: list[OrderPublic]
    count: int


class MediaBase(SQLModel):
    file_name: str = Field(max_length=512)
    file_url: str = Field(max_length=1024)
    mime_type: str = Field(max_length=128)
    file_size: int = Field(ge=0)
    width: int | None = Field(default=None, ge=0)
    height: int | None = Field(default=None, ge=0)
    original_name: str | None = Field(default=None, max_length=512)


class MediaCreate(MediaBase):
    created_by: uuid.UUID | None = None
    file_path: str = Field(max_length=1024)


class Media(MediaBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    file_path: str = Field(max_length=1024)
    created_by: uuid.UUID | None = Field(
        default=None,
        foreign_key="user.id",
        nullable=True,
        ondelete="SET NULL",
    )
    created_at: datetime = Field(default_factory=utc_now, nullable=False)


class MediaPublic(MediaBase):
    id: uuid.UUID
    created_at: datetime
    created_by: uuid.UUID | None = None


class MediaList(SQLModel):
    data: list[MediaPublic]
    count: int


class InventoryTransactionType(str, Enum):
    sale = "sale"
    return_ = "return"
    adjustment = "adjustment"


class InventoryTransactionBase(SQLModel):
    product_id: uuid.UUID = Field(
        foreign_key="product.id",
        nullable=False,
        ondelete="CASCADE",
    )
    order_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="sales_order.id",
        nullable=True,
        ondelete="SET NULL",
    )
    type: InventoryTransactionType = Field(
        sa_column=Column(sa.String(length=32), nullable=False)
    )
    quantity: int
    actor_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="user.id",
        nullable=True,
        ondelete="SET NULL",
    )
    memo: str | None = Field(default=None, max_length=1024)


class InventoryTransaction(InventoryTransactionBase, table=True):
    __tablename__ = "inventory_transaction"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("timezone('utc', now())"),
        ),
    )


class InventoryTransactionPublic(InventoryTransactionBase):
    id: uuid.UUID
    created_at: datetime


class InventoryTransactionsPublic(SQLModel):
    data: list[InventoryTransactionPublic]
    count: int


class InventoryAdjustmentCreate(SQLModel):
    product_id: uuid.UUID
    quantity: int
    memo: str | None = Field(default=None, max_length=1024)

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, value: int) -> int:
        if value == 0:
            raise ValueError("Quantity must be non-zero")
        return value


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=40)
