from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_customer
from app.models.user import User
from app.models.order import Order
from app.models.b2b_invoice import B2BInvoice
from app.schemas.common import APIResponse
from app.schemas.business import (
    BusinessProfileCreate,
    BusinessProfileRead,
    BulkCartRead,
    BulkCartItemCreate,
    BulkCartItemUpdate,
    BulkCartItemRead,
    BulkOrderCreateRequest,
    QuoteActionRequest,
    SavedShoppingListCreate,
    SavedShoppingListRead,
    RecurringBulkOrderCreate,
    RecurringBulkOrderRead,
    EventGroceryEstimateRequest,
    EventGroceryEstimateResponse,
    B2BAnalyticsRead,
    B2BInvoiceRead,
)
from app.services.bulk_order_service import BulkOrderService
from app.core.exceptions import NotFoundException, ForbiddenException

router = APIRouter(prefix="/b2b", tags=["B2B Bulk Ordering"])


# ---------------------------------------------------------------------------
# Business Profile
# ---------------------------------------------------------------------------

@router.get("/profile", response_model=APIResponse[Optional[BusinessProfileRead]])
def get_business_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = BulkOrderService.get_business_profile(db, current_user.id)
    return APIResponse(
        message="Business profile retrieved" if profile else "No business profile found",
        data=profile,
    )


@router.post("/profile", response_model=APIResponse[BusinessProfileRead])
def create_or_update_business_profile(
    payload: BusinessProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = BulkOrderService.create_or_update_business_profile(db, current_user.id, payload)
    return APIResponse(
        message="Business profile updated successfully",
        data=profile,
    )


# ---------------------------------------------------------------------------
# Bulk Cart
# ---------------------------------------------------------------------------

@router.get("/cart", response_model=APIResponse[BulkCartRead])
def get_bulk_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cart_data = BulkOrderService.get_bulk_cart(db, current_user.id)
    return APIResponse(
        message="Bulk cart retrieved",
        data=cart_data,
    )


@router.post("/cart/items", response_model=APIResponse[dict])
def add_to_bulk_cart(
    payload: BulkCartItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = BulkOrderService.add_to_bulk_cart(db, current_user.id, payload)
    return APIResponse(
        message="Item added to bulk cart",
        data={"item_id": item.id, "quantity": str(item.quantity)},
    )


@router.put("/cart/items/{item_id}", response_model=APIResponse[dict])
def update_bulk_cart_item(
    item_id: int,
    payload: BulkCartItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = BulkOrderService.update_bulk_cart_item(db, current_user.id, item_id, payload)
    return APIResponse(
        message="Bulk cart item updated",
        data={"item_id": item.id, "quantity": str(item.quantity)},
    )


@router.delete("/cart/items/{item_id}", response_model=APIResponse[dict])
def remove_bulk_cart_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    BulkOrderService.remove_bulk_cart_item(db, current_user.id, item_id)
    return APIResponse(
        message="Item removed from bulk cart",
        data={"item_id": item_id},
    )


@router.delete("/cart", response_model=APIResponse[dict])
def clear_bulk_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    BulkOrderService.clear_bulk_cart(db, current_user.id)
    return APIResponse(
        message="Bulk cart cleared",
        data={},
    )


# ---------------------------------------------------------------------------
# Bulk Orders & Quotes
# ---------------------------------------------------------------------------

@router.post("/orders", response_model=APIResponse[dict])
def create_bulk_order(
    payload: BulkOrderCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = BulkOrderService.create_bulk_order_request(db, current_user.id, payload)
    return APIResponse(
        message="Bulk order request submitted successfully",
        data={
            "order_id": order.id,
            "order_number": order.order_number,
            "status": order.status,
            "quote_status": order.quote_status,
            "total_amount": str(order.total_amount),
        },
    )


@router.get("/orders", response_model=APIResponse[List[dict]])
def list_bulk_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Order)
        .filter(Order.customer_id == current_user.id, Order.order_type == "BULK")
        .order_by(Order.created_at.desc())
    )
    if status_filter:
        query = query.filter(Order.status == status_filter)

    orders = query.all()
    results = []
    for o in orders:
        seller_profile = getattr(o.seller, "seller_profile", None) if o.seller else None
        results.append({
            "id": o.id,
            "order_number": o.order_number,
            "status": o.status,
            "quote_status": o.quote_status,
            "quote_total": str(o.quote_total) if o.quote_total else None,
            "total_amount": str(o.total_amount),
            "seller_business_name": seller_profile.business_name if seller_profile else "Solapur Mandi Seller",
            "requested_delivery_date": str(o.requested_delivery_date) if o.requested_delivery_date else None,
            "requested_delivery_window": o.requested_delivery_window,
            "items_count": len(o.items),
            "created_at": o.created_at.isoformat(),
        })

    return APIResponse(
        message="Bulk orders retrieved",
        data=results,
    )


@router.get("/orders/{order_id}", response_model=APIResponse[dict])
def get_bulk_order_detail(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order or order.customer_id != current_user.id:
        raise NotFoundException("Bulk order not found")

    items = []
    for it in order.items:
        items.append({
            "id": it.id,
            "product_name": it.product_name,
            "quantity": str(it.quantity),
            "unit": it.unit,
            "unit_price": str(it.unit_price),
            "subtotal": str(it.subtotal),
            "quoted_unit_price": str(it.quoted_unit_price) if it.quoted_unit_price else None,
            "quoted_subtotal": str(it.quoted_subtotal) if it.quoted_subtotal else None,
            "seller_notes": it.seller_notes,
        })

    seller_profile = getattr(order.seller, "seller_profile", None) if order.seller else None

    return APIResponse(
        message="Bulk order details retrieved",
        data={
            "id": order.id,
            "order_number": order.order_number,
            "status": order.status,
            "order_type": order.order_type,
            "quote_status": order.quote_status,
            "quote_total": str(order.quote_total) if order.quote_total else None,
            "quote_delivery_fee": str(order.quote_delivery_fee) if order.quote_delivery_fee else None,
            "quote_notes": order.quote_notes,
            "quote_expires_at": order.quote_expires_at.isoformat() if order.quote_expires_at else None,
            "subtotal": str(order.subtotal),
            "delivery_charge": str(order.delivery_charge),
            "total_amount": str(order.total_amount),
            "requested_delivery_date": str(order.requested_delivery_date) if order.requested_delivery_date else None,
            "requested_delivery_window": order.requested_delivery_window,
            "customer_note": order.customer_note,
            "seller_id": order.seller_id,
            "seller_business_name": seller_profile.business_name if seller_profile else "Solapur Mandi Seller",
            "items": items,
            "created_at": order.created_at.isoformat(),
        },
    )


@router.post("/orders/{order_id}/quote", response_model=APIResponse[dict])
def handle_quote(
    order_id: int,
    payload: QuoteActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = BulkOrderService.customer_handle_quote(
        db, current_user.id, order_id, payload.action, payload.idempotency_key
    )
    return APIResponse(
        message=f"Quote {payload.action.lower()}ed successfully",
        data={
            "order_id": order.id,
            "order_number": order.order_number,
            "status": order.status,
            "quote_status": order.quote_status,
            "total_amount": str(order.total_amount),
        },
    )


# ---------------------------------------------------------------------------
# Saved Lists
# ---------------------------------------------------------------------------

@router.get("/saved-lists", response_model=APIResponse[List[dict]])
def list_saved_lists(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lists = BulkOrderService.list_saved_lists(db, current_user.id)
    data = []
    for l in lists:
        items_data = []
        for it in l.items:
            items_data.append({
                "id": it.id,
                "product_id": it.product_id,
                "product_name": it.product.name if it.product else "Produce",
                "seller_product_id": it.seller_product_id,
                "quantity": str(it.quantity),
                "unit": it.unit,
            })
        data.append({
            "id": l.id,
            "name": l.name,
            "description": l.description,
            "item_count": len(l.items),
            "items": items_data,
            "created_at": l.created_at.isoformat(),
        })

    return APIResponse(message="Saved lists retrieved", data=data)


@router.post("/saved-lists", response_model=APIResponse[dict])
def create_saved_list(
    payload: SavedShoppingListCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sl = BulkOrderService.create_saved_list(db, current_user.id, payload)
    return APIResponse(message="Saved list created", data={"id": sl.id, "name": sl.name})


@router.post("/saved-lists/{list_id}/add-to-cart", response_model=APIResponse[dict])
def add_saved_list_to_cart(
    list_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    added_count = BulkOrderService.add_saved_list_to_bulk_cart(db, current_user.id, list_id)
    return APIResponse(
        message=f"{added_count} items added to bulk cart",
        data={"added_count": added_count},
    )


@router.delete("/saved-lists/{list_id}", response_model=APIResponse[dict])
def delete_saved_list(
    list_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    BulkOrderService.delete_saved_list(db, current_user.id, list_id)
    return APIResponse(message="Saved list deleted", data={"id": list_id})


# ---------------------------------------------------------------------------
# Recurring Bulk Orders
# ---------------------------------------------------------------------------

@router.get("/recurring-orders", response_model=APIResponse[List[dict]])
def list_recurring_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    orders = BulkOrderService.list_recurring_orders(db, current_user.id)
    data = []
    for ro in orders:
        data.append({
            "id": ro.id,
            "title": ro.title,
            "frequency": ro.frequency,
            "delivery_time_window": ro.delivery_time_window,
            "next_run_date": str(ro.next_run_date),
            "is_active": ro.is_active,
            "items_count": len(ro.items),
            "created_at": ro.created_at.isoformat(),
        })
    return APIResponse(message="Recurring bulk orders retrieved", data=data)


@router.post("/recurring-orders", response_model=APIResponse[dict])
def create_recurring_order(
    payload: RecurringBulkOrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ro = BulkOrderService.create_recurring_order(db, current_user.id, payload)
    return APIResponse(message="Recurring order scheduled", data={"id": ro.id, "title": ro.title})


@router.post("/recurring-orders/{recurring_id}/toggle", response_model=APIResponse[dict])
def toggle_recurring_order(
    recurring_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ro = BulkOrderService.toggle_recurring_order(db, current_user.id, recurring_id)
    return APIResponse(
        message=f"Recurring order {'activated' if ro.is_active else 'paused'}",
        data={"id": ro.id, "is_active": ro.is_active},
    )


# ---------------------------------------------------------------------------
# Event Estimator
# ---------------------------------------------------------------------------

@router.post("/event-estimate", response_model=APIResponse[EventGroceryEstimateResponse])
def estimate_event_groceries(
    payload: EventGroceryEstimateRequest,
    db: Session = Depends(get_db),
):
    estimate = BulkOrderService.estimate_event_groceries(db, payload)
    return APIResponse(message="Event grocery requirements estimated", data=estimate)


# ---------------------------------------------------------------------------
# Business Analytics
# ---------------------------------------------------------------------------

@router.get("/analytics", response_model=APIResponse[B2BAnalyticsRead])
def get_b2b_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    analytics = BulkOrderService.get_b2b_analytics(db, current_user.id)
    return APIResponse(message="B2B analytics retrieved", data=analytics)


# ---------------------------------------------------------------------------
# Invoices
# ---------------------------------------------------------------------------

@router.get("/invoices/{order_id}", response_model=APIResponse[dict])
def get_b2b_invoice(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invoice = db.query(B2BInvoice).filter(B2BInvoice.order_id == order_id).first()
    if not invoice:
        raise NotFoundException("Invoice not generated or order not confirmed yet")

    order = invoice.order
    if order.customer_id != current_user.id and current_user.role_id not in (1, 3):  # Admin or Seller
        raise ForbiddenException("Access denied to this invoice")

    items = []
    for it in order.items:
        items.append({
            "name": it.product_name,
            "quantity": str(it.quantity),
            "unit": it.unit,
            "unit_price": str(it.unit_price),
            "subtotal": str(it.subtotal),
        })

    return APIResponse(
        message="Invoice retrieved",
        data={
            "invoice_number": invoice.invoice_number,
            "order_number": order.order_number,
            "date": invoice.created_at.strftime("%d %b %Y"),
            "business_name": invoice.business_name,
            "business_address": invoice.business_address,
            "gstin": invoice.gstin,
            "seller_name": invoice.seller_name,
            "items": items,
            "subtotal": str(invoice.subtotal),
            "discount_amount": str(invoice.discount_amount),
            "delivery_fee": str(invoice.delivery_fee),
            "total_amount": str(invoice.total_amount),
            "payment_status": invoice.payment_status,
            "payment_method": invoice.payment_method,
        },
    )
