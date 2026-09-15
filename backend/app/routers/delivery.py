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
    DeliveryZoneRead,
)
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
