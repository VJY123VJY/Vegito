from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.address import AddressCreate, AddressUpdate, AddressRead
from app.schemas.common import APIResponse
from app.services.customer_service import CustomerService

router = APIRouter(prefix="/addresses", tags=["Addresses"])


@router.get("", response_model=APIResponse[List[AddressRead]], summary="List user addresses")
def list_addresses(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    addresses = CustomerService.list_addresses(db, current_user)
    return APIResponse(data=[AddressRead.model_validate(a) for a in addresses])


@router.post("", response_model=APIResponse[AddressRead], status_code=status.HTTP_201_CREATED, summary="Add new address")
def create_address(
    payload: AddressCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    address = CustomerService.create_address(db, current_user, payload)
    return APIResponse(message="Address added successfully", data=AddressRead.model_validate(address))


@router.patch("/{address_id}", response_model=APIResponse[AddressRead], summary="Update address")
def update_address(
    address_id: int,
    payload: AddressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    address = CustomerService.update_address(db, current_user, address_id, payload)
    return APIResponse(message="Address updated successfully", data=AddressRead.model_validate(address))


@router.delete("/{address_id}", response_model=APIResponse[bool], summary="Delete address")
def delete_address(
    address_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    CustomerService.delete_address(db, current_user, address_id)
    return APIResponse(message="Address deleted successfully", data=True)
