from typing import List, Optional
from fastapi import APIRouter, Depends, status, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_seller, get_optional_user, get_current_user
from app.models.user import User
from app.schemas.promotion import PromotionCreate, PromotionRead
from app.schemas.common import APIResponse
from app.services.promotion_service import PromotionService

router = APIRouter(prefix="/promotions", tags=["Promotions & Offers"])

@router.get("", response_model=APIResponse[List[PromotionRead]], summary="Get active marketplace offers (Customer)")
def list_active_promotions(
    promo_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    promos = PromotionService.get_active_promotions(db, current_user, promo_type)
    return APIResponse(data=promos)

@router.get("/seller", response_model=APIResponse[List[PromotionRead]], summary="Get offers created by the authenticated seller")
def list_seller_promotions(
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    promos = PromotionService.get_seller_promotions(db, current_user)
    return APIResponse(data=promos)

@router.post("", response_model=APIResponse[PromotionRead], status_code=status.HTTP_201_CREATED, summary="Create a new bundle/offer (Seller)")
def create_promotion(
    payload: PromotionCreate,
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    promo = PromotionService.create_promotion(db, current_user, payload)
    return APIResponse(message="Promotion published successfully", data=PromotionRead.model_validate(promo))

@router.patch("/{promo_id}/status", response_model=APIResponse[PromotionRead], summary="Update offer status (ACTIVE, PAUSED, EXPIRED)")
def update_promotion_status(
    promo_id: int,
    status: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updated = PromotionService.update_status(db, current_user, promo_id, status)
    return APIResponse(message=f"Offer status updated to {status}", data=updated)

@router.delete("/{promo_id}", response_model=APIResponse[bool], summary="Delete offer (Seller/Admin)")
def delete_promotion(
    promo_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    PromotionService.delete_promotion(db, current_user, promo_id)
    return APIResponse(message="Offer deleted successfully", data=True)
