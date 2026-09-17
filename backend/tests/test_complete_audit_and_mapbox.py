import pytest
import datetime
from decimal import Decimal
from starlette.testclient import TestClient
from app.models.user import User
from app.models.seller_profile import SellerProfile
from app.models.delivery_partner import DeliveryPartner
from app.models.order import Order
from app.models.product import Product
from app.models.seller_product import SellerProduct
from app.models.review import Review
from app.models.complaint import Complaint
from app.models.address import Address
from app.models.delivery_task import DeliveryTask
from app.models.notification import Notification
from app.services.jwt_service import create_access_token
from app.core.security import hash_otp


def test_complete_audit_and_mapbox_live_tracking(client: TestClient, db):
    # 1. Setup users
    cust = User(role_id=1, name="Sunita Rao", email="sunita@vegito.in", phone="9988001101", is_active=True)
    sel = User(role_id=2, name="Solapur Agro Farm", email="agro@vegito.in", phone="9988001102", is_active=True)
    rider = User(role_id=3, name="Kiran Jadhav", email="kiran@vegito.in", phone="9988001103", is_active=True)
    db.add_all([cust, sel, rider])
    db.flush()

    sp = SellerProfile(
        user_id=sel.id,
        business_name="Solapur Agro Farm Fresh",
        business_type="Organic Farm",
    )
    dp = DeliveryPartner(
        user_id=rider.id,
        vehicle_type="EV Bike",
        vehicle_number="MH-13-XX-5555",
        is_available=True,
        is_verified=True,
    )
    addr = Address(
        user_id=cust.id,
        address_line1="120 Navi Peth",
        city="Solapur",
        state="Maharashtra",
        pincode="413007",
        latitude=Decimal("17.6750"),
        longitude=Decimal("75.9100"),
    )
    prod = Product(
        name="Organic Cluster Beans",
        unit="500g",
        category_id=1,
        is_active=True,
    )
    db.add_all([sp, dp, addr, prod])
    db.flush()

    sprod = SellerProduct(
        seller_id=sel.id,
        product_id=prod.id,
        price=Decimal("45.00"),
        stock_quantity=50,
        is_available=True,
    )
    db.add(sprod)
    db.flush()

    # Order
    order = Order(
        order_number="VG-AUDIT-999",
        customer_id=cust.id,
        seller_id=sel.id,
        address_id=addr.id,
        delivery_partner_id=dp.id,
        status="READY_FOR_PICKUP",
        pickup_otp="123456",
        delivery_latitude=Decimal("17.6750"),
        delivery_longitude=Decimal("75.9100"),
        subtotal=Decimal("90.00"),
        total_amount=Decimal("90.00"),
    )
    db.add(order)
    db.flush()

    task = DeliveryTask(
        order_id=order.id,
        delivery_partner_id=dp.id,
        status="ASSIGNED",
        delivery_otp_hash=hash_otp(str(cust.id), "654321"),
    )
    db.add(task)
    db.commit()

    cust_token = create_access_token({"sub": str(cust.id), "role_id": 1})
    sel_token = create_access_token({"sub": str(sel.id), "role_id": 2})
    rider_token = create_access_token({"sub": str(rider.id), "role_id": 3})

    # --- 1. CUSTOMER PORTAL TESTS ---
    # Profile
    r_cust = client.get("/api/v1/customers/me", headers={"Authorization": f"Bearer {cust_token}"})
    assert r_cust.status_code == 200
    assert r_cust.json()["data"]["user"]["name"] == "Sunita Rao"

    # Products catalog
    r_prod = client.get("/api/v1/products?search=Cluster")
    assert r_prod.status_code == 200
    assert len(r_prod.json()["data"]["items"]) >= 1

    # Notifications
    r_notif = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {cust_token}"})
    assert r_notif.status_code == 200

    # Orders
    r_ord = client.get("/api/v1/orders", headers={"Authorization": f"Bearer {cust_token}"})
    assert r_ord.status_code == 200

    # --- 2. SELLER CENTRAL TESTS ---
    # Earnings
    r_earn = client.get("/api/v1/seller/earnings", headers={"Authorization": f"Bearer {sel_token}"})
    assert r_earn.status_code == 200
    earn_data = r_earn.json()["data"]
    assert earn_data["pending_amount"] == 90.0

    # Analytics
    r_rev = client.get("/api/v1/seller/analytics/revenue?range=30d", headers={"Authorization": f"Bearer {sel_token}"})
    assert r_rev.status_code == 200

    r_ord_an = client.get("/api/v1/seller/analytics/orders?range=30d", headers={"Authorization": f"Bearer {sel_token}"})
    assert r_ord_an.status_code == 200

    # Reviews
    r_revs = client.get("/api/v1/seller/reviews", headers={"Authorization": f"Bearer {sel_token}"})
    assert r_revs.status_code == 200

    # Complaints
    r_comp = client.get("/api/v1/seller/complaints", headers={"Authorization": f"Bearer {sel_token}"})
    assert r_comp.status_code == 200

    # --- 3. DELIVERY FLEET & MAPBOX LIVE TRACKING TESTS ---
    # Profile
    r_dp_prof = client.get("/api/v1/delivery/profile", headers={"Authorization": f"Bearer {rider_token}"})
    assert r_dp_prof.status_code == 200
    assert r_dp_prof.json()["data"]["vehicle_number"] == "MH-13-XX-5555"

    # Tasks
    r_tasks = client.get("/api/v1/delivery/tasks", headers={"Authorization": f"Bearer {rider_token}"})
    assert r_tasks.status_code == 200
    tasks_list = r_tasks.json()["data"]
    assert len(tasks_list) >= 1

    # Delivery boy verifies pickup OTP (123456)
    r_otp = client.post(
        f"/api/v1/delivery/orders/{order.id}/verify-pickup-otp",
        json={"otp": "123456"},
        headers={"Authorization": f"Bearer {rider_token}"},
    )
    assert r_otp.status_code == 200
    assert r_otp.json()["data"]["status"] == "PICKED_UP"

    # Start delivery (OUT_FOR_DELIVERY)
    r_start = client.post(
        f"/api/v1/delivery/orders/{order.id}/start",
        headers={"Authorization": f"Bearer {rider_token}"},
    )
    assert r_start.status_code == 200

    # Record GPS location
    r_loc = client.post(
        "/api/v1/delivery/location",
        json={"latitude": 17.6760, "longitude": 75.9080, "accuracy_meters": 5.0},
        headers={"Authorization": f"Bearer {rider_token}"},
    )
    assert r_loc.status_code == 200
    assert float(r_loc.json()["data"]["latitude"]) == 17.6760

    # WebSocket live tracking: Delivery partner streams GPS, Customer receives in real-time
    with client.websocket_connect(f"/ws/customer/{order.id}?token={cust_token}") as ws_cust:
        init_msg = ws_cust.receive_json()
        assert init_msg["type"] in ["initial_state", "location_update"]

        with client.websocket_connect(f"/ws/delivery/{order.id}?token={rider_token}") as ws_rider:
            ack = ws_rider.receive_json()
            assert ack["type"] == "connection_ack"

            # Stream new GPS coordinate
            ws_rider.send_json({
                "latitude": 17.6780,
                "longitude": 75.9090,
                "accuracy": 8.0,
                "speed": 30.0,
            })

            # Customer receives broadcast
            cust_update = ws_cust.receive_json()
            assert cust_update["type"] == "location_update"
            assert cust_update["latitude"] == 17.6780
            assert cust_update["longitude"] == 75.9090

    # Complete delivery with customer OTP
    r_comp_del = client.post(
        f"/api/v1/delivery/tasks/{task.id}/verify-otp",
        json={"delivery_otp": "654321", "notes": "Left at door"},
        headers={"Authorization": f"Bearer {rider_token}"},
    )
    assert r_comp_del.status_code == 200
    assert r_comp_del.json()["data"] is True
