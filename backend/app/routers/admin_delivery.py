from typing import List, Optional, Any, Dict
from decimal import Decimal
import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.models.delivery_partner import DeliveryPartner
from app.models.delivery_task import DeliveryTask
from app.models.delivery_partner_location import DeliveryPartnerLocation
from app.models.order import Order
from app.schemas.common import APIResponse
from app.schemas.delivery_location import LivePartnerLocationRead
from app.services.delivery_tracking_service import DeliveryTrackingService
from app.core.exceptions import NotFoundException
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["Admin Delivery Operations"])


class PartnerDetailResponse(BaseModel):
    partner_id: int
    user_id: int
    name: str
    phone: str
    email: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    is_available: bool
    is_verified: bool
    rating: Decimal
    status: str
    total_deliveries: int
    todays_deliveries: int
    completed_deliveries: int
    failed_deliveries: int
    earnings: Decimal
    current_location: Optional[Dict[str, Any]] = None
    active_deliveries: List[Dict[str, Any]] = []


@router.get("/delivery-partners", response_model=APIResponse[List[Dict[str, Any]]], summary="List all delivery partners")
def list_delivery_partners(
    is_verified: Optional[bool] = Query(None),
    is_available: Optional[bool] = Query(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    overview = DeliveryTrackingService.get_live_delivery_overview(db)
    items = []
    for p in overview:
        if is_verified is not None and p.is_verified != is_verified:
            continue
        if is_available is not None and p.is_available != is_available:
            continue
        items.append(p.model_dump())
    return APIResponse(data=items)


@router.get("/delivery/live", response_model=APIResponse[List[LivePartnerLocationRead]], summary="Live delivery monitoring data")
def get_live_delivery(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Returns live delivery map data for admin operations center.
    Contains active partner coordinates, vehicle details, statuses, and customer destinations.
    """
    data = DeliveryTrackingService.get_live_delivery_overview(db)
    return APIResponse(data=data)


@router.get("/delivery-partners/{partner_id}", response_model=APIResponse[PartnerDetailResponse], summary="Get delivery partner detailed profile")
def get_partner_detail(
    partner_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    partner = (
        db.query(DeliveryPartner)
        .options(joinedload(DeliveryPartner.user))
        .filter(DeliveryPartner.id == partner_id)
        .first()
    )
    if not partner:
        raise NotFoundException(f"Delivery partner {partner_id} not found")

    user = partner.user
    today_start = datetime.datetime.now(datetime.timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    todays_deliveries = (
        db.query(DeliveryTask)
        .filter(
            DeliveryTask.delivery_partner_id == partner.id,
            DeliveryTask.created_at >= today_start,
        )
        .count()
    )

    completed_deliveries = (
        db.query(DeliveryTask)
        .filter(
            DeliveryTask.delivery_partner_id == partner.id,
            DeliveryTask.status == "DELIVERED",
        )
        .count()
    )

    failed_deliveries = (
        db.query(DeliveryTask)
        .filter(
            DeliveryTask.delivery_partner_id == partner.id,
            DeliveryTask.status == "FAILED",
        )
        .count()
    )

    # Standard ₹35 per completed delivery
    earnings = Decimal(completed_deliveries * 35)

    latest_loc = (
        db.query(DeliveryPartnerLocation)
        .filter(DeliveryPartnerLocation.delivery_partner_id == partner.id)
        .order_by(DeliveryPartnerLocation.recorded_at.desc())
        .first()
    )
    loc_dict = None
    if latest_loc:
        loc_dict = {
            "latitude": float(latest_loc.latitude),
            "longitude": float(latest_loc.longitude),
            "speed_kmh": float(latest_loc.speed_kmh) if latest_loc.speed_kmh else None,
            "recorded_at": latest_loc.recorded_at.isoformat() if latest_loc.recorded_at else None,
        }

    # Active deliveries
    active_tasks = (
        db.query(DeliveryTask)
        .options(joinedload(DeliveryTask.order).joinedload(Order.customer), joinedload(DeliveryTask.order).joinedload(Order.address))
        .filter(
            DeliveryTask.delivery_partner_id == partner.id,
            DeliveryTask.status.in_(["ASSIGNED", "STARTED"]),
        )
        .all()
    )
    active_list = [
        {
            "task_id": t.id,
            "order_id": t.order_id,
            "order_number": t.order.order_number if t.order else None,
            "status": t.status,
            "customer_name": t.order.customer.name if (t.order and t.order.customer) else "Customer",
            "customer_phone": t.order.customer.phone if (t.order and t.order.customer) else None,
            "address": f"{t.order.address.address_line1}, {t.order.address.city}" if (t.order and t.order.address) else None,
            "total_amount": float(t.order.total_amount) if t.order else 0,
            "assigned_at": t.assigned_at.isoformat() if t.assigned_at else None,
        }
        for t in active_tasks
    ]

    partner_status = "AVAILABLE"
    if not partner.is_available:
        partner_status = "OFFLINE"
    elif any(t.status == "STARTED" for t in active_tasks):
        partner_status = "BUSY"
    elif active_tasks:
        partner_status = "ASSIGNED"
    else:
        partner_status = "ONLINE"

    res = PartnerDetailResponse(
        partner_id=partner.id,
        user_id=partner.user_id,
        name=user.name if user and user.name else f"Partner #{partner.id}",
        phone=user.phone if user else "",
        email=user.email if user else None,
        vehicle_type=partner.vehicle_type,
        vehicle_number=partner.vehicle_number,
        is_available=partner.is_available,
        is_verified=partner.is_verified,
        rating=partner.rating,
        status=partner_status,
        total_deliveries=partner.total_deliveries,
        todays_deliveries=todays_deliveries,
        completed_deliveries=completed_deliveries,
        failed_deliveries=failed_deliveries,
        earnings=earnings,
        current_location=loc_dict,
        active_deliveries=active_list,
    )

    return APIResponse(data=res)


@router.get("/delivery-tasks", response_model=APIResponse[List[Dict[str, Any]]], summary="List delivery tasks for assignment")
def list_delivery_tasks(
    status: Optional[str] = Query(None),
    unassigned_only: bool = Query(False),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = (
        db.query(DeliveryTask)
        .options(
            joinedload(DeliveryTask.order).joinedload(Order.customer),
            joinedload(DeliveryTask.order).joinedload(Order.address),
            joinedload(DeliveryTask.delivery_partner).joinedload(DeliveryPartner.user),
        )
        .order_by(DeliveryTask.created_at.desc())
    )
    if status:
        query = query.filter(DeliveryTask.status == status)
    if unassigned_only:
        query = query.filter(DeliveryTask.delivery_partner_id.is_(None))

    tasks = query.limit(100).all()
    res = [
        {
            "id": t.id,
            "order_id": t.order_id,
            "order_number": t.order.order_number if t.order else f"ORD-{t.order_id}",
            "order_status": t.order.status if t.order else "UNKNOWN",
            "task_status": t.status,
            "customer_name": t.order.customer.name if (t.order and t.order.customer) else "Customer",
            "customer_phone": t.order.customer.phone if (t.order and t.order.customer) else "",
            "delivery_address": (
                f"{t.order.address.address_line1}, {t.order.address.city}"
                if (t.order and t.order.address)
                else "Delivery Address"
            ),
            "destination_lat": float(t.order.address.latitude) if (t.order and t.order.address and t.order.address.latitude) else None,
            "destination_lng": float(t.order.address.longitude) if (t.order and t.order.address and t.order.address.longitude) else None,
            "delivery_partner_id": t.delivery_partner_id,
            "delivery_partner_name": (
                t.delivery_partner.user.name
                if (t.delivery_partner and t.delivery_partner.user)
                else None
            ),
            "total_amount": float(t.order.total_amount) if t.order else 0,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "assigned_at": t.assigned_at.isoformat() if t.assigned_at else None,
        }
        for t in tasks
    ]
    return APIResponse(data=res)


class PartnerVerificationUpdate(BaseModel):
    is_verified: bool


@router.patch("/delivery-partners/{partner_id}/verify", response_model=APIResponse[bool], summary="Verify or unverify a delivery partner")
def verify_delivery_partner(
    partner_id: int,
    payload: PartnerVerificationUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    partner = db.query(DeliveryPartner).filter(DeliveryPartner.id == partner_id).first()
    if not partner:
        raise NotFoundException(f"Delivery partner {partner_id} not found")
    partner.is_verified = payload.is_verified
    db.commit()
    return APIResponse(message=f"Delivery partner verification updated to {payload.is_verified}", data=True)

