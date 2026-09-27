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


@router.get("/{address_id}", response_model=APIResponse[AddressRead], summary="Get specific address with strict location privacy")
def get_address(
    address_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.core.exceptions import NotFoundException, ForbiddenException
    from app.models.address import Address
    from app.models.order import Order
    from app.models.delivery_task import DeliveryTask
    from app.models.delivery_partner import DeliveryPartner

    # 1. Sellers are NEVER permitted direct customer address access
    if current_user.role_id == 2:
        raise ForbiddenException("Sellers do not have access to customer delivery addresses")

    address = db.query(Address).filter(Address.id == address_id).first()
    if not address:
        raise NotFoundException(f"Address {address_id} not found")

    # 2. Customers can only view their own addresses
    if current_user.role_id == 1 and address.user_id != current_user.id:
        raise ForbiddenException("You do not have access to this address")

    # 3. Delivery partners can only view customer address after seller pickup verification
    if current_user.role_id == 3:
        partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == current_user.id).first()
        if not partner:
            raise ForbiddenException("Delivery partner profile not found")

        # Find active assigned order for this address
        order = (
            db.query(Order)
            .filter(Order.address_id == address_id, Order.delivery_partner_id == partner.id)
            .first()
        )
        if not order:
            raise ForbiddenException("Not authorized to view this address")

        task = db.query(DeliveryTask).filter(DeliveryTask.order_id == order.id).first()
        is_picked_up = bool(
            (task and getattr(task, "pickup_verified", False))
            or order.pickup_otp_verified_at is not None
            or order.status in ["PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"]
        )
        if not is_picked_up:
            raise ForbiddenException("Customer destination address is locked until seller pickup verification")

    return APIResponse(data=AddressRead.model_validate(address))


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
