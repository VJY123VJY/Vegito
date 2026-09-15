import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session
from app.config import settings
from app.models.payment import Payment
from app.models.order import Order
from app.core.constants import PaymentStatus, PaymentMethod
from app.core.exceptions import NotFoundException, BadRequestException
from app.utils.helpers import round_currency


class PaymentService:
    @staticmethod
    def create_payment_record(
        db: Session,
        order: Order,
        payment_method: str = "COD",
        provider: Optional[str] = None,
    ) -> Payment:
        provider = provider or settings.PAYMENT_PROVIDER

        status = PaymentStatus.PENDING.value
        # If COD, payment remains PENDING until delivery
        paid_at = None

        payment = Payment(
            order_id=order.id,
            payment_provider=provider,
            provider_order_id=f"PAY_ORD_{order.order_number}",
            amount=order.total_amount,
            currency="INR",
            status=status,
            payment_method=payment_method,
            paid_at=paid_at,
        )
        db.add(payment)
        return payment

    @staticmethod
    def verify_payment(
        db: Session,
        order_id: int,
        provider_payment_id: str,
        provider_order_id: Optional[str] = None,
        signature: Optional[str] = None,
    ) -> Payment:
        payment = db.query(Payment).filter(Payment.order_id == order_id).first()
        if not payment:
            raise NotFoundException(f"Payment record for order {order_id} not found")

        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise NotFoundException(f"Order {order_id} not found")

        # In dev/mock mode, automatically verify
        if settings.PAYMENT_PROVIDER == "mock" or not settings.RAZORPAY_KEY_SECRET:
            payment.provider_payment_id = provider_payment_id
            payment.status = PaymentStatus.PAID.value
            payment.paid_at = datetime.datetime.now(datetime.timezone.utc)
            order.payment_status = PaymentStatus.PAID.value
            db.commit()
            db.refresh(payment)
            return payment

        # Razorpay signature verification logic (production ready)
        import hmac
        import hashlib

        msg = f"{provider_order_id}|{provider_payment_id}".encode("utf-8")
        generated_signature = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
            msg,
            hashlib.sha256,
        ).hexdigest()

        if generated_signature != signature:
            payment.status = PaymentStatus.FAILED.value
            order.payment_status = PaymentStatus.FAILED.value
            db.commit()
            raise BadRequestException("Payment verification signature mismatch")

        payment.provider_payment_id = provider_payment_id
        payment.status = PaymentStatus.PAID.value
        payment.paid_at = datetime.datetime.now(datetime.timezone.utc)
        order.payment_status = PaymentStatus.PAID.value
        db.commit()
        db.refresh(payment)
        return payment
