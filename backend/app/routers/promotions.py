from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_seller, require_customer, get_current_user
from app.models.user import User
from app.schemas.promotion import PromotionCreate, PromotionRead
from app.schemas.common import APIResponse
from app.services.promotion_service import PromotionService

router = APIRouter(prefix="/promotions", tags=["Promotions & Offers"])

@router.get("", response_model=APIResponse[List[PromotionRead]], summary="Get active marketplace offers (Customer)")
def list_active_promotions(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    promos = PromotionService.get_active_promotions(db, current_user)
    return APIResponse(data=promos)

@router.post("", response_model=APIResponse[PromotionRead], status_code=status.HTTP_201_CREATED, summary="Create a new bundle/offer (Seller)")
def create_promotion(
    payload: PromotionCreate,
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    promo = PromotionService.create_promotion(db, current_user, payload)
    return APIResponse(message="Promotion published successfully", data=PromotionRead.model_validate(promo))
