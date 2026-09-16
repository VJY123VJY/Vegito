from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.schemas.admin_dashboard import TimeSeriesPoint, TopSellerSummary
from app.schemas.common import APIResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/admin/analytics", tags=["Admin Analytics"])


def parse_range(range_param: str) -> int:
    mapping = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    return mapping.get(range_param.lower(), 30)


@router.get("/revenue", response_model=APIResponse[List[TimeSeriesPoint]], summary="Admin revenue over time")
def get_revenue_analytics(
    range: str = Query("30d", description="7d, 30d, 90d, 1y"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    days = parse_range(range)
    data = AnalyticsService.get_revenue_analytics(db, range_days=days)
    return APIResponse(data=data)


@router.get("/orders", response_model=APIResponse[List[TimeSeriesPoint]], summary="Admin order trends over time")
def get_order_analytics(
    range: str = Query("30d", description="7d, 30d, 90d, 1y"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    days = parse_range(range)
    data = AnalyticsService.get_order_analytics(db, range_days=days)
    return APIResponse(data=data)


@router.get("/customers", response_model=APIResponse[List[TimeSeriesPoint]], summary="Admin customer growth over time")
def get_customer_growth_analytics(
    range: str = Query("30d", description="7d, 30d, 90d, 1y"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    days = parse_range(range)
    data = AnalyticsService.get_customer_growth_analytics(db, range_days=days)
    return APIResponse(data=data)


@router.get("/sellers", response_model=APIResponse[List[TopSellerSummary]], summary="Admin seller performance comparison")
def get_seller_performance_analytics(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    data = AnalyticsService.get_top_sellers(db, limit=limit)
    return APIResponse(data=data)
