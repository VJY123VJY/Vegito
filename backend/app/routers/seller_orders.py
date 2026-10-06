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
    from app.utils.display_number import batch_compute_order_display_numbers
    display_nums = batch_compute_order_display_numbers(db, [o.id for o in orders])
    from app.schemas.order import OrderItemRead
    sanitized_orders = []
    for idx, o in enumerate(orders, start=1):
        read_obj = OrderRead.model_validate(o)
        read_obj.delivery_latitude = None
        read_obj.delivery_longitude = None
        read_obj.display_number = display_nums.get(o.id, f"{idx:02d}")
        if o.customer:
            read_obj.customer_name = o.customer.name or (f"Customer ({o.customer.phone[-4:]})" if o.customer.phone else "Customer")
        if o.items:
            read_obj.items = [OrderItemRead.model_validate(it) for it in o.items]
            read_obj.items_count = len(o.items)
        if o.address:
            raw_area = o.address.landmark or o.address.address_line1 or o.address.city or ""
            read_obj.delivery_area = raw_area.split(",")[0].strip() if raw_area else "Local Area"
        if o.status not in ["READY", "READY_FOR_PICKUP", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"]:
            read_obj.pickup_otp = None
        sanitized_orders.append(read_obj)

    paginated = PaginatedResponse.create(sanitized_orders, total_count, pagination)
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
    order_read.delivery_latitude = None
    order_read.delivery_longitude = None
    if order.status not in ["READY", "READY_FOR_PICKUP", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"]:
        order_read.pickup_otp = None

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


@router.patch("/{order_id}/urgent", response_model=APIResponse[dict], summary="Toggle urgent flag on an order")
def toggle_order_urgent(
    order_id: int,
    payload: dict,
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    """Toggle is_urgent flag on an order. Seller must own the order."""
    from app.models.order import Order
    from app.models.order_item import OrderItem
    from app.models.seller_product import SellerProduct

    from app.models.seller_profile import SellerProfile
    from sqlalchemy import or_

    profile = db.query(SellerProfile).filter(SellerProfile.user_id == current_user.id).first()
    seller_ids = [current_user.id]
    if profile and profile.id not in seller_ids:
        seller_ids.append(profile.id)

    # Verify seller owns the order
    order = (
        db.query(Order)
        .outerjoin(OrderItem, OrderItem.order_id == Order.id)
        .outerjoin(SellerProduct, OrderItem.seller_product_id == SellerProduct.id)
        .filter(
            Order.id == order_id,
            or_(
                Order.seller_id.in_(seller_ids),
                Order.shop_id.in_(seller_ids),
                SellerProduct.seller_id.in_(seller_ids),
            )
        )
        .first()
    )
    if not order:
        from app.core.exceptions import NotFoundException
        raise NotFoundException(f"Order {order_id} not found or not authorized")

    is_urgent = bool(payload.get("is_urgent", True))
    order.is_urgent = is_urgent
    db.commit()

    # Dispatch seller WebSocket notification if marking urgent
    if is_urgent:
        try:
            from app.routers.websocket_tracking import dispatch_seller_new_order_notification
            dispatch_seller_new_order_notification({
                "type": "ORDER_URGENT",
                "event": "ORDER_URGENT",
                "event_id": f"URGENT_{order.id}",
                "order_id": order.id,
                "order_number": order.order_number,
                "is_urgent": True,
                "message": f"Order #{order.order_number} marked as URGENT!",
            }, seller_id=current_user.id)
        except Exception:
            pass

    return APIResponse(
        message=f"Order #{order.order_number} marked as {'URGENT' if is_urgent else 'normal'}",
        data={"order_id": order.id, "is_urgent": is_urgent}
    )
