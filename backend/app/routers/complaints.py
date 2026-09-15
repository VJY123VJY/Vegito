from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_customer, get_current_user
from app.models.user import User
from app.models.complaint import Complaint
from app.models.order import Order
from app.schemas.complaint import ComplaintCreate, ComplaintRead
from app.schemas.common import APIResponse
from app.core.exceptions import NotFoundException, ForbiddenException

router = APIRouter(prefix="/complaints", tags=["Complaints"])


@router.post("", response_model=APIResponse[ComplaintRead], status_code=status.HTTP_201_CREATED, summary="Raise an order complaint")
def raise_complaint(
    payload: ComplaintCreate,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == payload.order_id, Order.customer_id == current_user.id).first()
    if not order:
        raise NotFoundException("Order not found or does not belong to you")

    complaint = Complaint(
        order_id=payload.order_id,
        customer_id=current_user.id,
        complaint_type=payload.complaint_type,
        description=payload.description,
        status="OPEN",
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    read_obj = ComplaintRead.model_validate(complaint)
    read_obj.customer_name = current_user.name
    return APIResponse(message="Complaint raised successfully", data=read_obj)


@router.get("", response_model=APIResponse[List[ComplaintRead]], summary="List customer complaints")
def list_complaints(
    current_user: User = Depends(require_customer), db: Session = Depends(get_db)
):
    complaints = (
        db.query(Complaint)
        .filter(Complaint.customer_id == current_user.id)
        .order_by(Complaint.created_at.desc())
        .all()
    )
    results = []
    for c in complaints:
        read_obj = ComplaintRead.model_validate(c)
        read_obj.customer_name = current_user.name
        results.append(read_obj)
    return APIResponse(data=results)


@router.get("/{complaint_id}", response_model=APIResponse[ComplaintRead], summary="Get complaint details")
def get_complaint(
    complaint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise NotFoundException(f"Complaint {complaint_id} not found")

    if current_user.role_id == 1 and complaint.customer_id != current_user.id:
        raise ForbiddenException("You do not have permission to view this complaint")

    read_obj = ComplaintRead.model_validate(complaint)
    read_obj.customer_name = complaint.customer.name if complaint.customer else None
    return APIResponse(data=read_obj)
