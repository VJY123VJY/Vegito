from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_delivery_partner, get_current_user, require_admin
from app.models.user import User
from app.models.delivery_partner import DeliveryPartner
from app.schemas.delivery_location import (
    DeliveryLocationCreate,
    DeliveryLocationRead,
    LivePartnerLocationRead,
)
from app.schemas.common import APIResponse
from app.services.delivery_tracking_service import DeliveryTrackingService
from app.core.exceptions import ForbiddenException, NotFoundException

router = APIRouter(prefix="/delivery", tags=["Delivery GPS Tracking"])


@router.post(
    "/location",
    response_model=APIResponse[DeliveryLocationRead],
    summary="Delivery partner submits current GPS coordinates",
)
def submit_location(
    payload: DeliveryLocationCreate,
    current_user: User = Depends(require_delivery_partner),
    db: Session = Depends(get_db),
):
    """
    Authenticated delivery partner records GPS coordinates.
    Validated and stamped server-side.
    """
    saved = DeliveryTrackingService.record_location(db, current_user, payload)
    return APIResponse(message="Location recorded", data=saved)


@router.get(
    "/location/history",
    response_model=APIResponse[List[DeliveryLocationRead]],
    summary="Get GPS location history",
)
def get_location_history(
    partner_id: Optional[int] = Query(None, description="Delivery partner ID (Admin only or own ID)"),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns GPS history. Delivery partners can only access their own history.
    Admins can query any partner's history.
    """
    is_admin = current_user.role_id in [4, 5]
    if not is_admin:
        partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == current_user.id).first()
        if not partner:
            raise ForbiddenException("Access denied: Not a delivery partner")
        target_partner_id = partner.id
    else:
        if not partner_id:
            raise NotFoundException("partner_id query parameter required for admin")
        target_partner_id = partner_id

    history = DeliveryTrackingService.get_location_history(db, target_partner_id, limit=limit)
    return APIResponse(data=history)


@router.get(
    "/location/latest/{partner_id}",
    response_model=APIResponse[Optional[DeliveryLocationRead]],
    summary="Get latest location of a delivery partner",
)
def get_latest_location(
    partner_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    latest = DeliveryTrackingService.get_latest_partner_location(db, partner_id)
    return APIResponse(data=latest)
