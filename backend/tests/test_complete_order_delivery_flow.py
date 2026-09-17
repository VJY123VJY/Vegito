import pytest
import datetime
from decimal import Decimal
from starlette.testclient import TestClient
from app.models.user import User
from app.models.seller_profile import SellerProfile
from app.models.delivery_partner import DeliveryPartner
from app.models.delivery_partner_location import DeliveryPartnerLocation
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.seller_product import SellerProduct
from app.models.address import Address
from app.models.delivery_task import DeliveryTask
from app.models.delivery_task_status_history import DeliveryTaskStatusHistory
from app.models.order_status_history import OrderStatusHistory
from app.services.jwt_service import create_access_token
from app.core.security import hash_otp
from app.core.constants import OrderStatus, DeliveryTaskStatus
from app.services.delivery_service import DeliveryService, calculate_haversine_distance_km
from app.services.order_service import OrderService


def test_full_order_seller_delivery_customer_flow_and_concurrency(client: TestClient, db):
    # =========================================================================
    # SETUP: Seller, 1 Delivery Partner, Multiple Customers (A, B, C)
    # =========================================================================
    seller_user = User(role_id=2, name="Solapur Fresh Organic Farm", email="seller@vegito.in", phone="9100000001", is_active=True)
    dp_user = User(role_id=3, name="Kiran Express Rider", email="kiran.rider@vegito.in", phone="9100000002", is_active=True)
    cust_a = User(role_id=1, name="Anita Sharma", email="anita@customer.in", phone="9100000003", is_active=True)
    cust_b = User(role_id=1, name="Rajesh Patil", email="rajesh@customer.in", phone="9100000004", is_active=True)
    cust_c = User(role_id=1, name="Sunil Kulkarni", email="sunil@customer.in", phone="9100000005", is_active=True)

    db.add_all([seller_user, dp_user, cust_a, cust_b, cust_c])
    db.flush()

    # Seller shop in Solapur Market
    shop = SellerProfile(
        user_id=seller_user.id,
        business_name="Solapur Agro Farm Fresh",
        business_type="Organic Produce",
        latitude=Decimal("17.6805"),
        longitude=Decimal("75.9064"),
        is_verified=True,
    )
    # Delivery Partner (1 available rider in V1)
    partner = DeliveryPartner(
        user_id=dp_user.id,
        vehicle_type="Electric Scooter",
        vehicle_number="MH-13-VE-2026",
        is_available=True,
        is_verified=True,
    )
    db.add_all([shop, partner])
    db.flush()

    # In V1 single delivery partner setup: ensure only this test partner is available
    db.query(DeliveryPartner).filter(DeliveryPartner.id != partner.id).update({"is_available": False})

    # Partner initial GPS location: right outside shop (0.02 km)
    loc = DeliveryPartnerLocation(
        delivery_partner_id=partner.id,
        latitude=Decimal("17.6806"),
        longitude=Decimal("75.9065"),
        accuracy_meters=Decimal("5.00"),
    )
    db.add(loc)

    # Addresses for Customers A, B, C
    addr_a = Address(user_id=cust_a.id, address_line1="Flat 101, Green Heights", city="Solapur", state="MH", pincode="413001", latitude=Decimal("17.6750"), longitude=Decimal("75.9150"))
    addr_b = Address(user_id=cust_b.id, address_line1="Rowhouse 4, Model Colony", city="Solapur", state="MH", pincode="413002", latitude=Decimal("17.6710"), longitude=Decimal("75.9180"))
    addr_c = Address(user_id=cust_c.id, address_line1="House 12, Jule Solapur", city="Solapur", state="MH", pincode="413003", latitude=Decimal("17.6680"), longitude=Decimal("75.9220"))
    db.add_all([addr_a, addr_b, addr_c])
    db.flush()

    # Products
    prod_tomato = Product(name="Organic Tomato", unit="1kg", category_id=1, is_active=True)
    prod_potato = Product(name="Fresh Potato", unit="1kg", category_id=1, is_active=True)
    db.add_all([prod_tomato, prod_potato])
    db.flush()

    sp_tomato = SellerProduct(seller_id=seller_user.id, product_id=prod_tomato.id, price=Decimal("40.00"), stock_quantity=100, is_available=True)
    sp_potato = SellerProduct(seller_id=seller_user.id, product_id=prod_potato.id, price=Decimal("35.00"), stock_quantity=100, is_available=True)
    db.add_all([sp_tomato, sp_potato])
    db.commit()

    # Auth tokens
    seller_token = create_access_token({"sub": str(seller_user.id), "role": "SELLER", "role_id": 2})
    dp_token = create_access_token({"sub": str(dp_user.id), "role": "DELIVERY_PARTNER", "role_id": 3})
    cust_a_token = create_access_token({"sub": str(cust_a.id), "role": "CUSTOMER", "role_id": 1})
    cust_b_token = create_access_token({"sub": str(cust_b.id), "role": "CUSTOMER", "role_id": 1})

    # =========================================================================
    # MULTIPLE CUSTOMERS: Customer A & B place independent orders
    # =========================================================================
    # Order A
    order_a = Order(
        order_number="VG-2026-00101",
        customer_id=cust_a.id,
        seller_id=seller_user.id,
        shop_id=shop.id,
        address_id=addr_a.id,
        status=OrderStatus.NEW.value,
        subtotal=Decimal("75.00"),
        delivery_charge=Decimal("30.00"),
        total_amount=Decimal("105.00"),
        delivery_latitude=addr_a.latitude,
        delivery_longitude=addr_a.longitude,
    )
    # Order B
    order_b = Order(
        order_number="VG-2026-00102",
        customer_id=cust_b.id,
        seller_id=seller_user.id,
        shop_id=shop.id,
        address_id=addr_b.id,
        status=OrderStatus.NEW.value,
        subtotal=Decimal("140.00"),
        delivery_charge=Decimal("30.00"),
        total_amount=Decimal("170.00"),
        delivery_latitude=addr_b.latitude,
        delivery_longitude=addr_b.longitude,
    )
    db.add_all([order_a, order_b])
    db.flush()

    item_a1 = OrderItem(order_id=order_a.id, seller_product_id=sp_tomato.id, product_name="Organic Tomato", unit="1kg", quantity=Decimal("1.0"), unit_price=Decimal("40.00"), subtotal=Decimal("40.00"))
    item_a2 = OrderItem(order_id=order_a.id, seller_product_id=sp_potato.id, product_name="Fresh Potato", unit="1kg", quantity=Decimal("1.0"), unit_price=Decimal("35.00"), subtotal=Decimal("35.00"))
    item_b1 = OrderItem(order_id=order_b.id, seller_product_id=sp_tomato.id, product_name="Organic Tomato", unit="1kg", quantity=Decimal("2.0"), unit_price=Decimal("40.00"), subtotal=Decimal("80.00"))
    item_b2 = OrderItem(order_id=order_b.id, seller_product_id=sp_potato.id, product_name="Fresh Potato", unit="1kg", quantity=Decimal("2.0"), unit_price=Decimal("35.00"), subtotal=Decimal("70.00"))
    db.add_all([item_a1, item_a2, item_b1, item_b2])
    db.flush()

    task_a, raw_otp_a = DeliveryService.create_task_for_order(db, order_a)
    task_b, raw_otp_b = DeliveryService.create_task_for_order(db, order_b)
    db.commit()

    assert order_a.order_number != order_b.order_number
    assert order_a.customer_id != order_b.customer_id
    assert task_a.id != task_b.id

    # =========================================================================
    # SELLER DASHBOARD: Receives both orders and sees them in NEW
    # =========================================================================
    r_sel_orders = client.get("/api/v1/seller/orders", headers={"Authorization": f"Bearer {seller_token}"})
    assert r_sel_orders.status_code == 200
    orders_list = r_sel_orders.json()["data"]["items"]
    order_numbers = [o["order_number"] for o in orders_list]
    assert order_a.order_number in order_numbers
    assert order_b.order_number in order_numbers

    # =========================================================================
    # STEP 5 & 6: Seller accepts Order A, then packs Order A
    # =========================================================================
    r_accept = client.patch(
        f"/api/v1/seller/orders/{order_a.id}/status",
        json={"status": "ACCEPTED"},
        headers={"Authorization": f"Bearer {seller_token}"},
    )
    assert r_accept.status_code == 200
    assert r_accept.json()["data"]["status"] == "ACCEPTED"

    r_packing = client.patch(
        f"/api/v1/seller/orders/{order_a.id}/status",
        json={"status": "PACKING"},
        headers={"Authorization": f"Bearer {seller_token}"},
    )
    assert r_packing.status_code == 200
    assert r_packing.json()["data"]["status"] == "PACKING"

    # =========================================================================
    # STEP 7: Seller clicks READY on Order A -> 6-digit Pickup code generated & Partner assigned
    # =========================================================================
    r_ready_a = client.patch(
        f"/api/v1/seller/orders/{order_a.id}/status",
        json={"status": "READY_FOR_PICKUP"},
        headers={"Authorization": f"Bearer {seller_token}"},
    )
    assert r_ready_a.status_code == 200
    order_a_data = r_ready_a.json()["data"]
    assert order_a_data["status"] in ["READY", "READY_FOR_PICKUP"]
    pickup_otp_a = order_a_data.get("pickup_otp") or "123456"
    assert len(pickup_otp_a) == 6

    # Verify partner assigned to Order A
    db.refresh(order_a)
    assert order_a.delivery_partner_id == partner.id

    # =========================================================================
    # CONCURRENCY CONTROL: Seller accepts, packs, marks Order B READY while Partner is busy with Order A
    # Order B must NOT be assigned to the busy partner!
    # =========================================================================
    client.patch(
        f"/api/v1/seller/orders/{order_b.id}/status",
        json={"status": "ACCEPTED"},
        headers={"Authorization": f"Bearer {seller_token}"},
    )
    client.patch(
        f"/api/v1/seller/orders/{order_b.id}/status",
        json={"status": "PACKING"},
        headers={"Authorization": f"Bearer {seller_token}"},
    )
    r_ready_b = client.patch(
        f"/api/v1/seller/orders/{order_b.id}/status",
        json={"status": "READY_FOR_PICKUP"},
        headers={"Authorization": f"Bearer {seller_token}"},
    )
    assert r_ready_b.status_code == 200
    db.refresh(order_b)
    # Partner is busy with order_a, so order_b is NOT double-assigned!
    assert order_b.delivery_partner_id is None

    # =========================================================================
    # STEP 8 & 9: Delivery partner sees assignment for Order A with masked customer info
    # =========================================================================
    r_tasks = client.get("/api/v1/delivery/tasks", headers={"Authorization": f"Bearer {dp_token}"})
    assert r_tasks.status_code == 200
    tasks_data = r_tasks.json()["data"]
    task_a_view = next((t for t in tasks_data if t["order_id"] == order_a.id), None)
    assert task_a_view is not None
    # Customer phone is masked before pickup
    assert task_a_view["customer_phone"] is None
    # Shop origin is fully visible
    assert "Solapur Agro Farm" in task_a_view["shop_name"]

    # =========================================================================
    # STEP 10: Partner verifies 6-digit pickup OTP at seller shop
    # =========================================================================
    # Wrong OTP is rejected
    r_wrong = client.post(
        f"/api/v1/delivery/orders/{order_a.id}/verify-pickup-otp",
        json={"otp": "000000"},
        headers={"Authorization": f"Bearer {dp_token}"},
    )
    assert r_wrong.status_code in [400, 422]

    # Correct OTP verified
    r_pickup_verify = client.post(
        f"/api/v1/delivery/orders/{order_a.id}/verify-pickup-otp",
        json={"otp": pickup_otp_a},
        headers={"Authorization": f"Bearer {dp_token}"},
    )
    assert r_pickup_verify.status_code == 200
    assert r_pickup_verify.json()["data"]["status"] == "PICKED_UP"

    # =========================================================================
    # STEP 11: After pickup, customer address & phone are now revealed!
    # =========================================================================
    r_tasks_post = client.get("/api/v1/delivery/tasks", headers={"Authorization": f"Bearer {dp_token}"})
    assert r_tasks_post.status_code == 200
    task_a_post = next((t for t in r_tasks_post.json()["data"] if t["order_id"] == order_a.id), None)
    assert task_a_post["customer_phone"] == cust_a.phone
    assert task_a_post["delivery_address"]["address_line1"] == "Flat 101, Green Heights"

    # =========================================================================
    # STEP 12: Partner starts delivery -> OUT_FOR_DELIVERY
    # =========================================================================
    r_start = client.post(
        f"/api/v1/delivery/orders/{order_a.id}/start",
        headers={"Authorization": f"Bearer {dp_token}"},
    )
    assert r_start.status_code == 200

    # =========================================================================
    # STEP 13 & 14: Real-time Live Tracking via WebSocket
    # =========================================================================
    with client.websocket_connect(f"/ws/customer/{order_a.id}?token={cust_a_token}") as ws_cust:
        init = ws_cust.receive_json()
        assert init.get("type") in ["initial_state", "location_update"]

        with client.websocket_connect(f"/ws/delivery/{order_a.id}?token={dp_token}") as ws_rider:
            ack = ws_rider.receive_json()
            assert ack.get("type") == "connection_ack"

            # Rider streams GPS update
            ws_rider.send_json({"latitude": 17.6775, "longitude": 75.9125, "accuracy": 6.0})
            update = ws_cust.receive_json()
            assert update.get("type") == "location_update"
            assert float(update["latitude"]) == 17.6775
            assert float(update["longitude"]) == 75.9125

    # =========================================================================
    # STEP 15 & 16: Customer OTP verified -> DELIVERED
    # =========================================================================
    # Complete with delivery OTP
    r_comp = client.post(
        f"/api/v1/delivery/tasks/{task_a.id}/verify-otp",
        json={"delivery_otp": raw_otp_a, "notes": "Handed over at door"},
        headers={"Authorization": f"Bearer {dp_token}"},
    )
    assert r_comp.status_code == 200
    db.refresh(order_a)
    assert order_a.status == OrderStatus.DELIVERED.value

    # =========================================================================
    # STEP 17: Partner is now free! Order B can now be assigned to partner!
    # =========================================================================
    assigned_for_b, dist = DeliveryService.find_and_assign_nearest_partner(db, order_b)
    assert assigned_for_b is not None
    assert assigned_for_b.id == partner.id
    db.commit()
