from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate, ProductRead
from app.schemas.common import APIResponse
from app.utils.pagination import PaginationParams, PaginatedResponse
from app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["Products"])


@router.get(
    "",
    response_model=APIResponse[PaginatedResponse[ProductRead]],
    summary="List products with search and filtering",
)
def list_products(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term in product name or description"),
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    db: Session = Depends(get_db),
):
    pagination = PaginationParams(page=page, page_size=page_size)
    products, total_count = ProductService.list_products(
        db=db,
        pagination=pagination,
        search=search,
        category_id=category_id,
        active_only=True,
    )
    paginated = PaginatedResponse.create(products, total_count, pagination)
    return APIResponse(data=paginated)


@router.get(
    "/{product_id}",
    response_model=APIResponse[ProductRead],
    summary="Get product details with active seller offers",
)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = ProductService.get_product_by_id(db, product_id)
    return APIResponse(data=product)


@router.post(
    "",
    response_model=APIResponse[ProductRead],
    status_code=status.HTTP_201_CREATED,
    summary="Create master product (Admin)",
)
def create_product(
    payload: ProductCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    product = ProductService.create_product(db, payload)
    read_obj = ProductService.get_product_by_id(db, product.id)
    return APIResponse(message="Product created successfully", data=read_obj)


@router.patch(
    "/{product_id}",
    response_model=APIResponse[ProductRead],
    summary="Update master product (Admin)",
)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ProductService.update_product(db, product_id, payload)
    read_obj = ProductService.get_product_by_id(db, product_id)
    return APIResponse(message="Product updated successfully", data=read_obj)
