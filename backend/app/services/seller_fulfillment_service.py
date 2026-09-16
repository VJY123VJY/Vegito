import datetime
from decimal import Decimal
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.models.seller_order_fulfillment import SellerOrderFulfillment
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.seller_product import SellerProduct
from app.models.seller_profile import SellerProfile
from app.models.order_status_history import OrderStatusHistory
from app.models.user import User
from app.core.constants import OrderStatus
from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException
from app.services.notification_service import NotificationService
from app.schemas.seller_fulfillment import SellerOrderFulfillmentRead


class SellerFulfillmentService:
    @staticmethod
    def create_fulfillments_for_order(
        db: Session, order: Order, items: List[OrderItem]
    ) -> List[SellerOrderFulfillment]:
        """
        Groups items by seller_id and generates a SellerOrderFulfillment record for each seller.
        Supports single seller today and multiple sellers in the future.
        """
        seller_subtotals: dict[int, Decimal] = {}
        for item in items:
            if not item.seller_product_id:
                continue
            sp = db.query(SellerProduct).filter(SellerProduct.id == item.seller_product_id).first()
            if sp:
                seller_id = sp.seller_id
                seller_subtotals[seller_id] = seller_subtotals.get(seller_id, Decimal("0.00")) + item.subtotal

        fulfillments = []
        now = datetime.datetime.now(datetime.timezone.utc)
        for seller_id, subtotal in seller_subtotals.items():
            f = SellerOrderFulfillment(
                order_id=order.id,
                seller_id=seller_id,
                status=OrderStatus.NEW.value,
                subtotal=subtotal,
                seller_amount=subtotal,
                created_at=now,
                updated_at=now,
            )
            db.add(f)
            fulfillments.append(f)

        db.flush()
        return fulfillments

    @staticmethod
    def update_fulfillment_status(
        db: Session,
        user: User,
        fulfillment_id: int,
        new_status: str,
        note: Optional[str] = None,
    ) -> SellerOrderFulfillment:
        f = (
            db.query(SellerOrderFulfillment)
            .options(joinedload(SellerOrderFulfillment.order))
            .filter(SellerOrderFulfillment.id == fulfillment_id)
            .first()
        )
        if not f:
            raise NotFoundException(f"Seller fulfillment {fulfillment_id} not found")

        # Isolation: user must be the seller or an admin
        if user.role_id == 2 and f.seller_id != user.id:
            raise ForbiddenException("You do not have permission to update this fulfillment.")

        valid_transitions = {
            OrderStatus.NEW.value: {OrderStatus.ACCEPTED.value, OrderStatus.REJECTED.value},
            OrderStatus.ACCEPTED.value: {OrderStatus.PACKING.value, OrderStatus.REJECTED.value},
            OrderStatus.PACKING.value: {OrderStatus.READY.value},
        }
        allowed = valid_transitions.get(f.status, set())
        if new_status not in allowed:
            raise BadRequestException(f"Cannot change fulfillment status from {f.status} to {new_status}")

        now = datetime.datetime.now(datetime.timezone.utc)
        f.status = new_status
        f.updated_at = now
        if new_status == OrderStatus.ACCEPTED.value:
            f.accepted_at = now
        elif new_status == OrderStatus.PACKING.value:
            f.packed_at = now
        elif new_status == OrderStatus.READY.value:
            f.ready_at = now
        elif new_status == OrderStatus.REJECTED.value:
            f.rejected_at = now

        db.flush()

        # Multi-seller check:
        # If ALL seller fulfillments for this order are READY, transition overall order to READY!
        order = f.order
        all_fulfillments = (
            db.query(SellerOrderFulfillment)
            .filter(SellerOrderFulfillment.order_id == order.id)
            .all()
        )

        all_ready = all(item.status == OrderStatus.READY.value for item in all_fulfillments)
        any_packing = any(item.status == OrderStatus.PACKING.value for item in all_fulfillments)
        any_accepted = any(item.status == OrderStatus.ACCEPTED.value for item in all_fulfillments)

        if all_ready and order.status != OrderStatus.READY.value:
            old_order_status = order.status
            order.status = OrderStatus.READY.value
            order.ready_at = now
            history = OrderStatusHistory(
                order_id=order.id,
                old_status=old_order_status,
                new_status=OrderStatus.READY.value,
                changed_by=user.id,
                note="All seller items are packed and ready for delivery.",
            )
            db.add(history)
            NotificationService.send_notification(
                db=db,
                user_id=order.customer_id,
                notification_type="ORDER_READY",
                title="Order Ready for Dispatch",
                message=f"Order #{order.order_number} is packed and ready for delivery partner pickup.",
            )
        elif any_packing and order.status in [OrderStatus.NEW.value, OrderStatus.ACCEPTED.value]:
            old_order_status = order.status
            order.status = OrderStatus.PACKING.value
            order.packed_at = now
            history = OrderStatusHistory(
                order_id=order.id,
                old_status=old_order_status,
                new_status=OrderStatus.PACKING.value,
                changed_by=user.id,
                note=note or "Order packing started",
            )
            db.add(history)
        elif any_accepted and order.status == OrderStatus.NEW.value:
            old_order_status = order.status
            order.status = OrderStatus.ACCEPTED.value
            order.accepted_at = now
            history = OrderStatusHistory(
                order_id=order.id,
                old_status=old_order_status,
                new_status=OrderStatus.ACCEPTED.value,
                changed_by=user.id,
                note=note or "Order accepted",
            )
            db.add(history)

        db.commit()
        db.refresh(f)
        return f

    @staticmethod
    def list_fulfillments_for_order(
        db: Session, order_id: int
    ) -> List[SellerOrderFulfillmentRead]:
        items = (
            db.query(SellerOrderFulfillment)
            .filter(SellerOrderFulfillment.order_id == order_id)
            .all()
        )
        res = []
        for it in items:
            read = SellerOrderFulfillmentRead.model_validate(it)
            prof = db.query(SellerProfile).filter(SellerProfile.user_id == it.seller_id).first()
            if prof:
                read.business_name = prof.business_name
            res.append(read)
        return res
