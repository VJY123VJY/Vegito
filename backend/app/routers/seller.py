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
@router.put("/profile", response_model=APIResponse[SellerProfileRead], summary="Update seller profile")
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


@router.get("/dashboard/summary", summary="Seller command center summary")
def get_dashboard_summary(current_user: User = Depends(require_seller), db: Session = Depends(get_db)):
    from app.models.order import Order
    from app.models.seller_product import SellerProduct
    from app.models.seller_profile import SellerProfile
    from app.models.order_item import OrderItem
    from app.models.delivery_batch import DeliveryBatch
    from datetime import datetime, timedelta, timezone
    from collections import Counter

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)
    profile = db.query(SellerProfile).filter(SellerProfile.user_id == current_user.id).first()
    from sqlalchemy import or_
    orders = db.query(Order).filter(
        or_(
            Order.seller_id == current_user.id,
            Order.shop_id == profile.id if profile else False,
        )
    ).all()
    
    live_orders = pending_orders = ready_orders = today_orders = 0
    delivered_today = cancelled_today = out_for_delivery_today = 0
    today_revenue = weekly_revenue = monthly_revenue = 0.0
    today_gross_sales = 0.0
    items_sold_today = 0.0
    prep_times = []
    today_order_ids = []
    
    for o in orders:
        is_today = bool((o.placed_at and o.placed_at >= today_start) or (o.created_at and o.created_at >= today_start))
        if is_today:
            today_orders += 1
            today_order_ids.append(o.id)
            today_gross_sales += float(o.total_amount or 0)

        if o.status in ["ACCEPTED", "PACKING", "PREPARING", "SELLER_ACCEPTED"]:
            live_orders += 1
        elif o.status in ["NEW", "ORDER_PLACED"]:
            pending_orders += 1
        elif o.status in ["READY", "READY_FOR_PICKUP"]:
            ready_orders += 1
        elif o.status in ["PICKED_UP", "OUT_FOR_DELIVERY"]:
            out_for_delivery_today += 1
        elif o.status in ["CANCELLED", "REJECTED"]:
            if is_today:
                cancelled_today += 1

        if o.status in ["DELIVERED", "COMPLETED"]:
            amt = float(o.total_amount or 0)
            dt = o.delivered_at or o.updated_at
            if dt:
                if dt >= today_start:
                    today_revenue += amt
                    delivered_today += 1
                if dt >= week_start:
                    weekly_revenue += amt
                if dt >= month_start:
                    monthly_revenue += amt
                    
        if o.accepted_at and o.ready_at:
            delta = (o.ready_at - o.accepted_at).total_seconds() / 60.0
            if delta > 0:
                prep_times.append(delta)

    # Compute items sold today and top products
    top_products_today = []
    if today_order_ids:
        today_items = db.query(OrderItem).filter(OrderItem.order_id.in_(today_order_ids)).all()
        prod_counter = {}
        for it in today_items:
            qty = float(it.quantity or 0)
            rev = float(getattr(it, "total_price", None) or (float(getattr(it, "unit_price", 0) or 0) * qty))
            items_sold_today += qty
            p_name = it.product_name or "Produce"
            p_unit = it.unit or "kg"
            if p_name not in prod_counter:
                prod_counter[p_name] = {"quantity": 0.0, "revenue": 0.0, "unit": p_unit}
            prod_counter[p_name]["quantity"] += qty
            prod_counter[p_name]["revenue"] += rev

        sorted_prods = sorted(prod_counter.items(), key=lambda x: x[1]["quantity"], reverse=True)
        top_products_today = [
            {
                "name": name,
                "quantity": round(info["quantity"], 2),
                "revenue": round(info["revenue"], 2),
                "unit": info["unit"],
            }
            for name, info in sorted_prods[:5]
        ]

    # Compute area distribution
    area_counter = Counter()
    for o in orders:
        if o.id in today_order_ids and o.address:
            area = o.address.landmark or o.address.address_line1 or o.address.city or "Solapur"
            # Keep first 2-3 words of locality for clean display
            short_area = area.split(",")[0].strip()
            area_counter[short_area] += 1

    area_orders = [{"area": area, "count": count} for area, count in area_counter.most_common(5)]

    # Batches count
    from app.models.delivery_partner import DeliveryPartner
    dp = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == current_user.id).first()
    active_batches_count = 0
    if dp:
        active_batches_count = db.query(DeliveryBatch).filter(
            DeliveryBatch.delivery_partner_id == dp.id,
            DeliveryBatch.status.in_(["CREATED", "IN_PROGRESS"])
        ).count()

    avg_prep = sum(prep_times) / len(prep_times) if prep_times else None
    avg_order_val = (
        round(today_revenue / delivered_today, 2)
        if delivered_today > 0
        else (round(today_gross_sales / today_orders, 2) if today_orders > 0 else 0.0)
    )

    sps = db.query(SellerProduct).filter(SellerProduct.seller_id.in_(seller_ids)).all()
    low_stock_count = sum(1 for sp in sps if sp.stock_quantity <= (sp.low_stock_threshold or 10))
    profile = db.query(SellerProfile).filter(SellerProfile.user_id == current_user.id).first()
    
    return APIResponse(data={
        # V1 operational dashboard fields
        "store_name": profile.business_name if profile else "Vegito Fresh Store",
        "is_online": profile.is_available if profile else True,
        "orders_today": today_orders,
        "sales_today": round(today_revenue if today_revenue > 0 else today_gross_sales, 2),
        "delivered_today": delivered_today,
        "pending_today": pending_orders,
        "ready_today": ready_orders,
        "out_for_delivery_today": out_for_delivery_today,
        "cancelled_today": cancelled_today,
        "avg_order_value": avg_order_val,
        "items_sold_today": round(items_sold_today, 2),
        "active_batches_count": active_batches_count,
        "profit_status": "DATA_UNAVAILABLE",
        "profit_message": "Cost data not configured — showing gross sales",
        "profit_amount": None,
        "area_orders": area_orders,
        "top_products_today": top_products_today,
        "suggested_route": {
            "order_count": ready_orders,
            "can_batch": ready_orders > 0,
            "batch_count": 0,
            "total_orders": ready_orders,
            "batches": [],
        },
        # Backwards compatible fields
        "live_orders": live_orders,
        "pending_orders": pending_orders,
        "ready_orders": ready_orders,
        "today_orders": today_orders,
        "today_revenue": round(today_revenue, 2),
        "weekly_revenue": round(weekly_revenue, 2),
        "monthly_revenue": round(monthly_revenue, 2),
        "low_stock_count": low_stock_count,
        "total_products": len(sps),
        "active_products": sum(1 for sp in sps if getattr(sp, "is_available", True)),
        "avg_prep_time_min": round(avg_prep, 1) if avg_prep else None,
        "is_available": profile.is_available if profile else False
    })


@router.get("/analytics/product-performance", summary="Seller product performance")
def get_product_performance(current_user: User = Depends(require_seller), db: Session = Depends(get_db)):
    from app.models.seller_product import SellerProduct
    from app.models.order_item import OrderItem
    from app.models.order import Order
    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    month_ago = now - timedelta(days=30)
    
    sps = db.query(SellerProduct).filter(SellerProduct.seller_id == current_user.id).all()
    res = []
    
    for sp in sps:
        items = db.query(OrderItem).join(Order).filter(
            OrderItem.seller_product_id == sp.id,
            Order.placed_at >= month_ago,
            Order.status != "CANCELLED"
        ).all()
        
        sold = sum(float(i.quantity) for i in items)
        rev = sum(float(i.price * i.quantity) for i in items)
        orders_count = len(set(i.order_id for i in items))
        avg_qty = round(sold / orders_count, 2) if orders_count else 0.0
        
        avg_daily = sold / 30.0
        stock_turnover = round(float(sp.stock_quantity) / avg_daily, 1) if avg_daily > 0 else None
        
        res.append({
            "seller_product_id": sp.id,
            "product_id": sp.product_id,
            "product_name": sp.product.name if sp.product else "Unknown",
            "unit": sp.product.unit if sp.product else "",
            "current_stock": float(sp.stock_quantity),
            "total_units_sold": round(sold, 2),
            "total_revenue": round(rev, 2),
            "order_count": orders_count,
            "avg_order_quantity": avg_qty,
            "is_fast_moving": sold > 20,
            "is_slow_moving": sold < 2,
            "stock_turnover_days": stock_turnover,
            "low_stock": float(sp.stock_quantity) <= float(getattr(sp, "low_stock_threshold", 5) or 5)
        })
    return APIResponse(data=res)


@router.get("/analytics/low-stock-prediction", summary="Low stock prediction")
def get_low_stock_prediction(current_user: User = Depends(require_seller), db: Session = Depends(get_db)):
    from app.models.seller_product import SellerProduct
    from app.models.order_item import OrderItem
    from app.models.order import Order
    from datetime import datetime, timedelta, timezone
    
    now = datetime.now(timezone.utc)
    month_ago = now - timedelta(days=30)
    
    sps = db.query(SellerProduct).filter(SellerProduct.seller_id == current_user.id).all()
    res = []
    
    for sp in sps:
        items = db.query(OrderItem, Order.placed_at).join(Order).filter(
            OrderItem.seller_product_id == sp.id,
            Order.placed_at >= month_ago
        ).all()
        
        days_sold = set(i[1].date() for i in items if i[1])
        sold = sum(float(i[0].quantity) for i in items)
        
        has_suff = len(days_sold) >= 7
        avg_daily = round(sold / 30.0, 2)
        
        rem = round(float(sp.stock_quantity) / avg_daily, 1) if (avg_daily > 0 and has_suff) else None
        
        if not has_suff: rec = "Insufficient historical data"
        elif rem is not None and rem < 2: rec = "Restock urgently"
        elif rem is not None and rem < 5: rec = "Restock soon"
        else: rec = "Stock OK"
            
        res.append({
            "seller_product_id": sp.id,
            "product_name": sp.product.name if sp.product else "Unknown",
            "current_stock": float(sp.stock_quantity),
            "unit": sp.product.unit if sp.product else "",
            "avg_daily_sales": avg_daily,
            "days_remaining": rem,
            "has_sufficient_data": has_suff,
            "recommendation": rec,
            "suggested_restock_qty": round(14 * avg_daily, 1) if rec in ["Restock urgently", "Restock soon"] else None
        })
    return APIResponse(data=res)


@router.get("/orders/queue", summary="Smart order queue")
def get_orders_queue(status: str = None, current_user: User = Depends(require_seller), db: Session = Depends(get_db)):
    from app.models.order import Order
    from datetime import datetime, timezone
    
    profile = db.query(SellerProfile).filter(SellerProfile.user_id == current_user.id).first()
    from sqlalchemy import or_
    q = db.query(Order).filter(
        or_(
            Order.seller_id == current_user.id,
            Order.shop_id == profile.id if profile else False,
        )
    )
    if status: q = q.filter(Order.status == status)
    orders = q.all()
    
    now = datetime.now(timezone.utc)
    res = []
    for o in orders:
        score = 0
        if o.status == "NEW": score += 100
        elif o.status in ["ACCEPTED", "SELLER_ACCEPTED"]: score += 80
        elif o.status in ["PACKING", "PREPARING"]: score += 60
        elif o.status in ["READY", "READY_FOR_PICKUP"]: score += 40
            
        if o.placed_at:
            age_hr = (now - o.placed_at).total_seconds() / 3600.0
            score += min(int(age_hr), 24)
            
        is_urgent = getattr(o, "is_urgent", False)
        if is_urgent: score += 50
            
        prep_min = None
        sla = "NA"
        rem = None
        if o.accepted_at:
            prep_min = round((now - o.accepted_at).total_seconds() / 60.0, 1)
            rem = round(30.0 - prep_min, 1)
            if o.status in ["PACKING", "PREPARING", "ACCEPTED", "SELLER_ACCEPTED"]:
                if prep_min >= 30:
                    score += 60
                    sla = "BREACHED"
                elif prep_min >= 20:
                    score += 30
                    sla = "WARNING"
                else:
                    sla = "OK"
        
        odict = {
            "id": o.id, "order_number": o.order_number, "status": o.status,
            "total_amount": float(o.total_amount), "placed_at": o.placed_at.isoformat() if o.placed_at else None,
            "accepted_at": o.accepted_at.isoformat() if o.accepted_at else None,
            "customer_name": o.customer.name if o.customer else None,
            "priority_score": score,
            "is_urgent": is_urgent,
            "prep_minutes_elapsed": prep_min,
            "sla_status": sla,
            "sla_minutes_remaining": rem,
            "items_count": len(o.items) if o.items else 0
        }
        res.append(odict)
        
    res.sort(key=lambda x: x["priority_score"], reverse=True)
    return APIResponse(data=res)


@router.get("/inventory/audit-log", summary="Inventory transactions")
def get_inventory_audit(current_user: User = Depends(require_seller), db: Session = Depends(get_db)):
    from app.models.inventory_transaction import InventoryTransaction
    from app.models.inventory import Inventory
    from app.models.seller_product import SellerProduct
    from app.models.user import User as UserModel
    
    txs = db.query(InventoryTransaction, SellerProduct, UserModel)\
        .join(Inventory, InventoryTransaction.inventory_id == Inventory.id)\
        .join(SellerProduct, Inventory.seller_product_id == SellerProduct.id)\
        .outerjoin(UserModel, InventoryTransaction.created_by == UserModel.id)\
        .filter(SellerProduct.seller_id == current_user.id)\
        .order_by(InventoryTransaction.created_at.desc())\
        .limit(100).all()
        
    res = []
    for t, sp, u in txs:
        res.append({
            "id": t.id,
            "product_name": sp.product.name if (sp and sp.product) else "Produce",
            "transaction_type": t.transaction_type,
            "quantity": float(t.quantity),
            "reference_type": t.reference_type,
            "reference_id": t.reference_id,
            "note": t.note,
            "created_by_name": u.name if u else "Seller",
            "created_at": t.created_at.isoformat() if t.created_at else None
        })
    return APIResponse(data=res)


@router.patch("/inventory/{seller_product_id}/adjust", summary="Manual inventory adjust")
def adjust_inventory(seller_product_id: int, payload: dict, current_user: User = Depends(require_seller), db: Session = Depends(get_db)):
    from app.models.seller_product import SellerProduct
    from app.models.inventory import Inventory
    from app.models.inventory_transaction import InventoryTransaction
    from app.core.exceptions import NotFoundException, BadRequestException
    
    sp = db.query(SellerProduct).filter(SellerProduct.id == seller_product_id, SellerProduct.seller_id == current_user.id).first()
    if not sp:
        raise NotFoundException("Seller product not found")
        
    inv = db.query(Inventory).filter(Inventory.seller_product_id == sp.id).first()
    if not inv:
        inv = Inventory(seller_product_id=sp.id, quantity=sp.stock_quantity)
        db.add(inv)
        db.flush()
        
    delta = float(payload.get("delta", 0))
    if float(inv.quantity) + delta < 0:
        raise BadRequestException("Adjustment would result in negative stock quantity")
        
    inv.quantity = float(inv.quantity) + delta
    sp.stock_quantity = inv.quantity
    
    tx = InventoryTransaction(
        inventory_id=inv.id,
        transaction_type=payload.get("transaction_type", "ADJUSTMENT"),
        quantity=delta,
        note=payload.get("reason"),
        created_by=current_user.id
    )
    db.add(tx)
    db.commit()
    return APIResponse(message="Inventory updated", data={"new_quantity": float(inv.quantity), "seller_product_id": sp.id})


@router.get("/delivery/handoff-status", summary="Handoff status")
def get_handoff_status(current_user: User = Depends(require_seller), db: Session = Depends(get_db)):
    from app.models.order import Order
    from app.models.delivery_task import DeliveryTask
    from app.models.delivery_partner import DeliveryPartner
    from app.models.user import User as UserModel
    
    orders = db.query(Order).filter(
        Order.seller_id == current_user.id,
        Order.status.in_(["READY", "READY_FOR_PICKUP", "PICKED_UP", "OUT_FOR_DELIVERY"])
    ).all()
    
    res = []
    for o in orders:
        task = db.query(DeliveryTask).filter(DeliveryTask.order_id == o.id).first()
        dp_name = dp_phone = None
        if task and task.delivery_partner_id:
            dp = db.query(DeliveryPartner).filter(DeliveryPartner.id == task.delivery_partner_id).first()
            if dp:
                u = db.query(UserModel).filter(UserModel.id == dp.user_id).first()
                if u:
                    dp_name = u.name
                    dp_phone = u.phone
                    
        res.append({
            "order_id": o.id,
            "order_number": o.order_number,
            "order_status": o.status,
            "delivery_partner_name": dp_name,
            "delivery_partner_phone": dp_phone,
            "has_delivery_task": bool(task),
            "task_status": task.status if task else None,
            "pickup_otp": o.pickup_otp or (task.notes if task else None)
        })
    return APIResponse(data=res)


@router.get("/reports/sales", summary="Download sales report")
def download_sales_report(range: str = "30d", current_user: User = Depends(require_seller), db: Session = Depends(get_db)):
    from app.models.order import Order
    from fastapi.responses import StreamingResponse
    from datetime import datetime, timedelta, timezone
    import csv, io
    
    now = datetime.now(timezone.utc)
    days = 30
    if range == "7d": days = 7
    elif range == "90d": days = 90
    dt_start = now - timedelta(days=days)
    
    orders = db.query(Order).filter(
        Order.seller_id == current_user.id,
        Order.placed_at >= dt_start,
        Order.status != "CANCELLED"
    ).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Order ID", "Order Number", "Date", "Customer", "Total Amount", "Status"])
    for o in orders:
        writer.writerow([
            o.id, o.order_number,
            o.placed_at.isoformat() if o.placed_at else "",
            o.customer.name if o.customer else "",
            float(o.total_amount), o.status
        ])
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=sales_report_{now.strftime('%Y-%m-%d')}.csv"}
    )
