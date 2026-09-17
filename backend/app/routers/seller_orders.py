from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_seller
from app.models.user import User
from app.schemas.order import OrderRead, OrderStatusUpdate
from app.schemas.common import APIResponse
from app.utils.pagination import PaginationParams, PaginatedResponse
from app.services.seller_service import SellerService
from app.services.order_service import OrderService
from app.core.exceptions import ForbiddenException

router = APIRouter(prefix="/seller/orders", tags=["Seller Orders"])


@router.get("", response_model=APIResponse[PaginatedResponse[OrderRead]], summary="List orders containing seller's items")
def list_seller_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by order status"),
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    pagination = PaginationParams(page=page, page_size=page_size)
    orders, total_count = SellerService.list_orders(db, current_user, pagination, status=status)
    paginated = PaginatedResponse.create([OrderRead.model_validate(o) for o in orders], total_count, pagination)
    return APIResponse(data=paginated)


@router.patch("/{order_id}/status", response_model=APIResponse[OrderRead], summary="Update order packing status")
def update_seller_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    # Allowed statuses for seller
    allowed_statuses = ["ACCEPTED", "SELLER_ACCEPTED", "PACKING", "PREPARING", "READY", "READY_FOR_PICKUP", "REJECTED"]
    if payload.status not in allowed_statuses:
        raise ForbiddenException(f"Sellers are only permitted to update status to: {', '.join(allowed_statuses)}")

    order = OrderService.update_order_status(db, current_user, order_id, payload.status, payload.note)
    order_read = OrderRead.model_validate(order)
    from app.models.delivery_task import DeliveryTask
    task = db.query(DeliveryTask).filter(DeliveryTask.order_id == order.id).first()
    if task:
        order_read.delivery_task_id = task.id
    order_read.assignment_status = "ASSIGNED" if order.delivery_partner_id else "WAITING_FOR_DELIVERY_PARTNER"

    message = (
        f"Order #{order.order_number} is packed. Delivery partner has been notified."
        if payload.status in ["READY", "READY_FOR_PICKUP"]
        else f"Order marked as {payload.status}"
    )
    return APIResponse(message=message, data=order_read)
