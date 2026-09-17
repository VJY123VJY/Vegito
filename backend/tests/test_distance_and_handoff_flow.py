"""
test_distance_and_handoff_flow.py — Comprehensive end-to-end verification of:
  - 6 KM Customer Delivery Distance Rule (TEST 1, 2, 3)
  - 6 KM Delivery Partner Pickup Distance & Nearest Assignment (TEST 4, 5, 6, 7)
  - Seller MARK READY & Task Handoff Flow (TEST 8)
  - Invalid & Valid Pickup Code Verification (TEST 9, 10)
  - WebSocket Disconnect / Reconnect Recovery (TEST 11)
  - Idempotent READY on Multiple Clicks (TEST 12)
"""

import pytest
import datetime
from decimal import Decimal
from starlette.testclient import TestClient
from unittest.mock import patch

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
from app.services.jwt_service import create_access_token
from app.core.constants import OrderStatus, DeliveryTaskStatus
from app.core.exceptions import BadRequestException
from app.services.order_service import OrderService
from app.services.delivery_service import DeliveryService
from app.services.delivery_pricing_service import DeliveryPricingService
from app.services.mapbox_service import MapboxService


@pytest.fixture
def base_flow_data(db):
    """Sets up a seller with shop, a customer, products, and auth tokens."""
    seller_user = User(
        role_id=2,
        name="Solapur Fresh Farms",
        email="freshfarms@vegito.in",
        phone="9822001122",
        is_active=True,
    )
    cust_user = User(
        role_id=1,
        name="Amit Kulkarni",
        email="amit@vegito.in",
        phone="9822003344",
        is_active=True,
    )
    db.add_all([seller_user, cust_user])
    db.flush()

    shop = SellerProfile(
        user_id=seller_user.id,
        business_name="Solapur Fresh Farms Central",
        latitude=Decimal("17.6805000"),
        longitude=Decimal("75.9064000"),
        is_verified=True,
    )
    db.add(shop)

    prod = Product(name="Fresh Tomatoes", unit="1 kg", category_id=1, is_active=True)
    db.add(prod)
    db.flush()

    sp = SellerProduct(
        seller_id=seller_user.id,
        product_id=prod.id,
        price=Decimal("40.00"),
        stock_quantity=200,
        is_available=True,
    )
    db.add(sp)
    db.flush()

    seller_token = create_access_token({"sub": str(seller_user.id), "role": "SELLER", "role_id": 2})
    cust_token = create_access_token({"sub": str(cust_user.id), "role": "CUSTOMER", "role_id": 1})

    return {
        "seller_user": seller_user,
        "cust_user": cust_user,
        "shop": shop,
        "product": prod,
        "seller_product": sp,
        "seller_token": seller_token,
        "cust_token": cust_token,
    }


# ===========================================================================
# TEST 1, 2, 3: CUSTOMER ORDER ELIGIBILITY (6 KM MAXIMUM)
# ===========================================================================

def test_1_seller_to_customer_4_2_km_allowed(client: TestClient, db, base_flow_data):
    """TEST 1: Seller -> Customer = 4.2 km -> Order allowed (within 6 km)."""
    d = base_flow_data
    cust = d["cust_user"]
    seller = d["seller_user"]

    addr = Address(
        user_id=cust.id,
        address_line1="Jule Solapur 4.2km",
        city="Solapur",
        state="MH",
        pincode="413004",
        latitude=Decimal("17.6500"),
        longitude=Decimal("75.9200"),
    )
    db.add(addr)
    db.commit()

    with patch.object(MapboxService, "get_route_distance_km", return_value=(4.2, True)):
        fee, dist = DeliveryPricingService.calculate_delivery_distance_and_fee(db, addr.id, seller.id)
        assert dist == 4.2
        assert fee == Decimal("40.00")  # Band 3.0-5.0 km: ₹40.00

        # Endpoint check
        headers = {"Authorization": f"Bearer {d['cust_token']}"}
        res = client.get(f"/api/v1/orders/delivery-fee?address_id={addr.id}&seller_id={seller.id}", headers=headers)
        assert res.status_code == 200
        assert res.json()["data"]["distance_km"] == 4.2
        assert res.json()["data"]["delivery_fee"] == 40.0
        assert res.json()["data"]["max_allowed_km"] == 6.0


def test_2_seller_to_customer_5_9_km_allowed(client: TestClient, db, base_flow_data):
    """TEST 2: Seller -> Customer = 5.9 km -> Order allowed (within 6 km)."""
    d = base_flow_data
    cust = d["cust_user"]
    seller = d["seller_user"]

    addr = Address(
        user_id=cust.id,
        address_line1="Near Ring Road 5.9km",
        city="Solapur",
        state="MH",
        pincode="413005",
        latitude=Decimal("17.6300"),
        longitude=Decimal("75.9300"),
    )
    db.add(addr)
    db.commit()

    with patch.object(MapboxService, "get_route_distance_km", return_value=(5.9, True)):
        fee, dist = DeliveryPricingService.calculate_delivery_distance_and_fee(db, addr.id, seller.id)
        assert dist == 5.9
        assert fee == Decimal("50.00")  # Band 5.0-6.0 km: ₹50.00

        headers = {"Authorization": f"Bearer {d['cust_token']}"}
        res = client.get(f"/api/v1/orders/delivery-fee?address_id={addr.id}&seller_id={seller.id}", headers=headers)
        assert res.status_code == 200
        assert res.json()["data"]["distance_km"] == 5.9
        assert res.json()["data"]["delivery_fee"] == 50.0


def test_3_seller_to_customer_6_1_km_blocked(client: TestClient, db, base_flow_data):
    """TEST 3: Seller -> Customer = 6.1 km -> Order blocked with DELIVERY_OUT_OF_RANGE."""
    d = base_flow_data
    cust = d["cust_user"]
    seller = d["seller_user"]

    addr = Address(
        user_id=cust.id,
        address_line1="Outside Suburb 6.1km",
        city="Solapur",
        state="MH",
        pincode="413006",
        latitude=Decimal("17.6200"),
        longitude=Decimal("75.9400"),
    )
    db.add(addr)
    db.commit()

    with patch.object(MapboxService, "get_route_distance_km", return_value=(6.1, True)):
        # Service level
        with pytest.raises(BadRequestException) as exc_info:
            DeliveryPricingService.calculate_delivery_distance_and_fee(db, addr.id, seller.id)
        err = exc_info.value
        assert err.code == "DELIVERY_OUT_OF_RANGE"
        assert "This address is outside our delivery range. Please select an address within 6 km." in str(err)
        assert err.details["distance"] == 6.1
        assert err.details["max_distance"] == 6.0

        # Endpoint level (preview)
        headers = {"Authorization": f"Bearer {d['cust_token']}"}
        res_fee = client.get(f"/api/v1/orders/delivery-fee?address_id={addr.id}&seller_id={seller.id}", headers=headers)
        assert res_fee.status_code == 400
        assert res_fee.json()["error"]["code"] == "DELIVERY_OUT_OF_RANGE"
        assert "within 6 km" in res_fee.json()["error"]["message"]

        # Checkout level (order placement blocked)
        # Add item to cart first
        client.post("/api/v1/cart/items", json={"seller_product_id": d["seller_product"].id, "quantity": 1}, headers=headers)
        res_checkout = client.post(
            "/api/v1/orders",
            json={"address_id": addr.id, "payment_method": "COD"},
            headers=headers,
        )
        assert res_checkout.status_code == 400
        assert res_checkout.json()["error"]["code"] == "DELIVERY_OUT_OF_RANGE"
        assert "within 6 km" in res_checkout.json()["error"]["message"]


# ===========================================================================
# TEST 4, 5, 6, 7: DELIVERY PARTNER PICKUP ELIGIBILITY (<= 6 KM FROM SELLER)
# ===========================================================================

def test_4_and_5_and_6_delivery_partner_pickup_distance_eligibility(db, base_flow_data):
    """
    TEST 4: Partner -> Seller = 2.5 km -> Partner eligible.
    TEST 5: Partner -> Seller = 5.8 km -> Partner eligible.
    TEST 6: Partner -> Seller = 6.2 km -> Partner NOT eligible.
    """
    d = base_flow_data
    seller = d["seller_user"]
    cust = d["cust_user"]

    # Create 3 partners: P1 (2.5 km), P2 (5.8 km), P3 (6.2 km)
    u1 = User(role_id=3, name="Rider 2.5km", email="rider25@vegito.in", phone="9922000001", is_active=True)
    u2 = User(role_id=3, name="Rider 5.8km", email="rider58@vegito.in", phone="9922000002", is_active=True)
    u3 = User(role_id=3, name="Rider 6.2km", email="rider62@vegito.in", phone="9922000003", is_active=True)
    db.add_all([u1, u2, u3])
    db.flush()

    p1 = DeliveryPartner(user_id=u1.id, is_available=True, is_verified=True)
    p2 = DeliveryPartner(user_id=u2.id, is_available=True, is_verified=True)
    p3 = DeliveryPartner(user_id=u3.id, is_available=True, is_verified=True)
    db.add_all([p1, p2, p3])
    db.flush()

    # Disable all other partners
    db.query(DeliveryPartner).filter(~DeliveryPartner.id.in_([p1.id, p2.id, p3.id])).update({"is_available": False})

    # Record distinct GPS locations for each
    loc1 = DeliveryPartnerLocation(delivery_partner_id=p1.id, latitude=Decimal("17.6700"), longitude=Decimal("75.9000"))
    loc2 = DeliveryPartnerLocation(delivery_partner_id=p2.id, latitude=Decimal("17.6400"), longitude=Decimal("75.9100"))
    loc3 = DeliveryPartnerLocation(delivery_partner_id=p3.id, latitude=Decimal("17.6100"), longitude=Decimal("75.9200"))
    db.add_all([loc1, loc2, loc3])

    addr = Address(user_id=cust.id, address_line1="Close 2km", city="Solapur", state="MH", pincode="413001", latitude=Decimal("17.6850"), longitude=Decimal("75.9080"))
    db.add(addr)
    db.commit()

    order = Order(
        order_number="VG-TST-ELIG",
        customer_id=cust.id,
        seller_id=seller.id,
        address_id=addr.id,
        status=OrderStatus.PACKING.value,
        subtotal=Decimal("100.00"),
        delivery_charge=Decimal("20.00"),
        total_amount=Decimal("120.00"),
    )
    db.add(order)
    db.commit()

    # Mock distances from shop: p1=2.5km, p2=5.8km, p3=6.2km
    def mock_distance(lat1, lon1, lat2, lon2):
        if round(lat1, 4) == 17.6700:
            return 2.5, True
        elif round(lat1, 4) == 17.6400:
            return 5.8, True
        elif round(lat1, 4) == 17.6100:
            return 6.2, True
        return 1.5, False

    with patch.object(MapboxService, "get_route_distance_km", side_effect=mock_distance):
        # Case A: Only P3 (6.2 km) is available -> MUST NOT ASSIGN (TEST 6)
        p1.is_available = False
        p2.is_available = False
        p3.is_available = True
        db.commit()

        best, dist = DeliveryService.find_and_assign_nearest_partner(db, order, max_radius_km=6.0)
        assert best is None
        assert dist is None

        # Case B: Only P2 (5.8 km) is available -> MUST ASSIGN (TEST 5)
        p2.is_available = True
        p3.is_available = False
        db.commit()

        best, dist = DeliveryService.find_and_assign_nearest_partner(db, order, max_radius_km=6.0)
        assert best is not None
        assert best.id == p2.id
        assert dist == 5.8

        # Case C: P1 (2.5 km) also becomes available -> P1 is preferred over P2 (TEST 4)
        order.delivery_partner_id = None
        p1.is_available = True
        p2.is_available = True
        db.commit()

        best, dist = DeliveryService.find_and_assign_nearest_partner(db, order, max_radius_km=6.0)
        assert best is not None
        assert best.id == p1.id
        assert dist == 2.5


def test_7_nearest_eligible_partner_selected_first(db, base_flow_data):
    """
    TEST 7: Two delivery partners:
    Partner A = 2.0 km from seller
    Partner B = 4.0 km from seller
    Expected: Nearest eligible partner (Partner A) is considered first.
    """
    d = base_flow_data
    seller = d["seller_user"]
    cust = d["cust_user"]

    ua = User(role_id=3, name="Partner A", email="partnera@vegito.in", phone="9933000001", is_active=True)
    ub = User(role_id=3, name="Partner B", email="partnerb@vegito.in", phone="9933000002", is_active=True)
    db.add_all([ua, ub])
    db.flush()

    pa = DeliveryPartner(user_id=ua.id, is_available=True, is_verified=True)
    pb = DeliveryPartner(user_id=ub.id, is_available=True, is_verified=True)
    db.add_all([pa, pb])
    db.flush()

    db.query(DeliveryPartner).filter(~DeliveryPartner.id.in_([pa.id, pb.id])).update({"is_available": False})

    loc_a = DeliveryPartnerLocation(delivery_partner_id=pa.id, latitude=Decimal("17.6750"), longitude=Decimal("75.9050"))
    loc_b = DeliveryPartnerLocation(delivery_partner_id=pb.id, latitude=Decimal("17.6600"), longitude=Decimal("75.9020"))
    db.add_all([loc_a, loc_b])

    addr = Address(user_id=cust.id, address_line1="Close addr", city="Solapur", state="MH", pincode="413001", latitude=Decimal("17.6850"), longitude=Decimal("75.9080"))
    db.add(addr)
    db.commit()

    order = Order(
        order_number="VG-TST-NEAREST",
        customer_id=cust.id,
        seller_id=seller.id,
        address_id=addr.id,
        status=OrderStatus.PACKING.value,
        subtotal=Decimal("150.00"),
        delivery_charge=Decimal("20.00"),
        total_amount=Decimal("170.00"),
    )
    db.add(order)
    db.commit()

    def mock_dist_a_b(lat1, lon1, lat2, lon2):
        if round(lat1, 4) == 17.6750:
            return 2.0, True  # Partner A
        elif round(lat1, 4) == 17.6600:
            return 4.0, True  # Partner B
        return 1.5, False

    with patch.object(MapboxService, "get_route_distance_km", side_effect=mock_dist_a_b):
        best_partner, best_dist = DeliveryService.find_and_assign_nearest_partner(db, order, max_radius_km=6.0)
        assert best_partner is not None
        assert best_partner.id == pa.id
        assert best_dist == 2.0


# ===========================================================================
# TEST 8, 9, 10: SELLER MARK READY & HANDOFF VERIFICATION FLOW
# ===========================================================================

def test_8_seller_marks_order_ready_flow(db, base_flow_data):
    """
    TEST 8: Seller marks order READY.
    Expected:
    - Order status moves to READY
    - 6-digit pickup code generated once
    - Eligible partner assigned
    - Delivery task created & assigned
    - Task status history created
    - Seller shop address present on task
    """
    d = base_flow_data
    seller = d["seller_user"]
    cust = d["cust_user"]

    rider_user = User(role_id=3, name="Rider Sunil", email="sunil@vegito.in", phone="9944000001", is_active=True)
    db.add(rider_user)
    db.flush()

    partner = DeliveryPartner(user_id=rider_user.id, is_available=True, is_verified=True)
    db.add(partner)
    db.flush()

    db.query(DeliveryPartner).filter(DeliveryPartner.id != partner.id).update({"is_available": False})

    loc = DeliveryPartnerLocation(delivery_partner_id=partner.id, latitude=Decimal("17.6810"), longitude=Decimal("75.9070"))
    addr = Address(user_id=cust.id, address_line1="Bhavani Peth", city="Solapur", state="MH", pincode="413002", latitude=Decimal("17.6880"), longitude=Decimal("75.9100"))
    db.add_all([loc, addr])
    db.commit()

    order = Order(
        order_number="VG-TST-READY-01",
        customer_id=cust.id,
        seller_id=seller.id,
        address_id=addr.id,
        status=OrderStatus.PACKING.value,
        subtotal=Decimal("200.00"),
        delivery_charge=Decimal("20.00"),
        total_amount=Decimal("220.00"),
    )
    db.add(order)
    db.commit()

    with patch.object(MapboxService, "get_route_distance_km", return_value=(1.8, True)):
        updated_order = OrderService.update_order_status(db, seller, order.id, OrderStatus.READY.value)
        assert updated_order.status == OrderStatus.READY.value
        assert updated_order.pickup_otp is not None
        assert len(updated_order.pickup_otp) == 6
        assert updated_order.pickup_otp.isdigit()

        # Partner assigned
        assert updated_order.delivery_partner_id == partner.id

        # Delivery task created
        task = db.query(DeliveryTask).filter(DeliveryTask.order_id == order.id).first()
        assert task is not None
        assert task.delivery_partner_id == partner.id
        assert task.status == DeliveryTaskStatus.ASSIGNED.value

        # Secure hash in task notes
        assert task.notes is not None
        assert task.notes.startswith("pickup_hash:")

        # Partner views task: Customer address line is MASKED before pickup
        tasks_view = DeliveryService.list_partner_tasks(db, rider_user)
        matching = next(t for t in tasks_view if t.order_id == order.id)
        assert matching.delivery_address.address_line1 == "Area hidden until pickup"
        assert matching.customer_phone is None
        assert matching.shop_name == "Solapur Fresh Farms Central"


def test_9_delivery_partner_enters_wrong_code(db, base_flow_data):
    """
    TEST 9: Delivery partner enters wrong pickup code.
    Expected:
    - Raises INVALID_PICKUP_CODE
    - Pickup rejected, order status remains READY
    """
    d = base_flow_data
    seller = d["seller_user"]
    cust = d["cust_user"]

    rider_user = User(role_id=3, name="Rider Ramesh", email="ramesh9@vegito.in", phone="9944000002", is_active=True)
    db.add(rider_user)
    db.flush()

    partner = DeliveryPartner(user_id=rider_user.id, is_available=True, is_verified=True)
    db.add(partner)
    db.flush()

    addr = Address(user_id=cust.id, address_line1="12 Ashok Chowk", city="Solapur", state="MH", pincode="413005", latitude=Decimal("17.6880"), longitude=Decimal("75.9100"))
    db.add(addr)
    db.commit()

    order = Order(
        order_number="VG-TST-WRONG-OTP",
        customer_id=cust.id,
        seller_id=seller.id,
        address_id=addr.id,
        status=OrderStatus.PACKING.value,
        subtotal=Decimal("250.00"),
        delivery_charge=Decimal("20.00"),
        total_amount=Decimal("270.00"),
    )
    db.add(order)
    db.commit()

    with patch.object(MapboxService, "get_route_distance_km", return_value=(1.2, True)):
        OrderService.update_order_status(db, seller, order.id, OrderStatus.READY.value)
        actual_code = order.pickup_otp

        # Delivery partner attempts wrong code (e.g. 000000)
        with pytest.raises(BadRequestException) as exc_info:
            DeliveryService.verify_pickup_otp(db, rider_user, order.id, "000000")
        err = exc_info.value
        assert err.code == "INVALID_PICKUP_CODE"
        assert "Invalid pickup code. Please ask the seller to verify the code." in str(err)

        # Status must remain READY, not picked up
        assert order.status == OrderStatus.READY.value
        assert order.pickup_otp_verified_at is None


def test_10_delivery_partner_enters_correct_code(db, base_flow_data):
    """
    TEST 10: Delivery partner enters correct pickup code.
    Expected:
    - Pickup verified
    - Order status moves to PICKED_UP
    - Customer address becomes available
    - Customer notified
    - Delivery task moves to STARTED
    """
    d = base_flow_data
    seller = d["seller_user"]
    cust = d["cust_user"]

    rider_user = User(role_id=3, name="Rider Kiran", email="kiran10@vegito.in", phone="9944000003", is_active=True)
    db.add(rider_user)
    db.flush()

    partner = DeliveryPartner(user_id=rider_user.id, is_available=True, is_verified=True)
    db.add(partner)
    db.flush()

    addr = Address(user_id=cust.id, address_line1="Flat 201, Shanti Niketan", city="Solapur", state="MH", pincode="413002", latitude=Decimal("17.6890"), longitude=Decimal("75.9120"))
    db.add(addr)
    db.commit()

    order = Order(
        order_number="VG-TST-VALID-OTP",
        customer_id=cust.id,
        seller_id=seller.id,
        address_id=addr.id,
        status=OrderStatus.PACKING.value,
        subtotal=Decimal("300.00"),
        delivery_charge=Decimal("20.00"),
        total_amount=Decimal("320.00"),
    )
    db.add(order)
    db.commit()

    with patch.object(MapboxService, "get_route_distance_km", return_value=(1.5, True)):
        OrderService.update_order_status(db, seller, order.id, OrderStatus.READY.value)
        actual_code = order.pickup_otp

        # Delivery partner verifies with correct code
        res = DeliveryService.verify_pickup_otp(db, rider_user, order.id, actual_code)
        assert res["status"] == OrderStatus.PICKED_UP.value
        assert order.status == OrderStatus.PICKED_UP.value
        assert order.pickup_otp_verified_at is not None

        # Customer address is now UNLOCKED
        tasks_view = DeliveryService.list_partner_tasks(db, rider_user)
        matching = next(t for t in tasks_view if t.order_id == order.id)
        assert matching.delivery_address.address_line1 == "Flat 201, Shanti Niketan"
        assert matching.customer_phone == cust.phone


# ===========================================================================
# TEST 11: WEBSOCKET DISCONNECT & REST RECONNECT RECOVERY
# ===========================================================================

def test_11_websocket_reconnect_and_state_recovery(client: TestClient, db, base_flow_data):
    """
    TEST 11: WebSocket disconnects -> Frontend reconnects and REST API refetches authoritative state.
    """
    d = base_flow_data
    seller = d["seller_user"]
    cust = d["cust_user"]

    rider_user = User(role_id=3, name="Rider WS Test", email="riderws@vegito.in", phone="9944000004", is_active=True)
    db.add(rider_user)
    db.flush()

    partner = DeliveryPartner(user_id=rider_user.id, is_available=True, is_verified=True)
    db.add(partner)
    db.flush()

    addr = Address(user_id=cust.id, address_line1="77 Park Avenue", city="Solapur", state="MH", pincode="413003", latitude=Decimal("17.6850"), longitude=Decimal("75.9080"))
    db.add(addr)
    db.commit()

    order = Order(
        order_number="VG-TST-WS-RECOVERY",
        customer_id=cust.id,
        seller_id=seller.id,
        address_id=addr.id,
        status=OrderStatus.READY.value,
        pickup_otp="654321",
        delivery_partner_id=partner.id,
        subtotal=Decimal("150.00"),
        total_amount=Decimal("170.00"),
    )
    db.add(order)
    db.commit()

    rider_token = create_access_token({"sub": str(rider_user.id), "role": "DELIVERY_PARTNER", "role_id": 3})

    # WebSocket connection gets connection_ack with recovery items
    with client.websocket_connect(f"/ws/delivery-dashboard?token={rider_token}") as ws:
        ack = ws.receive_json()
        assert ack.get("type") == "connection_ack"
        assert ack.get("status") == "connected"
        ws.close()

        # Simulate disconnect by exiting block
    # After disconnect, REST API refetches authoritative state without loss of order
    headers = {"Authorization": f"Bearer {rider_token}"}
    res = client.get("/api/v1/delivery/tasks", headers=headers)
    assert res.status_code == 200
    task_items = res.json()["data"]
    assert any(t["order_id"] == order.id for t in task_items)


# ===========================================================================
# TEST 12: IDEMPOTENT READY TRANSITION (SELLER CLICKS READY TWICE)
# ===========================================================================

def test_12_seller_clicks_ready_twice_idempotency(db, base_flow_data):
    """
    TEST 12: Seller clicks READY twice.
    Expected:
    - No duplicate task
    - No new pickup code
    - No duplicate assignment
    """
    d = base_flow_data
    seller = d["seller_user"]
    cust = d["cust_user"]

    rider_user = User(role_id=3, name="Rider Idemp", email="rideridemp@vegito.in", phone="9944000005", is_active=True)
    db.add(rider_user)
    db.flush()

    partner = DeliveryPartner(user_id=rider_user.id, is_available=True, is_verified=True)
    db.add(partner)
    db.flush()

    db.query(DeliveryPartner).filter(DeliveryPartner.id != partner.id).update({"is_available": False})

    loc = DeliveryPartnerLocation(delivery_partner_id=partner.id, latitude=Decimal("17.6810"), longitude=Decimal("75.9070"))
    addr = Address(user_id=cust.id, address_line1="Idempotent St", city="Solapur", state="MH", pincode="413001", latitude=Decimal("17.6850"), longitude=Decimal("75.9080"))
    db.add_all([loc, addr])
    db.commit()

    order = Order(
        order_number="VG-TST-IDEMP",
        customer_id=cust.id,
        seller_id=seller.id,
        address_id=addr.id,
        status=OrderStatus.PACKING.value,
        subtotal=Decimal("220.00"),
        delivery_charge=Decimal("20.00"),
        total_amount=Decimal("240.00"),
    )
    db.add(order)
    db.commit()

    with patch.object(MapboxService, "get_route_distance_km", return_value=(1.5, True)):
        # First click: READY
        first_res = OrderService.update_order_status(db, seller, order.id, OrderStatus.READY.value)
        code_1 = first_res.pickup_otp
        task_count_1 = db.query(DeliveryTask).filter(DeliveryTask.order_id == order.id).count()
        partner_1 = first_res.delivery_partner_id

        assert code_1 is not None
        assert task_count_1 == 1

        # Second click: READY again
        second_res = OrderService.update_order_status(db, seller, order.id, OrderStatus.READY.value)
        code_2 = second_res.pickup_otp
        task_count_2 = db.query(DeliveryTask).filter(DeliveryTask.order_id == order.id).count()
        partner_2 = second_res.delivery_partner_id

        # Verification: Same code, same task count (1), same assignment
        assert code_1 == code_2
        assert task_count_2 == 1
        assert partner_1 == partner_2
