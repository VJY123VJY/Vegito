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
    product_type: Optional[str] = Query(None, description="Filter by product type (VEGETABLE or FRUIT)"),
    lat: Optional[float] = Query(None, description="Customer latitude for 20 KM radius filter"),
    lon: Optional[float] = Query(None, description="Customer longitude for 20 KM radius filter"),
    seller_id: Optional[int] = Query(None, description="Filter by specific seller ID"),
    db: Session = Depends(get_db),
):
    pagination = PaginationParams(page=page, page_size=page_size)
    products, total_count = ProductService.list_products(
        db=db,
        pagination=pagination,
        search=search,
        category_id=category_id,
        product_type=product_type,
        active_only=True,
        lat=lat,
        lon=lon,
        seller_id=seller_id,
        max_radius_km=20.0,
    )
    paginated = PaginatedResponse.create(products, total_count, pagination)
    return APIResponse(data=paginated)


@router.get(
    "/{product_id}",
    response_model=APIResponse[ProductRead],
    summary="Get product details with active seller offers",
)
def get_product(
    product_id: int,
    lat: Optional[float] = Query(None, description="Customer latitude"),
    lon: Optional[float] = Query(None, description="Customer longitude"),
    db: Session = Depends(get_db),
):
    product = ProductService.get_product_by_id(db, product_id, lat=lat, lon=lon)
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


@router.get(
    "/{product_id}/reviews",
    summary="Get customer reviews and average rating for a product",
)
def get_product_reviews_alias(product_id: int, db: Session = Depends(get_db)):
    from app.services.review_service import ReviewService
    summary = ReviewService.get_product_reviews(db, product_id)
    return APIResponse(data=summary)

