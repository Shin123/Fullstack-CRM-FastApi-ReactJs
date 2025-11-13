import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, status

from app import crud
from app.api.deps import (
    SessionDep,
    get_current_active_superuser,
)
from app.models import (
    InventoryAdjustmentCreate,
    InventoryTransactionPublic,
    InventoryTransactionType,
    InventoryTransactionsPublic,
    User,
)

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("/transactions", response_model=InventoryTransactionsPublic)
def read_inventory_transactions(
    session: SessionDep,
    _: User = Depends(get_current_active_superuser),
    skip: int = 0,
    limit: int = 100,
    product_id: uuid.UUID | None = None,
    order_id: uuid.UUID | None = None,
    tx_type: InventoryTransactionType | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> Any:
    transactions, count = crud.get_inventory_transactions(
        session=session,
        skip=skip,
        limit=limit,
        product_id=product_id,
        order_id=order_id,
        tx_type=tx_type,
        from_date=from_date,
        to_date=to_date,
    )
    return InventoryTransactionsPublic(data=transactions, count=count)


@router.post(
    "/adjustments",
    response_model=InventoryTransactionPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_inventory_adjustment(
    *,
    session: SessionDep,
    adjustment_in: InventoryAdjustmentCreate,
    current_user: User = Depends(get_current_active_superuser),
) -> InventoryTransactionPublic:
    transaction = crud.create_inventory_adjustment(
        session=session,
        adjustment_in=adjustment_in,
        actor_id=current_user.id,
    )
    return transaction
