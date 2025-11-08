import uuid
from datetime import datetime
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
    OrderCreate,
    OrderPublic,
    OrderStatus,
    OrderUpdate,
    OrdersPublic,
    PaymentStatus,
    User,
)

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("/", response_model=OrdersPublic)
def read_orders(
    session: SessionDep,
    _current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    customer_id: uuid.UUID | None = None,
    status: OrderStatus | None = None,
    assigned_to: uuid.UUID | None = None,
    created_by: uuid.UUID | None = None,
    payment_status: PaymentStatus | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> Any:
    orders, count = crud.get_orders(
        session=session,
        skip=skip,
        limit=limit,
        customer_id=customer_id,
        status=status,
        assigned_to=assigned_to,
        created_by=created_by,
        payment_status=payment_status,
        from_date=from_date,
        to_date=to_date,
    )
    return OrdersPublic(data=orders, count=count)


@router.get("/{order_id}", response_model=OrderPublic)
def read_order(
    session: SessionDep,
    _current_user: CurrentUser,
    order_id: uuid.UUID,
) -> OrderPublic:
    order = crud.get_order(session=session, order_id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post(
    "/",
    response_model=OrderPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_order(
    *,
    session: SessionDep,
    order_in: OrderCreate,
    current_user: User = Depends(get_current_active_superuser),
) -> OrderPublic:
    try:
        order = crud.create_order(
            session=session, order_in=order_in, created_by=current_user.id
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail in {"Customer not found", "Product not found", "Assigned user not found"} else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc
    return order


@router.patch(
    "/{order_id}",
    response_model=OrderPublic,
)
def update_order(
    *,
    session: SessionDep,
    order_id: uuid.UUID,
    order_in: OrderUpdate,
    current_user: User = Depends(get_current_active_superuser),
) -> OrderPublic:
    db_order = crud.get_order(session=session, order_id=order_id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    try:
        order = crud.update_order(
            session=session, db_order=db_order, order_in=order_in, updated_by=current_user.id
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Assigned user not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc
    return order


@router.delete(
    "/{order_id}",
    response_model=Message,
)
def delete_order(
    *,
    session: SessionDep,
    order_id: uuid.UUID,
    _current_user: User = Depends(get_current_active_superuser),
) -> Message:
    order = crud.get_order(session=session, order_id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    crud.delete_order(session=session, db_order=order)
    return Message(message="Order deleted successfully")
