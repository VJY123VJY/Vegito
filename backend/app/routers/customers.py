from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_customer
from app.models.user import User
from app.schemas.customer import CustomerProfileRead, CustomerProfileUpdate
from app.schemas.common import APIResponse
from app.services.customer_service import CustomerService

router = APIRouter(prefix="/customers", tags=["Customers"])


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
