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
from app.models.address import Address
from app.models.delivery_task import DeliveryTask
from app.services.jwt_service import create_access_token
from app.core.security import hash_otp, verify_otp_hash
from app.core.constants import OrderStatus, DeliveryTaskStatus
from app.core.exceptions import BadRequestException
from app.services.order_service import OrderService
from app.services.delivery_service import DeliveryService
from app.utils.otp import generate_pickup_code


@pytest.fixture
def setup_flow_data(db):
    seller_user = User(role_id=2, name="Fresh Veggies Shop", email="shop@vegito.in", phone="9111111101", is_active=True)
    dp_user = User(role_id=3, name="Ramesh Rider", email="ramesh@vegito.in", phone="9111111102", is_active=True)
    cust_user = User(role_id=1, name="Pooja Sharma", email="pooja@vegito.in", phone="9111111103", is_active=True)
    db.add_all([seller_user, dp_user, cust_user])
    db.flush()

    shop = SellerProfile(
        user_id=seller_user.id,
        business_name="Solapur Fresh Veggies",
        latitude=Decimal("17.6805"),
        longitude=Decimal("75.9064"),
        is_verified=True,
    )
    partner = DeliveryPartner(
        user_id=dp_user.id,
        vehicle_type="Bike",
        vehicle_number="MH-13-PC-2026",
        is_available=True,
        is_verified=True,
    )
    db.add_all([shop, partner])
    db.flush()

    # In single partner V1: make other partners unavailable
    db.query(DeliveryPartner).filter(DeliveryPartner.id != partner.id).update({"is_available": False})

    # Partner GPS location at shop (1.0 km)
    loc = DeliveryPartnerLocation(
        delivery_partner_id=partner.id,
        latitude=Decimal("17.6810"),
        longitude=Decimal("75.9070"),
    )
    db.add(loc)

    addr = Address(
        user_id=cust_user.id,
        address_line1="Flat 402, Sunrise Residency",
        city="Solapur",
        state="MH",
        pincode="413001",
        latitude=Decimal("17.6890"),
        longitude=Decimal("75.9150"),
    )
    db.add(addr)
    db.flush()

    seller_token = create_access_token({"sub": str(seller_user.id), "role": "SELLER", "role_id": 2})
    dp_token = create_access_token({"sub": str(dp_user.id), "role": "DELIVERY_PARTNER", "role_id": 3})
    cust_token = create_access_token({"sub": str(cust_user.id), "role": "CUSTOMER", "role_id": 1})

    return {
        "seller_user": seller_user,
        "dp_user": dp_user,
        "cust_user": cust_user,
        "shop": shop,
        "partner": partner,
        "addr": addr,
        "seller_token": seller_token,
        "dp_token": dp_token,
        "cust_token": cust_token,
    }


def test_pickup_code_cryptographic_unpredictability():
    """Test 2: Pickup code must be 6 digits, numeric, and unpredictable across invocations."""
    codes = [generate_pickup_code(6) for _ in range(50)]
    for code in codes:
        assert len(code) == 6, f"Expected 6 digits, got {code}"
        assert code.isdigit(), f"Expected numeric string, got {code}"
        assert 100000 <= int(code) <= 999999, f"Out of 6-digit range: {code}"
    # Check uniqueness among 50 random samples
    assert len(set(codes)) > 45, "Pickup codes lack sufficient entropy/unpredictability"


def test_pickup_code_generated_only_at_ready(db, setup_flow_data):
    """Test 1: Pickup code must NOT be generated at NEW, ACCEPTED, or PACKING, only at READY."""
    d = setup_flow_data
    seller = d["seller_user"]
    cust = d["cust_user"]
    addr = d["addr"]

    order = Order(
        order_number="VG-PC-1001",
        customer_id=cust.id,
        seller_id=seller.id,
        address_id=addr.id,
        status=OrderStatus.NEW.value,
        subtotal=Decimal("250.00"),
        delivery_charge=Decimal("30.00"),
        total_amount=Decimal("280.00"),
        payment_method="COD",
    )
    db.add(order)
    db.flush()

    # Step 1: Order is NEW -> pickup_otp is None
    assert order.pickup_otp is None
    assert order.pickup_otp_created_at is None

    # Step 2: Seller ACCEPT -> pickup_otp is STILL None
    OrderService.update_order_status(db, seller, order.id, OrderStatus.ACCEPTED.value)
    assert order.status == OrderStatus.ACCEPTED.value
    assert order.pickup_otp is None

    # Step 3: Seller PACKING -> pickup_otp is STILL None
    OrderService.update_order_status(db, seller, order.id, OrderStatus.PACKING.value)
    assert order.status == OrderStatus.PACKING.value
    assert order.pickup_otp is None

    # Step 4: Seller clicks MARK READY -> pickup_otp is generated
    OrderService.update_order_status(db, seller, order.id, OrderStatus.READY.value)
    assert order.status == OrderStatus.READY.value
    assert order.pickup_otp is not None
    assert len(order.pickup_otp) == 6
    assert order.pickup_otp.isdigit()
    assert order.pickup_otp_created_at is not None


def test_seller_and_partner_see_same_code(client: TestClient, db, setup_flow_data):
    """Test 3: Both Seller and Assigned Delivery Partner see the exact same 6-digit pickup code."""
    d = setup_flow_data
    seller = d["seller_user"]
    dp = d["dp_user"]
    cust = d["cust_user"]
    addr = d["addr"]

    order = Order(
        order_number="VG-PC-1002",
        customer_id=cust.id,
        seller_id=seller.id,
        address_id=addr.id,
        status=OrderStatus.PACKING.value,
        subtotal=Decimal("320.00"),
        delivery_charge=Decimal("20.00"),
        total_amount=Decimal("340.00"),
    )
    db.add(order)
    db.flush()

    # Transition to READY
    OrderService.update_order_status(db, seller, order.id, OrderStatus.READY.value)
    expected_code = order.pickup_otp
    assert expected_code is not None

    # Seller views order details
    seller_detail = OrderService.get_order_detail(db, seller, order.id)
    assert seller_detail.pickup_otp == expected_code

    # Delivery Partner lists tasks
    partner_tasks = DeliveryService.list_partner_tasks(db, dp)
    matching_task = next(t for t in partner_tasks if t.order_id == order.id)
    assert matching_task.pickup_otp == expected_code


def test_customer_never_sees_pickup_code(db, setup_flow_data):
    """Test 4: Customer must NEVER see pickup_otp in order details or order listings."""
    d = setup_flow_data
    seller = d["seller_user"]
    cust = d["cust_user"]
    addr = d["addr"]

    order = Order(
        order_number="VG-PC-1003",
        customer_id=cust.id,
        seller_id=seller.id,
        address_id=addr.id,
        status=OrderStatus.PACKING.value,
        subtotal=Decimal("150.00"),
        delivery_charge=Decimal("20.00"),
        total_amount=Decimal("170.00"),
    )
    db.add(order)
    db.flush()

    OrderService.update_order_status(db, seller, order.id, OrderStatus.READY.value)

    # Customer fetches order detail
    cust_detail = OrderService.get_order_detail(db, cust, order.id)
    assert cust_detail.pickup_otp is None, "Security violation: pickup_otp leaked to customer in order details!"

    # Customer lists orders
    from app.utils.pagination import PaginationParams
    orders_list, _ = OrderService.list_customer_orders(db, cust, PaginationParams(page=1, limit=10))
    for o in orders_list:
        assert o.pickup_otp is None, "Security violation: pickup_otp leaked to customer in orders list!"


def test_customer_masked_before_pickup_and_revealed_after(db, setup_flow_data):
    """Tests 5 & 6: Customer phone, address, and coordinates hidden before pickup; revealed after verification."""
    d = setup_flow_data
    seller = d["seller_user"]
    dp = d["dp_user"]
    cust = d["cust_user"]
    addr = d["addr"]

    order = Order(
        order_number="VG-PC-1004",
        customer_id=cust.id,
        seller_id=seller.id,
        address_id=addr.id,
        status=OrderStatus.PACKING.value,
        subtotal=Decimal("200.00"),
        delivery_charge=Decimal("20.00"),
        total_amount=Decimal("220.00"),
    )
    db.add(order)
    db.flush()

    OrderService.update_order_status(db, seller, order.id, OrderStatus.READY.value)

    # Test 5: BEFORE pickup verification
    tasks_before = DeliveryService.list_partner_tasks(db, dp)
    task_before = next(t for t in tasks_before if t.order_id == order.id)
    assert task_before.customer_phone is None
    assert task_before.customer_latitude is None
    assert task_before.customer_longitude is None
    assert "hidden until pickup" in task_before.delivery_address.address_line1.lower()

    # Verify pickup with correct code
    pickup_code = order.pickup_otp
    DeliveryService.verify_pickup_otp(db, dp, order.id, pickup_code)

    # Test 6: AFTER pickup verification
    tasks_after = DeliveryService.list_partner_tasks(db, dp)
    task_after = next(t for t in tasks_after if t.order_id == order.id)
    assert task_after.customer_phone == cust.phone
    assert task_after.customer_latitude == addr.latitude
    assert task_after.customer_longitude == addr.longitude
    assert task_after.delivery_address.address_line1 == addr.address_line1


def test_pickup_code_verification_success_and_status(db, setup_flow_data):
    """Test 7: Successful verification transitions order to PICKED_UP and delivery task to STARTED."""
    d = setup_flow_data
    seller = d["seller_user"]
    dp = d["dp_user"]
    cust = d["cust_user"]
    addr = d["addr"]

    order = Order(
        order_number="VG-PC-1005",
        customer_id=cust.id,
        seller_id=seller.id,
        address_id=addr.id,
        status=OrderStatus.PACKING.value,
        subtotal=Decimal("200.00"),
        delivery_charge=Decimal("20.00"),
        total_amount=Decimal("220.00"),
    )
    db.add(order)
    db.flush()

    OrderService.update_order_status(db, seller, order.id, OrderStatus.READY.value)
    code = order.pickup_otp

    res = DeliveryService.verify_pickup_otp(db, dp, order.id, code)
    assert res["message"] == "OTP Verified"
    assert res["status"] == OrderStatus.PICKED_UP.value
    assert order.status == OrderStatus.PICKED_UP.value
    assert order.pickup_otp_verified_at is not None

    task = db.query(DeliveryTask).filter(DeliveryTask.order_id == order.id).first()
    assert task.status == DeliveryTaskStatus.STARTED.value
    assert task.started_at is not None


def test_pickup_code_verification_invalid_rejected(db, setup_flow_data):
    """Test 8: Invalid pickup code must raise BadRequestException with specific message."""
    d = setup_flow_data
    seller = d["seller_user"]
    dp = d["dp_user"]
    cust = d["cust_user"]
    addr = d["addr"]

    order = Order(
        order_number="VG-PC-1006",
        customer_id=cust.id,
        seller_id=seller.id,
        address_id=addr.id,
        status=OrderStatus.PACKING.value,
        subtotal=Decimal("200.00"),
        delivery_charge=Decimal("20.00"),
        total_amount=Decimal("220.00"),
    )
    db.add(order)
    db.flush()

    OrderService.update_order_status(db, seller, order.id, OrderStatus.READY.value)

    # Invalid code
    with pytest.raises(BadRequestException) as exc:
        DeliveryService.verify_pickup_otp(db, dp, order.id, "000000")
    assert "Invalid pickup code" in str(exc.value) and ("ask the seller" in str(exc.value) or "check with the seller" in str(exc.value))

    # Order and task should still be unchanged
    assert order.status == OrderStatus.READY.value
    assert order.pickup_otp_verified_at is None


def test_pickup_code_hash_stored_in_task_notes(db, setup_flow_data):
    """Test 9: Verify pickup code SHA-256 hash is securely stored in DeliveryTask.notes."""
    d = setup_flow_data
    seller = d["seller_user"]
    cust = d["cust_user"]
    addr = d["addr"]

    order = Order(
        order_number="VG-PC-1007",
        customer_id=cust.id,
        seller_id=seller.id,
        address_id=addr.id,
        status=OrderStatus.PACKING.value,
        subtotal=Decimal("200.00"),
        delivery_charge=Decimal("20.00"),
        total_amount=Decimal("220.00"),
    )
    db.add(order)
    db.flush()

    OrderService.update_order_status(db, seller, order.id, OrderStatus.READY.value)
    task = db.query(DeliveryTask).filter(DeliveryTask.order_id == order.id).first()
    assert task is not None
    assert task.notes is not None
    assert task.notes.startswith("pickup_hash:")

    stored_hash = task.notes.split("pickup_hash:", 1)[1]
    expected_hash = hash_otp(str(order.id), order.pickup_otp)
    assert stored_hash == expected_hash
    assert verify_otp_hash(str(order.id), order.pickup_otp, stored_hash)


def test_doorstep_delivery_otp_separate_flow(client: TestClient, db, setup_flow_data):
    """Test 10: Verify Doorstep Delivery OTP is distinct from Pickup Code and completes delivery."""
    d = setup_flow_data
    seller = d["seller_user"]
    dp = d["dp_user"]
    cust = d["cust_user"]
    addr = d["addr"]

    # Create task with a known raw doorstep delivery OTP
    order = Order(
        order_number="VG-PC-1008",
        customer_id=cust.id,
        seller_id=seller.id,
        address_id=addr.id,
        status=OrderStatus.PACKING.value,
        subtotal=Decimal("300.00"),
        delivery_charge=Decimal("20.00"),
        total_amount=Decimal("320.00"),
    )
    db.add(order)
    db.flush()

    doorstep_otp = "5678"
    task = DeliveryTask(
        order_id=order.id,
        delivery_partner_id=d["partner"].id,
        status=DeliveryTaskStatus.ASSIGNED.value,
        delivery_otp_hash=hash_otp(str(cust.id), doorstep_otp),
    )
    db.add(task)
    db.flush()

    # Move to READY -> generates pickup code
    OrderService.update_order_status(db, seller, order.id, OrderStatus.READY.value)
    pickup_code = order.pickup_otp
    assert pickup_code != doorstep_otp, "Pickup code and doorstep delivery OTP must be distinct!"

    # Verify pickup code at shop
    DeliveryService.verify_pickup_otp(db, dp, order.id, pickup_code)
    assert order.status == OrderStatus.PICKED_UP.value

    # Delivery partner starts out for delivery
    DeliveryService.start_delivery(db, dp, order.id)
    assert order.status == OrderStatus.OUT_FOR_DELIVERY.value

    # At customer doorstep: partner completes delivery with doorstep OTP
    completed_task = DeliveryService.complete_delivery(db, dp, task.id, doorstep_otp)
    assert completed_task.status == DeliveryTaskStatus.DELIVERED.value
    assert order.status == OrderStatus.DELIVERED.value
    assert order.delivered_at is not None
