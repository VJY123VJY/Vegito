from typing import Optional, List
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.dependencies import require_customer
from app.models.user import User
from app.models.seller_profile import SellerProfile
from app.models.seller_product import SellerProduct
from app.models.customer_favorite import CustomerFavorite
from app.models.order import Order
from app.models.order_item import OrderItem
from app.schemas.product import ProductRead
from app.schemas.customer import CustomerProfileRead, CustomerProfileUpdate
from app.schemas.common import APIResponse, BaseSchema
from app.services.customer_service import CustomerService
from app.services.product_service import ProductService
from app.services.location_service import LocationService, DEFAULT_SOLAPUR_LAT, DEFAULT_SOLAPUR_LON
from app.utils.pagination import PaginationParams

router = APIRouter(prefix="/customers", tags=["Customers"])


class NearbySellerRead(BaseSchema):
    id: int
    user_id: int
    business_name: str
    business_type: Optional[str] = None
    address: Optional[str] = None
    distance_km: float
    is_verified: bool
    rating: Decimal
    total_orders: int
    active_products_count: int


class CustomerHomeFeedRead(BaseSchema):
    """Customer-scoped discovery data built from persisted marketplace activity."""
    fresh_picks: List[ProductRead]
    buy_again: List[ProductRead]
    favorites: List[ProductRead]
    has_purchase_history: bool


@router.get("/me", response_model=APIResponse[CustomerProfileRead], summary="Get customer profile")
def get_customer_profile(
    current_user: User = Depends(require_customer), db: Session = Depends(get_db)
):
    profile = CustomerService.get_profile(db, current_user)
    return APIResponse(data=CustomerProfileRead.model_validate(profile))


@router.patch("/me", response_model=APIResponse[CustomerProfileRead], summary="Update customer profile")
def update_customer_profile(
    payload: CustomerProfileUpdate,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    profile = CustomerService.update_profile(db, current_user, payload)
    return APIResponse(message="Profile updated successfully", data=CustomerProfileRead.model_validate(profile))


@router.get("/home-feed", response_model=APIResponse[CustomerHomeFeedRead], summary="Personalized customer home feed")
def get_customer_home_feed(
    current_user: User = Depends(require_customer), db: Session = Depends(get_db)
):
    """Return only real current offers and this customer's own stored signals.

    Product responses are rebuilt through ProductService so price and available
    stock always come from the current seller listing/inventory, not old orders.
    """
    fresh_picks, _ = ProductService.list_products(
        db, PaginationParams(page=1, page_size=12), active_only=True
    )
    fresh_picks = [product for product in fresh_picks if product.is_in_stock]

    favorite_ids = [
        product_id for (product_id,) in db.query(CustomerFavorite.product_id)
        .filter(CustomerFavorite.user_id == current_user.id)
        .order_by(CustomerFavorite.created_at.desc())
        .limit(8)
        .all()
    ]

    purchased_items = (
        db.query(OrderItem)
        .join(Order, OrderItem.order_id == Order.id)
        .filter(
            Order.customer_id == current_user.id,
            Order.status.in_(["DELIVERED", "COMPLETED"]),
            OrderItem.seller_product_id.isnot(None),
        )
        .order_by(Order.placed_at.desc(), OrderItem.id.desc())
        .all()
    )
    buy_again_ids: List[int] = []
    for item in purchased_items:
        if item.seller_product_id is None:
            continue
        listing = db.query(SellerProduct).filter(SellerProduct.id == item.seller_product_id).first()
        if listing and listing.product_id not in buy_again_ids:
            buy_again_ids.append(listing.product_id)
        if len(buy_again_ids) == 8:
            break

    def current_products(product_ids: List[int]) -> List[ProductRead]:
        products: List[ProductRead] = []
        for product_id in product_ids:
            product = ProductService.get_product_by_id(db, product_id)
            if product.is_in_stock:
                products.append(product)
        return products

    return APIResponse(data=CustomerHomeFeedRead(
        fresh_picks=fresh_picks,
        buy_again=current_products(buy_again_ids),
        favorites=current_products(favorite_ids),
        has_purchase_history=bool(purchased_items),
    ))


@router.get("/nearby-sellers", response_model=APIResponse[List[NearbySellerRead]], summary="Discover verified sellers within 15 KM (Section 15 & 50)")
def get_nearby_sellers(
    lat: Optional[float] = Query(None, description="Customer latitude"),
    lon: Optional[float] = Query(None, description="Customer longitude"),
    db: Session = Depends(get_db),
):
    c_lat = lat if lat is not None else DEFAULT_SOLAPUR_LAT
    c_lon = lon if lon is not None else DEFAULT_SOLAPUR_LON

    sellers = (
        db.query(SellerProfile)
        .join(User, SellerProfile.user_id == User.id)
        .filter(User.is_active == True, SellerProfile.is_available == True)
        .all()
    )

    results = []
    for sp in sellers:
        s_lat, s_lon = LocationService.resolve_seller_coordinates(db, sp.user_id, fallback_to_default=False)
        if s_lat is None or s_lon is None:
            continue
        dist = LocationService.calculate_distance(c_lat, c_lon, s_lat, s_lon)
        # 15 KM boundary per Section 50
        if dist <= 15.0:
            prod_count = (
                db.query(SellerProduct)
                .filter(SellerProduct.seller_id == sp.user_id, SellerProduct.is_available == True, SellerProduct.stock_quantity > 0)
                .count()
            )
            results.append(
                NearbySellerRead(
                    id=sp.id,
                    user_id=sp.user_id,
                    business_name=sp.business_name,
                    business_type=sp.business_type,
                    address=sp.address or "Solapur Market Area",
                    distance_km=dist,
                    is_verified=bool(sp.is_verified),
                    rating=sp.rating or Decimal("0.00"),
                    total_orders=sp.total_orders or 0,
                    active_products_count=prod_count,
                )
            )

    results.sort(key=lambda s: s.distance_km)
    return APIResponse(data=results)

