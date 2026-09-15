from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.payment import Payment
from app.schemas.payment import PaymentVerify, PaymentRead
from app.schemas.common import APIResponse
from app.services.payment_service import PaymentService
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/verify", response_model=APIResponse[PaymentRead], summary="Verify payment")
def verify_payment(
    payload: PaymentVerify,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payment = PaymentService.verify_payment(
        db=db,
        order_id=payload.order_id,
        provider_payment_id=payload.provider_payment_id,
        provider_order_id=payload.provider_order_id,
        signature=payload.signature,
    )
    return APIResponse(message="Payment verified successfully", data=PaymentRead.model_validate(payment))


@router.get("/{order_id}", response_model=APIResponse[PaymentRead], summary="Get payment status for order")
def get_order_payment(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payment = db.query(Payment).filter(Payment.order_id == order_id).first()
    if not payment:
        raise NotFoundException(f"Payment record for order {order_id} not found")
    return APIResponse(data=PaymentRead.model_validate(payment))
