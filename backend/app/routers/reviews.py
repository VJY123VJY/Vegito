from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_customer
from app.models.user import User
from app.models.review import Review
from app.models.order import Order
from app.models.order_item import OrderItem
from app.schemas.review import ReviewCreate, ReviewRead
from app.schemas.common import APIResponse
from app.core.constants import OrderStatus
from app.core.exceptions import NotFoundException, BadRequestException

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post("", response_model=APIResponse[ReviewRead], status_code=status.HTTP_201_CREATED, summary="Create review for completed order")
def create_review(
    payload: ReviewCreate,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    # Verify order exists, belongs to this customer, and is completed
    order = db.query(Order).filter(Order.id == payload.order_id, Order.customer_id == current_user.id).first()
    if not order:
        raise NotFoundException("Order not found or does not belong to you")

    if order.status != OrderStatus.DELIVERED.value:
        raise BadRequestException("You can only review orders that have been successfully delivered.")

    # If product_id specified, verify customer purchased it in this order
    if payload.product_id:
        item = (
            db.query(OrderItem)
            .filter(OrderItem.order_id == order.id)
            .first()
        )
        if not item:
            raise BadRequestException("The specified product was not part of this order.")

    review = Review(
        order_id=payload.order_id,
        order_item_id=payload.order_item_id,
        customer_id=current_user.id,
        product_id=payload.product_id,
        product_rating=payload.product_rating,
        seller_rating=payload.seller_rating,
        delivery_rating=payload.delivery_rating,
        comment=payload.comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    read_obj = ReviewRead.model_validate(review)
    read_obj.customer_name = current_user.name
    return APIResponse(message="Review submitted successfully", data=read_obj)


@router.get("/products/{product_id}", response_model=APIResponse[List[ReviewRead]], summary="Get reviews for a product")
def get_product_reviews(product_id: int, db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(Review.product_id == product_id).order_by(Review.created_at.desc()).all()
    results = []
    for r in reviews:
        read_obj = ReviewRead.model_validate(r)
        read_obj.customer_name = r.customer.name if r.customer else None
        results.append(read_obj)
    return APIResponse(data=results)
