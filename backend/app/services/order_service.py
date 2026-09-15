import datetime
from decimal import Decimal
from typing import List, Optional, Tuple
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
from app.models.order_item import OrderItem
from app.schemas.order import OrderCreate, OrderRead, OrderDetailRead, OrderItemRead, OrderStatusHistoryRead
from app.schemas.address import AddressRead
from app.core.constants import OrderStatus, PaymentStatus, RoleEnum
from app.core.exceptions import BadRequestException, NotFoundException, ForbiddenException
from app.utils.helpers import generate_order_number, round_currency
from app.utils.pagination import PaginationParams
from app.services.inventory_service import InventoryService
from app.services.payment_service import PaymentService
from app.services.coupon_service import CouponService
from app.services.delivery_service import DeliveryService
from app.services.notification_service import NotificationService
from app.config import settings


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

        # Delivery charges: free above 300, else 30
        delivery_charge = Decimal("0.00") if subtotal >= Decimal("300.00") else Decimal("30.00")

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

        # Create Order
        order = Order(
            order_number=order_number,
            customer_id=user.id,
            address_id=order_in.address_id,
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

        # Send in-app notification
        NotificationService.send_notification(
            db=db,
            user_id=user.id,
            notification_type="ORDER_PLACED",
            title=f"Order Placed #{order.order_number}",
            message=f"Your order #{order.order_number} of ₹{order.total_amount} has been placed successfully.",
        )

        db.commit()
        db.refresh(order)

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
            )
            .filter(Order.id == order_id)
            .first()
        )
        if not order:
            raise NotFoundException(f"Order {order_id} not found")

        # Access check: customer can access only their own order unless admin/seller
        if user.role_id == 1 and order.customer_id != user.id:
            raise ForbiddenException("You do not have permission to view this order")

        detail = OrderDetailRead.model_validate(order)
        detail.items = [OrderItemRead.model_validate(i) for i in order.items]
        detail.status_history = [OrderStatusHistoryRead.model_validate(h) for h in order.status_history]
        detail.address = AddressRead.model_validate(order.address) if order.address else None
        detail.delivery_otp = raw_delivery_otp
        return detail

    @staticmethod
    def update_order_status(
        db: Session, user: User, order_id: int, new_status: str, note: Optional[str] = None
    ) -> Order:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise NotFoundException(f"Order {order_id} not found")

        if user.role_id == 2:
            seller_owns_order = (
                db.query(OrderItem)
                .join(SellerProduct, OrderItem.seller_product_id == SellerProduct.id)
                .filter(OrderItem.order_id == order.id, SellerProduct.seller_id == user.id)
                .first()
            )
            if not seller_owns_order:
                raise ForbiddenException("You do not have permission to update this order")

        allowed_transitions = {
            OrderStatus.NEW.value: {OrderStatus.ACCEPTED.value, OrderStatus.REJECTED.value},
            OrderStatus.ACCEPTED.value: {OrderStatus.PACKING.value, OrderStatus.REJECTED.value},
            OrderStatus.PACKING.value: {OrderStatus.READY.value},
            OrderStatus.READY.value: {OrderStatus.OUT_FOR_DELIVERY.value},
            OrderStatus.OUT_FOR_DELIVERY.value: {OrderStatus.DELIVERED.value},
        }
        if new_status not in allowed_transitions.get(order.status, set()):
            raise BadRequestException(f"Cannot change order from {order.status} to {new_status}")

        old_status = order.status
        now = datetime.datetime.now(datetime.timezone.utc)
        order.status = new_status

        if new_status == OrderStatus.ACCEPTED.value:
            order.accepted_at = now
        elif new_status == OrderStatus.PACKING.value:
            order.packed_at = now
        elif new_status == OrderStatus.READY.value:
            order.ready_at = now
        elif new_status == OrderStatus.OUT_FOR_DELIVERY.value:
            order.out_for_delivery_at = now
        elif new_status == OrderStatus.DELIVERED.value:
            order.delivered_at = now
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
