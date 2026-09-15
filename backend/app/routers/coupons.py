from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_customer, require_admin
from app.models.user import User
from app.schemas.coupon import (
    CouponCreate,
    CouponUpdate,
    CouponRead,
    ApplyCouponRequest,
    ApplyCouponResponse,
)
from app.schemas.common import APIResponse
from app.services.coupon_service import CouponService

router = APIRouter(prefix="/coupons", tags=["Coupons"])


@router.get("", response_model=APIResponse[List[CouponRead]], summary="List available active coupons")
def list_coupons(db: Session = Depends(get_db)):
    coupons = CouponService.list_coupons(db, active_only=True)
    return APIResponse(data=[CouponRead.model_validate(c) for c in coupons])


@router.post("/apply", response_model=APIResponse[ApplyCouponResponse], summary="Validate and calculate coupon discount")
def apply_coupon(
    payload: ApplyCouponRequest,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    coupon, discount = CouponService.validate_and_calculate_discount(
        db, current_user, payload.code, payload.order_amount
    )
    final_amount = max(payload.order_amount - discount, 0)
    response_data = ApplyCouponResponse(
        is_valid=True,
        code=coupon.code,
        discount_amount=discount,
        final_amount=final_amount,
        message=f"Coupon applied! You saved ₹{discount}",
    )
    return APIResponse(message="Coupon applied", data=response_data)


@router.post("", response_model=APIResponse[CouponRead], status_code=status.HTTP_201_CREATED, summary="Create coupon (Admin)")
def create_coupon(
    payload: CouponCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    coupon = CouponService.create_coupon(db, payload)
    return APIResponse(message="Coupon created successfully", data=CouponRead.model_validate(coupon))
