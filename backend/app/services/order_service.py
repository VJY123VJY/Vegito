import datetime
from decimal import Decimal
from typing import List, Optional, Tuple
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload
from app.models.user import User
from app.models.order import Order
from app.models.order_status_history import OrderStatusHistory
from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.models.seller_product import SellerProduct
from app.models.product import Product
from app.models.customer_profile import CustomerProfile
from app.models.address import Address
from app.models.delivery_task import DeliveryTask
from app.models.delivery_partner import DeliveryPartner
from app.models.seller_profile import SellerProfile
from app.models.order_item import OrderItem
from app.schemas.order import OrderCreate, OrderRead, OrderDetailRead, OrderItemRead, OrderStatusHistoryRead
from app.schemas.address import AddressRead
from app.core.constants import OrderStatus, PaymentStatus, RoleEnum, DeliveryTaskStatus
from app.core.exceptions import BadRequestException, NotFoundException, ForbiddenException
from app.utils.helpers import generate_order_number, round_currency
from app.utils.pagination import PaginationParams
from app.services.inventory_service import InventoryService
from app.services.payment_service import PaymentService
from app.services.coupon_service import CouponService
from app.services.delivery_service import DeliveryService
from app.services.notification_service import NotificationService
from app.services.location_service import LocationService
from app.utils.otp import generate_pickup_otp, generate_pickup_code
from app.core.security import hash_otp
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class OrderService:
    @staticmethod
    def checkout(db: Session, user: User, order_in: OrderCreate) -> OrderDetailRead:
        """
        Executes an atomic checkout:
        1. Validates cart items.
        2. Reserves & commits inventory stock with row-level locks.
        3. Validates coupon.
        4. Calculates server-side financials.
        5. Creates order, order items snapshot, order status history, payment, delivery task.
        6. Clears customer cart.
        """
        cart = db.query(Cart).filter(Cart.user_id == user.id).first()
        if not cart:
            raise BadRequestException("Cart is empty.")

        cart_items = (
            db.query(CartItem)
            .options(
                joinedload(CartItem.seller_product).joinedload(SellerProduct.product)
            )
            .filter(CartItem.cart_id == cart.id)
            .all()
        )

        if not cart_items:
            raise BadRequestException("Your cart is empty. Please add products before checking out.")

        address = (
            db.query(Address)
            .filter(Address.id == order_in.address_id, Address.user_id == user.id)
            .first()
        )
        if not address:
            raise NotFoundException("Selected delivery address was not found.")
        if address.city.strip().casefold() != settings.SERVICE_CITY.casefold():
            raise BadRequestException(
                f"Vegito currently delivers only in {settings.SERVICE_CITY}."
            )

        subtotal = Decimal("0.00")
        items_to_create = []

        # Validate items and calculate server-side subtotal
        for item in cart_items:
            sp = item.seller_product
            product = sp.product if sp else None
            if not sp or not product or not sp.is_available or not product.is_active:
                raise BadRequestException(f"Item '{product.name if product else 'Unknown'}' is no longer available.")

            if item.quantity > sp.stock_quantity:
                raise BadRequestException(
                    f"Insufficient stock for '{product.name}'. Available: {sp.stock_quantity}, in cart: {item.quantity}."
                )

            item_subtotal = round_currency(sp.price * item.quantity)
            subtotal += item_subtotal

            items_to_create.append({
                "seller_product_id": sp.id,
                "product_name": product.name,
                "unit": product.unit,
                "quantity": item.quantity,
                "unit_price": sp.price,
                "subtotal": item_subtotal,
            })

        # Determine seller & shop info for order record
        from app.services.location_service import LocationService
        cust_lat, cust_lon = LocationService.resolve_address_coordinates(db, address)

        first_seller_id = cart_items[0].seller_product.seller_id if (cart_items and cart_items[0].seller_product) else None
        shop_id = None
        sp_prof = None
        if first_seller_id:
            sp_prof = (
                db.query(SellerProfile)
                .filter(or_(SellerProfile.user_id == first_seller_id, SellerProfile.id == first_seller_id))
                .first()
            )
            if sp_prof:
                shop_id = sp_prof.id
        if not sp_prof:
            sp_prof = db.query(SellerProfile).first()

        if not sp_prof:
            raise BadRequestException("No eligible seller found to fulfill this order.")

        # Enforce seller active status
        seller_user = db.query(User).filter(User.id == sp_prof.user_id).first()
        if not seller_user or not seller_user.is_active:
            raise BadRequestException("Seller account is currently inactive. Order cannot be placed.")

        # Enforce seller availability: block checkout if seller is OFFLINE
        if not sp_prof.is_available:
            raise BadRequestException(
                message="Seller is currently offline. Please try again later.",
                code="SELLER_OFFLINE",
                details={"message": "Seller is currently offline. Please try again later."}
            )

        # Resolve seller coordinates and check 1–15 km bounds
        s_lat, s_lon = LocationService.resolve_seller_coordinates(db, sp_prof.user_id)
        if s_lat is None or s_lon is None:
            raise BadRequestException(
                message="Seller location coordinates are not configured. Order cannot be routed.",
                code="SELLER_LOCATION_MISSING",
                details={"message": "Seller location coordinates are missing."}
            )

        seller_dist = LocationService.calculate_distance(cust_lat, cust_lon, s_lat, s_lon)
        is_in_bounds, bounds_msg = LocationService.is_within_delivery_bounds(seller_dist, max_km=20.0)
        if not is_in_bounds:
            out_msg = f"Sorry, this delivery address is outside our 20 KM delivery area. (Distance: {seller_dist:.1f} km)"
            raise BadRequestException(
                message=out_msg,
                code="DELIVERY_OUT_OF_RANGE",
                details={"distance": seller_dist, "max_distance": 20.0, "message": out_msg}
            )

        # Centralized Server-Side Distance-Based Delivery Fee (1–20 KM, >20 KM blocked)
        from app.services.delivery_pricing_service import DeliveryPricingService
        delivery_charge, delivery_distance_km = DeliveryPricingService.calculate_delivery_distance_and_fee(
            db=db,
            address_id=order_in.address_id,
            seller_id=sp_prof.user_id,
        )

        # Coupon validation
        discount_amount = Decimal("0.00")
        coupon_id = None
        if order_in.coupon_code:
            coupon, discount = CouponService.validate_and_calculate_discount(
                db, user, order_in.coupon_code, subtotal
            )
            discount_amount = discount
            coupon_id = coupon.id

        total_amount = round_currency(subtotal + delivery_charge - discount_amount)
        order_number = generate_order_number()

        full_delivery_address = f"{address.address_line1}, {address.address_line2 or ''}, {address.city}, {address.state} - {address.pincode}".replace(", ,", ",").strip()

        # Create Order
        order = Order(
            order_number=order_number,
            customer_id=user.id,
            address_id=order_in.address_id,
            seller_id=sp_prof.user_id,
            shop_id=sp_prof.id,
            delivery_latitude=Decimal(str(cust_lat)) if cust_lat is not None else address.latitude,
            delivery_longitude=Decimal(str(cust_lon)) if cust_lon is not None else address.longitude,
            customer_delivery_address=full_delivery_address,
            landmark=address.landmark,
            status=OrderStatus.NEW.value,
            payment_method=order_in.payment_method,
            payment_status=PaymentStatus.PENDING.value,
            subtotal=subtotal,
            delivery_charge=delivery_charge,
            discount_amount=discount_amount,
            total_amount=total_amount,
            delivery_slot_start=order_in.delivery_slot_start,

            delivery_slot_end=order_in.delivery_slot_end,
            customer_note=order_in.customer_note,
            placed_at=datetime.datetime.now(datetime.timezone.utc),
        )
        db.add(order)
        db.flush()

        # Create Order Items and deduct inventory atomically
        for it in items_to_create:
            order_item = OrderItem(
                order_id=order.id,
                seller_product_id=it["seller_product_id"],
                product_name=it["product_name"],
                unit=it["unit"],
                quantity=it["quantity"],
                unit_price=it["unit_price"],
                subtotal=it["subtotal"],
            )
            db.add(order_item)

            # Deduct stock and record inventory transaction
            InventoryService.commit_stock_deduction(
                db=db,
                seller_product_id=it["seller_product_id"],
                quantity=it["quantity"],
                reference_id=order.id,
                created_by=user.id,
            )

        # Record Coupon Usage if applied
        if coupon_id and discount_amount > 0:
            CouponService.record_usage(
                db=db,
                coupon_id=coupon_id,
                user_id=user.id,
                order_id=order.id,
                discount_amount=discount_amount,
            )

        # Create Seller Fulfillments (supports 1 seller today and N sellers in future)
        from app.services.seller_fulfillment_service import SellerFulfillmentService
        order_items_objs = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        SellerFulfillmentService.create_fulfillments_for_order(db=db, order=order, items=order_items_objs)


        # Initial Status History
        status_history = OrderStatusHistory(
            order_id=order.id,
            old_status=None,
            new_status=OrderStatus.NEW.value,
            changed_by=user.id,
            note="Order placed by customer",
        )
        db.add(status_history)

        # Payment record
        PaymentService.create_payment_record(
            db=db,
            order=order,
            payment_method=order_in.payment_method,
        )

        # Delivery task with secure OTP
        delivery_task, raw_delivery_otp = DeliveryService.create_task_for_order(db=db, order=order)

        # Clear cart
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()

        # Update customer profile order count
        profile = db.query(CustomerProfile).filter(CustomerProfile.user_id == user.id).first()
        if profile:
            profile.total_orders += 1

        # Send in-app notification to customer
        NotificationService.send_notification(
            db=db,
            user_id=user.id,
            notification_type="ORDER_PLACED",
            title=f"Order Placed #{order.order_number}",
            message=f"Your order #{order.order_number} of ₹{order.total_amount} has been placed successfully.",
        )

        # Send in-app notification to seller
        if order.seller_id:
            NotificationService.send_notification(
                db=db,
                user_id=order.seller_id,
                notification_type="NEW_ORDER",
                title=f"New Order #{order.order_number}",
                message=f"You received a new order #{order.order_number} for ₹{order.total_amount}.",
            )

        db.commit()
        db.refresh(order)
        logger.info(f"[ORDER] Created order={order.order_number} customer={user.id} subtotal={subtotal} delivery_charge={delivery_charge} total={order.total_amount}")

        # Dispatch real-time NEW_ORDER notification to Seller Dashboard
        if order.seller_id:
            try:
                from app.routers.websocket_tracking import dispatch_seller_new_order_notification
                items_summary = [
                    {"name": it["product_name"], "quantity": float(it["quantity"]), "unit": it["unit"]}
                    for it in items_to_create
                ]
                seller_payload = {
                    "type": "NEW_ORDER",
                    "event": "NEW_ORDER",
                    "event_id": f"ORDER_{order.id}_NEW",
                    "order_id": order.id,
                    "order_number": order.order_number,
                    "status": "NEW",
                    "customer_name": user.name or "Customer",
                    "items": items_summary,
                    "total_amount": float(order.total_amount),
                    "delivery_area": address.city if address else "Solapur",
                    "created_at": order.placed_at.isoformat() if order.placed_at else datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "message": f"New Order #{order.order_number} received!",
                }
                dispatch_seller_new_order_notification(seller_payload, seller_id=order.seller_id)
                if sp_prof and sp_prof.id != order.seller_id:
                    dispatch_seller_new_order_notification(seller_payload, seller_id=sp_prof.id)
                for f in fulfillments:
                    if f.seller_id not in [order.seller_id, getattr(sp_prof, "id", None)]:
                        dispatch_seller_new_order_notification(seller_payload, seller_id=f.seller_id)
            except Exception as notify_err:
                logger.warning(f"Could not dispatch seller NEW_ORDER notification: {notify_err}")

        return OrderService.get_order_detail(db, user, order.id, raw_delivery_otp=raw_delivery_otp)

    @staticmethod
    def list_customer_orders(
        db: Session, user: User, pagination: PaginationParams
    ) -> Tuple[List[OrderRead], int]:
        query = db.query(Order).filter(Order.customer_id == user.id)
        total_count = query.count()
        orders = (
            query.order_by(Order.placed_at.desc())
            .offset(pagination.offset)
            .limit(pagination.limit)
            .all()
        )

        results = [OrderRead.model_validate(o) for o in orders]
        # Security: Customer must never see pickup code
        for r in results:
            r.pickup_otp = None
        return results, total_count

    @staticmethod
    def get_order_detail(
        db: Session, user: User, order_id: int, raw_delivery_otp: Optional[str] = None
    ) -> OrderDetailRead:
        order = (
            db.query(Order)
            .options(
                joinedload(Order.address),
                joinedload(Order.items),
                joinedload(Order.status_history),
                joinedload(Order.delivery_task),
                joinedload(Order.seller),
                joinedload(Order.shop),
                joinedload(Order.delivery_partner).joinedload(DeliveryPartner.user),
            )
            .filter(Order.id == order_id)
            .first()
        )
        if not order:
            raise NotFoundException(f"Order {order_id} not found")

        # Access check
        if user.role_id == 1:
            if order.customer_id != user.id:
                raise ForbiddenException("You do not have permission to view this order")
        elif user.role_id == 2:
            # Seller check
            seller_owns = (order.seller_id == user.id) or any(
                item.seller_product and item.seller_product.seller_id == user.id for item in order.items
            )
            if not seller_owns and user.role_id not in [4, 5]:
                raise ForbiddenException("You do not have permission to view this order")
        elif user.role_id == 3:
            # Delivery partner check
            partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == user.id).first()
            if not partner:
                raise ForbiddenException("Delivery partner profile not found")
            if order.delivery_partner_id and order.delivery_partner_id != partner.id and user.role_id not in [4, 5]:
                raise ForbiddenException("This order is assigned to another delivery partner")

        detail = OrderDetailRead.model_validate(order)
        detail.items = [OrderItemRead.model_validate(i) for i in order.items]
        detail.status_history = [OrderStatusHistoryRead.model_validate(h) for h in order.status_history]

        # Populate shop info
        shop_prof = order.shop
        if not shop_prof and order.seller_id:
            shop_prof = db.query(SellerProfile).filter(SellerProfile.user_id == order.seller_id).first()
        if not shop_prof and order.items:
            first_sp = db.query(SellerProduct).filter(SellerProduct.id == order.items[0].seller_product_id).first()
            if first_sp:
                shop_prof = db.query(SellerProfile).filter(SellerProfile.user_id == first_sp.seller_id).first()

        if shop_prof:
            detail.shop_name = shop_prof.business_name
            detail.shop_address = shop_prof.address
            detail.shop_latitude = shop_prof.latitude
            detail.shop_longitude = shop_prof.longitude
            if (detail.shop_latitude is None or detail.shop_longitude is None) and order.seller_id:
                s_lat, s_lng = LocationService.resolve_seller_coordinates(db, order.seller_id, fallback_to_default=False)
                if s_lat is not None:
                    detail.shop_latitude = Decimal(str(s_lat))
                if s_lng is not None:
                    detail.shop_longitude = Decimal(str(s_lng))
        else:
            detail.shop_name = "Vegito Fresh Farm"
            detail.shop_address = None
            detail.shop_latitude = None
            detail.shop_longitude = None

        cust_user = db.query(User).filter(User.id == order.customer_id).first()
        detail.customer_name = cust_user.name if cust_user else "Customer"

        # Delivery partner info
        dp = order.delivery_partner
        if not dp and order.delivery_task and order.delivery_task.delivery_partner_id:
            dp = db.query(DeliveryPartner).filter(DeliveryPartner.id == order.delivery_task.delivery_partner_id).first()
        if dp and dp.user:
            detail.delivery_partner_name = dp.user.name or "Delivery Partner"
            detail.delivery_partner_phone = dp.user.phone

        # Determine pickup verification state
        is_picked_up = bool(
            order.pickup_otp_verified_at is not None
            or (order.delivery_task and getattr(order.delivery_task, "pickup_verified", False))
            or order.status in [OrderStatus.PICKED_UP.value, OrderStatus.OUT_FOR_DELIVERY.value, OrderStatus.DELIVERED.value]
        )

        # ROLE-BASED PRIVACY & ACCESS CONTROLS
        if user.role_id == 2:
            # SELLER: Never receive customer exact delivery address, coordinates, or phone
            detail.address = None
            detail.customer_latitude = None
            detail.customer_longitude = None
            detail.delivery_latitude = None
            detail.delivery_longitude = None
            detail.customer_phone = None
            detail.delivery_otp = None
            # Seller only receives pickup_otp when order is READY or later
            if order.status in [
                OrderStatus.READY.value,
                OrderStatus.READY_FOR_PICKUP.value,
                OrderStatus.PICKED_UP.value,
                OrderStatus.OUT_FOR_DELIVERY.value,
                OrderStatus.DELIVERED.value,
            ]:
                detail.pickup_otp = order.pickup_otp
            else:
                detail.pickup_otp = None

        elif user.role_id == 3:
            # DELIVERY PARTNER: Pickup OTP is NEVER revealed in API response (must receive from seller at shop)
            detail.pickup_otp = None
            detail.delivery_otp = None

            if is_picked_up:
                # UNLOCKED after pickup verification
                detail.customer_name = cust_user.name if cust_user else "Customer"
                detail.address = AddressRead.model_validate(order.address) if order.address else None
                detail.customer_latitude = order.delivery_latitude if order.delivery_latitude is not None else (order.address.latitude if order.address else None)
                detail.customer_longitude = order.delivery_longitude if order.delivery_longitude is not None else (order.address.longitude if order.address else None)
                detail.customer_phone = cust_user.phone if cust_user else None
            else:
                # LOCKED / HIDDEN before pickup verification
                detail.customer_name = None
                detail.address = None
                detail.customer_latitude = None
                detail.customer_longitude = None
                detail.delivery_latitude = None
                detail.delivery_longitude = None
                detail.customer_phone = None

        elif user.role_id == 1:
            # CUSTOMER: Sees own address and doorstep delivery OTP; NEVER sees pickup OTP
            detail.address = AddressRead.model_validate(order.address) if order.address else None
            detail.customer_latitude = order.delivery_latitude if order.delivery_latitude is not None else (order.address.latitude if order.address else None)
            detail.customer_longitude = order.delivery_longitude if order.delivery_longitude is not None else (order.address.longitude if order.address else None)
            detail.customer_phone = cust_user.phone if cust_user else None
            detail.pickup_otp = None

            if raw_delivery_otp:
                detail.delivery_otp = raw_delivery_otp
            elif order.delivery_task and order.delivery_task.notes and "doorstep_otp:" in order.delivery_task.notes:
                try:
                    detail.delivery_otp = order.delivery_task.notes.split("doorstep_otp:", 1)[1].split()[0].strip()
                except Exception:
                    detail.delivery_otp = None
            else:
                detail.delivery_otp = None

        else:
            # Admin / Superadmin
            detail.address = AddressRead.model_validate(order.address) if order.address else None
            detail.customer_latitude = order.delivery_latitude or (order.address.latitude if order.address else Decimal("17.6860"))
            detail.customer_longitude = order.delivery_longitude or (order.address.longitude if order.address else Decimal("75.9120"))
            detail.customer_phone = cust_user.phone if cust_user else None
            detail.pickup_otp = order.pickup_otp

        return detail

    @staticmethod
    def update_order_status(
        db: Session, user: User, order_id: int, new_status: str, note: Optional[str] = None
    ) -> Order:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise NotFoundException(f"Order {order_id} not found")

        # Permission check
        if user.role_id == 2:
            seller_owns_order = (
                (order.seller_id == user.id)
                or db.query(OrderItem)
                .join(SellerProduct, OrderItem.seller_product_id == SellerProduct.id)
                .filter(OrderItem.order_id == order.id, SellerProduct.seller_id == user.id)
                .first()
            )
            if not seller_owns_order:
                raise ForbiddenException("You do not have permission to update this order")
        elif user.role_id == 3:
            # Delivery partner can only update their assigned orders or active deliveries
            partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == user.id).first()
            if not partner:
                raise ForbiddenException("Delivery partner profile not found")
            if order.delivery_partner_id and order.delivery_partner_id != partner.id:
                raise ForbiddenException("This order is assigned to another delivery partner")

        allowed_transitions = {
            OrderStatus.NEW.value: {
                OrderStatus.ACCEPTED.value, OrderStatus.SELLER_ACCEPTED.value,
                OrderStatus.REJECTED.value, OrderStatus.CANCELLED.value
            },
            OrderStatus.ORDER_PLACED.value: {
                OrderStatus.ACCEPTED.value, OrderStatus.SELLER_ACCEPTED.value,
                OrderStatus.REJECTED.value, OrderStatus.CANCELLED.value
            },
            OrderStatus.ACCEPTED.value: {
                OrderStatus.PACKING.value, OrderStatus.PREPARING.value,
                OrderStatus.READY.value, OrderStatus.READY_FOR_PICKUP.value,
                OrderStatus.REJECTED.value, OrderStatus.CANCELLED.value
            },
            OrderStatus.SELLER_ACCEPTED.value: {
                OrderStatus.PACKING.value, OrderStatus.PREPARING.value,
                OrderStatus.READY.value, OrderStatus.READY_FOR_PICKUP.value,
                OrderStatus.REJECTED.value, OrderStatus.CANCELLED.value
            },
            OrderStatus.PACKING.value: {
                OrderStatus.READY.value, OrderStatus.READY_FOR_PICKUP.value
            },
            OrderStatus.PREPARING.value: {
                OrderStatus.READY.value, OrderStatus.READY_FOR_PICKUP.value
            },
            OrderStatus.READY.value: {
                OrderStatus.PICKED_UP.value, OrderStatus.OUT_FOR_DELIVERY.value
            },
            OrderStatus.READY_FOR_PICKUP.value: {
                OrderStatus.PICKED_UP.value, OrderStatus.OUT_FOR_DELIVERY.value
            },
            OrderStatus.PICKED_UP.value: {
                OrderStatus.OUT_FOR_DELIVERY.value, OrderStatus.DELIVERED.value
            },
            OrderStatus.OUT_FOR_DELIVERY.value: {
                OrderStatus.DELIVERED.value
            },
        }
        if order.status in [OrderStatus.READY.value, OrderStatus.READY_FOR_PICKUP.value] and new_status in [OrderStatus.READY.value, OrderStatus.READY_FOR_PICKUP.value]:
            logger.info(f"[SELLER] Order #{order.order_number} is already in READY state. Idempotent return without duplicate assignment.")
            return order

        if new_status not in allowed_transitions.get(order.status, set()):
            raise BadRequestException(f"Cannot change order from {order.status} to {new_status}")

        old_status = order.status
        now = datetime.datetime.now(datetime.timezone.utc)
        order.status = new_status

        if new_status in [OrderStatus.ACCEPTED.value, OrderStatus.SELLER_ACCEPTED.value]:
            order.accepted_at = now
            logger.info(f"[SELLER] Order accepted order={order.order_number}")
        elif new_status in [OrderStatus.PACKING.value, OrderStatus.PREPARING.value]:
            order.packed_at = now
            logger.info(f"[SELLER] Packing order={order.order_number}")
        elif new_status in [OrderStatus.READY.value, OrderStatus.READY_FOR_PICKUP.value]:
            order.ready_at = now
            if not order.pickup_otp:
                pickup_code = generate_pickup_code(6)
                order.pickup_otp = pickup_code
                order.pickup_otp_created_at = now
            else:
                pickup_code = order.pickup_otp
            order.pickup_otp_hash = hash_otp(str(order.id), pickup_code)
            order.pickup_otp_expires_at = now + datetime.timedelta(minutes=30)
            order.pickup_otp_attempts = 0
            order.pickup_otp_max_attempts = 5
            logger.info(f"[SELLER] Marked ready order={order.order_number} pickup_code_ready=True")

            # Assign nearest eligible delivery partner within 1-15 KM of seller shop
            from app.services.delivery_service import DeliveryService
            from app.models.delivery_task_status_history import DeliveryTaskStatusHistory
            if not order.delivery_partner_id:
                assigned_partner, dist_km = DeliveryService.find_and_assign_nearest_partner(db, order, max_radius_km=20.0)
                if assigned_partner:
                    logger.info(f"Assigned partner {assigned_partner.id} to order {order.id} (distance {dist_km} km)")
                else:
                    logger.info(f"No available delivery partner within 1-20 km radius for order {order.id}. Order remains READY awaiting partner.")

            # Store pickup code hash into task notes for verification while preserving any doorstep OTP
            task = db.query(DeliveryTask).filter(DeliveryTask.order_id == order.id).first()
            if not task:
                task, _ = DeliveryService.create_task_for_order(db, order)
            if task:
                if order.delivery_partner_id and task.delivery_partner_id != order.delivery_partner_id:
                    task.delivery_partner_id = order.delivery_partner_id
                    task.status = DeliveryTaskStatus.ASSIGNED.value
                    db.add(DeliveryTaskStatusHistory(
                        delivery_task_id=task.id,
                        old_status=None,
                        new_status=DeliveryTaskStatus.ASSIGNED.value,
                        note="Assigned to nearest eligible partner within 1-15 km",
                    ))
                task.notes = f"pickup_hash:{order.pickup_otp_hash}"
        elif new_status in [OrderStatus.OUT_FOR_DELIVERY.value, OrderStatus.PICKED_UP.value]:
            order.out_for_delivery_at = now
        elif new_status == OrderStatus.DELIVERED.value:
            order.delivered_at = now
            if order.payment_method == "COD":
                order.payment_status = PaymentStatus.PAID.value
        elif new_status in [OrderStatus.CANCELLED.value, OrderStatus.REJECTED.value]:
            order.cancelled_at = now

        history = OrderStatusHistory(
            order_id=order.id,
            old_status=old_status,
            new_status=new_status,
            changed_by=user.id,
            note=note,
        )
        db.add(history)

        # Notify customer
        NotificationService.send_notification(
            db=db,
            user_id=order.customer_id,
            notification_type=f"ORDER_{new_status}",
            title=f"Order {new_status.replace('_', ' ').title()}",
            message=f"Order #{order.order_number} status updated to {new_status}.",
        )

        db.commit()
        db.refresh(order)

        # Dispatch real-time DELIVERY_ASSIGNED / ORDER_PACKED notification to Delivery Partner Dashboard
        if new_status in [OrderStatus.READY.value, OrderStatus.READY_FOR_PICKUP.value]:
            logger.info(
                f"[ORDER_READY] order_id={order.id} order_number={order.order_number} "
                f"delivery_partner_id={order.delivery_partner_id} pickup_otp_set={bool(order.pickup_otp)}"
            )
            try:
                from app.routers.websocket_tracking import dispatch_order_packed_notification
                shop_prof = order.shop or (db.query(SellerProfile).filter(SellerProfile.user_id == order.seller_id).first() if order.seller_id else None)
                shop_name = shop_prof.business_name if shop_prof else "Vegito Fresh Farm"
                task_id = order.delivery_task.id if order.delivery_task else None
                if not task_id:
                    task_rec = db.query(DeliveryTask).filter(DeliveryTask.order_id == order.id).first()
                    task_id = task_rec.id if task_rec else order.id
                payload = {
                    "type": "ORDER_PACKED",
                    "event": "DELIVERY_ASSIGNED",
                    "event_id": f"DELIVERY_ASSIGNED_{task_id}",
                    "order_id": order.id,
                    "order_number": order.order_number,
                    "status": order.status,
                    "otp": order.pickup_otp or "",
                    "pickup_code": order.pickup_otp or "",
                    "delivery_partner_id": order.delivery_partner_id,
                    "delivery_task_id": task_id,
                    "shop_name": shop_name,
                    "total_amount": float(order.total_amount),
                    "message": f"Order {order.order_number} is packed and ready for pickup. Go to seller shop.",
                }
                logger.info(
                    f"[DELIVERY_EVENT_PUBLISHED] event=DELIVERY_ASSIGNED "
                    f"order_id={order.id} task_id={task_id} "
                    f"delivery_partner_id={order.delivery_partner_id} shop={shop_name}"
                )
                dispatch_order_packed_notification(payload, partner_id=order.delivery_partner_id)
            except Exception as notify_err:
                logger.warning(f"Could not dispatch DELIVERY_ASSIGNED / ORDER_PACKED notification: {notify_err}")

        return order

    @staticmethod
    def reorder(db: Session, user: User, order_id: int) -> bool:
        """Adds all active items from a previous order into the current cart."""
        order = db.query(Order).filter(Order.id == order_id, Order.customer_id == user.id).first()
        if not order:
            raise NotFoundException(f"Order {order_id} not found")

        cart = db.query(Cart).filter(Cart.user_id == user.id).first()
        if not cart:
            cart = Cart(user_id=user.id)
            db.add(cart)
            db.flush()

        for item in order.items:
            if item.seller_product_id:
                sp = db.query(SellerProduct).filter(SellerProduct.id == item.seller_product_id).first()
                if sp and sp.is_available:
                    existing = (
                        db.query(CartItem)
                        .filter(CartItem.cart_id == cart.id, CartItem.seller_product_id == sp.id)
                        .first()
                    )
                    if existing:
                        existing.quantity += item.quantity
                    else:
                        db.add(CartItem(cart_id=cart.id, seller_product_id=sp.id, quantity=item.quantity))

        db.commit()
        return True
