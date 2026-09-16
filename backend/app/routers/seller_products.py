from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_seller
from app.models.user import User
from app.schemas.seller import (
    SellerProductCreate,
    SellerProductUpdate,
    SellerProductRead,
)
from app.schemas.product import ProductRead
from app.schemas.common import APIResponse
from app.services.seller_service import SellerService

router = APIRouter(prefix="/seller/products", tags=["Seller Products"])


@router.get("", response_model=APIResponse[List[SellerProductRead]], summary="List seller's offered products")
def list_seller_products(
    current_user: User = Depends(require_seller), db: Session = Depends(get_db)
):
    seller_products = SellerService.list_seller_products(db, current_user)
    results = []
    for sp in seller_products:
        read_obj = SellerProductRead.model_validate(sp)
        if sp.product:
            read_obj.product = ProductRead.model_validate(sp.product)
        results.append(read_obj)
    return APIResponse(data=results)


@router.post("", response_model=APIResponse[SellerProductRead], status_code=status.HTTP_201_CREATED, summary="Add product listing with price and stock")
def add_seller_product(
    payload: SellerProductCreate,
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    sp = SellerService.add_product(db, current_user, payload)
    read_obj = SellerProductRead.model_validate(sp)
    if sp.product:
        read_obj.product = ProductRead.model_validate(sp.product)
    return APIResponse(message="Product added to your store", data=read_obj)


@router.patch("/{seller_product_id}", response_model=APIResponse[SellerProductRead], summary="Update price, stock, or availability")
def update_seller_product(
    seller_product_id: int,
    payload: SellerProductUpdate,
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    sp = SellerService.update_product(db, current_user, seller_product_id, payload)
    read_obj = SellerProductRead.model_validate(sp)
    if sp.product:
        read_obj.product = ProductRead.model_validate(sp.product)
    return APIResponse(message="Product listing updated", data=read_obj)


@router.delete("/{seller_product_id}", response_model=APIResponse[bool], summary="Remove or deactivate seller product")
def delete_seller_product(
    seller_product_id: int,
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    success = SellerService.delete_product(db, current_user, seller_product_id)
    return APIResponse(message="Product listing removed from your store", data=success)
