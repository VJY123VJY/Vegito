from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_seller
from app.models.user import User
from app.schemas.seller import SellerProfileRead, SellerProfileUpdate
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
def update_seller_profile(
    payload: SellerProfileUpdate,
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    profile = SellerService.update_profile(db, current_user, payload)
    return APIResponse(message="Profile updated successfully", data=SellerProfileRead.model_validate(profile))


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

