import datetime
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from app.models.delivery_task import DeliveryTask
from app.models.delivery_task_status_history import DeliveryTaskStatusHistory
from app.models.delivery_partner import DeliveryPartner
from app.models.delivery_batch import DeliveryBatch
from app.models.delivery_batch_order import DeliveryBatchOrder
from app.models.delivery_zone import DeliveryZone
from app.models.order import Order
from app.models.user import User
from app.core.constants import DeliveryTaskStatus, OrderStatus, PaymentStatus
from app.core.security import hash_otp, verify_otp_hash
from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException
from app.utils.otp import generate_delivery_otp
from app.schemas.delivery import DeliveryTaskRead, DeliveryBatchCreate, DeliveryZoneCreate
from app.schemas.address import AddressRead
from app.utils.pagination import PaginationParams
from app.config import settings


class DeliveryService:
    @staticmethod
    def create_task_for_order(db: Session, order: Order) -> Tuple[DeliveryTask, str]:
        """Creates a delivery task for a newly placed order with a secure OTP."""
        raw_otp = generate_delivery_otp()
        otp_hash = hash_otp(str(order.customer_id), raw_otp)

        task = DeliveryTask(
            order_id=order.id,
            status=DeliveryTaskStatus.ASSIGNED.value,
            delivery_otp_hash=otp_hash,
            assigned_at=datetime.datetime.now(datetime.timezone.utc),
        )
        db.add(task)
        db.flush()

        history = DeliveryTaskStatusHistory(
            delivery_task_id=task.id,
            old_status=None,
            new_status=DeliveryTaskStatus.ASSIGNED.value,
            note="Task automatically created on order checkout",
        )
        db.add(history)
        return task, raw_otp

    @staticmethod
    def get_delivery_partner(db: Session, user: User) -> DeliveryPartner:
        partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == user.id).first()
        if not partner:
            partner = DeliveryPartner(user_id=user.id, is_available=True)
            db.add(partner)
            db.commit()
            db.refresh(partner)
        return partner

    @staticmethod
    def list_partner_tasks(
        db: Session, partner_user: User, status: Optional[str] = None
    ) -> List[DeliveryTaskRead]:
        partner = DeliveryService.get_delivery_partner(db, partner_user)
        query = (
            db.query(DeliveryTask)
            .options(
                joinedload(DeliveryTask.order).joinedload(Order.address),
                joinedload(DeliveryTask.order).joinedload(Order.customer),
            )
            .filter(DeliveryTask.delivery_partner_id == partner.id)
        )
        if status:
            query = query.filter(DeliveryTask.status == status)

        tasks = query.order_by(DeliveryTask.created_at.desc()).all()
        results = []
        for t in tasks:
            order = t.order
            results.append(
                DeliveryTaskRead(
                    id=t.id,
                    order_id=t.order_id,
                    order_number=order.order_number if order else None,
                    customer_name=order.customer.name if (order and order.customer) else None,
                    customer_phone=order.customer.phone if (order and order.customer) else None,
                    delivery_address=AddressRead.model_validate(order.address) if (order and order.address) else None,
                    delivery_partner_id=t.delivery_partner_id,
                    status=t.status,
                    assigned_at=t.assigned_at,
                    started_at=t.started_at,
                    delivered_at=t.delivered_at,
                    delivery_otp_verified_at=t.delivery_otp_verified_at,
                    notes=t.notes,
                    created_at=t.created_at,
                    updated_at=t.updated_at,
                )
            )
        return results

    @staticmethod
    def update_task_status(
        db: Session,
        partner_user: User,
        task_id: int,
        new_status: str,
        note: Optional[str] = None,
    ) -> DeliveryTask:
        partner = DeliveryService.get_delivery_partner(db, partner_user)
        task = db.query(DeliveryTask).filter(DeliveryTask.id == task_id).first()
        if not task:
            raise NotFoundException(f"Delivery task {task_id} not found")

        if task.delivery_partner_id != partner.id:
            raise ForbiddenException("This task is assigned to another delivery partner")

        old_status = task.status
        allowed_transitions = {
            DeliveryTaskStatus.ASSIGNED.value: {DeliveryTaskStatus.STARTED.value, DeliveryTaskStatus.CANCELLED.value},
            DeliveryTaskStatus.STARTED.value: {DeliveryTaskStatus.DELIVERED.value, DeliveryTaskStatus.FAILED.value},
            DeliveryTaskStatus.FAILED.value: {DeliveryTaskStatus.STARTED.value},
        }
        if new_status not in allowed_transitions.get(old_status, set()):
            raise BadRequestException(f"Cannot change delivery task from {old_status} to {new_status}")
        now = datetime.datetime.now(datetime.timezone.utc)
        task.status = new_status

        if new_status == DeliveryTaskStatus.STARTED.value and not task.started_at:
            task.started_at = now
            # Update order status to OUT_FOR_DELIVERY
            order = db.query(Order).filter(Order.id == task.order_id).first()
            if order:
                order.status = OrderStatus.OUT_FOR_DELIVERY.value
                order.out_for_delivery_at = now

        history = DeliveryTaskStatusHistory(
            delivery_task_id=task.id,
            old_status=old_status,
            new_status=new_status,
            changed_by=partner_user.id,
            note=note,
        )
        db.add(history)
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def verify_delivery_otp_and_complete(
        db: Session,
        partner_user: User,
        task_id: int,
        delivery_otp: str,
        notes: Optional[str] = None,
    ) -> DeliveryTask:
        partner = DeliveryService.get_delivery_partner(db, partner_user)
        task = db.query(DeliveryTask).filter(DeliveryTask.id == task_id).first()
        if not task:
            raise NotFoundException(f"Delivery task {task_id} not found")

        if task.delivery_partner_id != partner.id:
            raise ForbiddenException("This task is assigned to another delivery partner")

        order = db.query(Order).filter(Order.id == task.order_id).first()
        if not order:
            raise NotFoundException("Associated order not found")

        if task.status != DeliveryTaskStatus.STARTED.value:
            raise BadRequestException("Start the delivery before verifying the delivery OTP")

        # Verify OTP
        is_valid = verify_otp_hash(str(order.customer_id), delivery_otp.strip(), task.delivery_otp_hash or "")
        if not is_valid:
            raise BadRequestException("Invalid delivery OTP code provided by customer.")

        now = datetime.datetime.now(datetime.timezone.utc)
        old_status = task.status
        task.status = DeliveryTaskStatus.DELIVERED.value
        task.delivered_at = now
        task.delivery_otp_verified_at = now
        task.notes = notes or task.notes

        # Complete order
        order.status = OrderStatus.DELIVERED.value
        order.delivered_at = now
        if order.payment_method == "COD":
            order.payment_status = PaymentStatus.PAID.value

        # Increment partner stats
        partner.total_deliveries += 1

        history = DeliveryTaskStatusHistory(
            delivery_task_id=task.id,
            old_status=old_status,
            new_status=DeliveryTaskStatus.DELIVERED.value,
            changed_by=partner_user.id,
            note="Delivered and verified with customer OTP",
        )
        db.add(history)
        db.commit()
        db.refresh(task)
        return task

    # Delivery Zones
    @staticmethod
    def list_zones(db: Session, active_only: bool = True) -> List[DeliveryZone]:
        query = db.query(DeliveryZone).filter(DeliveryZone.city.ilike(settings.SERVICE_CITY))
        if active_only:
            query = query.filter(DeliveryZone.is_active == True)
        return query.order_by(DeliveryZone.city.asc(), DeliveryZone.name.asc()).all()

    @staticmethod
    def create_zone(db: Session, zone_in: DeliveryZoneCreate) -> DeliveryZone:
        if zone_in.city.strip().casefold() != settings.SERVICE_CITY.casefold():
            raise BadRequestException(
                f"Delivery zones are currently limited to {settings.SERVICE_CITY}."
            )
        zone = DeliveryZone(**zone_in.model_dump())
        db.add(zone)
        db.commit()
        db.refresh(zone)
        return zone
