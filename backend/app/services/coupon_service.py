import datetime
from decimal import Decimal
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from app.models.coupon import Coupon
from app.models.coupon_usage import CouponUsage
from app.models.user import User
from app.schemas.coupon import CouponCreate, CouponUpdate, ApplyCouponResponse
from app.core.constants import DiscountType
from app.core.exceptions import NotFoundException, BadRequestException, ConflictException
from app.utils.helpers import round_currency


class CouponService:
    @staticmethod
    def create_coupon(db: Session, coupon_in: CouponCreate) -> Coupon:
        existing = db.query(Coupon).filter(Coupon.code == coupon_in.code.upper().strip()).first()
        if existing:
            raise ConflictException(f"Coupon with code '{coupon_in.code}' already exists")

        coupon = Coupon(
            code=coupon_in.code.upper().strip(),
            description=coupon_in.description,
            discount_type=coupon_in.discount_type.upper(),
            discount_value=coupon_in.discount_value,
            minimum_order_amount=coupon_in.minimum_order_amount,
            maximum_discount=coupon_in.maximum_discount,
            usage_limit=coupon_in.usage_limit,
            starts_at=coupon_in.starts_at,
            expires_at=coupon_in.expires_at,
            is_active=coupon_in.is_active,
        )
        db.add(coupon)
        db.commit()
        db.refresh(coupon)
        return coupon

    @staticmethod
    def list_coupons(db: Session, active_only: bool = True) -> List[Coupon]:
        query = db.query(Coupon)
        if active_only:
            query = query.filter(Coupon.is_active == True)
        return query.order_by(Coupon.created_at.desc()).all()

    @staticmethod
    def validate_and_calculate_discount(
        db: Session, user: User, code: str, order_amount: Decimal
    ) -> Tuple[Coupon, Decimal]:
        clean_code = code.upper().strip()
        coupon = db.query(Coupon).filter(Coupon.code == clean_code, Coupon.is_active == True).first()
        if not coupon:
            raise BadRequestException("Invalid or inactive coupon code")

        now = datetime.datetime.now(datetime.timezone.utc)
        if coupon.starts_at and coupon.starts_at.replace(tzinfo=datetime.timezone.utc) > now:
            raise BadRequestException("This coupon has not started yet")
        if coupon.expires_at and coupon.expires_at.replace(tzinfo=datetime.timezone.utc) < now:
            raise BadRequestException("This coupon has expired")

        if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
            raise BadRequestException("Coupon usage limit has been reached")

        # Check if this user has already used this coupon
        already_used = (
            db.query(CouponUsage)
            .filter(CouponUsage.coupon_id == coupon.id, CouponUsage.user_id == user.id)
            .first()
        )
        if already_used:
            raise BadRequestException("You have already used this coupon code")

        if order_amount < coupon.minimum_order_amount:
            raise BadRequestException(
                f"Minimum order amount of ₹{coupon.minimum_order_amount} required to use this coupon"
            )

        if coupon.discount_type == DiscountType.PERCENTAGE.value:
            discount = round_currency(order_amount * (coupon.discount_value / Decimal("100.00")))
            if coupon.maximum_discount and discount > coupon.maximum_discount:
                discount = coupon.maximum_discount
        else:
            discount = min(coupon.discount_value, order_amount)

        return coupon, discount

    @staticmethod
    def record_usage(
        db: Session, coupon_id: int, user_id: int, order_id: int, discount_amount: Decimal
    ) -> CouponUsage:
        usage = CouponUsage(
            coupon_id=coupon_id,
            user_id=user_id,
            order_id=order_id,
            discount_amount=discount_amount,
        )
        db.add(usage)
        # Increment coupon used count
        coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
        if coupon:
            coupon.used_count += 1
        return usage
