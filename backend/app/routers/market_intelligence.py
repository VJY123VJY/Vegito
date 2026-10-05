from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_admin, get_optional_user
from app.models.user import User
from app.schemas.market_intelligence import MarketIntelligenceCreate, MarketIntelligenceRead
from app.schemas.common import APIResponse
from app.services.market_intelligence_service import MarketIntelligenceService

router = APIRouter(prefix="/market-intelligence", tags=["Market Intelligence & APMC Rates"])

@router.get("", response_model=APIResponse[List[MarketIntelligenceRead]], summary="Get live APMC market intelligence and benchmark prices")
def list_market_intelligence(db: Session = Depends(get_db)):
    items = MarketIntelligenceService.list_all(db)
    return APIResponse(message="Market intelligence data retrieved", data=items)

@router.get("/product/{product_id}", response_model=APIResponse[Optional[MarketIntelligenceRead]], summary="Get APMC market price reference for a product")
def get_product_market_price(product_id: int, db: Session = Depends(get_db)):
    item = MarketIntelligenceService.get_by_product_id(db, product_id)
    return APIResponse(data=item)

@router.post("", response_model=APIResponse[MarketIntelligenceRead], status_code=status.HTTP_201_CREATED, summary="Update/Insert APMC market price (Admin)")
def upsert_market_intelligence(
    payload: MarketIntelligenceCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = MarketIntelligenceService.upsert(db, payload)
    return APIResponse(message="Market rate updated successfully", data=item)
