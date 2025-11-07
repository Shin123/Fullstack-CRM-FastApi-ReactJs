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
    CustomerCreate,
    CustomerPublic,
    CustomersPublic,
    CustomerUpdate,
    Message,
)

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("/", response_model=CustomersPublic)
def read_customers(
    session: SessionDep, _current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve customers.
    """
    customers, count = crud.get_customers(session=session, skip=skip, limit=limit)
    return CustomersPublic(data=customers, count=count)


@router.get("/{customer_id}", response_model=CustomerPublic)
def read_customer(
    session: SessionDep, _current_user: CurrentUser, customer_id: uuid.UUID
) -> Any:
    """
    Get customer by ID.
    """
    customer = crud.get_customer(session=session, customer_id=customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.post(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=CustomerPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_customer(*, session: SessionDep, customer_in: CustomerCreate) -> Any:
    """
    Create new customer.
    """
    try:
        customer = crud.create_customer(session=session, customer_in=customer_in)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return customer


@router.put(
    "/{customer_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=CustomerPublic,
)
def update_customer(
    *,
    session: SessionDep,
    customer_id: uuid.UUID,
    customer_in: CustomerUpdate,
) -> Any:
    """
    Update a customer.
    """
    db_customer = crud.get_customer(session=session, customer_id=customer_id)
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    try:
        customer = crud.update_customer(
            session=session, db_customer=db_customer, customer_in=customer_in
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return customer


@router.delete(
    "/{customer_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=Message,
)
def delete_customer(*, session: SessionDep, customer_id: uuid.UUID) -> Message:
    """
    Delete a customer.
    """
    customer = crud.get_customer(session=session, customer_id=customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    crud.delete_customer(session=session, db_customer=customer)
    return Message(message="Customer deleted successfully")
