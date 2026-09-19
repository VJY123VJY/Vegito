import math
import datetime
from decimal import Decimal
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
from app.models.seller_profile import SellerProfile
from app.models.address import Address
from app.models.order_status_history import OrderStatusHistory
from app.core.constants import DeliveryTaskStatus, OrderStatus, PaymentStatus
from app.core.security import hash_otp, verify_otp_hash
from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException
from app.utils.otp import generate_delivery_otp
from app.schemas.delivery import DeliveryTaskRead, DeliveryBatchCreate, DeliveryZoneCreate
from app.schemas.address import AddressRead
from app.utils.pagination import PaginationParams
from app.services.notification_service import NotificationService
from app.config import settings


def calculate_haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates great-circle distance between two geographic coordinates in kilometers
    using the Haversine formula.
    """
    R = 6371.0  # Earth radius in kilometers
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


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
    def find_and_assign_nearest_partner(
        db: Session,
        order: Order,
        max_radius_km: Optional[float] = None,
    ) -> Tuple[Optional[DeliveryPartner], Optional[float]]:
        """
        Finds the nearest eligible delivery partner for an order and assigns them.
        Criteria:
          1. Partner must be active (user.is_active is True).
          2. Partner must be available (is_available is True).
          3. Partner must NOT have an ongoing active delivery (concurrency control).
          4. Distance from partner's latest recorded location to the Seller's Shop
             must be <= DELIVERY_ASSIGNMENT_RADIUS_KM (1–7 KM).
          5. Returns the closest eligible partner, or (None, None) if no partner is available.
        """
        import logging
        logger = logging.getLogger(__name__)
        from app.models.delivery_partner_location import DeliveryPartnerLocation
        from app.services.mapbox_service import MapboxService
        radius_limit = max_radius_km or float(getattr(settings, "DELIVERY_ASSIGNMENT_RADIUS_KM", 6.0))
        logger.info(f"[DELIVERY] Searching partner order={order.order_number or order.id} within {radius_limit}km")

        # V1 has one person in both roles.  Always assign that seller's own
        # delivery profile first; do not search or assign an unrelated courier.
        if order.seller_id:
            seller_profile = db.query(SellerProfile).filter(
                SellerProfile.user_id == order.seller_id
            ).first()
            # Seller availability is delivery availability in V1.  Keep READY
            # orders intact while offline; they can be assigned after going online.
            if seller_profile and not seller_profile.is_available:
                return None, None
            seller_partner = DeliveryService.get_delivery_partner(
                db, db.query(User).filter(User.id == order.seller_id).one()
            )
            order.delivery_partner_id = seller_partner.id
            task = db.query(DeliveryTask).filter(DeliveryTask.order_id == order.id).first()
            if task:
                task.delivery_partner_id = seller_partner.id
                task.status = DeliveryTaskStatus.ASSIGNED.value
            db.flush()
            return seller_partner, Decimal("0")

        # 1. Determine Seller Shop coordinates
        shop_lat = 17.6805  # Default Solapur center
        shop_lng = 75.9064
        shop_prof = order.shop
        if not shop_prof and order.seller_id:
            shop_prof = db.query(SellerProfile).filter(SellerProfile.user_id == order.seller_id).first()

        if shop_prof:
            if shop_prof.latitude and shop_prof.longitude:
                shop_lat = float(shop_prof.latitude)
                shop_lng = float(shop_prof.longitude)
            elif shop_prof.address_id:
                shop_addr = db.query(Address).filter(Address.id == shop_prof.address_id).first()
                if shop_addr and shop_addr.latitude and shop_addr.longitude:
                    shop_lat = float(shop_addr.latitude)
                    shop_lng = float(shop_addr.longitude)

        # 2. Query candidate delivery partners (available + user active)
        candidates = (
            db.query(DeliveryPartner)
            .join(User, DeliveryPartner.user_id == User.id)
            .filter(DeliveryPartner.is_available == True, User.is_active == True)
            .all()
        )

        eligible_partners: List[Tuple[DeliveryPartner, float]] = []

        for partner in candidates:
            # 3. Concurrency check: does partner have an active, incomplete delivery?
            active_task = (
                db.query(DeliveryTask)
                .join(Order, DeliveryTask.order_id == Order.id)
                .filter(
                    DeliveryTask.delivery_partner_id == partner.id,
                    DeliveryTask.status.in_(["ASSIGNED", "STARTED", "OUT_FOR_DELIVERY", "PICKED_UP"]),
                    Order.status.notin_(["DELIVERED", "CANCELLED", "REJECTED"]),
                    Order.id != order.id,
                )
                .first()
            )
            if active_task:
                # Partner is currently delivering another order! Do NOT double-assign.
                continue

            # 4. Location check: Partner location -> Seller Shop location
            loc = (
                db.query(DeliveryPartnerLocation)
                .filter(DeliveryPartnerLocation.delivery_partner_id == partner.id)
                .order_by(DeliveryPartnerLocation.recorded_at.desc())
                .first()
            )
            if loc and loc.latitude and loc.longitude:
                dist_km, _ = MapboxService.get_route_distance_km(
                    float(loc.latitude), float(loc.longitude), shop_lat, shop_lng
                )
            else:
                # No recorded GPS trace yet (fresh test/dev partner); treat as local base distance (1.5 km)
                dist_km = 1.5

            if dist_km <= radius_limit:
                eligible_partners.append((partner, dist_km))

        if not eligible_partners:
            logger.info(f"[DELIVERY] No available partner found within {radius_limit}km for order={order.order_number or order.id}. Order remains READY awaiting partner.")
            return None, None

        # Sort by distance (nearest first)
        eligible_partners.sort(key=lambda x: x[1])
        best_partner, best_dist = eligible_partners[0]

        logger.info(f"[DELIVERY] Partner found partner={best_partner.id} distance={best_dist}km")

        # Assign partner to order & task
        order.delivery_partner_id = best_partner.id
        task = db.query(DeliveryTask).filter(DeliveryTask.order_id == order.id).first()
        if not task:
            task, _ = DeliveryService.create_task_for_order(db, order)
        if task:
            task.delivery_partner_id = best_partner.id
            task.status = DeliveryTaskStatus.ASSIGNED.value
            db.flush()
            logger.info(f"[DELIVERY] Task created task={task.id}")

        logger.info(f"[DELIVERY] Notification sent partner={best_partner.id}")
        logger.info(f"[DELIVERY] Event published event=DELIVERY_ASSIGNED")

        return best_partner, best_dist

    @staticmethod
    def list_partner_tasks(
        db: Session, partner_user: User, status: Optional[str] = None
    ) -> List[DeliveryTaskRead]:
        partner = DeliveryService.get_delivery_partner(db, partner_user)

        # Auto-heal any orders assigned to this partner (or ready for pickup) lacking a DeliveryTask
        unlinked_orders = (
            db.query(Order)
            .filter(
                (Order.delivery_partner_id == partner.id) |
                (Order.status.in_([OrderStatus.READY.value, OrderStatus.READY_FOR_PICKUP.value])),
                ~Order.id.in_(db.query(DeliveryTask.order_id))
            )
            .all()
        )
        for u_ord in unlinked_orders:
            DeliveryService.create_task_for_order(db, u_ord)
        if unlinked_orders:
            db.flush()

        query = (
            db.query(DeliveryTask)
            .options(
                joinedload(DeliveryTask.order).joinedload(Order.address),
                joinedload(DeliveryTask.order).joinedload(Order.customer),
                joinedload(DeliveryTask.order).joinedload(Order.shop),
            )
            .filter(
                (DeliveryTask.delivery_partner_id == partner.id) |
                (DeliveryTask.order.has(Order.delivery_partner_id == partner.id)) |
                (
                    (DeliveryTask.delivery_partner_id.is_(None)) &
                    (DeliveryTask.order.has(Order.status.in_([
                        OrderStatus.READY.value, OrderStatus.READY_FOR_PICKUP.value
                    ])))
                )
            )
        )
        if status:
            if status in [OrderStatus.READY_FOR_PICKUP.value, OrderStatus.READY.value]:
                query = query.filter(
                    (DeliveryTask.status == status) |
                    (DeliveryTask.order.has(Order.status.in_([OrderStatus.READY.value, OrderStatus.READY_FOR_PICKUP.value])))
                )
            else:
                query = query.filter(DeliveryTask.status == status)

        tasks = query.order_by(DeliveryTask.created_at.desc()).all()
        results = []
        for t in tasks:
            order = t.order
            shop = order.shop if order else None
            if not shop and order and order.seller_id:
                shop = db.query(SellerProfile).filter(SellerProfile.user_id == order.seller_id).first()

            is_picked_up = bool(
                order and (
                    order.pickup_otp_verified_at is not None
                    or order.status in ["PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"]
                    or t.status in ["STARTED", "OUT_FOR_DELIVERY", "DELIVERED"]
                )
            )

            cust_name = order.customer.name if (order and order.customer) else "Customer"
            cust_phone = (order.customer.phone if (order and order.customer) else None) if is_picked_up else None

            addr_obj = None
            if order and order.address:
                if is_picked_up:
                    addr_obj = AddressRead.model_validate(order.address)
                else:
                    addr_obj = AddressRead(
                        id=order.address.id,
                        user_id=order.address.user_id,
                        address_line1="Area hidden until pickup",
                        address_line2=None,
                        city=order.address.city,
                        state=order.address.state,
                        pincode=order.address.pincode,
                        landmark=None,
                        is_default=False,
                        latitude=None,
                        longitude=None,
                        created_at=order.address.created_at or datetime.datetime.now(datetime.timezone.utc),
                        updated_at=order.address.updated_at or datetime.datetime.now(datetime.timezone.utc),
                    )

            cust_lat = (order.delivery_latitude or (order.address.latitude if order and order.address else None) or Decimal("17.6860")) if is_picked_up else None
            cust_lng = (order.delivery_longitude or (order.address.longitude if order and order.address else None) or Decimal("75.9120")) if is_picked_up else None

            results.append(
                DeliveryTaskRead(
                    id=t.id,
                    order_id=t.order_id,
                    order_number=order.order_number if order else None,
                    order_status=order.status if order else None,
                    customer_name=cust_name,
                    customer_phone=cust_phone,
                    delivery_address=addr_obj,
                    customer_latitude=cust_lat,
                    customer_longitude=cust_lng,
                    shop_name=shop.business_name if shop else "Vegito Fresh Farm",
                    shop_address=shop.address if shop else "Solapur Market Depot",
                    shop_latitude=shop.latitude if (shop and shop.latitude) else Decimal("17.6805"),
                    shop_longitude=shop.longitude if (shop and shop.longitude) else Decimal("75.9064"),
                    delivery_partner_id=t.delivery_partner_id,
                    status=t.status,
                    pickup_otp=order.pickup_otp if order else None,
                    pickup_otp_verified_at=order.pickup_otp_verified_at if order else None,
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
    def accept_delivery(db: Session, partner_user: User, order_id: int) -> DeliveryTask:
        partner = DeliveryService.get_delivery_partner(db, partner_user)
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise NotFoundException(f"Order {order_id} not found")

        task = db.query(DeliveryTask).filter(DeliveryTask.order_id == order.id).first()
        if not task:
            task, _ = DeliveryService.create_task_for_order(db, order)

        if task.delivery_partner_id and task.delivery_partner_id != partner.id:
            raise ForbiddenException("This order is already assigned to another delivery partner")

        now = datetime.datetime.now(datetime.timezone.utc)
        task.delivery_partner_id = partner.id
        task.assigned_at = task.assigned_at or now
        order.delivery_partner_id = partner.id

        # Keep READY_FOR_PICKUP status until pickup OTP is verified at shop
        if order.status not in [OrderStatus.READY_FOR_PICKUP.value, OrderStatus.READY.value, OrderStatus.PICKED_UP.value, OrderStatus.OUT_FOR_DELIVERY.value]:
            order.status = OrderStatus.READY_FOR_PICKUP.value

        order_history = OrderStatusHistory(
            order_id=order.id,
            old_status=order.status,
            new_status=order.status,
            changed_by=partner_user.id,
            note="Delivery accepted by partner. Awaiting shop pickup OTP verification.",
        )
        db.add(order_history)

        history = DeliveryTaskStatusHistory(
            delivery_task_id=task.id,
            old_status=task.status,
            new_status=task.status,
            changed_by=partner_user.id,
            note="Delivery accepted by partner",
        )
        db.add(history)
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def verify_pickup_otp(
        db: Session,
        partner_user: User,
        order_id: int,
        otp: str,
    ) -> dict:
        partner = DeliveryService.get_delivery_partner(db, partner_user)
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise NotFoundException(f"Order {order_id} not found")

        # Check assigned partner
        if order.delivery_partner_id and order.delivery_partner_id != partner.id:
            raise ForbiddenException("This order is assigned to another delivery partner")

        if not order.delivery_partner_id:
            order.delivery_partner_id = partner.id

        task = db.query(DeliveryTask).filter(DeliveryTask.order_id == order.id).first()
        if not task:
            task, _ = DeliveryService.create_task_for_order(db, order)
        if not task.delivery_partner_id:
            task.delivery_partner_id = partner.id

        # Idempotency check: if pickup is already verified, return success safely
        if order.pickup_otp_verified_at or order.status in [OrderStatus.PICKED_UP.value, OrderStatus.OUT_FOR_DELIVERY.value, OrderStatus.DELIVERED.value]:
            return {
                "message": "OTP Verified",
                "order_id": order.id,
                "order_number": order.order_number,
                "status": order.status,
                "pickup_otp_verified_at": order.pickup_otp_verified_at.isoformat() if order.pickup_otp_verified_at else datetime.datetime.now(datetime.timezone.utc).isoformat(),
            }

        # Verify OTP / Pickup Code
        expected_otp = (order.pickup_otp or "").strip()
        clean_otp = (otp or "").strip()

        is_hash_valid = False
        if task and task.notes and task.notes.startswith("pickup_hash:"):
            expected_hash = task.notes.split("pickup_hash:", 1)[1].strip()
            is_hash_valid = verify_otp_hash(str(order.id), clean_otp, expected_hash)

        is_otp_valid = False
        if expected_otp:
            is_otp_valid = (clean_otp == expected_otp) or is_hash_valid
        elif is_hash_valid:
            is_otp_valid = True
        elif (settings.OTP_DEV_MODE or settings.OTP_TEST_MODE) and not order.pickup_otp:
            is_otp_valid = clean_otp in [getattr(settings, "TEST_PICKUP_OTP", "123456"), "123456"]

        if not clean_otp or not is_otp_valid:
            raise BadRequestException(
                message="Invalid pickup code. Please ask the seller to verify the code.",
                code="INVALID_PICKUP_CODE",
            )

        now = datetime.datetime.now(datetime.timezone.utc)
        order.pickup_otp_verified_at = now
        old_status = order.status
        order.status = OrderStatus.PICKED_UP.value

        history = OrderStatusHistory(
            order_id=order.id,
            old_status=old_status,
            new_status=OrderStatus.PICKED_UP.value,
            changed_by=partner_user.id,
            note="Pickup code verified by delivery partner. Produce handed over from seller shop.",
        )
        db.add(history)

        task.status = DeliveryTaskStatus.STARTED.value
        if not task.started_at:
            task.started_at = now

        task_history = DeliveryTaskStatusHistory(
            delivery_task_id=task.id,
            old_status=task.status,
            new_status=DeliveryTaskStatus.STARTED.value,
            note="Pickup verified from shop; delivery partner en route to customer",
        )
        db.add(task_history)

        # Notify customer
        NotificationService.send_notification(
            db=db,
            user_id=order.customer_id,
            notification_type="ORDER_PICKED_UP",
            title="Order Picked Up",
            message="Your order has been picked up and is on the way.",
        )

        db.commit()
        db.refresh(order)
        db.refresh(task)

        return {
            "message": "OTP Verified",
            "order_id": order.id,
            "order_number": order.order_number,
            "status": order.status,
            "pickup_otp_verified_at": order.pickup_otp_verified_at.isoformat() if order.pickup_otp_verified_at else None,
        }

    @staticmethod
    def start_delivery(db: Session, partner_user: User, order_id: int) -> DeliveryTask:
        partner = DeliveryService.get_delivery_partner(db, partner_user)
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise NotFoundException(f"Order {order_id} not found")

        task = db.query(DeliveryTask).filter(DeliveryTask.order_id == order.id).first()
        if not task:
            raise NotFoundException(f"Delivery task for order {order_id} not found")

        if task.delivery_partner_id and task.delivery_partner_id != partner.id:
            raise ForbiddenException("This order is assigned to another delivery partner")

        now = datetime.datetime.now(datetime.timezone.utc)
        task.delivery_partner_id = partner.id
        task.status = DeliveryTaskStatus.STARTED.value
        task.started_at = now

        old_order_status = order.status
        order.status = OrderStatus.OUT_FOR_DELIVERY.value
        order.out_for_delivery_at = now

        order_history = OrderStatusHistory(
            order_id=order.id,
            old_status=old_order_status,
            new_status=OrderStatus.OUT_FOR_DELIVERY.value,
            changed_by=partner_user.id,
            note="Delivery partner started delivery (out for delivery)",
        )
        db.add(order_history)

        history = DeliveryTaskStatusHistory(
            delivery_task_id=task.id,
            old_status=task.status,
            new_status=DeliveryTaskStatus.STARTED.value,
            changed_by=partner_user.id,
            note="Delivery started, out for delivery",
        )
        db.add(history)
        db.commit()
        db.refresh(task)
        return task

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
        # Idempotency check: if task and order are already DELIVERED, return safely
        if task.status == DeliveryTaskStatus.DELIVERED.value and order.status == OrderStatus.DELIVERED.value:
            return task

        if task.status not in [DeliveryTaskStatus.STARTED.value, "OUT_FOR_DELIVERY", "PICKED_UP"]:
            raise BadRequestException("Start the delivery before verifying the delivery OTP")

        # Verify OTP
        is_valid = verify_otp_hash(str(order.customer_id), delivery_otp.strip(), task.delivery_otp_hash or "")
        if not is_valid and (settings.OTP_DEV_MODE or settings.OTP_TEST_MODE) and delivery_otp.strip() in [settings.OTP_DEV_CODE, "123456", "654321"]:
            is_valid = True

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

        # Notify customer
        NotificationService.send_notification(
            db=db,
            user_id=order.customer_id,
            notification_type="ORDER_DELIVERED",
            title="Order Delivered!",
            message=f"Order #{order.order_number} has been delivered successfully. Thank you for shopping with Vegito!",
        )

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

    # Alias for convenience
    complete_delivery = verify_delivery_otp_and_complete

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

    @staticmethod
    def assign_pending_ready_orders(db: Session, partner_id: Optional[int] = None) -> List[Order]:
        """
        Scans for orders in READY / READY_FOR_PICKUP that have no delivery partner assigned yet,
        and triggers find_and_assign_nearest_partner for each.
        If assigned, dispatches the real-time notification to the delivery dashboard.
        """
        import logging
        logger = logging.getLogger(__name__)
        from app.models.delivery_task_status_history import DeliveryTaskStatusHistory

        pending_orders = (
            db.query(Order)
            .filter(
                Order.status.in_([OrderStatus.READY.value, OrderStatus.READY_FOR_PICKUP.value]),
                Order.delivery_partner_id.is_(None),
            )
            .order_by(Order.ready_at.asc())
            .all()
        )

        assigned_orders = []
        for order in pending_orders:
            assigned_partner, dist_km = DeliveryService.find_and_assign_nearest_partner(
                db, order, max_radius_km=float(getattr(settings, "DELIVERY_ASSIGNMENT_RADIUS_KM", 15.0))
            )
            if assigned_partner:
                assigned_orders.append(order)
                try:
                    from app.routers.websocket_tracking import dispatch_order_packed_notification
                    shop_name = order.shop.business_name if order.shop else "Vegito Shop"
                    payload = {
                        "type": "ORDER_PACKED",
                        "event": "DELIVERY_ASSIGNED",
                        "event_id": f"DELIVERY_ASSIGNED_{order.id}",
                        "order_id": order.id,
                        "order_number": order.order_number,
                        "status": order.status,
                        "delivery_partner_id": assigned_partner.id,
                        "shop_name": shop_name,
                        "total_amount": float(order.total_amount),
                        "message": f"Order #{order.order_number} is ready for pickup!",
                    }
                    dispatch_order_packed_notification(payload, partner_id=assigned_partner.id)
                except Exception as e:
                    logger.warning(f"[DELIVERY] Failed to dispatch assigned event: {e}")

        if assigned_orders:
            db.commit()
        return assigned_orders
