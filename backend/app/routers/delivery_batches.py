import datetime
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.dependencies import require_seller_or_delivery, get_current_user
from app.models.user import User
from app.models.order import Order
from app.models.delivery_task import DeliveryTask
from app.models.delivery_batch import DeliveryBatch
from app.models.delivery_batch_order import DeliveryBatchOrder
from app.models.seller_profile import SellerProfile
from app.schemas.delivery import DeliveryBatchCreate, DeliveryBatchRead, DeliveryTaskRead
from app.schemas.common import APIResponse
from app.services.delivery_service import DeliveryService, calculate_haversine_distance_km
from app.core.constants import DeliveryTaskStatus, OrderStatus
from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException
from app.config import settings

router = APIRouter(prefix="/delivery-batches", tags=["Delivery Batches"])


def _build_batch_read(db: Session, batch: DeliveryBatch, current_user: User) -> DeliveryBatchRead:
    partner = DeliveryService.get_delivery_partner(db, current_user)
    batch_read = DeliveryBatchRead(
        id=batch.id,
        delivery_partner_id=batch.delivery_partner_id,
        zone_id=batch.zone_id,
        status=batch.status,
        total_orders=batch.total_orders,
        started_at=batch.started_at,
        completed_at=batch.completed_at,
        tasks=[],
    )
    # Fetch ordered tasks
    batch_orders = (
        db.query(DeliveryBatchOrder)
        .filter(DeliveryBatchOrder.batch_id == batch.id)
        .order_by(DeliveryBatchOrder.sequence_number.asc())
        .all()
    )
    task_ids = [bo.delivery_task_id for bo in batch_orders]
    if task_ids:
        all_partner_tasks = DeliveryService.list_partner_tasks(db, current_user)
        task_map = {t.id: t for t in all_partner_tasks}
        batch_read.tasks = [task_map[tid] for tid in task_ids if tid in task_map]
    return batch_read


@router.post("", response_model=APIResponse[DeliveryBatchRead], status_code=status.HTTP_201_CREATED, summary="Create a delivery batch / route")
def create_delivery_batch(
    payload: DeliveryBatchCreate,
    current_user: User = Depends(require_seller_or_delivery),
    db: Session = Depends(get_db),
):
    max_batch_size = getattr(settings, "MAX_DELIVERY_BATCH_SIZE", 10)
    task_ids = list(payload.task_ids or [])

    if payload.order_ids and len(payload.order_ids) > max_batch_size:
        raise BadRequestException(
            f"Maximum batch size is {max_batch_size} orders. Selected orders exceed maximum allowed limit."
        )

    partner = DeliveryService.get_delivery_partner(db, current_user)

    if not task_ids and payload.order_ids:
        for o_id in payload.order_ids:
            task = db.query(DeliveryTask).filter(DeliveryTask.order_id == o_id).first()
            if not task:
                ord_obj = db.query(Order).filter(Order.id == o_id).first()
                if ord_obj:
                    task = DeliveryTask(
                        order_id=o_id,
                        delivery_partner_id=partner.id,
                        status=DeliveryTaskStatus.ASSIGNED.value,
                    )
                    db.add(task)
                    db.flush()
            if task:
                task_ids.append(task.id)

    if len(task_ids) == 0:
        raise BadRequestException("At least one order must be selected to create a delivery route.")

    if len(task_ids) > max_batch_size:
        raise BadRequestException(
            f"Maximum batch size is {max_batch_size} orders. Selected orders exceed maximum allowed limit."
        )

    # Load tasks and verify ownership
    tasks = db.query(DeliveryTask).filter(DeliveryTask.id.in_(task_ids)).all()
    if len(tasks) != len(task_ids):
        raise NotFoundException("One or more selected delivery tasks were not found.")

    for t in tasks:
        # Authorization check: task must be assigned to partner or belong to seller
        if t.delivery_partner_id is not None and t.delivery_partner_id != partner.id:
            if not (t.order and t.order.seller_id == current_user.id):
                raise ForbiddenException(f"Task {t.id} is assigned to another delivery partner.")
        if t.status in [DeliveryTaskStatus.DELIVERED.value, DeliveryTaskStatus.CANCELLED.value]:
            raise BadRequestException(f"Task {t.id} is already {t.status} and cannot be added to a new route.")

    # Sort tasks in practical geographical order starting from driver GPS or shop
    origin_lat, origin_lng = 17.6599, 75.9064  # Solapur APMC default
    if payload.latitude is not None and payload.longitude is not None:
        origin_lat, origin_lng = float(payload.latitude), float(payload.longitude)
    else:
        seller_prof = db.query(SellerProfile).filter(SellerProfile.user_id == current_user.id).first()
        if seller_prof and seller_prof.latitude and seller_prof.longitude:
            origin_lat, origin_lng = float(seller_prof.latitude), float(seller_prof.longitude)

    def get_task_distance(task: DeliveryTask) -> float:
        ord = task.order
        if ord and ord.address and ord.address.latitude and ord.address.longitude:
            return calculate_haversine_distance_km(
                origin_lat, origin_lng, float(ord.address.latitude), float(ord.address.longitude)
            )
        return 999.0

    sorted_tasks = sorted(tasks, key=get_task_distance)

    # Create batch
    batch = DeliveryBatch(
        zone_id=payload.zone_id,
        delivery_partner_id=partner.id,
        total_orders=len(sorted_tasks),
        status="READY",
    )
    db.add(batch)
    db.flush()

    for idx, t in enumerate(sorted_tasks, start=1):
        bo = DeliveryBatchOrder(
            batch_id=batch.id,
            delivery_task_id=t.id,
            sequence_number=idx,
        )
        db.add(bo)
        # Ensure task and order are assigned to this partner
        t.delivery_partner_id = partner.id
        if t.order:
            t.order.delivery_partner_id = partner.id

    db.commit()
    db.refresh(batch)

    data = _build_batch_read(db, batch, current_user)
    return APIResponse(message=f"Delivery route #{batch.id} created with {batch.total_orders} stops", data=data)


@router.get("", response_model=APIResponse[List[DeliveryBatchRead]], summary="List delivery batches for partner")
def list_delivery_batches(
    current_user: User = Depends(require_seller_or_delivery),
    db: Session = Depends(get_db),
):
    partner = DeliveryService.get_delivery_partner(db, current_user)
    batches = (
        db.query(DeliveryBatch)
        .filter(DeliveryBatch.delivery_partner_id == partner.id)
        .order_by(DeliveryBatch.created_at.desc())
        .limit(30)
        .all()
    )
    result = [_build_batch_read(db, b, current_user) for b in batches]
    return APIResponse(data=result)


@router.get("/suggest-grouping", summary="Suggest smart route grouping of ready orders (max 10)")
def suggest_route_grouping(
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    current_user: User = Depends(require_seller_or_delivery),
    db: Session = Depends(get_db),
):
    """
    Groups ready orders into practical delivery routes of up to 10 orders each
    using real coordinates and distance proximity (nearest-first).
    """
    partner = DeliveryService.get_delivery_partner(db, current_user)
    
    # Auto-ensure delivery tasks exist for seller's ready orders
    ready_orders = db.query(Order).filter(
        Order.seller_id == current_user.id,
        Order.status.in_([OrderStatus.READY.value, OrderStatus.READY_FOR_PICKUP.value])
    ).all()
    for ro in ready_orders:
        et = db.query(DeliveryTask).filter(DeliveryTask.order_id == ro.id).first()
        if not et:
            et = DeliveryTask(order_id=ro.id, delivery_partner_id=partner.id, status=DeliveryTaskStatus.ASSIGNED.value)
            db.add(et)
    db.flush()

    all_tasks = DeliveryService.list_partner_tasks(db, current_user, status=OrderStatus.READY.value)
    if not all_tasks:
        # Also check ASSIGNED tasks that are ready
        all_tasks = [t for t in DeliveryService.list_partner_tasks(db, current_user) if t.status in ["ASSIGNED", "READY"]]

    if not all_tasks:
        return APIResponse(message="No pending orders to route", data=[])

    # Determine origin (driver current GPS or shop coordinates)
    origin_lat, origin_lng = lat, lng
    if origin_lat is None or origin_lng is None:
        seller_prof = db.query(SellerProfile).filter(SellerProfile.user_id == current_user.id).first()
        if seller_prof and seller_prof.latitude and seller_prof.longitude:
            origin_lat, origin_lng = float(seller_prof.latitude), float(seller_prof.longitude)
        else:
            origin_lat, origin_lng = 17.6599, 75.9064  # Solapur APMC default

    # Recalculate distance from the specific origin for accurate nearest-first sorting
    for t in all_tasks:
        if t.order_id:
            ord_obj = db.query(Order).filter(Order.id == t.order_id).first()
            if ord_obj and ord_obj.address and ord_obj.address.latitude and ord_obj.address.longitude:
                t.distance_km = round(
                    calculate_haversine_distance_km(
                        origin_lat, origin_lng, float(ord_obj.address.latitude), float(ord_obj.address.longitude)
                    ),
                    2
                )

    max_batch = getattr(settings, "MAX_DELIVERY_BATCH_SIZE", 10)
    # Sort nearest-first
    sorted_tasks = sorted(all_tasks, key=lambda t: t.distance_km if t.distance_km is not None else 999.0)

    # Chunk into groups of max_batch
    groups = []
    for i in range(0, len(sorted_tasks), max_batch):
        chunk = sorted_tasks[i:i + max_batch]
        areas = list(set([t.delivery_area for t in chunk if t.delivery_area]))
        est_distance = sum([t.distance_km for t in chunk if t.distance_km is not None])
        groups.append({
            "group_number": len(groups) + 1,
            "order_count": len(chunk),
            "areas": areas,
            "estimated_km": round(est_distance, 2) if est_distance > 0 else None,
            "task_ids": [t.id for t in chunk],
            "stops": [
                {
                    "task_id": t.id,
                    "order_id": t.order_id,
                    "order_number": t.order_number,
                    "display_number": t.display_number,
                    "customer_name": t.customer_name,
                    "delivery_area": t.delivery_area,
                    "distance_km": t.distance_km,
                    "item_count": t.item_count,
                    "items": t.items,
                    "total_amount": float(t.total_amount) if t.total_amount else 0.0,
                    "payment_method": t.payment_method,
                    "payment_status": t.payment_status,
                }
                for t in chunk
            ],
        })

    return APIResponse(data=groups)


@router.get("/{batch_id}", response_model=APIResponse[DeliveryBatchRead], summary="Get specific delivery batch / route")
def get_delivery_batch(
    batch_id: int,
    current_user: User = Depends(require_seller_or_delivery),
    db: Session = Depends(get_db),
):
    partner = DeliveryService.get_delivery_partner(db, current_user)
    batch = db.query(DeliveryBatch).filter(DeliveryBatch.id == batch_id).first()
    if not batch:
        raise NotFoundException(f"Delivery batch {batch_id} not found")
    if batch.delivery_partner_id != partner.id and current_user.role_id not in [4, 5]:
        raise ForbiddenException("This batch belongs to another delivery partner")

    data = _build_batch_read(db, batch, current_user)
    return APIResponse(data=data)


@router.post("/{batch_id}/start", response_model=APIResponse[DeliveryBatchRead], summary="Start delivery route (bag loaded)")
def start_delivery_batch(
    batch_id: int,
    current_user: User = Depends(require_seller_or_delivery),
    db: Session = Depends(get_db),
):
    partner = DeliveryService.get_delivery_partner(db, current_user)
    batch = db.query(DeliveryBatch).filter(DeliveryBatch.id == batch_id).first()
    if not batch:
        raise NotFoundException(f"Delivery batch {batch_id} not found")
    if batch.delivery_partner_id != partner.id and current_user.role_id not in [4, 5]:
        raise ForbiddenException("This batch belongs to another delivery partner")

    now = datetime.datetime.now(datetime.timezone.utc)
    batch.status = "IN_PROGRESS"
    if not batch.started_at:
        batch.started_at = now

    # Update all tasks and orders in batch to started/out for delivery
    batch_orders = db.query(DeliveryBatchOrder).filter(DeliveryBatchOrder.batch_id == batch.id).all()
    for bo in batch_orders:
        task = db.query(DeliveryTask).filter(DeliveryTask.id == bo.delivery_task_id).first()
        if task and task.status != DeliveryTaskStatus.DELIVERED.value:
            task.status = DeliveryTaskStatus.STARTED.value
            if not task.started_at:
                task.started_at = now
            task.delivery_partner_id = partner.id
            if task.order and task.order.status != OrderStatus.DELIVERED.value:
                task.order.status = OrderStatus.OUT_FOR_DELIVERY.value
                task.order.out_for_delivery_at = now
                task.order.delivery_partner_id = partner.id

    db.commit()
    db.refresh(batch)

    data = _build_batch_read(db, batch, current_user)
    return APIResponse(message=f"Route #{batch.id} started. Orders are out for delivery.", data=data)


@router.post("/{batch_id}/complete", response_model=APIResponse[DeliveryBatchRead], summary="Complete delivery route")
def complete_delivery_batch(
    batch_id: int,
    current_user: User = Depends(require_seller_or_delivery),
    db: Session = Depends(get_db),
):
    partner = DeliveryService.get_delivery_partner(db, current_user)
    batch = db.query(DeliveryBatch).filter(DeliveryBatch.id == batch_id).first()
    if not batch:
        raise NotFoundException(f"Delivery batch {batch_id} not found")
    if batch.delivery_partner_id != partner.id and current_user.role_id not in [4, 5]:
        raise ForbiddenException("This batch belongs to another delivery partner")

    now = datetime.datetime.now(datetime.timezone.utc)
    batch.status = "COMPLETED"
    batch.completed_at = now
    db.commit()
    db.refresh(batch)

    data = _build_batch_read(db, batch, current_user)
    return APIResponse(message=f"Delivery route #{batch.id} completed successfully!", data=data)
