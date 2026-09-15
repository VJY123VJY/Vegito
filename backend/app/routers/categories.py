from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryRead
from app.schemas.common import APIResponse
from app.services.product_service import ProductService

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=APIResponse[List[CategoryRead]], summary="List all active categories")
def list_categories(db: Session = Depends(get_db)):
    categories = ProductService.list_categories(db, active_only=True)
    return APIResponse(data=[CategoryRead.model_validate(c) for c in categories])


@router.get("/{category_id}", response_model=APIResponse[CategoryRead], summary="Get category by ID")
def get_category(category_id: int, db: Session = Depends(get_db)):
    category = ProductService.get_category_by_id(db, category_id)
    return APIResponse(data=CategoryRead.model_validate(category))


@router.post(
    "",
    response_model=APIResponse[CategoryRead],
    status_code=status.HTTP_201_CREATED,
    summary="Create category (Admin)",
)
def create_category(
    payload: CategoryCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    category = ProductService.create_category(db, payload)
    return APIResponse(message="Category created successfully", data=CategoryRead.model_validate(category))


@router.patch(
    "/{category_id}",
    response_model=APIResponse[CategoryRead],
    summary="Update category (Admin)",
)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    category = ProductService.update_category(db, category_id, payload)
    return APIResponse(message="Category updated successfully", data=CategoryRead.model_validate(category))
