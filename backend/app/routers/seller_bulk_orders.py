"""
seller_bulk_orders.py — Router for Seller bulk order management, quoting, and tiered pricing.

Allows Solapur mandi sellers to:
- View incoming B2B bulk requests from restaurants, caterers, and hotels
- Inspect stock availability & reservations for requested quantities
- Accept bulk orders at standard/tiered rates
- Submit custom negotiated quotes with line-item prices, delivery charges, and expiry windows
- Decline/reject requests if unable to fulfill
- Configure volume-based tiered pricing rules per product
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, Path, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_seller
from app.models.user import User
from app.models.seller_product import SellerProduct
from app.models.bulk_pricing_rule import BulkPricingRule
from app.schemas.common import APIResponse
from app.schemas.business import (
    SendCustomQuoteRequest,
    BulkPricingRuleCreate,
    BulkPricingRuleRead,
)
from app.services.bulk_order_service import BulkOrderService
from app.core.exceptions import NotFoundException, ForbiddenException, BadRequestException


router = APIRouter(prefix="/seller/bulk-orders", tags=["Seller Bulk Orders"])


class BulkOrderRejectRequest(BaseModel):
    reason: Optional[str] = None


@router.get("", response_model=APIResponse[List[Dict[str, Any]]], summary="List incoming B2B bulk orders for seller")
def list_seller_bulk_orders(
    status: Optional[str] = Query(None, description="Filter by status (e.g. BULK_REQUESTED, QUOTE_SENT, CONFIRMED)"),
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    """
    Returns all B2B bulk orders directed to this seller, sorted by newest first.
    Includes business customer contact details, item summaries, and delivery time windows.
    """
    orders = BulkOrderService.list_seller_bulk_orders(db, current_user.id, status=status)
    return APIResponse(
        message="Seller bulk orders retrieved successfully",
        data=orders,
    )


@router.get("/{order_id}", response_model=APIResponse[Dict[str, Any]], summary="Get detailed bulk order with live inventory availability")
def get_seller_bulk_order(
    order_id: int = Path(..., description="ID of the bulk order"),
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    """
    Retrieves full details of a bulk order including customer/business profile,
    items with current warehouse stock and reserved stock, quote status, and audit history.
    """
    order_detail = BulkOrderService.get_seller_bulk_order(db, current_user.id, order_id)
    return APIResponse(
        message="Bulk order details retrieved",
        data=order_detail,
    )


@router.post("/{order_id}/accept", response_model=APIResponse[Dict[str, Any]], summary="Accept bulk order at standard/tiered rates")
def accept_seller_bulk_order(
    order_id: int = Path(..., description="ID of the bulk order to accept"),
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    """
    Seller accepts the bulk order at standard prices or tiered volume rules.
    Atomically checks stock, increases reserved_quantity in inventory,
    transitions status to CONFIRMED, generates B2B invoice, and sends push/in-app notification.
    """
    order = BulkOrderService.seller_accept_standard_price(db, current_user.id, order_id)
    return APIResponse(
        message="Bulk order accepted and inventory reserved successfully",
        data={
            "order_id": order.id,
            "order_number": order.order_number,
            "status": order.status,
            "quote_status": order.quote_status,
            "total_amount": str(order.total_amount),
        },
    )


@router.post("/{order_id}/quote", response_model=APIResponse[Dict[str, Any]], summary="Send custom quote with discounted unit prices & delivery fee")
def send_seller_quote(
    order_id: int = Path(..., description="ID of the bulk order"),
    payload: SendCustomQuoteRequest = Body(...),
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    """
    Submits a negotiated quote to the business customer:
    - Quoted unit prices per item
    - Delivery / transport fee
    - Validity duration (default 24h)
    Transitions order to QUOTE_SENT and alerts customer.
    """
    order = BulkOrderService.seller_send_custom_quote(db, current_user.id, order_id, payload)
    return APIResponse(
        message="Custom quote sent to customer successfully",
        data={
            "order_id": order.id,
            "order_number": order.order_number,
            "status": order.status,
            "quote_status": order.quote_status,
            "quote_total": str(order.quote_total),
            "quote_delivery_fee": str(order.quote_delivery_fee),
            "quote_expires_at": order.quote_expires_at.isoformat() if order.quote_expires_at else None,
        },
    )


@router.post("/{order_id}/reject", response_model=APIResponse[Dict[str, Any]], summary="Decline/reject a bulk order request")
def reject_seller_bulk_order(
    order_id: int = Path(..., description="ID of the bulk order"),
    payload: BulkOrderRejectRequest = Body(default_factory=BulkOrderRejectRequest),
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    """
    Seller declines the bulk order (e.g. stock shortfall or schedule conflict).
    Safely releases any reservations, transitions status to CANCELLED, and notifies the business buyer.
    """
    order = BulkOrderService.seller_reject_bulk_order(db, current_user.id, order_id, payload.reason)
    return APIResponse(
        message="Bulk order request declined",
        data={
            "order_id": order.id,
            "order_number": order.order_number,
            "status": order.status,
        },
    )


# ---------------------------------------------------------------------------
# Bulk Pricing Tier Management
# ---------------------------------------------------------------------------

@router.get("/pricing-rules/{seller_product_id}", response_model=APIResponse[List[BulkPricingRuleRead]], summary="Get active bulk pricing tiers for a product")
def get_bulk_pricing_rules(
    seller_product_id: int = Path(...),
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    """
    Lists all active volume pricing tier rules for a seller's product.
    """
    sp = db.query(SellerProduct).filter(SellerProduct.id == seller_product_id, SellerProduct.seller_id == current_user.id).first()
    if not sp:
        raise NotFoundException("Seller product not found or does not belong to you")

    rules = BulkOrderService.list_pricing_rules_for_seller_product(db, seller_product_id)
    return APIResponse(
        message="Bulk pricing rules retrieved",
        data=[BulkPricingRuleRead.model_validate(r) for r in rules],
    )


@router.post("/pricing-rules", response_model=APIResponse[BulkPricingRuleRead], summary="Create or update bulk pricing tier rule")
def create_bulk_pricing_rule(
    payload: BulkPricingRuleCreate = Body(...),
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    """
    Sets up a volume pricing tier (e.g. 20kg-50kg @ ₹22/kg, 50kg+ @ ₹19/kg).
    """
    sp = db.query(SellerProduct).filter(SellerProduct.id == payload.seller_product_id, SellerProduct.seller_id == current_user.id).first()
    if not sp:
        raise ForbiddenException("Product does not belong to this seller")

    rule = BulkOrderService.create_or_update_pricing_rule(db, payload)
    return APIResponse(
        message="Bulk pricing tier rule created successfully",
        data=BulkPricingRuleRead.model_validate(rule),
    )


@router.delete("/pricing-rules/{rule_id}", response_model=APIResponse[dict], summary="Deactivate a bulk pricing rule")
def delete_bulk_pricing_rule(
    rule_id: int = Path(...),
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    """
    Deactivates a bulk pricing tier.
    """
    rule = db.query(BulkPricingRule).filter(BulkPricingRule.id == rule_id).first()
    if not rule:
        raise NotFoundException("Pricing rule not found")

    sp = db.query(SellerProduct).filter(SellerProduct.id == rule.seller_product_id, SellerProduct.seller_id == current_user.id).first()
    if not sp:
        raise ForbiddenException("Pricing rule does not belong to this seller")

    rule.is_active = False
    db.commit()

    return APIResponse(
        message="Bulk pricing rule deactivated",
        data={"rule_id": rule_id},
    )
