import datetime
from decimal import Decimal
import pytest
from app.models.user import User
from app.models.delivery_partner import DeliveryPartner
from app.models.order import Order
from app.models.address import Address
from app.models.product import Product
from app.models.seller_product import SellerProduct
from app.models.order_item import OrderItem
from app.services.order_service import OrderService
from app.services.delivery_service import DeliveryService
from app.core.exceptions import BadRequestException, ForbiddenException
from app.core.constants import OrderStatus


def test_order_packed_and_pickup_otp_flow(db):
    # 1. Setup users: customer, seller, delivery partner
    customer = User(role_id=1, name="Cust User", phone="9988776601", is_active=True)
    seller_user = User(role_id=2, name="Seller Farm", phone="9988776602", is_active=True)
    partner_user = User(role_id=3, name="Rider Dave", phone="9988776603", is_active=True)
    db.add_all([customer, seller_user, partner_user])
    db.flush()

    partner = DeliveryPartner(user_id=partner_user.id, is_available=True, is_verified=True)
    db.add(partner)
    db.flush()

    addr = Address(
        user_id=customer.id,
        address_line1="100 Green St",
        city="Solapur",
        state="Maharashtra",
        pincode="413001",
    )
    db.add(addr)
    db.flush()

    prod = Product(
        name="Fresh Spinach",
        category_id=1,
        unit="kg",
        is_active=True,
    )
    db.add(prod)
    db.flush()

    sp = SellerProduct(
        seller_id=seller_user.id,
        product_id=prod.id,
        price=Decimal("40.00"),
        stock_quantity=Decimal("50.00"),
        is_available=True,
    )
    db.add(sp)
    db.flush()

    order = Order(
        order_number="VG-PACK-101",
        customer_id=customer.id,
        seller_id=seller_user.id,
        delivery_partner_id=partner.id,
        address_id=addr.id,
        status=OrderStatus.NEW.value,
        total_amount=Decimal("80.00"),
    )
    db.add(order)
    db.flush()

    item = OrderItem(
        order_id=order.id,
        seller_product_id=sp.id,
        product_name="Fresh Spinach",
        unit="kg",
        quantity=Decimal("2.00"),
        unit_price=Decimal("40.00"),
        subtotal=Decimal("80.00"),
    )
    db.add(item)
    db.flush()

    # Seller accepts
    OrderService.update_order_status(db, seller_user, order.id, OrderStatus.ACCEPTED.value)
    assert order.status == OrderStatus.ACCEPTED.value

    # Seller moves order to PACKING
    OrderService.update_order_status(db, seller_user, order.id, OrderStatus.PACKING.value)
    assert order.status == OrderStatus.PACKING.value

    # Seller clicks Order Packed (moves to READY_FOR_PICKUP)
    OrderService.update_order_status(db, seller_user, order.id, OrderStatus.READY_FOR_PICKUP.value)
    assert order.status == OrderStatus.READY_FOR_PICKUP.value
    assert len(order.pickup_otp) == 6 and order.pickup_otp.isdigit()
    assert order.pickup_otp_created_at is not None

    # Seller clicks Order Packed twice -> Idempotent, no duplicate task, no new pickup code
    initial_code = order.pickup_otp
    order_twice = OrderService.update_order_status(db, seller_user, order.id, OrderStatus.READY_FOR_PICKUP.value)
    assert order_twice.pickup_otp == initial_code

    # Customer cannot see pickup_otp in order details
    cust_detail = OrderService.get_order_detail(db, customer, order.id)
    assert cust_detail.pickup_otp is None

    # Seller can see pickup_otp
    seller_detail = OrderService.get_order_detail(db, seller_user, order.id)
    assert seller_detail.pickup_otp == order.pickup_otp

    # Delivery Partner accepts delivery
    DeliveryService.accept_delivery(db, partner_user, order.id)
    assert order.status == OrderStatus.READY_FOR_PICKUP.value

    # Wrong OTP entered -> raises BadRequestException
    with pytest.raises(BadRequestException) as exc_wrong_otp:
        DeliveryService.verify_pickup_otp(db, partner_user, order.id, "999999")
    assert "invalid" in str(exc_wrong_otp.value).lower()

    # Correct OTP entered -> moves to PICKED_UP
    res = DeliveryService.verify_pickup_otp(db, partner_user, order.id, order.pickup_otp)
    assert res["message"] == "OTP Verified"
    assert res["status"] == OrderStatus.PICKED_UP.value
    assert order.status == OrderStatus.PICKED_UP.value
    assert order.pickup_otp_verified_at is not None


def test_delivery_dashboard_websocket_order_packed_notification(db, client):
    from app.services.jwt_service import create_access_token

    # 1. Setup users
    customer = User(role_id=1, name="Cust WS", phone="9988776611", is_active=True)
    seller = User(role_id=2, name="Seller WS", phone="9988776612", is_active=True)
    partner_user = User(role_id=3, name="Rider WS", phone="9988776613", is_active=True)
    db.add_all([customer, seller, partner_user])
    db.flush()

    partner = DeliveryPartner(user_id=partner_user.id, is_available=True, is_verified=True)
    db.add(partner)
    db.flush()

    addr = Address(user_id=customer.id, address_line1="123 Market St", city="Solapur", state="MH", pincode="413001")
    db.add(addr)
    db.flush()

    prod = Product(name="Tomatoes", category_id=1, unit="kg", is_active=True)
    db.add(prod)
    db.flush()

    sp = SellerProduct(seller_id=seller.id, product_id=prod.id, price=Decimal("30.00"), stock_quantity=Decimal("100"), is_available=True)
    db.add(sp)
    db.flush()

    order = Order(
        order_number="VG-WS-1024",
        customer_id=customer.id,
        seller_id=seller.id,
        delivery_partner_id=partner.id,
        address_id=addr.id,
        status=OrderStatus.PREPARING.value,
        total_amount=Decimal("60.00"),
    )
    db.add(order)
    db.flush()

    item = OrderItem(order_id=order.id, seller_product_id=sp.id, product_name="Tomatoes", unit="kg", quantity=Decimal("2.00"), unit_price=Decimal("30.00"), subtotal=Decimal("60.00"))
    db.add(item)
    db.flush()
    db.commit()

    token = create_access_token({"sub": str(partner_user.id), "role": "DELIVERY_PARTNER"})

    # Connect to delivery dashboard websocket
    with client.websocket_connect(f"/ws/delivery-dashboard?token={token}") as ws:
        ack = ws.receive_json()
        assert ack.get("type") == "connection_ack"
        assert ack.get("status") == "connected"

        # Seller clicks Order Packed
        OrderService.update_order_status(db, seller, order.id, OrderStatus.READY_FOR_PICKUP.value)

        # Delivery dashboard should receive real-time notification
        notif = ws.receive_json()
        assert notif.get("type") == "ORDER_PACKED"
        assert notif.get("order_id") == order.id
        assert notif.get("order_number") == "VG-WS-1024"
        assert notif.get("shop_name") is not None
        assert "packed" in notif.get("message", "").lower()

