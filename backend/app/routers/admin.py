from typing import Dict, Any, Optional
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
    if task.status != "ASSIGNED":
        raise BadRequestException("Only unassigned tasks can be assigned")
    task.delivery_partner_id = partner.id
    db.commit()
    return APIResponse(message="Delivery task assigned", data=True)
