from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_admin, require_super_admin
from app.models.user import User
from app.schemas.user import UserRead, UserStatusUpdate
from app.schemas.complaint import ComplaintRead, ComplaintUpdate
from app.schemas.common import APIResponse
from app.utils.pagination import PaginationParams, PaginatedResponse
from app.services.admin_service import AdminService
from app.services.delivery_service import DeliveryService
from app.models.delivery_task import DeliveryTask
from app.models.delivery_partner import DeliveryPartner
from app.core.exceptions import NotFoundException, BadRequestException
from app.core.exceptions import ConflictException
from app.utils.validators import validate_phone_number
from pydantic import BaseModel, Field

router = APIRouter(prefix="/admin", tags=["Admin & Super Admin"])


@router.get("/dashboard", response_model=APIResponse[Dict[str, Any]], summary="Aggregated dashboard analytics")
def get_dashboard(
    current_user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    metrics = AdminService.get_dashboard_metrics(db)
    return APIResponse(data=metrics)


@router.get("/users", response_model=APIResponse[PaginatedResponse[UserRead]], summary="List platform users")
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role_id: Optional[int] = Query(None, description="Filter by role ID (1: Customer, 2: Seller, 3: Delivery, 4: Admin, 5: Super Admin)"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    pagination = PaginationParams(page=page, page_size=page_size)
    users, total_count = AdminService.list_users(db, pagination, role_id=role_id)
    paginated = PaginatedResponse.create(users, total_count, pagination)
    return APIResponse(data=paginated)


@router.patch("/users/{user_id}/status", response_model=APIResponse[UserRead], summary="Block or activate user")
def update_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    updated = AdminService.update_user_status(db, user_id, payload.is_active)
    return APIResponse(message="User status updated", data=updated)


@router.get("/complaints", response_model=APIResponse[PaginatedResponse[ComplaintRead]], summary="List customer complaints")
def list_complaints(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="OPEN, IN_PROGRESS, RESOLVED, CLOSED"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    pagination = PaginationParams(page=page, page_size=page_size)
    complaints, total_count = AdminService.list_complaints(db, pagination, status=status)
    paginated = PaginatedResponse.create(complaints, total_count, pagination)
    return APIResponse(data=paginated)


@router.patch("/complaints/{complaint_id}/resolve", response_model=APIResponse[ComplaintRead], summary="Resolve complaint")
def resolve_complaint(
    complaint_id: int,
    payload: ComplaintUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    resolved = AdminService.resolve_complaint(db, complaint_id, current_user, payload)
    return APIResponse(message="Complaint status updated", data=resolved)


class CreateAdminRequest(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None


class AssignDeliveryRequest(BaseModel):
    delivery_partner_id: int = Field(..., gt=0)


@router.post(
    "/super/create-admin",
    response_model=APIResponse[UserRead],
    status_code=status.HTTP_201_CREATED,
    summary="Provision a new admin (Super Admin only)",
)
def create_admin(
    payload: CreateAdminRequest,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    phone = validate_phone_number(payload.phone)
    existing = db.query(User).filter(User.phone == phone).first()
    if existing:
        raise ConflictException(f"User with phone {phone} already exists")

    admin_user = User(
        role_id=4,  # ADMIN
        name=payload.name,
        phone=phone,
        email=payload.email,
        is_active=True,
        is_verified=True,
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    return APIResponse(message="Admin created successfully", data=UserRead.model_validate(admin_user))


@router.patch("/delivery-tasks/{task_id}/assign", response_model=APIResponse[bool], summary="Assign a delivery task")
def assign_delivery_task(
    task_id: int,
    payload: AssignDeliveryRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    task = db.query(DeliveryTask).filter(DeliveryTask.id == task_id).first()
    if not task:
        raise NotFoundException(f"Delivery task {task_id} not found")
    partner = db.query(DeliveryPartner).filter(DeliveryPartner.id == payload.delivery_partner_id).first()
    if not partner or not partner.is_verified or not partner.is_available:
        raise BadRequestException("Delivery partner is unavailable or not verified")
    if task.status in ["DELIVERED", "FAILED", "CANCELLED"]:
        raise BadRequestException(f"Cannot assign task in {task.status} status")
    task.delivery_partner_id = partner.id
    task.assigned_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    return APIResponse(message="Delivery task assigned successfully", data=True)


@router.get("/orders", response_model=APIResponse[Dict[str, Any]], summary="List all orders across platform")
def list_admin_orders(
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from app.models.order import Order
    from app.models.order_item import OrderItem
    from sqlalchemy.orm import joinedload

    query = db.query(Order).options(
        joinedload(Order.customer),
        joinedload(Order.address),
        joinedload(Order.items),
        joinedload(Order.delivery_task).joinedload(DeliveryTask.delivery_partner).joinedload(DeliveryPartner.user),
    )
    if status:
        query = query.filter(Order.status == status)
    if q:
        query = query.join(User, Order.customer_id == User.id).filter(
            (Order.order_number.ilike(f"%{q}%")) | (User.name.ilike(f"%{q}%")) | (User.phone.ilike(f"%{q}%"))
        )

    total_count = query.count()
    orders = (
        query.order_by(Order.placed_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for o in orders:
        partner_name = None
        if o.delivery_task and o.delivery_task.delivery_partner and o.delivery_task.delivery_partner.user:
            partner_name = o.delivery_task.delivery_partner.user.name

        items.append({
            "id": o.id,
            "order_number": o.order_number,
            "customer_name": o.customer.name if o.customer else "Customer",
            "customer_phone": o.customer.phone if o.customer else "",
            "address": f"{o.address.address_line1}, {o.address.city}" if o.address else None,
            "status": o.status,
            "payment_method": o.payment_method,
            "payment_status": o.payment_status,
            "total_amount": float(o.total_amount),
            "items_count": len(o.items),
            "placed_at": o.placed_at.isoformat() if o.placed_at else None,
            "delivery_task_id": o.delivery_task.id if o.delivery_task else None,
            "delivery_partner_id": o.delivery_task.delivery_partner_id if o.delivery_task else None,
            "delivery_partner_name": partner_name,
        })

    return APIResponse(data={"items": items, "total": total_count, "page": page, "page_size": page_size})


@router.get("/customers", response_model=APIResponse[Dict[str, Any]], summary="List platform customers")
def list_admin_customers(
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from app.models.customer_profile import CustomerProfile
    from app.models.order import Order
    from sqlalchemy import func

    query = db.query(User).filter(User.role_id == 1)
    if q:
        query = query.filter((User.name.ilike(f"%{q}%")) | (User.phone.ilike(f"%{q}%")) | (User.email.ilike(f"%{q}%")))

    total_count = query.count()
    users = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for u in users:
        order_count = db.query(Order).filter(Order.customer_id == u.id).count()
        total_spent = (
            db.query(func.coalesce(func.sum(Order.total_amount), 0))
            .filter(Order.customer_id == u.id, Order.payment_status == "PAID")
            .scalar()
        )
        items.append({
            "id": u.id,
            "name": u.name or "Customer",
            "phone": u.phone,
            "email": u.email,
            "is_active": u.is_active,
            "total_orders": order_count,
            "total_spent": float(total_spent),
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })

    return APIResponse(data={"items": items, "total": total_count, "page": page, "page_size": page_size})


@router.get("/inventory/alerts", response_model=APIResponse[List[Dict[str, Any]]], summary="List low stock inventory alerts")
def get_inventory_alerts(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from app.models.seller_product import SellerProduct
    from app.models.seller_profile import SellerProfile
    from app.models.product import Product
    from sqlalchemy.orm import joinedload

    alerts = (
        db.query(Inventory)
        .join(SellerProduct, SellerProduct.id == Inventory.seller_product_id)
        .join(Product, Product.id == SellerProduct.product_id)
        .options(
            joinedload(Inventory.seller_product).joinedload(SellerProduct.product),
            joinedload(Inventory.seller_product).joinedload(SellerProduct.seller).joinedload(User.seller_profile),
        )
        .filter(Inventory.quantity <= Inventory.low_stock_threshold)
        .all()
    )

    results = []
    for inv in alerts:
        sp = inv.seller_product
        prod = sp.product if sp else None
        seller_user = sp.seller if sp else None
        prof = seller_user.seller_profile if seller_user else None

        results.append({
            "inventory_id": inv.id,
            "seller_product_id": inv.seller_product_id,
            "product_name": prod.name if prod else "Unknown",
            "unit": prod.unit if prod else "kg",
            "quantity": float(inv.quantity),
            "low_stock_threshold": float(inv.low_stock_threshold),
            "seller_id": sp.seller_id if sp else None,
            "business_name": prof.business_name if prof else "Seller",
            "seller_phone": seller_user.phone if seller_user else "",
        })

    return APIResponse(data=results)

