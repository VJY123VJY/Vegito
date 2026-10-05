from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_delivery_partner, require_seller_or_delivery, get_current_user
from app.models.user import User
from app.models.delivery_task import DeliveryTask
from app.models.seller_profile import SellerProfile
from app.core.exceptions import NotFoundException, ForbiddenException
from app.schemas.address import AddressRead
from app.schemas.delivery import (
    DeliveryTaskRead,
    DeliveryTaskStatusUpdate,
    DeliveryOtpVerifyRequest,
    VerifyPickupOtpRequest,
    DeliveryZoneRead,
    DeliveryPartnerProfileRead,
    DeliveryPartnerProfileUpdate,
    DeliveryPartnerAvailabilityUpdate,
)
from app.models.delivery_partner import DeliveryPartner
from app.schemas.common import APIResponse
from app.services.delivery_service import DeliveryService

router = APIRouter(prefix="/delivery", tags=["Delivery Partner"])


@router.get("/tasks", response_model=APIResponse[List[DeliveryTaskRead]], summary="List assigned delivery tasks")
def list_tasks(
    status: Optional[str] = None,
    current_user: User = Depends(require_seller_or_delivery),
    db: Session = Depends(get_db),
):
    tasks = DeliveryService.list_partner_tasks(db, current_user, status=status)
    return APIResponse(data=tasks)


@router.get("/orders", response_model=APIResponse[List[DeliveryTaskRead]], summary="List assigned delivery tasks (alias)")
def list_delivery_orders(
    status: Optional[str] = None,
    current_user: User = Depends(require_seller_or_delivery),
    db: Session = Depends(get_db),
):
    tasks = DeliveryService.list_partner_tasks(db, current_user, status=status)
    return APIResponse(data=tasks)


@router.get("/tasks/{task_id}", response_model=APIResponse[DeliveryTaskRead], summary="Get specific delivery task with IDOR protection")
def get_task(
    task_id: int,
    current_user: User = Depends(require_seller_or_delivery),
    db: Session = Depends(get_db),
):
    partner = DeliveryService.get_delivery_partner(db, current_user)
    task = db.query(DeliveryTask).filter(DeliveryTask.id == task_id).first()
    if not task:
        raise NotFoundException(f"Delivery task {task_id} not found")
    if task.delivery_partner_id is not None and task.delivery_partner_id != partner.id and current_user.role_id not in [4, 5]:
        if not (task.order and task.order.seller_id == current_user.id):
            raise ForbiddenException("This task is assigned to another delivery partner")


    order = task.order
    shop = order.shop if order else None
    if not shop and order and order.seller_id:
        shop = db.query(SellerProfile).filter(SellerProfile.user_id == order.seller_id).first()

    is_picked_up = bool(
        getattr(task, "pickup_verified", False)
        or (order and (
            order.pickup_otp_verified_at is not None
            or order.status in ["PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"]
        ))
    )

    cust_name = (order.customer.name if (order and order.customer) else "Customer") if is_picked_up else None
    cust_phone = (order.customer.phone if (order and order.customer) else None) if is_picked_up else None

    addr_obj = None
    if order and order.address and is_picked_up:
        addr_obj = AddressRead.model_validate(order.address)

    cust_lat = (order.delivery_latitude if (order and order.delivery_latitude is not None) else (order.address.latitude if (order and order.address) else None)) if is_picked_up else None
    cust_lng = (order.delivery_longitude if (order and order.delivery_longitude is not None) else (order.address.longitude if (order and order.address) else None)) if is_picked_up else None

    shop_lat = shop.latitude if (shop and shop.latitude is not None) else None
    shop_lng = shop.longitude if (shop and shop.longitude is not None) else None
    if (shop_lat is None or shop_lng is None) and order and order.seller_id:
        from app.services.location_service import LocationService
        s_lat, s_lng = LocationService.resolve_seller_coordinates(db, order.seller_id, fallback_to_default=False)
        if s_lat is not None:
            shop_lat = Decimal(str(s_lat))
        if s_lng is not None:
            shop_lng = Decimal(str(s_lng))

    read_task = DeliveryTaskRead(
        id=task.id,
        order_id=task.order_id,
        order_number=order.order_number if order else None,
        order_status=order.status if order else None,
        customer_name=cust_name,
        customer_phone=cust_phone,
        delivery_address=addr_obj,
        customer_latitude=cust_lat,
        customer_longitude=cust_lng,
        shop_name=shop.business_name if shop else "Vegito Fresh Farm",
        shop_address=shop.address if shop else "Solapur Market Depot",
        shop_latitude=shop_lat,
        shop_longitude=shop_lng,
        delivery_partner_id=task.delivery_partner_id,
        status=task.status,
        pickup_otp=None,
        pickup_otp_verified_at=order.pickup_otp_verified_at if order else None,
        pickup_verified=is_picked_up,
        pickup_at=task.pickup_at or (order.pickup_otp_verified_at if order else None),
        assigned_at=task.assigned_at,
        started_at=task.started_at,
        delivered_at=task.delivered_at,
        delivery_otp_verified_at=task.delivery_otp_verified_at,
        notes=task.notes,
        is_urgent=bool(order.is_urgent) if order else False,
        failure_reason=getattr(task, "failure_reason", None),
        created_at=task.created_at,
        updated_at=task.updated_at,
    )
    return APIResponse(data=read_task)


@router.post("/tasks/{task_id}/verify-pickup", response_model=APIResponse[dict], summary="Verify pickup OTP by task ID")
def verify_task_pickup_otp(
    task_id: int,
    payload: VerifyPickupOtpRequest,
    current_user: User = Depends(require_seller_or_delivery),
    db: Session = Depends(get_db),
):
    partner = DeliveryService.get_delivery_partner(db, current_user)
    task = db.query(DeliveryTask).filter(DeliveryTask.id == task_id).first()
    if not task:
        raise NotFoundException(f"Delivery task {task_id} not found")
    if task.delivery_partner_id is None:
        task.delivery_partner_id = partner.id
        if task.order:
            task.order.delivery_partner_id = partner.id
        db.commit()
    elif task.delivery_partner_id != partner.id and current_user.role_id not in [4, 5]:
        if not (task.order and task.order.seller_id == current_user.id):
            raise ForbiddenException("This task is assigned to another delivery partner")

    result = DeliveryService.verify_pickup_otp(db, current_user, task.order_id, payload.otp)
    return APIResponse(message="Pickup OTP Verified", data=result)


@router.get(
    "/tasks/{task_id}/customer-location",
    response_model=APIResponse[dict],
    summary="Get customer delivery location (Locked until pickup OTP verification)",
)
def get_task_customer_location(
    task_id: int,
    current_user: User = Depends(require_seller_or_delivery),
    db: Session = Depends(get_db),
):
    partner = DeliveryService.get_delivery_partner(db, current_user)
    task = db.query(DeliveryTask).filter(DeliveryTask.id == task_id).first()
    if not task:
        raise NotFoundException(f"Delivery task {task_id} not found")
    if task.delivery_partner_id is not None and task.delivery_partner_id != partner.id and current_user.role_id not in [4, 5]:
        if not (task.order and task.order.seller_id == current_user.id):
            raise ForbiddenException("This task is assigned to another delivery partner")

    order = task.order
    if not order:
        raise NotFoundException("Associated order not found")

    is_picked_up = bool(
        getattr(task, "pickup_verified", False)
        or (order.pickup_otp_verified_at is not None)
        or (order.status in ["PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"])
    )

    if not is_picked_up:
        raise ForbiddenException(
            "Customer delivery location is locked. Seller pickup OTP must be verified first."
        )

    addr_data = None
    if order.address:
        addr_data = AddressRead.model_validate(order.address).model_dump()

    raw_lat = order.delivery_latitude if order.delivery_latitude is not None else (order.address.latitude if order.address else None)
    cust_lat = float(raw_lat) if raw_lat is not None else None
    raw_lng = order.delivery_longitude if order.delivery_longitude is not None else (order.address.longitude if order.address else None)
    cust_lng = float(raw_lng) if raw_lng is not None else None

    return APIResponse(
        message="Customer delivery location authorized",
        data={
            "order_id": order.id,
            "order_number": order.order_number,
            "customer_name": order.customer.name if order.customer else "Customer",
            "customer_phone": order.customer.phone if order.customer else None,
            "delivery_address": addr_data,
            "customer_latitude": cust_lat,
            "customer_longitude": cust_lng,
        },
    )


@router.get(
    "/orders/{order_id}/customer-location",
    response_model=APIResponse[dict],
    summary="Get customer delivery location by order ID (Locked until pickup OTP verification)",
)
def get_order_customer_location(
    order_id: int,
    current_user: User = Depends(require_seller_or_delivery),
    db: Session = Depends(get_db),
):
    partner = DeliveryService.get_delivery_partner(db, current_user)
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise NotFoundException(f"Order {order_id} not found")
    if order.delivery_partner_id is not None and order.delivery_partner_id != partner.id and current_user.role_id not in [4, 5]:
        if order.seller_id != current_user.id:
            raise ForbiddenException("This order is assigned to another delivery partner")

    task = db.query(DeliveryTask).filter(DeliveryTask.order_id == order.id).first()

    is_picked_up = bool(
        (task and getattr(task, "pickup_verified", False))
        or (order.pickup_otp_verified_at is not None)
        or (order.status in ["PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"])
    )

    if not is_picked_up:
        raise ForbiddenException(
            "Customer delivery location is locked. Seller pickup OTP must be verified first."
        )

    addr_data = None
    if order.address:
        addr_data = AddressRead.model_validate(order.address).model_dump()

    raw_lat = order.delivery_latitude if order.delivery_latitude is not None else (order.address.latitude if order.address else None)
    cust_lat = float(raw_lat) if raw_lat is not None else None
    raw_lng = order.delivery_longitude if order.delivery_longitude is not None else (order.address.longitude if order.address else None)
    cust_lng = float(raw_lng) if raw_lng is not None else None

    return APIResponse(
        message="Customer delivery location authorized",
        data={
            "order_id": order.id,
            "order_number": order.order_number,
            "customer_name": order.customer.name if order.customer else "Customer",
            "customer_phone": order.customer.phone if order.customer else None,
            "delivery_address": addr_data,
            "customer_latitude": cust_lat,
            "customer_longitude": cust_lng,
        },
    )


@router.patch("/tasks/{task_id}/status", response_model=APIResponse[bool], summary="Update delivery task status")
def update_task_status(
    task_id: int,
    payload: DeliveryTaskStatusUpdate,
    current_user: User = Depends(require_seller_or_delivery),
    db: Session = Depends(get_db),
):
    DeliveryService.update_task_status(db, current_user, task_id, payload.status, payload.note)
    return APIResponse(message=f"Task marked as {payload.status}", data=True)


@router.post("/tasks/{task_id}/verify-otp", response_model=APIResponse[bool], summary="Verify customer OTP and complete delivery")
def verify_delivery_otp(
    task_id: int,
    payload: DeliveryOtpVerifyRequest,
    current_user: User = Depends(require_seller_or_delivery),
    db: Session = Depends(get_db),
):
    DeliveryService.verify_delivery_otp_and_complete(
        db, current_user, task_id, payload.delivery_otp, payload.notes
    )
    return APIResponse(message="Delivery verified and completed successfully", data=True)


@router.get("/zones", response_model=APIResponse[List[DeliveryZoneRead]], summary="List delivery zones")
def list_zones(db: Session = Depends(get_db)):
    zones = DeliveryService.list_zones(db)
    return APIResponse(data=[DeliveryZoneRead.model_validate(z) for z in zones])


@router.post("/orders/{order_id}/accept", response_model=APIResponse[bool], summary="Delivery partner accepts order")
def accept_order(
    order_id: int,
    current_user: User = Depends(require_seller_or_delivery),
    db: Session = Depends(get_db),
):
    DeliveryService.accept_delivery(db, current_user, order_id)
    return APIResponse(message="Delivery accepted", data=True)


@router.post("/orders/{order_id}/verify-pickup-otp", response_model=APIResponse[dict], summary="Delivery partner verifies pickup OTP from seller")
def verify_pickup_otp(
    order_id: int,
    payload: VerifyPickupOtpRequest,
    current_user: User = Depends(require_seller_or_delivery),
    db: Session = Depends(get_db),
):
    result = DeliveryService.verify_pickup_otp(db, current_user, order_id, payload.otp)
    return APIResponse(message="OTP Verified", data=result)


@router.post("/orders/{order_id}/pickup", response_model=APIResponse[bool], summary="Delivery partner marks order picked up from shop")
def pickup_order(
    order_id: int,
    current_user: User = Depends(require_seller_or_delivery),
    db: Session = Depends(get_db),
):
    DeliveryService.accept_delivery(db, current_user, order_id)
    return APIResponse(message="Order picked up from shop", data=True)


@router.post("/orders/{order_id}/start", response_model=APIResponse[bool], summary="Delivery partner starts delivery to customer")
def start_order(
    order_id: int,
    current_user: User = Depends(require_seller_or_delivery),
    db: Session = Depends(get_db),
):
    DeliveryService.start_delivery(db, current_user, order_id)
    return APIResponse(message="Delivery started — out for delivery", data=True)


@router.get("/profile", response_model=APIResponse[DeliveryPartnerProfileRead], summary="Get delivery partner profile")
def get_delivery_profile(
    current_user: User = Depends(require_seller_or_delivery),
    db: Session = Depends(get_db),
):
    partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == current_user.id).first()
    if not partner:
        partner = DeliveryPartner(
            user_id=current_user.id,
            vehicle_type="Motorcycle",
            vehicle_number="MH-13-AB-1234",
            is_available=True,
            is_verified=True,
        )
        db.add(partner)
        db.commit()
        db.refresh(partner)

    return APIResponse(
        data=DeliveryPartnerProfileRead(
            id=partner.id,
            user_id=current_user.id,
            name=current_user.name or "Delivery Partner",
            email=current_user.email or "",
            phone=current_user.phone or "",
            vehicle_type=partner.vehicle_type,
            vehicle_number=partner.vehicle_number,
            is_available=partner.is_available,
            is_verified=partner.is_verified,
            rating=partner.rating,
            total_deliveries=partner.total_deliveries,
            created_at=partner.created_at,
        )
    )


@router.patch("/profile", response_model=APIResponse[DeliveryPartnerProfileRead], summary="Update delivery partner profile")
def update_delivery_profile(
    payload: DeliveryPartnerProfileUpdate,
    current_user: User = Depends(require_seller_or_delivery),
    db: Session = Depends(get_db),
):
    partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == current_user.id).first()
    if not partner:
        partner = DeliveryPartner(user_id=current_user.id, is_available=True, is_verified=True)
        db.add(partner)
        db.flush()

    if payload.vehicle_type is not None:
        partner.vehicle_type = payload.vehicle_type
    if payload.vehicle_number is not None:
        partner.vehicle_number = payload.vehicle_number
    if payload.is_available is not None:
        partner.is_available = payload.is_available

    if payload.name is not None:
        current_user.name = payload.name
    if payload.phone is not None:
        current_user.phone = payload.phone

    db.commit()
    db.refresh(partner)

    # If partner became online, immediately assign any pending ready orders
    if partner.is_available:
        DeliveryService.assign_pending_ready_orders(db, partner.id)

    return APIResponse(
        message="Profile updated successfully",
        data=DeliveryPartnerProfileRead(
            id=partner.id,
            user_id=current_user.id,
            name=current_user.name or "Delivery Partner",
            email=current_user.email or "",
            phone=current_user.phone or "",
            vehicle_type=partner.vehicle_type,
            vehicle_number=partner.vehicle_number,
            is_available=partner.is_available,
            is_verified=partner.is_verified,
            rating=partner.rating,
            total_deliveries=partner.total_deliveries,
            created_at=partner.created_at,
        ),
    )


@router.patch("/availability", response_model=APIResponse[DeliveryPartnerProfileRead], summary="Toggle delivery partner availability (online/offline)")
def set_delivery_availability(
    payload: DeliveryPartnerAvailabilityUpdate,
    current_user: User = Depends(require_seller_or_delivery),
    db: Session = Depends(get_db),
):
    partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == current_user.id).first()
    if not partner:
        partner = DeliveryPartner(user_id=current_user.id, is_available=True, is_verified=True)
        db.add(partner)
        db.flush()

    partner.is_available = payload.is_available
    db.commit()
    db.refresh(partner)

    if partner.is_available:
        DeliveryService.assign_pending_ready_orders(db, partner.id)

    status_text = "online" if partner.is_available else "offline"
    return APIResponse(
        message=f"Delivery partner is now {status_text}",
        data=DeliveryPartnerProfileRead(
            id=partner.id,
            user_id=current_user.id,
            name=current_user.name or "Delivery Partner",
            email=current_user.email or "",
            phone=current_user.phone or "",
            vehicle_type=partner.vehicle_type,
            vehicle_number=partner.vehicle_number,
            is_available=partner.is_available,
            is_verified=partner.is_verified,
            rating=partner.rating,
            total_deliveries=partner.total_deliveries,
            created_at=partner.created_at,
        ),
    )


@router.get("/reviews", summary="Customer reviews for logged-in delivery partner")
def get_partner_reviews(
    current_user: User = Depends(require_seller_or_delivery),
    db: Session = Depends(get_db),
):
    from app.services.review_service import ReviewService
    from app.models.delivery_partner import DeliveryPartner
    partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == current_user.id).first()
    if not partner:
        return APIResponse(data={"average_rating": 0.0, "total_reviews": 0, "reviews": []})
    summary = ReviewService.get_delivery_partner_reviews(db, partner.id)
    return APIResponse(data=summary)


@router.get("/earnings", summary="Delivery earnings dashboard")
def get_delivery_earnings(current_user: User = Depends(require_seller_or_delivery), db: Session = Depends(get_db)):
    from app.models.delivery_task import DeliveryTask
    from app.models.delivery_partner import DeliveryPartner
    from datetime import datetime, timedelta, timezone
    
    partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == current_user.id).first()
    if not partner:
        return APIResponse(data={"today": {"deliveries": 0, "base_earnings": 0.0, "failed": 0}, "this_week": {"deliveries": 0, "base_earnings": 0.0, "failed": 0}, "this_month": {"deliveries": 0, "base_earnings": 0.0, "failed": 0}, "total_lifetime": {"deliveries": 0, "base_earnings": 0.0, "failed": 0}})
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)
    
    tasks = db.query(DeliveryTask).filter(DeliveryTask.delivery_partner_id == partner.id).all()
    
    def calc_stats(t_list):
        comps = [t for t in t_list if t.status in ["DELIVERED", "COMPLETED"]]
        fails = [t for t in t_list if t.status == "FAILED"]
        return {
            "deliveries": len(comps),
            "base_earnings": len(comps) * 35.0,
            "failed": len(fails)
        }
        
    today_tasks = [t for t in tasks if t.created_at and t.created_at >= today_start]
    week_tasks = [t for t in tasks if t.created_at and t.created_at >= week_start]
    month_tasks = [t for t in tasks if t.created_at and t.created_at >= month_start]
    
    return APIResponse(data={
        "today": calc_stats(today_tasks),
        "this_week": calc_stats(week_tasks),
        "this_month": calc_stats(month_tasks),
        "total_lifetime": calc_stats(tasks)
    })


@router.get("/performance", summary="Delivery performance metrics")
def get_delivery_performance(current_user: User = Depends(require_seller_or_delivery), db: Session = Depends(get_db)):
    from app.models.delivery_task import DeliveryTask
    from app.models.delivery_partner import DeliveryPartner
    from app.models.review import Review
    from app.models.order import Order
    from sqlalchemy.orm import joinedload
    
    partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == current_user.id).first()
    if not partner:
        return APIResponse(data={
            "total_completed": 0, "total_failed": 0, "on_time_percentage": 100.0,
            "avg_delivery_time_min": None, "avg_pickup_time_min": None,
            "customer_rating": 5.0, "cancellation_rate": 0.0
        })
    
    tasks = db.query(DeliveryTask).options(joinedload(DeliveryTask.order)).filter(DeliveryTask.delivery_partner_id == partner.id).all()
    comp = [t for t in tasks if t.status in ["DELIVERED", "COMPLETED"]]
    fails = [t for t in tasks if t.status == "FAILED"]
    
    on_time = 0
    del_times = []
    pick_times = []
    
    for t in comp:
        if t.created_at and t.updated_at:
            mins = (t.updated_at - t.created_at).total_seconds() / 60.0
            if mins <= 60: on_time += 1
            
        o = t.order
        if o and getattr(o, "picked_up_at", None) and getattr(o, "delivered_at", None):
            dt = (o.delivered_at - o.picked_up_at).total_seconds() / 60.0
            if dt > 0: del_times.append(dt)
        if o and getattr(o, "ready_at", None) and getattr(o, "picked_up_at", None):
            pt = (o.picked_up_at - o.ready_at).total_seconds() / 60.0
            if pt > 0: pick_times.append(pt)
            
    total = len(comp) + len(fails)
    
    reviews = db.query(Review).filter(Review.delivery_partner_id == partner.id).all()
    valid_ratings = [float(r.delivery_rating) for r in reviews if r.delivery_rating]
    rating = round(sum(valid_ratings) / len(valid_ratings), 1) if valid_ratings else 5.0
    
    return APIResponse(data={
        "total_completed": len(comp),
        "total_failed": len(fails),
        "on_time_percentage": round((on_time / len(comp) * 100), 1) if comp else 100.0,
        "avg_delivery_time_min": round(sum(del_times) / len(del_times), 1) if del_times else None,
        "avg_pickup_time_min": round(sum(pick_times) / len(pick_times), 1) if pick_times else None,
        "customer_rating": rating,
        "cancellation_rate": round((len(fails) / total * 100), 1) if total > 0 else 0.0
    })


@router.post("/tasks/{task_id}/fail", summary="Mark task as failed")
def fail_delivery_task(task_id: int, payload: dict, current_user: User = Depends(require_seller_or_delivery), db: Session = Depends(get_db)):
    from app.models.delivery_task import DeliveryTask
    from app.models.delivery_partner import DeliveryPartner
    from app.models.delivery_task_status_history import DeliveryTaskStatusHistory
    from app.models.order_status_history import OrderStatusHistory
    from app.models.order import Order
    from app.core.exceptions import NotFoundException
    from datetime import datetime, timezone
    
    partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == current_user.id).first()
    task = db.query(DeliveryTask).filter(DeliveryTask.id == task_id, DeliveryTask.delivery_partner_id == partner.id).first()
    if not task:
        raise NotFoundException("Delivery task not found or not assigned to you")
        
    reason = payload.get('reason', 'OTHER')
    notes = payload.get('notes', '')
    now = datetime.now(timezone.utc)
    
    task.status = "FAILED"
    task.failure_reason = reason
    task.failed_at = now
    task.notes = f"{reason}: {notes}".strip()
    
    t_hist = DeliveryTaskStatusHistory(delivery_task_id=task.id, status="FAILED", note=task.notes)
    db.add(t_hist)
    
    if task.order:
        task.order.status = "CANCELLED"
        task.order.cancelled_at = now
        o_hist = OrderStatusHistory(order_id=task.order.id, status="CANCELLED", note=f"Delivery failed: {task.notes}")
        db.add(o_hist)
        
    db.commit()
    return APIResponse(message="Delivery marked as failed", data=True)

