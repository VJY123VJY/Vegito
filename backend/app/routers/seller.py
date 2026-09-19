from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.schemas.market_intelligence import MarketIntelligenceRead
from app.schemas.market_intelligence import PriceHistoryRead
from app.database import get_db
from app.dependencies import require_seller
from app.models.user import User
from app.schemas.seller import SellerProfileRead, SellerProfileUpdate, SellerAvailabilityUpdate
from app.schemas.common import APIResponse
from app.services.seller_service import SellerService

router = APIRouter(prefix="/seller", tags=["Seller Profile"])


@router.get("/profile", response_model=APIResponse[SellerProfileRead], summary="Get seller profile")
def get_seller_profile(
    current_user: User = Depends(require_seller), db: Session = Depends(get_db)
):
    profile = SellerService.get_profile(db, current_user)
    return APIResponse(data=SellerProfileRead.model_validate(profile))


@router.patch("/profile", response_model=APIResponse[SellerProfileRead], summary="Update seller profile")
def update_seller_profile(
    payload: SellerProfileUpdate,
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    profile = SellerService.update_profile(db, current_user, payload)
    return APIResponse(message="Profile updated successfully", data=SellerProfileRead.model_validate(profile))


@router.patch("/availability", response_model=APIResponse[SellerProfileRead], summary="Toggle seller availability (online/offline)")
def set_seller_availability(
    payload: SellerAvailabilityUpdate,
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    profile = SellerService.set_availability(db, current_user, payload.is_available)
    status_text = "online" if payload.is_available else "offline"
    return APIResponse(
        message=f"Seller is now {status_text}",
        data=SellerProfileRead.model_validate(profile),
    )


@router.get("/market-intelligence", response_model=APIResponse[List[MarketIntelligenceRead]], summary="Get daily market analysis for listed products")
def get_market_intelligence(
    current_user: User = Depends(require_seller), db: Session = Depends(get_db)
):
    intelligence = SellerService.get_market_intelligence(db, current_user.id)
    return APIResponse(data=[MarketIntelligenceRead.model_validate(i) for i in intelligence])


@router.get("/price-history/{seller_product_id}", response_model=APIResponse[List[PriceHistoryRead]], summary="Get historical prices for a product")
def get_price_history(
    seller_product_id: int,
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db)
):
    history = SellerService.get_price_history(db, current_user, seller_product_id)
    return APIResponse(data=[PriceHistoryRead.model_validate(h) for h in history])


@router.post("/publish-price", response_model=APIResponse[dict], summary="Explicitly publish a new product price")
def publish_price(
    payload: dict,
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    sp_id = payload.get("seller_product_id")
    new_price = payload.get("price")
    if not sp_id or not new_price:
        from app.core.exceptions import BadRequestException
        raise BadRequestException("seller_product_id and price are required")

    from decimal import Decimal
    sp = SellerService.publish_price(db, current_user, sp_id, Decimal(str(new_price)))
    return APIResponse(message="Price published successfully", data={"seller_product_id": sp.id, "new_price": float(sp.price)})


@router.get("/analytics/revenue", summary="Seller revenue trends")
def get_seller_revenue_analytics(
    range: str = "30d",
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    from app.services.analytics_service import AnalyticsService
    mapping = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    days = mapping.get(range.lower(), 30)
    data = AnalyticsService.get_seller_revenue(db, current_user.id, range_days=days)
    return APIResponse(data=[d.model_dump() for d in data])


@router.get("/analytics/orders", summary="Seller order trends")
def get_seller_order_analytics(
    range: str = "30d",
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    from app.services.analytics_service import AnalyticsService
    mapping = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    days = mapping.get(range.lower(), 30)
    data = AnalyticsService.get_seller_orders(db, current_user.id, range_days=days)
    return APIResponse(data=[d.model_dump() for d in data])


@router.get("/analytics/products", summary="Seller top product performance")
def get_seller_product_analytics(
    limit: int = 5,
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    from app.services.analytics_service import AnalyticsService
    data = AnalyticsService.get_seller_top_products(db, current_user.id, limit=limit)
    return APIResponse(data=[d.model_dump() for d in data])


@router.patch("/fulfillments/{fulfillment_id}/status", summary="Update seller fulfillment status")
def update_fulfillment_status(
    fulfillment_id: int,
    payload: dict,
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    from app.services.seller_fulfillment_service import SellerFulfillmentService
    new_status = payload.get("status")
    note = payload.get("note")
    f = SellerFulfillmentService.update_fulfillment_status(
        db, current_user, fulfillment_id, new_status, note
    )
    return APIResponse(message=f"Fulfillment status updated to {new_status}", data={"id": f.id, "status": f.status})


@router.get("/earnings", summary="Seller earnings, payouts, and order revenue breakdown")
def get_seller_earnings(
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    from app.models.order import Order
    from app.models.seller_profile import SellerProfile

    delivered_orders = (
        db.query(Order)
        .filter(Order.seller_id == current_user.id, Order.status.in_(["DELIVERED", "COMPLETED"]))
        .order_by(Order.delivered_at.desc())
        .all()
    )
    total_revenue = sum(float(o.total_amount) for o in delivered_orders)
    delivered_count = len(delivered_orders)

    pending_orders = (
        db.query(Order)
        .filter(
            Order.seller_id == current_user.id,
            Order.status.in_(["NEW", "ACCEPTED", "SELLER_ACCEPTED", "PACKING", "PREPARING", "READY", "READY_FOR_PICKUP", "PICKED_UP", "OUT_FOR_DELIVERY"]),
        )
        .all()
    )
    pending_amount = sum(float(o.total_amount) for o in pending_orders)

    commission_rate = 5.0
    platform_fee = round(total_revenue * (commission_rate / 100.0), 2)
    net_earnings = round(total_revenue - platform_fee, 2)

    transactions = [
        {
            "order_id": o.id,
            "order_number": o.order_number,
            "date": o.delivered_at.isoformat() if o.delivered_at else o.placed_at.isoformat(),
            "customer_name": o.customer.name if o.customer else "Customer",
            "total_amount": float(o.total_amount),
            "payment_method": o.payment_method,
            "payment_status": o.payment_status,
            "status": o.status,
        }
        for o in delivered_orders[:20]
    ]

    return APIResponse(
        data={
            "total_revenue": total_revenue,
            "net_earnings": net_earnings,
            "platform_fee": platform_fee,
            "pending_amount": pending_amount,
            "delivered_orders_count": delivered_count,
            "pending_orders_count": len(pending_orders),
            "commission_rate_percent": commission_rate,
            "transactions": transactions,
        }
    )


@router.get("/reviews", summary="Customer reviews for seller's products")
def get_seller_reviews(
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    from app.models.review import Review
    from app.models.seller_product import SellerProduct

    seller_prod_ids = [sp.product_id for sp in db.query(SellerProduct.product_id).filter(SellerProduct.seller_id == current_user.id).all()]

    filter_cond = Review.seller_id == current_user.id
    if seller_prod_ids:
        filter_cond = filter_cond | Review.product_id.in_(seller_prod_ids)

    reviews = (
        db.query(Review)
        .filter(filter_cond)
        .order_by(Review.created_at.desc())
        .all()
    )

    results = []
    for r in reviews:
        results.append({
            "id": r.id,
            "order_id": r.order_id,
            "product_id": r.product_id,
            "product_name": r.product.name if r.product else None,
            "customer_name": r.customer.name if r.customer else "Customer",
            "rating": r.product_rating or r.seller_rating or 5,
            "comment": r.comment or "",
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return APIResponse(data=results)


@router.get("/complaints", summary="Complaints associated with seller's orders")
def get_seller_complaints(
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    from app.models.complaint import Complaint
    from app.models.order import Order

    seller_order_ids = [o.id for o in db.query(Order.id).filter(Order.seller_id == current_user.id).all()]

    complaints = (
        db.query(Complaint)
        .filter(Complaint.order_id.in_(seller_order_ids))
        .order_by(Complaint.created_at.desc())
        .all()
    ) if seller_order_ids else []

    results = []
    for c in complaints:
        results.append({
            "id": c.id,
            "order_id": c.order_id,
            "order_number": c.order.order_number if c.order else f"#{c.order_id}",
            "customer_name": c.customer.name if c.customer else "Customer",
            "complaint_type": c.complaint_type,
            "description": c.description,
            "status": c.status,
            "resolution": c.resolution,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })

    return APIResponse(data=results)


