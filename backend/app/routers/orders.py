from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_customer, get_current_user
from app.models.user import User
from app.schemas.order import OrderCreate, OrderRead, OrderDetailRead, OrderStatusUpdate
from app.schemas.common import APIResponse
from app.utils.pagination import PaginationParams, PaginatedResponse
from app.services.order_service import OrderService
from app.core.exceptions import BadRequestException

router = APIRouter(prefix="/orders", tags=["Orders"])


from typing import Optional
from app.config import settings

@router.get(
    "/delivery-fee",
    response_model=APIResponse[dict],
    summary="Preview distance-based delivery fee for customer address",
)
def get_delivery_fee(
    address_id: Optional[int] = Query(None, description="Customer address ID (optional)"),
    seller_id: Optional[int] = Query(None, description="Seller user ID (optional)"),
    latitude: Optional[float] = Query(None, description="Customer latitude (optional)"),
    longitude: Optional[float] = Query(None, description="Customer longitude (optional)"),
    weight_kg: Optional[float] = Query(None, description="Order total weight in KG (optional)"),
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    from app.services.delivery_pricing_service import DeliveryPricingService
    from app.services.location_service import calculate_item_weight_kg
    from app.models.cart import Cart
    from app.models.address import Address
    from app.models.seller_profile import SellerProfile

    cust_lat = latitude
    cust_lng = longitude

    # 1. Resolve customer coordinates from address_id if provided
    if address_id:
        address = db.query(Address).filter(
            Address.id == address_id,
            Address.user_id == current_user.id,
        ).first()
        if address and address.latitude is not None and address.longitude is not None:
            cust_lat = float(address.latitude)
            cust_lng = float(address.longitude)

    # Fallback to customer's default address if lat/lng still not found
    if cust_lat is None or cust_lng is None:
        def_addr = db.query(Address).filter(
            Address.user_id == current_user.id,
            Address.latitude.isnot(None),
            Address.longitude.isnot(None),
        ).order_by(Address.is_default.desc(), Address.id.desc()).first()
        if def_addr:
            address_id = address_id or def_addr.id
            cust_lat = float(def_addr.latitude)
            cust_lng = float(def_addr.longitude)

    # 2. Resolve seller if not explicitly provided
    if not seller_id and current_user:
        cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
        if cart and cart.items:
            first_item = cart.items[0]
            if first_item.seller_product and first_item.seller_product.seller_id:
                seller_id = first_item.seller_product.seller_id

    # If still not found, resolve default active seller profile
    if not seller_id:
        active_shop = (
            db.query(SellerProfile)
            .join(User, SellerProfile.user_id == User.id)
            .filter(
                User.is_active == True,
                SellerProfile.latitude.isnot(None),
                SellerProfile.longitude.isnot(None),
            )
            .order_by(SellerProfile.is_available.desc(), SellerProfile.id.desc())
            .first()
        )
        if active_shop:
            seller_id = active_shop.user_id

    # 3. Calculate total weight
    computed_weight = weight_kg
    if computed_weight is None or computed_weight <= 0:
        cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
        if cart and cart.items:
            weight_sum = 0.0
            for it in cart.items:
                if it.seller_product and it.seller_product.product:
                    unit = it.seller_product.product.unit
                    weight_sum += calculate_item_weight_kg(unit, float(it.quantity))
            if weight_sum > 0:
                computed_weight = weight_sum
    if computed_weight is None or computed_weight <= 0:
        computed_weight = 1.0

    # 4. Check eligibility & tiered fee (will not throw on out-of-range)
    res = DeliveryPricingService.check_eligibility_and_pricing(
        db=db,
        address_id=address_id,
        seller_id=seller_id,
        cust_lat=cust_lat,
        cust_lng=cust_lng,
        total_weight_kg=computed_weight,
        raise_on_ineligible=False,
    )

    shop_prof = db.query(SellerProfile).filter(SellerProfile.user_id == seller_id).first() if seller_id else None
    seller_online = bool(shop_prof and shop_prof.is_available) if shop_prof else True

    is_final_deliverable = res.is_deliverable and seller_online
    if not seller_online:
        final_message = "This seller is currently offline and not accepting new orders."
    else:
        final_message = res.reason

    return APIResponse(
        message="Delivery fee calculated",
        data={
            "address_id": address_id or 0,
            "distance_km": res.distance_km,
            "delivery_fee": float(res.delivery_fee),
            "max_allowed_km": res.max_allowed_km,
            "seller_online": seller_online,
            "is_deliverable": is_final_deliverable,
            "message": final_message,
            "weight_kg": res.total_weight_kg,
        },
    )


@router.get(
    "/seller-availability",
    response_model=APIResponse[dict],
    summary="Get current seller availability for customer checkout",
)
def get_seller_availability(
    seller_id: Optional[int] = Query(None, description="Seller user ID (optional)"),
    db: Session = Depends(get_db),
):
    from app.models.seller_profile import SellerProfile
    shop_prof = None
    if seller_id:
        shop_prof = db.query(SellerProfile).filter(SellerProfile.user_id == seller_id).first()
    if not shop_prof:
        shop_prof = (
            db.query(SellerProfile)
            .join(User, SellerProfile.user_id == User.id)
            .filter(
                User.is_active == True,
                SellerProfile.latitude.isnot(None),
                SellerProfile.longitude.isnot(None),
            )
            .first()
        )
    if not shop_prof:
        shop_prof = db.query(SellerProfile).first()
    is_available = bool(shop_prof.is_available) if shop_prof else True
    shop_name = shop_prof.business_name if shop_prof else "Vegito Shop"
    return APIResponse(
        data={
            "seller_id": shop_prof.user_id if shop_prof else None,
            "shop_name": shop_name,
            "is_available": is_available,
            "is_online": is_available,
        }
    )


@router.post(
    "",
    response_model=APIResponse[OrderDetailRead],
    status_code=status.HTTP_201_CREATED,
    summary="Checkout and place order",
)
def create_order(
    payload: OrderCreate,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    order_detail = OrderService.checkout(db, current_user, payload)
    return APIResponse(message="Order placed successfully", data=order_detail)


@router.get(
    "",
    response_model=APIResponse[PaginatedResponse[OrderRead]],
    summary="List customer orders",
)
def list_orders(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    pagination = PaginationParams(page=page, page_size=page_size)
    orders, total_count = OrderService.list_customer_orders(db, current_user, pagination)
    paginated = PaginatedResponse.create(orders, total_count, pagination)
    return APIResponse(data=paginated)


@router.get(
    "/{order_id}",
    response_model=APIResponse[OrderDetailRead],
    summary="Get order details",
)
def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order_detail = OrderService.get_order_detail(db, current_user, order_id)
    return APIResponse(data=order_detail)


@router.post(
    "/{order_id}/reorder",
    response_model=APIResponse[bool],
    summary="Add items from past order to cart",
)
def reorder(
    order_id: int,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    OrderService.reorder(db, current_user, order_id)
    return APIResponse(message="Order items added to your cart", data=True)


@router.patch(
    "/{order_id}/status",
    response_model=APIResponse[OrderDetailRead],
    summary="Update order status (Seller/Admin)",
)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    OrderService.update_order_status(db, current_user, order_id, payload.status, payload.note)
    updated = OrderService.get_order_detail(db, current_user, order_id)
    return APIResponse(message="Order status updated", data=updated)
