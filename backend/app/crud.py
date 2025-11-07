import re
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlmodel import Session, func, select

from app.core.security import get_password_hash, verify_password
from app.models import (
    Category,
    CategoryCreate,
    CategoryUpdate,
    Item,
    ItemCreate,
    Product,
    ProductCreate,
    ProductStatus,
    ProductUpdate,
    User,
    UserCreate,
    UserUpdate,
)

HEX_DIGITS = set("0123456789abcdef")


def create_user(*, session: Session, user_create: UserCreate) -> User:
    db_obj = User.model_validate(
        user_create, update={"hashed_password": get_password_hash(user_create.password)}
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> Any:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data:
        password = user_data["password"]
        hashed_password = get_password_hash(password)
        extra_data["hashed_password"] = hashed_password
    db_user.sqlmodel_update(user_data, update=extra_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def get_user_by_email(*, session: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)
    session_user = session.exec(statement).first()
    return session_user


def authenticate(*, session: Session, email: str, password: str) -> User | None:
    db_user = get_user_by_email(session=session, email=email)
    print(db_user, "db_user")
    if not db_user:
        return None
    if not verify_password(password, db_user.hashed_password):
        return None
    return db_user


def create_item(*, session: Session, item_in: ItemCreate, owner_id: uuid.UUID) -> Item:
    db_item = Item.model_validate(item_in, update={"owner_id": owner_id})
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item


def get_category(*, session: Session, category_id: uuid.UUID) -> Category | None:
    return session.get(Category, category_id)


def get_category_by_slug(*, session: Session, slug: str) -> Category | None:
    statement = select(Category).where(Category.slug == slug)
    return session.exec(statement).first()


def get_categories(
    *, session: Session, skip: int = 0, limit: int = 100
) -> tuple[list[Category], int]:
    count_statement = select(func.count()).select_from(Category)
    count = session.exec(count_statement).one()
    statement = select(Category).offset(skip).limit(limit)
    categories = session.exec(statement).all()
    return categories, count


def create_category(*, session: Session, category_in: CategoryCreate) -> Category:
    if get_category_by_slug(session=session, slug=category_in.slug):
        raise ValueError("Slug already exists")
    now = datetime.now(timezone.utc)
    db_category = Category.model_validate(
        category_in, update={"created_at": now, "updated_at": now}
    )
    session.add(db_category)
    session.commit()
    session.refresh(db_category)
    return db_category


def update_category(
    *, session: Session, db_category: Category, category_in: CategoryUpdate
) -> Category:
    update_data = category_in.model_dump(exclude_unset=True)
    if not update_data:
        return db_category
    if "slug" in update_data and update_data["slug"] != db_category.slug:
        if get_category_by_slug(session=session, slug=update_data["slug"]):
            raise ValueError("Slug already exists")
    update_data["updated_at"] = datetime.now(timezone.utc)
    db_category.sqlmodel_update(update_data)
    session.add(db_category)
    session.commit()
    session.refresh(db_category)
    return db_category


def delete_category(*, session: Session, db_category: Category) -> None:
    session.delete(db_category)
    session.commit()


def get_product(*, session: Session, product_id: uuid.UUID) -> Product | None:
    return session.get(Product, product_id)


def get_product_by_slug(*, session: Session, slug: str) -> Product | None:
    statement = select(Product).where(Product.slug == slug)
    return session.exec(statement).first()


def _slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^\w\s-]", "", value)
    value = re.sub(r"[\s_-]+", "-", value)
    value = re.sub(r"^-+|-+$", "", value)
    return value or "product"


def _extract_slug_base(slug: str) -> str:
    base, separator, suffix = slug.rpartition("-")
    if separator and len(suffix) == 5 and all(ch in HEX_DIGITS for ch in suffix.lower()):
        return base
    return slug


def _generate_unique_product_slug(session: Session, base_slug: str) -> str:
    base = base_slug or "product"
    while True:
        suffix = uuid.uuid4().hex[:5]
        candidate = f"{base}-{suffix}"
        if not get_product_by_slug(session=session, slug=candidate):
            return candidate


def get_products(
    *,
    session: Session,
    skip: int = 0,
    limit: int = 100,
    category_id: uuid.UUID | None = None,
    status: ProductStatus | None = None,
) -> tuple[list[Product], int]:
    statement = select(Product)
    count_statement = select(func.count()).select_from(Product)

    if category_id:
        statement = statement.where(Product.category_id == category_id)
        count_statement = count_statement.where(Product.category_id == category_id)
    if status:
        statement = statement.where(Product.status == status)
        count_statement = count_statement.where(Product.status == status)

    statement = statement.order_by(Product.created_at.desc()).offset(skip).limit(limit)

    products = session.exec(statement).all()
    count = session.exec(count_statement).one()
    return products, count


def create_product(*, session: Session, product_in: ProductCreate) -> Product:
    category = get_category(session=session, category_id=product_in.category_id)
    if not category:
        raise ValueError("Category not found")

    now = datetime.now(timezone.utc)
    base_slug = _slugify(product_in.name)
    slug = _generate_unique_product_slug(session, base_slug)
    db_product = Product.model_validate(
        product_in,
        update={
            "slug": slug,
            "created_at": now,
            "updated_at": now,
        },
    )
    session.add(db_product)
    session.commit()
    session.refresh(db_product)
    return db_product


def update_product(
    *, session: Session, db_product: Product, product_in: ProductUpdate
) -> Product:
    update_data = product_in.model_dump(exclude_unset=True)
    if not update_data:
        return db_product
    if "category_id" in update_data:
        category_id = update_data["category_id"]
        if category_id and not get_category(session=session, category_id=category_id):
            raise ValueError("Category not found")

    if "name" in update_data and update_data["name"] is not None:
        new_base = _slugify(update_data["name"])
        current_base = _extract_slug_base(db_product.slug)
        if new_base != current_base:
            update_data["slug"] = _generate_unique_product_slug(session, new_base)

    update_data["updated_at"] = datetime.now(timezone.utc)
    db_product.sqlmodel_update(update_data)
    session.add(db_product)
    session.commit()
    session.refresh(db_product)
    return db_product


def delete_product(*, session: Session, db_product: Product) -> None:
    session.delete(db_product)
    session.commit()
