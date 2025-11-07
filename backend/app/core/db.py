from sqlmodel import Session, create_engine, select

from app import crud
from app.core.config import settings
from app.models import (
    Category,
    CategoryCreate,
    Customer,
    CustomerCreate,
    Product,
    ProductCreate,
    User,
    UserCreate,
)

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))


# make sure all SQLModel models are imported (app.models) before initializing DB
# otherwise, SQLModel might fail to initialize relationships properly
# for more details: https://github.com/fastapi/full-stack-fastapi-template/issues/28


def init_db(session: Session) -> None:
    # Tables should be created with Alembic migrations
    # But if you don't want to use migrations, create
    # the tables un-commenting the next lines
    # from sqlmodel import SQLModel

    # This works because the models are already imported and registered from app.models
    # SQLModel.metadata.create_all(engine)

    user = session.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    ).first()
    if not user:
        user_in = UserCreate(
            email=settings.FIRST_SUPERUSER,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_superuser=True,
        )
        user = crud.create_user(session=session, user_create=user_in)

    category_exists = session.exec(select(Category)).first()
    if not category_exists:
        default_categories = [
            CategoryCreate(
                name="General",
                slug="general",
                description="Default category",
            ),
        ]
        for category_in in default_categories:
            try:
                crud.create_category(session=session, category_in=category_in)
            except ValueError:
                continue

    product_exists = session.exec(select(Product)).first()
    if not product_exists:
        category = session.exec(select(Category)).first()
        if category:
            default_products = [
                ProductCreate(
                    name="Sample Product",
                    sku="SKU-DEFAULT",
                    description="Default seeded product",
                    category_id=category.id,
                    price="0",
                    price_origin=None,
                    images=[],
                    thumbnail_image=None,
                    stock=0,
                ),
            ]
            for product_in in default_products:
                try:
                    crud.create_product(session=session, product_in=product_in)
                except ValueError:
                    continue

    customer_exists = session.exec(select(Customer)).first()
    if not customer_exists:
        default_customers = [
            CustomerCreate(
                name="Example Customer",
                phone="+10000000000",
                email="customer@example.com",
                address="123 Main Street",
            )
        ]
        for customer_in in default_customers:
            try:
                crud.create_customer(session=session, customer_in=customer_in)
            except ValueError:
                continue
