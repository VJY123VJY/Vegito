import pytest
import datetime
from decimal import Decimal
from unittest.mock import MagicMock, patch

from app.models.user import User
from app.models.order import Order
from app.core.constants import OrderStatus, DeliveryTaskStatus
from app.models.delivery_partner import DeliveryPartner
from app.models.delivery_partner_location import DeliveryPartnerLocation
from app.models.delivery_task import DeliveryTask
from app.models.seller_profile import SellerProfile
from app.services.delivery_service import DeliveryService
from app.services.location_service import calculate_haversine_distance_km


def test_haversine_formula():
    """Verify haversine formula calculations."""
    # Central Solapur
    lat1, lon1 = 17.6805, 75.9064
    # ~0.24 km away
    assert calculate_haversine_distance_km(lat1, lon1, 17.6820, 75.9080) < 1.0
    # ~2.6 km away
    d_2_6 = calculate_haversine_distance_km(lat1, lon1, 17.7000, 75.9200)
    assert 2.0 <= d_2_6 <= 3.5
    # ~16.5 km away
    d_16 = calculate_haversine_distance_km(lat1, lon1, 17.8000, 76.0000)
    assert d_16 > 15.0


def test_section_18_delivery_partner_scenarios(db):
    """
    Test Section 18 Scenarios:
    Partner A: 4 km -> Eligible
    Partner B: 10 km -> Eligible
    Partner C: 15 km -> Eligible
    Partner D: 18 km -> Not Eligible
    Partner E: 5 km (unavailable) -> Not Eligible
    Partner F: 0.5 km -> Not Eligible
    Partner G: Missing location -> Not Eligible
    """
    now = datetime.datetime.now(datetime.timezone.utc)

    from app.models.address import Address

    # Deactivate existing partners temporarily so test is fully deterministic
    db.query(DeliveryPartner).update({"is_available": False})
    db.flush()

    import uuid

    # 1. Create Seller with location at Solapur (17.6805, 75.9064)
    seller_user = User(
        name="Test Seller Section 18",
        phone=f"98{uuid.uuid4().int % 100000000:08d}",
        role_id=2,
        is_active=True,
    )
    db.add(seller_user)
    db.flush()

    seller_prof = SellerProfile(
        user_id=seller_user.id,
        business_name="Test Seller 18 Shop",
        latitude=Decimal("17.6805000"),
        longitude=Decimal("75.9064000"),
        is_verified=True,
    )
    db.add(seller_prof)
    db.flush()

    # Create customer & address & order
    cust_user = User(
        name="Test Customer 18",
        phone=f"98{uuid.uuid4().int % 100000000:08d}",
        role_id=1,
        is_active=True,
    )
    db.add(cust_user)
    db.flush()

    addr = Address(
        user_id=cust_user.id,
        address_line1="Test Solapur Dropoff",
        city="Solapur",
        state="MH",
        pincode="413001",
        latitude=Decimal("17.6800"),
        longitude=Decimal("75.9060"),
    )
    db.add(addr)
    db.flush()

    order = Order(
        order_number=f"TEST-SEC18-{int(now.timestamp())}",
        customer_id=cust_user.id,
        address_id=addr.id,
        seller_id=seller_user.id,
        status=OrderStatus.READY.value,
        total_amount=Decimal("250.00"),
        payment_method="COD",
    )
    db.add(order)
    db.flush()

    import uuid

    # Helper to create partner
    def create_partner(name_suffix, is_available=True, is_active=True):
        u = User(
            name=f"Partner {name_suffix}",
            phone=f"98{uuid.uuid4().int % 100000000:08d}",
            role_id=3,
            is_active=is_active,
        )
        db.add(u)
        db.flush()
        p = DeliveryPartner(user_id=u.id, is_available=is_available)
        db.add(p)
        db.flush()
        return p

    def set_location(partner, lat, lon):
        loc = DeliveryPartnerLocation(
            delivery_partner_id=partner.id,
            latitude=Decimal(str(lat)),
            longitude=Decimal(str(lon)),
            recorded_at=now,
        )
        db.add(loc)
        db.flush()

    # Partner F: 0.5 km (lat: 17.6840, lon: 75.9090 => ~0.47 km) -> NOT ELIGIBLE (< 1 km)
    pF = create_partner("F", is_available=True)
    set_location(pF, 17.6840, 75.9090)
    dist_F = calculate_haversine_distance_km(17.6840, 75.9090, 17.6805, 75.9064)
    assert dist_F < 1.0

    # Partner D: 18 km (lat: 17.8100, lon: 76.0100 => ~18 km) -> NOT ELIGIBLE (> 15 km)
    pD = create_partner("D", is_available=True)
    set_location(pD, 17.8100, 76.0100)
    dist_D = calculate_haversine_distance_km(17.8100, 76.0100, 17.6805, 75.9064)
    assert dist_D > 15.0

    # Partner E: 5 km but unavailable -> NOT ELIGIBLE (unavailable)
    pE = create_partner("E", is_available=False)
    set_location(pE, 17.7100, 75.9400)

    # Partner G: Missing location -> NOT ELIGIBLE (missing location)
    pG = create_partner("G", is_available=True)

    # Test with ONLY ineligible partners (F, D, E, G)
    # Must find NO partner and order remains without partner
    with patch("app.models.delivery_partner.DeliveryPartner.query", None, create=True):
        assigned, dist = DeliveryService.find_and_assign_nearest_partner(db, order)
        assert assigned is None
        assert dist is None
        assert order.delivery_partner_id is None

    # Now add Partner B: ~10 km away
    # lat: 17.7400, lon: 75.9700 => ~9.4 km
    pB = create_partner("B", is_available=True)
    set_location(pB, 17.7400, 75.9700)
    dist_B = calculate_haversine_distance_km(17.7400, 75.9700, 17.6805, 75.9064)
    assert 1.0 <= dist_B <= 15.0

    # Now assign -> pB should be assigned!
    assigned, dist = DeliveryService.find_and_assign_nearest_partner(db, order)
    assert assigned is not None
    assert assigned.id == pB.id
    assert 1.0 <= dist <= 15.0

    # Reset order assignment
    order.delivery_partner_id = None
    task = db.query(DeliveryTask).filter(DeliveryTask.order_id == order.id).first()
    if task:
        task.delivery_partner_id = None

    # Now add Partner A: ~4 km away (closer than B!)
    # lat: 17.7100, lon: 75.9300 => ~4.06 km
    pA = create_partner("A", is_available=True)
    set_location(pA, 17.7100, 75.9300)
    dist_A = calculate_haversine_distance_km(17.7100, 75.9300, 17.6805, 75.9064)
    assert 1.0 <= dist_A <= 15.0
    assert dist_A < dist_B

    # Now assign -> pA should be chosen over pB because it's closest!
    assigned, dist = DeliveryService.find_and_assign_nearest_partner(db, order)
    assert assigned is not None
    # Test partner with active task (concurrency check)
    order.delivery_partner_id = None
    # Assign an active task to pA for a different order
    other_order = Order(
        order_number=f"TEST-SEC18-OTHER-{int(now.timestamp())}",
        customer_id=cust_user.id,
        address_id=addr.id,
        seller_id=seller_user.id,
        status=OrderStatus.PICKED_UP.value,
        total_amount=Decimal("100.00"),
        payment_method="COD",
    )
    db.add(other_order)
    db.flush()
    active_task = DeliveryTask(
        order_id=other_order.id,
        delivery_partner_id=pA.id,
        status=DeliveryTaskStatus.ASSIGNED.value,
    )
    db.add(active_task)
    db.flush()

    # Now pA has an active task -> should be skipped! pB should get assigned.
    assigned, dist = DeliveryService.find_and_assign_nearest_partner(db, order)
    assert assigned is not None
    assert assigned.id == pB.id  # pA was skipped due to active task!

    db.rollback()


def test_missing_seller_location_aborts_assignment(db):
    """If seller has no pickup location, assignment must abort and return (None, None)."""
    now = datetime.datetime.now(datetime.timezone.utc)
    import uuid
    from app.models.address import Address

    seller_user = User(
        name="Seller No Location",
        phone=f"98{uuid.uuid4().int % 100000000:08d}",
        role_id=2,
        is_active=True,
    )
    db.add(seller_user)
    db.flush()

    # Seller profile with NO latitude / longitude
    seller_prof = SellerProfile(
        user_id=seller_user.id,
        business_name="Seller No GPS Shop",
        latitude=None,
        longitude=None,
        is_verified=True,
    )
    db.add(seller_prof)
    db.flush()

    cust_user = User(
        name="Customer",
        phone=f"98{uuid.uuid4().int % 100000000:08d}",
        role_id=1,
        is_active=True,
    )
    db.add(cust_user)
    db.flush()

    addr = Address(
        user_id=cust_user.id,
        address_line1="Dropoff",
        city="Solapur",
        state="MH",
        pincode="413001",
        latitude=Decimal("17.6800"),
        longitude=Decimal("75.9060"),
    )
    db.add(addr)
    db.flush()

    order = Order(
        order_number=f"TEST-NOLOC-{int(now.timestamp())}",
        customer_id=cust_user.id,
        address_id=addr.id,
        seller_id=seller_user.id,
        status=OrderStatus.READY.value,
        total_amount=Decimal("150.00"),
        payment_method="COD",
    )
    db.add(order)
    db.flush()

    # find_and_assign_nearest_partner must return None, None
    assigned, dist = DeliveryService.find_and_assign_nearest_partner(db, order)
    assert assigned is None
    assert dist is None
    assert order.delivery_partner_id is None

    db.rollback()


def test_customer_location_authorization_stages(client, db):
    """
    Verifies STAGE 1 & STAGE 2 address security rules:
    STAGE 1: Before OTP verification:
      - Delivery task has seller pickup location ONLY.
      - Customer address/coordinates are NOT returned.
      - GET /delivery/tasks/{id}/customer-location returns 403 Forbidden.
      - Direct unauthenticated request returns 401 Unauthorized.
    STAGE 2: After OTP verification:
      - OTP verification succeeds and returns customer location.
      - GET /delivery/tasks/{id}/customer-location returns 200 with customer address.
    """
    import uuid
    from app.services.jwt_service import create_access_token
    from app.models.address import Address

    now = datetime.datetime.now(datetime.timezone.utc)

    # 1. Seller
    seller_user = User(
        name="Security Seller",
        phone=f"98{uuid.uuid4().int % 100000000:08d}",
        role_id=2,
        is_active=True,
    )
    db.add(seller_user)
    db.flush()

    seller_prof = SellerProfile(
        user_id=seller_user.id,
        business_name="Green Garden Store",
        latitude=Decimal("17.6805"),
        longitude=Decimal("75.9064"),
        is_verified=True,
    )
    db.add(seller_prof)
    db.flush()

    # 2. Customer with specific address
    cust_user = User(
        name="Confidential Customer",
        phone=f"98{uuid.uuid4().int % 100000000:08d}",
        role_id=1,
        is_active=True,
    )
    db.add(cust_user)
    db.flush()

    cust_addr = Address(
        user_id=cust_user.id,
        address_line1="702 Lotus Residency, Hotgi Road",
        city="Solapur",
        state="MH",
        pincode="413003",
        landmark="Opposite Big Bazaar",
        latitude=Decimal("17.6620"),
        longitude=Decimal("75.9180"),
    )
    db.add(cust_addr)
    db.flush()

    # 3. Delivery Partner
    rider_user = User(
        name="Security Rider",
        phone=f"98{uuid.uuid4().int % 100000000:08d}",
        role_id=3,
        is_active=True,
    )
    db.add(rider_user)
    db.flush()

    partner = DeliveryPartner(user_id=rider_user.id, is_available=True, is_verified=True)
    db.add(partner)
    db.flush()

    rider_loc = DeliveryPartnerLocation(
        delivery_partner_id=partner.id,
        latitude=Decimal("17.6900"),
        longitude=Decimal("75.9100"),
        recorded_at=now,
    )
    db.add(rider_loc)
    db.flush()

    # 4. Create Order & Delivery Task
    order = Order(
        order_number=f"SEC-ORD-{int(now.timestamp())}",
        customer_id=cust_user.id,
        address_id=cust_addr.id,
        seller_id=seller_user.id,
        status=OrderStatus.READY.value,
        pickup_otp="654321",
        pickup_otp_created_at=now,
        delivery_partner_id=partner.id,
        total_amount=Decimal("350.00"),
        payment_method="COD",
    )
    db.add(order)
    db.flush()

    task = DeliveryTask(
        order_id=order.id,
        delivery_partner_id=partner.id,
        status=DeliveryTaskStatus.ASSIGNED.value,
        pickup_verified=False,
    )
    db.add(task)
    db.commit()

    rider_token = create_access_token({"sub": str(rider_user.id), "role": "DELIVERY_PARTNER", "role_id": 3})
    auth_headers = {"Authorization": f"Bearer {rider_token}"}

    # =========================================================================
    # STAGE 1: BEFORE OTP VERIFICATION
    # =========================================================================
    # A. Check GET /delivery/tasks/{task.id}
    res = client.get(f"/api/v1/delivery/tasks/{task.id}", headers=auth_headers)
    assert res.status_code == 200
    task_data = res.json()["data"]
    assert task_data["delivery_address"] is None
    assert task_data["customer_latitude"] is None
    assert task_data["customer_longitude"] is None
    assert task_data["customer_phone"] is None
    assert task_data["pickup_verified"] is False
    # Seller pickup info MUST be present
    assert task_data["shop_name"] == "Green Garden Store"
    assert float(task_data["shop_latitude"]) == 17.6805
    assert float(task_data["shop_longitude"]) == 75.9064

    # B. TEST 8: Attempt to directly call customer-location API before OTP
    # Must fail with 403 Forbidden!
    res_loc = client.get(f"/api/v1/delivery/tasks/{task.id}/customer-location", headers=auth_headers)
    assert res_loc.status_code == 403
    assert "locked" in res_loc.json()["error"]["message"].lower()

    # C. Unauthenticated call must fail with 401
    res_unauth = client.get(f"/api/v1/delivery/tasks/{task.id}/customer-location")
    assert res_unauth.status_code == 401

    # =========================================================================
    # STAGE 2: AFTER OTP VERIFICATION
    # =========================================================================
    # Verify pickup OTP
    res_verify = client.post(
        f"/api/v1/delivery/tasks/{task.id}/verify-pickup",
        json={"otp": "654321"},
        headers=auth_headers,
    )
    assert res_verify.status_code == 200
    verify_data = res_verify.json()["data"]
    assert verify_data["customer_name"] == "Confidential Customer"
    assert float(verify_data["customer_latitude"]) == 17.662
    assert float(verify_data["customer_longitude"]) == 75.918
    assert verify_data["delivery_address"]["address_line1"] == "702 Lotus Residency, Hotgi Road"

    # Now GET /delivery/tasks/{task.id} returns customer address & coordinates!
    res_after = client.get(f"/api/v1/delivery/tasks/{task.id}", headers=auth_headers)
    assert res_after.status_code == 200
    task_data_after = res_after.json()["data"]
    assert task_data_after["pickup_verified"] is True
    assert task_data_after["delivery_address"]["address_line1"] == "702 Lotus Residency, Hotgi Road"
    assert float(task_data_after["customer_latitude"]) == 17.662
    assert float(task_data_after["customer_longitude"]) == 75.918

    # Now GET /delivery/tasks/{task.id}/customer-location returns 200 OK!
    res_loc_after = client.get(f"/api/v1/delivery/tasks/{task.id}/customer-location", headers=auth_headers)
    assert res_loc_after.status_code == 200
    loc_data = res_loc_after.json()["data"]
    assert loc_data["delivery_address"]["address_line1"] == "702 Lotus Residency, Hotgi Road"
    assert float(loc_data["customer_latitude"]) == 17.662
    assert float(loc_data["customer_longitude"]) == 75.918


