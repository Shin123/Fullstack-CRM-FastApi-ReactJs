import uuid
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum

import sqlalchemy as sa
from pydantic import EmailStr
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
    thumbnail_image: str | None = Field(default=None, max_length=2048)
    images: list[str] = Field(default_factory=list)
    description: str | None = Field(default=None, max_length=2048)
    price: Decimal = Field(default=Decimal("0"), ge=0)
    price_origin: Decimal | None = Field(default=None, ge=0)
    badge: ProductBadge | None = Field(default=None)
    stock: int = Field(default=0, ge=0)
    status: ProductStatus = Field(default=ProductStatus.draft)


class ProductCreate(ProductBase):
    category_id: uuid.UUID | None = None


class ProductUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore
    thumbnail_image: str | None = Field(default=None, max_length=2048)
    images: list[str] | None = None
    description: str | None = Field(default=None, max_length=2048)
    price: Decimal | None = Field(default=None, ge=0)
    price_origin: Decimal | None = Field(default=None, ge=0)
    badge: ProductBadge | None = Field(default=None)
    stock: int | None = Field(default=None, ge=0)
    status: ProductStatus | None = Field(default=None)
    category_id: uuid.UUID | None = None


class Product(ProductBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    category_id: uuid.UUID = Field(
        foreign_key="category.id", nullable=False, ondelete="CASCADE", index=True
    )
    slug: str = Field(
        min_length=1,
        max_length=255,
        sa_column=Column(sa.String(length=255), nullable=False, unique=True),
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
    category_id: uuid.UUID
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
