import datetime
from decimal import Decimal
from typing import Optional, List, Any, Dict
from pydantic import BaseModel


class DashboardSummary(BaseModel):
    customers: int = 0
    sellers: int = 0
    delivery_partners: int = 0
    orders: int = 0
    revenue: Decimal = Decimal("0.00")
    pending_orders: int = 0
    low_stock: int = 0
    failed_deliveries: int = 0


class TimeSeriesPoint(BaseModel):
    date: str
    value: Decimal = Decimal("0.00")
    orders_count: Optional[int] = None
    customers_count: Optional[int] = None


class RecentOrderSummary(BaseModel):
    id: int
    order_number: str
    customer_name: Optional[str] = None
    status: str
    total_amount: Decimal
    items_count: int = 0
    placed_at: datetime.datetime


class TopSellerSummary(BaseModel):
    seller_id: int
    business_name: str
    total_orders: int
    total_revenue: Decimal
    rating: Decimal
    is_verified: bool


class TopProductSummary(BaseModel):
    product_id: int
    product_name: str
    category_name: Optional[str] = None
    total_quantity_sold: Decimal
    total_revenue: Decimal
    in_stock: Decimal


class PendingSellerVerification(BaseModel):
    seller_id: int
    business_name: str
    contact_name: Optional[str] = None
    phone: str
    city: Optional[str] = None
    created_at: datetime.datetime


class AdminDashboardResponse(BaseModel):
    summary: DashboardSummary
    revenue_chart: List[TimeSeriesPoint] = []
    order_chart: List[TimeSeriesPoint] = []
    customer_growth: List[TimeSeriesPoint] = []
    recent_orders: List[RecentOrderSummary] = []
    top_sellers: List[TopSellerSummary] = []
    top_products: List[TopProductSummary] = []
    pending_seller_verifications: List[PendingSellerVerification] = []
    active_delivery: List[Dict[str, Any]] = []
