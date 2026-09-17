from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_delivery_partner, get_current_user
from app.models.user import User
from app.schemas.delivery import (
    DeliveryTaskRead,
    DeliveryTaskStatusUpdate,
    DeliveryOtpVerifyRequest,
    VerifyPickupOtpRequest,
    DeliveryZoneRead,
    DeliveryPartnerProfileRead,
    DeliveryPartnerProfileUpdate,
)
from app.models.delivery_partner import DeliveryPartner
from app.schemas.common import APIResponse
from app.services.delivery_service import DeliveryService

router = APIRouter(prefix="/delivery", tags=["Delivery Partner"])


@router.get("/tasks", response_model=APIResponse[List[DeliveryTaskRead]], summary="List assigned delivery tasks")
def list_tasks(
    status: Optional[str] = None,
    current_user: User = Depends(require_delivery_partner),
    db: Session = Depends(get_db),
):
    tasks = DeliveryService.list_partner_tasks(db, current_user, status=status)
    return APIResponse(data=tasks)


@router.get("/orders", response_model=APIResponse[List[DeliveryTaskRead]], summary="List assigned delivery tasks (alias)")
def list_delivery_orders(
    status: Optional[str] = None,
    current_user: User = Depends(require_delivery_partner),
    db: Session = Depends(get_db),
):
    tasks = DeliveryService.list_partner_tasks(db, current_user, status=status)
    return APIResponse(data=tasks)


@router.patch("/tasks/{task_id}/status", response_model=APIResponse[bool], summary="Update delivery task status")
def update_task_status(
    task_id: int,
    payload: DeliveryTaskStatusUpdate,
    current_user: User = Depends(require_delivery_partner),
    db: Session = Depends(get_db),
):
    DeliveryService.update_task_status(db, current_user, task_id, payload.status, payload.note)
    return APIResponse(message=f"Task marked as {payload.status}", data=True)


@router.post("/tasks/{task_id}/verify-otp", response_model=APIResponse[bool], summary="Verify customer OTP and complete delivery")
def verify_delivery_otp(
    task_id: int,
    payload: DeliveryOtpVerifyRequest,
    current_user: User = Depends(require_delivery_partner),
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
    current_user: User = Depends(require_delivery_partner),
    db: Session = Depends(get_db),
):
    DeliveryService.accept_delivery(db, current_user, order_id)
    return APIResponse(message="Delivery accepted", data=True)


@router.post("/orders/{order_id}/verify-pickup-otp", response_model=APIResponse[dict], summary="Delivery partner verifies pickup OTP from seller")
def verify_pickup_otp(
    order_id: int,
    payload: VerifyPickupOtpRequest,
    current_user: User = Depends(require_delivery_partner),
    db: Session = Depends(get_db),
):
    result = DeliveryService.verify_pickup_otp(db, current_user, order_id, payload.otp)
    return APIResponse(message="OTP Verified", data=result)


@router.post("/orders/{order_id}/pickup", response_model=APIResponse[bool], summary="Delivery partner marks order picked up from shop")
def pickup_order(
    order_id: int,
    current_user: User = Depends(require_delivery_partner),
    db: Session = Depends(get_db),
):
    DeliveryService.accept_delivery(db, current_user, order_id)
    return APIResponse(message="Order picked up from shop", data=True)


@router.post("/orders/{order_id}/start", response_model=APIResponse[bool], summary="Delivery partner starts delivery to customer")
def start_order(
    order_id: int,
    current_user: User = Depends(require_delivery_partner),
    db: Session = Depends(get_db),
):
    DeliveryService.start_delivery(db, current_user, order_id)
    return APIResponse(message="Delivery started — out for delivery", data=True)


@router.get("/profile", response_model=APIResponse[DeliveryPartnerProfileRead], summary="Get delivery partner profile")
def get_delivery_profile(
    current_user: User = Depends(require_delivery_partner),
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
    current_user: User = Depends(require_delivery_partner),
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


@router.get("/reviews", summary="Customer reviews for logged-in delivery partner")
def get_partner_reviews(
    current_user: User = Depends(require_delivery_partner),
    db: Session = Depends(get_db),
):
    from app.services.review_service import ReviewService
    from app.models.delivery_partner import DeliveryPartner
    partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == current_user.id).first()
    if not partner:
        return APIResponse(data={"average_rating": 0.0, "total_reviews": 0, "reviews": []})
    summary = ReviewService.get_delivery_partner_reviews(db, partner.id)
    return APIResponse(data=summary)



