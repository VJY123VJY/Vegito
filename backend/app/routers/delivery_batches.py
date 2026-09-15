from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.models.delivery_batch import DeliveryBatch
from app.models.delivery_batch_order import DeliveryBatchOrder
from app.schemas.delivery import DeliveryBatchCreate, DeliveryBatchRead
from app.schemas.common import APIResponse

router = APIRouter(prefix="/delivery-batches", tags=["Delivery Batches"])


@router.post("", response_model=APIResponse[DeliveryBatchRead], status_code=status.HTTP_201_CREATED, summary="Create a delivery batch (Admin)")
def create_delivery_batch(
    payload: DeliveryBatchCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    batch = DeliveryBatch(
        zone_id=payload.zone_id,
        delivery_partner_id=payload.delivery_partner_id,
        total_orders=len(payload.task_ids),
        status="CREATED",
    )
    db.add(batch)
    db.flush()

    for idx, task_id in enumerate(payload.task_ids, start=1):
        bo = DeliveryBatchOrder(
            batch_id=batch.id,
            delivery_task_id=task_id,
            sequence_number=idx,
        )
        db.add(bo)

    db.commit()
    db.refresh(batch)
    return APIResponse(message="Delivery batch created", data=DeliveryBatchRead.model_validate(batch))


@router.get("", response_model=APIResponse[List[DeliveryBatchRead]], summary="List delivery batches (Admin)")
def list_delivery_batches(
    current_user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    batches = db.query(DeliveryBatch).order_by(DeliveryBatch.created_at.desc()).all()
    return APIResponse(data=[DeliveryBatchRead.model_validate(b) for b in batches])
