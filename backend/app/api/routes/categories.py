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
    CategoriesPublic,
    Category,
    CategoryCreate,
    CategoryPublic,
    CategoryUpdate,
    Message,
)

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("/", response_model=CategoriesPublic)
def read_categories(
    session: SessionDep, _current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve categories.
    """
    categories, count = crud.get_categories(session=session, skip=skip, limit=limit)
    return CategoriesPublic(data=categories, count=count)


@router.get("/{category_id}", response_model=CategoryPublic)
def read_category(
    session: SessionDep, _current_user: CurrentUser, category_id: uuid.UUID
) -> Category:
    """
    Retrieve a category by id.
    """
    category = crud.get_category(session=session, category_id=category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.post(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=CategoryPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_category(*, session: SessionDep, category_in: CategoryCreate) -> Category:
    """
    Create a new category.
    """
    try:
        category = crud.create_category(session=session, category_in=category_in)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return category


@router.put(
    "/{category_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=CategoryPublic,
)
def update_category(
    *,
    session: SessionDep,
    category_id: uuid.UUID,
    category_in: CategoryUpdate,
) -> Category:
    """
    Update a category.
    """
    db_category = crud.get_category(session=session, category_id=category_id)
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    try:
        category = crud.update_category(
            session=session, db_category=db_category, category_in=category_in
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return category


@router.delete(
    "/{category_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=Message,
)
def delete_category(*, session: SessionDep, category_id: uuid.UUID) -> Message:
    """
    Delete a category.
    """
    category = crud.get_category(session=session, category_id=category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    crud.delete_category(session=session, db_category=category)
    return Message(message="Category deleted successfully")
