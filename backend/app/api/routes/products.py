import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app import crud
from app.api.deps import (
    CurrentUser,
    SessionDep,
    get_current_active_superuser,
)
from app.models import (
    Message,
    ProductCreate,
    ProductPublic,
    ProductsPublic,
    ProductStatus,
    ProductUpdate,
)

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/", response_model=ProductsPublic)
def read_products(
    session: SessionDep,
    _current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    category_id: uuid.UUID | None = None,
    status: ProductStatus | None = None,
) -> Any:
    """
    Retrieve products with optional filters.
    """
    products, count = crud.get_products(
        session=session,
        skip=skip,
        limit=limit,
        category_id=category_id,
        status=status,
    )
    return ProductsPublic(data=products, count=count)


@router.get("/{product_id}", response_model=ProductPublic)
def read_product(
    session: SessionDep, _current_user: CurrentUser, product_id: uuid.UUID
) -> ProductPublic:
    """
    Retrieve a product by id.
    """
    product = crud.get_product(session=session, product_id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=ProductPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_product(*, session: SessionDep, product_in: ProductCreate) -> ProductPublic:
    """
    Create a new product.
    """
    try:
        product = crud.create_product(session=session, product_in=product_in)
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Category not found" else 409
        raise HTTPException(status_code=status_code, detail=detail) from exc
    return product


@router.put(
    "/{product_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=ProductPublic,
)
def update_product(
    *,
    session: SessionDep,
    product_id: uuid.UUID,
    product_in: ProductUpdate,
) -> ProductPublic:
    """
    Update an existing product.
    """
    db_product = crud.get_product(session=session, product_id=product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    try:
        product = crud.update_product(
            session=session, db_product=db_product, product_in=product_in
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Category not found" else 409
        raise HTTPException(status_code=status_code, detail=detail) from exc
    return product


@router.delete(
    "/{product_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=Message,
)
def delete_product(*, session: SessionDep, product_id: uuid.UUID) -> Message:
    """
    Delete a product.
    """
    product = crud.get_product(session=session, product_id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    crud.delete_product(session=session, db_product=product)
    return Message(message="Product deleted successfully")
