from typing import List, Optional, Union
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_customer, require_admin, get_current_user
from app.models.user import User
from app.schemas.review import (
    ReviewCreate,
    ReviewRead,
    OrderReviewStatusRead,
    EntityReviewSummary,
    ReviewConfigRead,
)
from app.schemas.common import APIResponse, PaginatedResponse
from app.services.review_service import ReviewService
from app.config import settings

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post(
    "",
    response_model=APIResponse[Union[ReviewRead, List[ReviewRead]]],
    status_code=status.HTTP_201_CREATED,
    summary="Submit review for delivered order produce, seller, and delivery partner",
)
def create_review(
    payload: ReviewCreate,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    created = ReviewService.submit_order_review(db, current_user, payload)
    data = created[0] if len(created) == 1 else created
    return APIResponse(message="Review submitted successfully", data=data)


@router.get(
    "/order/{order_id}",
    response_model=APIResponse[OrderReviewStatusRead],
    summary="Get customer's review status and existing reviews for an order",
)
def get_order_review_status(
    order_id: int,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    status_data = ReviewService.get_order_review_status(db, current_user, order_id)
    return APIResponse(data=status_data)


@router.get(
    "/config",
    response_model=APIResponse[ReviewConfigRead],
    summary="Get public review configuration such as official Google Business Review link",
)
def get_review_config():
    return APIResponse(
        data=ReviewConfigRead(google_review_url=settings.GOOGLE_REVIEW_URL)
    )


@router.get(
    "/products/{product_id}",
    response_model=APIResponse[EntityReviewSummary],
    summary="Get public customer reviews and average rating for a product",
)
def get_product_reviews(product_id: int, db: Session = Depends(get_db)):
    summary = ReviewService.get_product_reviews(db, product_id)
    return APIResponse(data=summary)


@router.get(
    "/sellers/{seller_id}",
    response_model=APIResponse[EntityReviewSummary],
    summary="Get customer reviews and average rating for a seller/shop",
)
def get_seller_reviews(seller_id: int, db: Session = Depends(get_db)):
    summary = ReviewService.get_seller_reviews(db, seller_id)
    return APIResponse(data=summary)


@router.get(
    "/delivery-partners/{partner_id}",
    response_model=APIResponse[EntityReviewSummary],
    summary="Get customer reviews and average rating for a delivery partner",
)
def get_delivery_partner_reviews(partner_id: int, db: Session = Depends(get_db)):
    summary = ReviewService.get_delivery_partner_reviews(db, partner_id)
    return APIResponse(data=summary)


@router.get(
    "",
    response_model=PaginatedResponse[ReviewRead],
    summary="Admin review list with filtering by rating, target type, seller, partner, or product",
)
def list_admin_reviews(
    rating: Optional[int] = Query(None, ge=1, le=5),
    target_type: Optional[str] = Query(None, description="SELLER, DELIVERY_PARTNER, PRODUCT"),
    seller_id: Optional[int] = None,
    delivery_partner_id: Optional[int] = None,
    product_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * page_size
    items, total_count = ReviewService.list_reviews_for_admin(
        db=db,
        rating=rating,
        target_type=target_type,
        seller_id=seller_id,
        delivery_partner_id=delivery_partner_id,
        product_id=product_id,
        limit=page_size,
        offset=offset,
    )
    total_pages = (total_count + page_size - 1) // page_size if page_size else 1
    return PaginatedResponse(
        data=items,
        total=total_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
