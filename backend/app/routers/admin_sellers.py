from typing import List, Optional, Any, Dict
from decimal import Decimal
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.models.seller_profile import SellerProfile
from app.models.seller_product import SellerProduct
from app.models.product import Product
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.inventory import Inventory
from app.models.review import Review
from app.models.complaint import Complaint
from app.models.address import Address
from app.schemas.common import APIResponse
from app.core.exceptions import NotFoundException
from pydantic import BaseModel

router = APIRouter(prefix="/admin/sellers", tags=["Admin Seller Management"])


class SellerListItem(BaseModel):
    seller_id: int
    business_name: str
    contact_name: Optional[str] = None
    phone: str
    email: Optional[str] = None
    city: Optional[str] = None
    is_verified: bool
    is_active: bool
    rating: Decimal
    total_orders: int
    product_count: int
    total_revenue: Decimal
    created_at: Any


class SellerDetailResponse(BaseModel):
    seller_id: int
    business_name: str
    business_type: Optional[str] = None
    description: Optional[str] = None
    gst_number: Optional[str] = None
    is_verified: bool
    is_active: bool
    rating: Decimal
    contact_name: Optional[str] = None
    phone: str
    email: Optional[str] = None
    address: Optional[Dict[str, Any]] = None
    stats: Dict[str, Any]
    products: List[Dict[str, Any]] = []
    recent_orders: List[Dict[str, Any]] = []
    reviews: List[Dict[str, Any]] = []
    complaints: List[Dict[str, Any]] = []


class SellerVerificationUpdate(BaseModel):
    is_verified: bool


@router.get("", response_model=APIResponse[Dict[str, Any]], summary="List sellers with filtering and metrics")
def list_sellers(
    q: Optional[str] = Query(None, description="Search business name or phone"),
    is_verified: Optional[bool] = Query(None),
    is_active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=50),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = (
        db.query(SellerProfile)
        .join(User, User.id == SellerProfile.user_id)
        .options(joinedload(SellerProfile.user), joinedload(SellerProfile.address))
    )

    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.filter(
            (SellerProfile.business_name.ilike(search_pattern))
            | (User.name.ilike(search_pattern))
            | (User.phone.ilike(search_pattern))
        )
    if is_verified is not None:
        query = query.filter(SellerProfile.is_verified == is_verified)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    total_count = query.count()
    sellers = (
        query.order_by(SellerProfile.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items: List[SellerListItem] = []
    for sp in sellers:
        # Product count
        prod_count = (
            db.query(SellerProduct)
            .filter(SellerProduct.seller_id == sp.user_id)
            .count()
        )
        # Revenue
        rev = (
            db.query(func.coalesce(func.sum(OrderItem.subtotal), 0))
            .join(SellerProduct, SellerProduct.id == OrderItem.seller_product_id)
            .filter(SellerProduct.seller_id == sp.user_id)
            .scalar()
        )

        item = SellerListItem(
            seller_id=sp.user_id,
            business_name=sp.business_name,
            contact_name=sp.user.name if sp.user else None,
            phone=sp.user.phone if sp.user else "",
            email=sp.user.email if sp.user else None,
            city=sp.address.city if sp.address else None,
            is_verified=sp.is_verified,
            is_active=sp.user.is_active if sp.user else True,
            rating=sp.rating,
            total_orders=sp.total_orders,
            product_count=prod_count,
            total_revenue=Decimal(str(rev)),
            created_at=sp.created_at.isoformat() if sp.created_at else None,
        )
        items.append(item)

    return APIResponse(
        data={
            "items": [it.model_dump() for it in items],
            "total": total_count,
            "page": page,
            "page_size": page_size,
        }
    )


@router.get("/{seller_id}", response_model=APIResponse[SellerDetailResponse], summary="Get full seller inspection profile")
def get_seller_detail(
    seller_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    sp = (
        db.query(SellerProfile)
        .options(joinedload(SellerProfile.user), joinedload(SellerProfile.address))
        .filter(SellerProfile.user_id == seller_id)
        .first()
    )
    if not sp:
        raise NotFoundException(f"Seller with ID {seller_id} not found")

    user = sp.user
    addr = sp.address
    addr_dict = None
    if addr:
        addr_dict = {
            "address_line1": addr.address_line1,
            "city": addr.city,
            "state": addr.state,
            "pincode": addr.pincode,
            "latitude": float(addr.latitude) if addr.latitude else None,
            "longitude": float(addr.longitude) if addr.longitude else None,
        }

    # Products
    seller_prods = (
        db.query(SellerProduct)
        .options(joinedload(SellerProduct.product))
        .filter(SellerProduct.seller_id == seller_id)
        .all()
    )
    prods_list = [
        {
            "id": sprod.id,
            "product_id": sprod.product_id,
            "product_name": sprod.product.name if sprod.product else "Unknown",
            "price": sprod.price,
            "stock_quantity": sprod.stock_quantity,
            "is_available": sprod.is_available,
        }
        for sprod in seller_prods
    ]

    # Revenue
    rev = (
        db.query(func.coalesce(func.sum(OrderItem.subtotal), 0))
        .join(SellerProduct, SellerProduct.id == OrderItem.seller_product_id)
        .filter(SellerProduct.seller_id == seller_id)
        .scalar()
    )

    # Recent orders involving this seller
    recent_orders_rows = (
        db.query(Order)
        .join(OrderItem, OrderItem.order_id == Order.id)
        .join(SellerProduct, SellerProduct.id == OrderItem.seller_product_id)
        .filter(SellerProduct.seller_id == seller_id)
        .distinct()
        .order_by(Order.placed_at.desc())
        .limit(10)
        .all()
    )
    recent_orders_list = [
        {
            "id": o.id,
            "order_number": o.order_number,
            "status": o.status,
            "total_amount": o.total_amount,
            "placed_at": o.placed_at.isoformat() if o.placed_at else None,
        }
        for o in recent_orders_rows
    ]

    stats = {
        "total_revenue": Decimal(str(rev)),
        "total_orders": sp.total_orders,
        "product_count": len(seller_prods),
        "in_stock_products": sum(1 for p in seller_prods if p.is_available and p.stock_quantity > 0),
        "out_of_stock_products": sum(1 for p in seller_prods if p.stock_quantity <= 0),
    }

    res = SellerDetailResponse(
        seller_id=sp.user_id,
        business_name=sp.business_name,
        business_type=sp.business_type,
        description=sp.description,
        gst_number=sp.gst_number,
        is_verified=sp.is_verified,
        is_active=user.is_active if user else True,
        rating=sp.rating,
        contact_name=user.name if user else None,
        phone=user.phone if user else "",
        email=user.email if user else None,
        address=addr_dict,
        stats=stats,
        products=prods_list,
        recent_orders=recent_orders_list,
        reviews=[],
        complaints=[],
    )

    return APIResponse(data=res)


@router.patch("/{seller_id}/verify", response_model=APIResponse[bool], summary="Verify or unverify seller")
def toggle_seller_verification(
    seller_id: int,
    payload: SellerVerificationUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    sp = db.query(SellerProfile).filter(SellerProfile.user_id == seller_id).first()
    if not sp:
        raise NotFoundException(f"Seller {seller_id} not found")

    sp.is_verified = payload.is_verified
    db.commit()
    return APIResponse(
        message=f"Seller verification status updated to {payload.is_verified}",
        data=True,
    )
