from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_customer, get_current_user
from app.models.user import User
from app.schemas.order import OrderCreate, OrderRead, OrderDetailRead, OrderStatusUpdate
from app.schemas.common import APIResponse
from app.utils.pagination import PaginationParams, PaginatedResponse
from app.services.order_service import OrderService

router = APIRouter(prefix="/orders", tags=["Orders"])


from typing import Optional
from app.config import settings

@router.get(
    "/delivery-fee",
    response_model=APIResponse[dict],
    summary="Preview distance-based delivery fee for customer address",
)
def get_delivery_fee(
    address_id: int = Query(..., description="Customer address ID"),
    seller_id: Optional[int] = Query(None, description="Seller user ID (optional)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.services.delivery_pricing_service import DeliveryPricingService
    fee, distance_km = DeliveryPricingService.calculate_delivery_distance_and_fee(
        db, address_id=address_id, seller_id=seller_id
    )
    return APIResponse(
        message="Delivery fee calculated",
        data={
            "address_id": address_id,
            "distance_km": distance_km,
            "delivery_fee": float(fee),
            "max_allowed_km": float(getattr(settings, "DELIVERY_MAX_DISTANCE_KM", 6.0)),
        },
    )


@router.post(
    "",
    response_model=APIResponse[OrderDetailRead],
    status_code=status.HTTP_201_CREATED,
    summary="Checkout and place order",
)
def create_order(
    payload: OrderCreate,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    order_detail = OrderService.checkout(db, current_user, payload)
    return APIResponse(message="Order placed successfully", data=order_detail)


@router.get(
    "",
    response_model=APIResponse[PaginatedResponse[OrderRead]],
    summary="List customer orders",
)
def list_orders(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    pagination = PaginationParams(page=page, page_size=page_size)
    orders, total_count = OrderService.list_customer_orders(db, current_user, pagination)
    paginated = PaginatedResponse.create(orders, total_count, pagination)
    return APIResponse(data=paginated)


@router.get(
    "/{order_id}",
    response_model=APIResponse[OrderDetailRead],
    summary="Get order details",
)
def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order_detail = OrderService.get_order_detail(db, current_user, order_id)
    return APIResponse(data=order_detail)


@router.post(
    "/{order_id}/reorder",
    response_model=APIResponse[bool],
    summary="Add items from past order to cart",
)
def reorder(
    order_id: int,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    OrderService.reorder(db, current_user, order_id)
    return APIResponse(message="Order items added to your cart", data=True)


@router.patch(
    "/{order_id}/status",
    response_model=APIResponse[OrderDetailRead],
    summary="Update order status (Seller/Admin)",
)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    OrderService.update_order_status(db, current_user, order_id, payload.status, payload.note)
    updated = OrderService.get_order_detail(db, current_user, order_id)
    return APIResponse(message="Order status updated", data=updated)
