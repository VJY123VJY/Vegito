from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_customer
from app.models.user import User
from app.schemas.cart import CartRead, CartItemAdd, CartItemUpdate
from app.schemas.common import APIResponse
from app.services.cart_service import CartService

router = APIRouter(prefix="/cart", tags=["Cart"])


@router.get("", response_model=APIResponse[CartRead], summary="Get customer cart and totals")
def get_cart(current_user: User = Depends(require_customer), db: Session = Depends(get_db)):
    cart = CartService.get_cart_details(db, current_user)
    return APIResponse(data=cart)


@router.post("/items", response_model=APIResponse[CartRead], status_code=status.HTTP_201_CREATED, summary="Add item to cart")
def add_to_cart(
    payload: CartItemAdd,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    cart = CartService.add_to_cart(db, current_user, payload.seller_product_id, payload.quantity)
    return APIResponse(message="Item added to cart", data=cart)


@router.patch("/items/{item_id}", response_model=APIResponse[CartRead], summary="Update cart item quantity")
def update_cart_item(
    item_id: int,
    payload: CartItemUpdate,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    cart = CartService.update_cart_item(db, current_user, item_id, payload.quantity)
    return APIResponse(message="Cart updated", data=cart)


@router.delete("/items/{item_id}", response_model=APIResponse[CartRead], summary="Remove item from cart")
def remove_cart_item(
    item_id: int,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    cart = CartService.remove_cart_item(db, current_user, item_id)
    return APIResponse(message="Item removed from cart", data=cart)


@router.delete("", response_model=APIResponse[bool], summary="Clear all items in cart")
def clear_cart(
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    CartService.clear_cart(db, current_user)
    return APIResponse(message="Cart cleared successfully", data=True)
