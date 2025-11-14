import re
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlmodel import Session, func, select

from app.core.security import get_password_hash, verify_password
from app.models import (
    Category,
    CategoryCreate,
    CategoryUpdate,
    Customer,
    CustomerCreate,
    CustomerUpdate,
    InventoryAdjustmentCreate,
    InventoryTransaction,
    InventoryTransactionType,
    Item,
    ItemCreate,
    Order,
    OrderCreate,
    OrderItem,
    # OrderItemCreate,
    OrderStatus,
    OrderUpdate,
    PaymentStatus,
    Product,
    ProductCreate,
    ProductStatus,
    ProductUpdate,
    User,
    UserCreate,
    UserUpdate,
    Media,
    MediaCreate,
)

HEX_DIGITS = set("0123456789abcdef")
INVENTORY_DEDUCT_STATUSES = {
    OrderStatus.confirmed,
    OrderStatus.paid,
    OrderStatus.fulfilled,
}


def _requires_inventory_deduction(status: OrderStatus | None) -> bool:
    return bool(status and status in INVENTORY_DEDUCT_STATUSES)


def _order_has_transactions(
    *, session: Session, order_id: uuid.UUID, tx_type: InventoryTransactionType
) -> bool:
    statement = (
        select(func.count())
        .select_from(InventoryTransaction)
        .where(
            InventoryTransaction.order_id == order_id,
            InventoryTransaction.type == tx_type,
        )
    )
    return session.exec(statement).one() > 0


def adjust_product_stock(
    *,
    session: Session,
    product_id: uuid.UUID,
    delta: int,
    tx_type: InventoryTransactionType,
    order_id: uuid.UUID | None = None,
    actor_id: uuid.UUID | None = None,
    memo: str | None = None,
    allow_negative: bool = False,
) -> InventoryTransaction:
    product_statement = (
        select(Product).where(Product.id == product_id).with_for_update()
    )
    product = session.exec(product_statement).one_or_none()
    if not product:
        raise ValueError("Product not found")

    new_stock = (product.stock or 0) + delta
    if not allow_negative and new_stock < 0:
        raise ValueError("Insufficient stock")
    product.stock = new_stock

    transaction = InventoryTransaction(
        product_id=product_id,
        order_id=order_id,
        type=tx_type,
        quantity=delta,
        actor_id=actor_id,
        memo=memo,
    )
    session.add(product)
    session.add(transaction)
    session.flush()
    return transaction


def deduct_inventory_for_order(
    *, session: Session, order: Order, actor_id: uuid.UUID | None
) -> None:
    if not order.items:
        return
    if _order_has_transactions(
        session=session, order_id=order.id, tx_type=InventoryTransactionType.sale
    ):
        return

    for item in order.items:
        if not item.product_id:
            continue
        adjust_product_stock(
            session=session,
            product_id=item.product_id,
            delta=-item.quantity,
            tx_type=InventoryTransactionType.sale,
            order_id=order.id,
            actor_id=actor_id,
            memo=f"Order {order.order_number}",
            allow_negative=True,
        )


def restore_inventory_for_order(
    *, session: Session, order: Order, actor_id: uuid.UUID | None
) -> None:
    if not order.items:
        return
    if not _order_has_transactions(
        session=session, order_id=order.id, tx_type=InventoryTransactionType.sale
    ):
        return
    if _order_has_transactions(
        session=session, order_id=order.id, tx_type=InventoryTransactionType.return_
    ):
        return

    for item in order.items:
        if not item.product_id:
            continue
        adjust_product_stock(
            session=session,
            product_id=item.product_id,
            delta=item.quantity,
            tx_type=InventoryTransactionType.return_,
            order_id=order.id,
            actor_id=actor_id,
            memo=f"Order {order.order_number}",
            allow_negative=True,
        )


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


def get_product_by_sku(*, session: Session, sku: str) -> Product | None:
    statement = select(Product).where(Product.sku == sku)
    return session.exec(statement).first()


def _slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^\w\s-]", "", value)
    value = re.sub(r"[\s_-]+", "-", value)
    value = re.sub(r"^-+|-+$", "", value)
    return value or "product"


def _extract_slug_base(slug: str) -> str:
    base, separator, suffix = slug.rpartition("-")
    if (
        separator
        and len(suffix) == 5
        and all(ch in HEX_DIGITS for ch in suffix.lower())
    ):
        return base
    return slug


def _generate_unique_product_slug(session: Session, base_slug: str) -> str:
    base = base_slug or "product"
    while True:
        suffix = uuid.uuid4().hex[:5]
        candidate = f"{base}-{suffix}"
        if not get_product_by_slug(session=session, slug=candidate):
            return candidate


def _generate_order_number(session: Session, dt: datetime) -> str:
    prefix = dt.strftime("ORD%Y%m%d")
    statement = (
        select(Order.order_number)
        .where(Order.order_number.like(f"{prefix}-%"))
        .order_by(Order.order_number.desc())
        .limit(1)
    )
    last_number = session.exec(statement).first()
    if last_number:
        _, _, suffix = last_number.rpartition("-")
        try:
            counter = int(suffix) + 1
        except ValueError:
            counter = 1
    else:
        counter = 1
    return f"{prefix}-{counter:04d}"


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
    if product_in.category_id:
        category = get_category(session=session, category_id=product_in.category_id)
        if not category:
            raise ValueError("Category not found")
    if get_product_by_sku(session=session, sku=product_in.sku):
        raise ValueError("SKU already exists")

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
    if "sku" in update_data and update_data["sku"] is not None:
        new_sku = update_data["sku"]
        if new_sku != db_product.sku and get_product_by_sku(
            session=session, sku=new_sku
        ):
            raise ValueError("SKU already exists")

    update_data["updated_at"] = datetime.now(timezone.utc)
    db_product.sqlmodel_update(update_data)
    session.add(db_product)
    session.commit()
    session.refresh(db_product)
    return db_product


def delete_product(*, session: Session, db_product: Product) -> None:
    session.delete(db_product)
    session.commit()


def get_customer(*, session: Session, customer_id: uuid.UUID) -> Customer | None:
    return session.get(Customer, customer_id)


def get_customer_by_phone(*, session: Session, phone: str) -> Customer | None:
    statement = select(Customer).where(Customer.phone == phone)
    return session.exec(statement).first()


def get_customers(
    *, session: Session, skip: int = 0, limit: int = 100
) -> tuple[list[Customer], int]:
    count_statement = select(func.count()).select_from(Customer)
    count = session.exec(count_statement).one()
    statement = select(Customer).offset(skip).limit(limit)
    customers = session.exec(statement).all()
    return customers, count


def create_customer(*, session: Session, customer_in: CustomerCreate) -> Customer:
    if get_customer_by_phone(session=session, phone=customer_in.phone):
        raise ValueError("Phone number already registered")

    now = datetime.now(timezone.utc)
    db_customer = Customer.model_validate(
        customer_in, update={"created_at": now, "updated_at": now}
    )
    session.add(db_customer)
    session.commit()
    session.refresh(db_customer)
    return db_customer


def update_customer(
    *, session: Session, db_customer: Customer, customer_in: CustomerUpdate
) -> Customer:
    update_data = customer_in.model_dump(exclude_unset=True)
    if not update_data:
        return db_customer

    if "phone" in update_data and update_data["phone"] != db_customer.phone:
        if get_customer_by_phone(session=session, phone=update_data["phone"]):
            raise ValueError("Phone number already registered")

    if "email" in update_data and update_data["email"]:
        # Optional: Add validation for email if needed in the future
        pass

    update_data["updated_at"] = datetime.now(timezone.utc)
    db_customer.sqlmodel_update(update_data)
    session.add(db_customer)
    session.commit()
    session.refresh(db_customer)
    return db_customer


def delete_customer(*, session: Session, db_customer: Customer) -> None:
    session.delete(db_customer)
    session.commit()


def get_order(*, session: Session, order_id: uuid.UUID) -> Order | None:
    return session.get(Order, order_id)


def get_orders(
    *,
    session: Session,
    skip: int = 0,
    limit: int = 100,
    customer_id: uuid.UUID | None = None,
    status: OrderStatus | None = None,
    assigned_to: uuid.UUID | None = None,
    created_by: uuid.UUID | None = None,
    payment_status: PaymentStatus | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> tuple[list[Order], int]:
    statement = select(Order)
    count_statement = select(func.count()).select_from(Order)

    filters = []
    if customer_id:
        filters.append(Order.customer_id == customer_id)
    if status:
        filters.append(Order.status == status)
    if assigned_to:
        filters.append(Order.assigned_to == assigned_to)
    if created_by:
        filters.append(Order.created_by == created_by)
    if payment_status:
        filters.append(Order.payment_status == payment_status)
    if from_date:
        filters.append(Order.created_at >= from_date)
    if to_date:
        filters.append(Order.created_at <= to_date)

    for condition in filters:
        statement = statement.where(condition)
        count_statement = count_statement.where(condition)

    statement = statement.order_by(Order.created_at.desc()).offset(skip).limit(limit)

    orders = session.exec(statement).all()
    count = session.exec(count_statement).one()
    return orders, count


def create_order(
    *,
    session: Session,
    order_in: OrderCreate,
    created_by: uuid.UUID | None,
) -> Order:
    customer = get_customer(session=session, customer_id=order_in.customer_id)
    if not customer:
        raise ValueError("Customer not found")
    if not order_in.items:
        raise ValueError("Order items required")

    now = datetime.now(timezone.utc)
    order_number = _generate_order_number(session, now)

    items: list[OrderItem] = []
    subtotal = Decimal("0")
    for item_in in order_in.items:
        product = get_product(session=session, product_id=item_in.product_id)
        if not product:
            raise ValueError("Product not found")
        unit_price = Decimal(product.price)
        total_price = unit_price * item_in.quantity
        subtotal += total_price
        items.append(
            OrderItem(
                product_id=product.id,
                product_name=product.name,
                sku=product.sku,
                thumbnail_image=product.thumbnail_image,
                quantity=item_in.quantity,
                unit_price=unit_price,
                total_price=total_price,
            )
        )

    discount_total = Decimal(str(order_in.discount_total))
    tax_total = Decimal(str(order_in.tax_total))
    shipping_fee = Decimal(str(order_in.shipping_fee))
    grand_total = subtotal - discount_total + tax_total + shipping_fee
    if grand_total < 0:
        raise ValueError("Grand total cannot be negative")

    if order_in.assigned_to:
        assigned_user = session.get(User, order_in.assigned_to)
        if not assigned_user:
            raise ValueError("Assigned user not found")

    order = Order(
        customer_id=order_in.customer_id,
        payment_method=order_in.payment_method,
        payment_status=order_in.payment_status,
        status=order_in.status,
        assigned_to=order_in.assigned_to,
        shipping_address=order_in.shipping_address,
        billing_address=order_in.billing_address,
        notes=order_in.notes,
        discount_total=discount_total,
        tax_total=tax_total,
        shipping_fee=shipping_fee,
        subtotal=subtotal,
        grand_total=grand_total,
        order_number=order_number,
        created_by=created_by,
        created_at=now,
        updated_at=now,
    )
    order.items = items
    session.add(order)
    session.flush()

    if _requires_inventory_deduction(order.status):
        deduct_inventory_for_order(session=session, order=order, actor_id=created_by)

    session.commit()
    session.refresh(order)
    return order


STATUS_TIMESTAMP_MAP: dict[OrderStatus, str] = {
    OrderStatus.confirmed: "confirmed_at",
    OrderStatus.paid: "paid_at",
    OrderStatus.fulfilled: "fulfilled_at",
    OrderStatus.cancelled: "cancelled_at",
}


def update_order(
    *,
    session: Session,
    db_order: Order,
    order_in: OrderUpdate,
    updated_by: uuid.UUID | None,
) -> Order:
    update_data = order_in.model_dump(exclude_unset=True)
    if not update_data:
        return db_order

    now = datetime.now(timezone.utc)
    previous_status = db_order.status
    target_status = update_data.get("status", previous_status)

    if "assigned_to" in update_data and update_data["assigned_to"]:
        user = session.get(User, update_data["assigned_to"])
        if not user:
            raise ValueError("Assigned user not found")

    if "status" in update_data:
        new_status = update_data["status"]
        timestamp_field = STATUS_TIMESTAMP_MAP.get(new_status)
        if timestamp_field:
            setattr(db_order, timestamp_field, now)

    for field in ("discount_total", "tax_total", "shipping_fee"):
        if field in update_data and update_data[field] is not None:
            update_data[field] = Decimal(str(update_data[field]))

    db_order.sqlmodel_update(update_data)
    db_order.updated_by = updated_by
    db_order.updated_at = now

    subtotal = sum(item.total_price for item in db_order.items)
    if "discount_total" in update_data and update_data["discount_total"] is not None:
        discount_total = Decimal(str(update_data["discount_total"]))
    else:
        discount_total = db_order.discount_total
    if "tax_total" in update_data and update_data["tax_total"] is not None:
        tax_total = Decimal(str(update_data["tax_total"]))
    else:
        tax_total = db_order.tax_total
    if "shipping_fee" in update_data and update_data["shipping_fee"] is not None:
        shipping_fee = Decimal(str(update_data["shipping_fee"]))
    else:
        shipping_fee = db_order.shipping_fee

    grand_total = subtotal - discount_total + tax_total + shipping_fee
    if grand_total < 0:
        raise ValueError("Grand total cannot be negative")
    db_order.grand_total = grand_total

    session.add(db_order)
    session.flush()

    needs_before = _requires_inventory_deduction(previous_status)
    needs_after = _requires_inventory_deduction(target_status)
    if not needs_before and needs_after:
        deduct_inventory_for_order(session=session, order=db_order, actor_id=updated_by)
    elif needs_before and not needs_after:
        restore_inventory_for_order(
            session=session, order=db_order, actor_id=updated_by
        )

    session.commit()
    session.refresh(db_order)
    return db_order


def delete_order(*, session: Session, db_order: Order) -> None:
    restore_inventory_for_order(session=session, order=db_order, actor_id=None)
    session.delete(db_order)
    session.commit()


def create_inventory_adjustment(
    *,
    session: Session,
    adjustment_in: InventoryAdjustmentCreate,
    actor_id: uuid.UUID | None,
) -> InventoryTransaction:
    transaction = adjust_product_stock(
        session=session,
        product_id=adjustment_in.product_id,
        delta=adjustment_in.quantity,
        tx_type=InventoryTransactionType.adjustment,
        actor_id=actor_id,
        memo=adjustment_in.memo,
        allow_negative=True,
    )
    session.commit()
    session.refresh(transaction)
    return transaction


def get_inventory_transactions(
    *,
    session: Session,
    skip: int = 0,
    limit: int = 100,
    product_id: uuid.UUID | None = None,
    order_id: uuid.UUID | None = None,
    tx_type: InventoryTransactionType | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> tuple[list[InventoryTransaction], int]:
    statement = select(InventoryTransaction)
    if product_id:
        statement = statement.where(InventoryTransaction.product_id == product_id)
    if order_id:
        statement = statement.where(InventoryTransaction.order_id == order_id)
    if tx_type:
        statement = statement.where(InventoryTransaction.type == tx_type)
    if from_date:
        statement = statement.where(InventoryTransaction.created_at >= from_date)
    if to_date:
        statement = statement.where(InventoryTransaction.created_at <= to_date)

    count_statement = statement.with_only_columns(func.count()).order_by(None)
    total = session.exec(count_statement).one()

    data_statement = (
        statement.order_by(InventoryTransaction.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    transactions = session.exec(data_statement).all()
    return transactions, total


def get_media(*, session: Session, media_id: uuid.UUID) -> Media | None:
    return session.get(Media, media_id)


def create_media_entry(*, session: Session, media_in: MediaCreate) -> Media:
    media = Media.model_validate(media_in)
    session.add(media)
    session.commit()
    session.refresh(media)
    return media


def list_media(
    *,
    session: Session,
    skip: int = 0,
    limit: int = 50,
    search: str | None = None,
) -> tuple[list[Media], int]:
    statement = select(Media)
    if search:
        statement = statement.where(Media.file_name.ilike(f"%{search}%"))
    count_statement = statement.with_only_columns(func.count()).order_by(None)
    total = session.exec(count_statement).one()
    data_statement = (
        statement.order_by(Media.created_at.desc()).offset(skip).limit(limit)
    )
    media_items = session.exec(data_statement).all()
    return media_items, total


def delete_media(*, session: Session, media: Media) -> None:
    session.delete(media)
    session.commit()
