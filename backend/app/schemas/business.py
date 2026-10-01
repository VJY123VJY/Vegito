import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema


# ---------------------------------------------------------------------------
# Business Profile Schemas
# ---------------------------------------------------------------------------

class BusinessProfileBase(BaseModel):
    business_name: str = Field(..., max_length=150)
    business_type: str = Field(..., max_length=50)  # RESTAURANT, HOTEL, CATERER, EVENT, MESS, HOSTEL, HOSPITAL, BUSINESS, OTHER
    contact_person: str = Field(..., max_length=100)
    phone: str = Field(..., max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    business_address: str
    delivery_address: str
    gstin: Optional[str] = Field(None, max_length=20)
    preferred_delivery_time: Optional[str] = Field("06:00 AM – 08:00 AM", max_length=50)
    payment_preference: Optional[str] = Field("UPI", max_length=50)


class BusinessProfileCreate(BusinessProfileBase):
    pass


class BusinessProfileUpdate(BaseModel):
    business_name: Optional[str] = Field(None, max_length=150)
    business_type: Optional[str] = Field(None, max_length=50)
    contact_person: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    business_address: Optional[str] = None
    delivery_address: Optional[str] = None
    gstin: Optional[str] = Field(None, max_length=20)
    preferred_delivery_time: Optional[str] = Field(None, max_length=50)
    payment_preference: Optional[str] = Field(None, max_length=50)


class BusinessProfileRead(BaseSchema, BusinessProfileBase):
    id: int
    user_id: int
    credit_limit: Decimal
    credit_balance: Decimal
    is_approved: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime


# ---------------------------------------------------------------------------
# Bulk Pricing Rule Schemas
# ---------------------------------------------------------------------------

class BulkPricingRuleBase(BaseModel):
    min_quantity: Decimal = Field(..., ge=1)
    max_quantity: Optional[Decimal] = None
    unit_price: Decimal = Field(..., gt=0)
    discount_percentage: Optional[Decimal] = None
    is_active: bool = True


class BulkPricingRuleCreate(BulkPricingRuleBase):
    seller_product_id: int


class BulkPricingRuleRead(BaseSchema, BulkPricingRuleBase):
    id: int
    seller_product_id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime


# ---------------------------------------------------------------------------
# Bulk Cart Schemas
# ---------------------------------------------------------------------------

class BulkCartItemCreate(BaseModel):
    seller_product_id: int
    quantity: Decimal = Field(..., gt=0)
    unit: Optional[str] = "KG"
    notes: Optional[str] = None


class BulkCartItemUpdate(BaseModel):
    quantity: Decimal = Field(..., gt=0)
    notes: Optional[str] = None


class BulkCartItemRead(BaseSchema):
    id: int
    seller_product_id: int
    product_name: str
    product_image_url: Optional[str] = None
    seller_id: int
    seller_business_name: Optional[str] = None
    quantity: Decimal
    unit: str
    base_unit_price: Decimal
    effective_unit_price: Decimal
    subtotal: Decimal
    bulk_rule_applied: bool = False
    available_stock: Decimal
    is_in_stock: bool
    notes: Optional[str] = None


class BulkCartRead(BaseModel):
    items: List[BulkCartItemRead] = []
    total_items_count: int = 0
    total_quantity: Decimal = Decimal("0.000")
    estimated_subtotal: Decimal = Decimal("0.00")


# ---------------------------------------------------------------------------
# Bulk Order Request & Quote Schemas
# ---------------------------------------------------------------------------

class BulkOrderItemRequest(BaseModel):
    seller_product_id: int
    quantity: Decimal = Field(..., gt=0)
    unit: Optional[str] = "KG"
    notes: Optional[str] = None


class BulkOrderCreateRequest(BaseModel):
    items: List[BulkOrderItemRequest] = Field(..., min_length=1)
    address_id: int
    delivery_date: datetime.date
    delivery_time_window: str = Field("06:00 AM – 08:00 AM", max_length=50)
    special_instructions: Optional[str] = None
    idempotency_key: Optional[str] = None


class QuotedItemPrice(BaseModel):
    order_item_id: int
    quoted_unit_price: Decimal = Field(..., gt=0)
    seller_notes: Optional[str] = None


class SendCustomQuoteRequest(BaseModel):
    items: List[QuotedItemPrice]
    delivery_fee: Decimal = Field(Decimal("0.00"), ge=0)
    notes: Optional[str] = None
    expires_in_hours: Optional[int] = Field(24, ge=1, le=168)


class QuoteActionRequest(BaseModel):
    action: str = Field(..., pattern="^(ACCEPT|REJECT)$")
    idempotency_key: Optional[str] = None


# ---------------------------------------------------------------------------
# Saved Lists Schemas
# ---------------------------------------------------------------------------

class SavedShoppingListItemCreate(BaseModel):
    product_id: int
    seller_product_id: Optional[int] = None
    quantity: Decimal = Field(..., gt=0)
    unit: str = "KG"


class SavedShoppingListCreate(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    items: List[SavedShoppingListItemCreate] = []


class SavedShoppingListItemRead(BaseSchema):
    id: int
    product_id: int
    product_name: str
    seller_product_id: Optional[int] = None
    quantity: Decimal
    unit: str
    current_price: Optional[Decimal] = None
    is_available: bool = True


class SavedShoppingListRead(BaseSchema):
    id: int
    name: str
    description: Optional[str] = None
    item_count: int
    items: List[SavedShoppingListItemRead] = []
    created_at: datetime.datetime
    updated_at: datetime.datetime


# ---------------------------------------------------------------------------
# Recurring Order Schemas
# ---------------------------------------------------------------------------

class RecurringBulkOrderItemCreate(BaseModel):
    seller_product_id: int
    quantity: Decimal = Field(..., gt=0)
    unit: str = "KG"


class RecurringBulkOrderCreate(BaseModel):
    title: str = Field(..., max_length=100)
    frequency: str = Field("DAILY", pattern="^(DAILY|WEEKLY|MON_WED_FRI|CUSTOM)$")
    delivery_time_window: str = Field("06:00 AM – 08:00 AM", max_length=50)
    address_id: int
    seller_id: Optional[int] = None
    next_run_date: datetime.date
    special_instructions: Optional[str] = None
    items: List[RecurringBulkOrderItemCreate] = Field(..., min_length=1)


class RecurringBulkOrderItemRead(BaseSchema):
    id: int
    seller_product_id: int
    product_name: str
    quantity: Decimal
    unit: str
    current_unit_price: Decimal


class RecurringBulkOrderRead(BaseSchema):
    id: int
    title: str
    frequency: str
    delivery_time_window: str
    address_id: int
    address_text: Optional[str] = None
    seller_id: Optional[int] = None
    seller_name: Optional[str] = None
    is_active: bool
    next_run_date: datetime.date
    last_run_date: Optional[datetime.date] = None
    special_instructions: Optional[str] = None
    items: List[RecurringBulkOrderItemRead] = []
    created_at: datetime.datetime


# ---------------------------------------------------------------------------
# B2B Invoice Schemas
# ---------------------------------------------------------------------------

class B2BInvoiceRead(BaseSchema):
    id: int
    invoice_number: str
    order_id: int
    business_id: Optional[int] = None
    business_name: str
    business_address: str
    gstin: Optional[str] = None
    seller_id: Optional[int] = None
    seller_name: str
    subtotal: Decimal
    discount_amount: Decimal
    delivery_fee: Decimal
    total_amount: Decimal
    payment_status: str
    payment_method: str
    created_at: datetime.datetime


# ---------------------------------------------------------------------------
# Event Grocery Estimate
# ---------------------------------------------------------------------------

class EventGroceryEstimateRequest(BaseModel):
    event_type: str = Field("WEDDING", max_length=50)
    people_count: int = Field(..., ge=10, le=50000)
    days_count: int = Field(1, ge=1, le=14)
    meals_per_day: int = Field(2, ge=1, le=5)


class EventGroceryItem(BaseModel):
    product_id: int
    product_name: str
    category: str
    estimated_quantity: Decimal
    unit: str
    approximate_price: Decimal
    available_in_stock: bool


class EventGroceryEstimateResponse(BaseModel):
    disclaimer: str = "Estimated suggestion based on standard Indian hospitality catering metrics. Not an authoritative food requirement guarantee. Review and customize before requesting bulk order."
    event_type: str
    people_count: int
    total_estimated_budget: Decimal
    suggested_items: List[EventGroceryItem] = []


# ---------------------------------------------------------------------------
# B2B Analytics
# ---------------------------------------------------------------------------

class TopProductMetric(BaseModel):
    product_name: str
    total_quantity: Decimal
    unit: str
    total_spend: Decimal


class B2BAnalyticsRead(BaseModel):
    monthly_spend: Decimal = Decimal("0.00")
    total_orders_count: int = 0
    active_orders_count: int = 0
    pending_quotes_count: int = 0
    average_order_value: Decimal = Decimal("0.00")
    top_products: List[TopProductMetric] = []
    top_sellers: List[Dict[str, Any]] = []
    purchase_frequency: str = "N/A"
