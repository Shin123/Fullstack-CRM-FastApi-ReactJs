from decimal import Decimal

from sqlmodel import Session

from app import crud
from app.models import Product, ProductCreate, ProductStatus
from app.tests.utils.category import create_random_category
from app.tests.utils.utils import random_lower_string


def create_random_product(db: Session) -> Product:
    category = create_random_category(db)
    name = f"Product {random_lower_string()}"
    product_in = ProductCreate(
        name=name,
        category_id=category.id,
        price=Decimal("9.99"),
        price_origin=Decimal("19.99"),
        description="Random product",
        images=[f"https://example.com/{category.id}.png"],
        thumbnail_image=f"https://example.com/{category.id}-thumb.png",
        status=ProductStatus.published,
        stock=5,
    )
    return crud.create_product(session=db, product_in=product_in)
