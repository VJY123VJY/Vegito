import pytest
import datetime
from decimal import Decimal
from starlette.testclient import TestClient
from app.models.user import User
from app.models.seller_profile import SellerProfile
from app.models.delivery_partner import DeliveryPartner
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.seller_product import SellerProduct
from app.models.product import Product
from app.models.category import Category
from app.models.address import Address
from app.models.delivery_task import DeliveryTask
from app.services.jwt_service import create_access_token
from app.core.security import hash_otp
from app.core.constants import OrderStatus, DeliveryTaskStatus
from app.services.order_service import OrderService
from app.services.delivery_service import DeliveryService


@pytest.fixture
def secure_setup(db):
    seller_user = User(role_id=2, name="Farmer Shop", email="farmer@vegito.in", phone="9200000001", is_active=True)
    seller_unauth = User(role_id=2, name="Other Shop", email="other@vegito.in", phone="9200000099", is_active=True)
    dp_assigned = User(role_id=3, name="Assigned Rider", email="rider1@vegito.in", phone="9200000002", is_active=True)
    dp_unauth = User(role_id=3, name="Intruder Rider", email="rider2@vegito.in", phone="9200000003", is_active=True)
    cust_user = User(role_id=1, name="Secure Customer", email="cust@vegito.in", phone="9200000004", is_active=True)
    cust_unauth = User(role_id=1, name="Other Customer", email="cust2@vegito.in", phone="9200000005", is_active=True)

    db.add_all([seller_user, seller_unauth, dp_assigned, dp_unauth, cust_user, cust_unauth])
    db.flush()

    shop = SellerProfile(
        user_id=seller_user.id,
        business_name="Solapur Green Farm",
        latitude=Decimal("17.6805"),
        longitude=Decimal("75.9064"),
        is_verified=True,
    )
    partner_assigned = DeliveryPartner(
        user_id=dp_assigned.id,
        vehicle_type="Bike",
        vehicle_number="MH-13-AA-1111",
        is_available=True,
        is_verified=True,
    )
    partner_unauth = DeliveryPartner(
        user_id=dp_unauth.id,
        vehicle_type="Bike",
        vehicle_number="MH-13-BB-2222",
        is_available=True,
        is_verified=True,
    )
    db.add_all([shop, partner_assigned, partner_unauth])
    db.flush()

    addr = Address(
        user_id=cust_user.id,
        address_line1="Bungalow 7, Golden Nest Society",
        city="Solapur",
        state="MH",
        pincode="413005",
        latitude=Decimal("17.6920"),
        longitude=Decimal("75.9180"),
    )
    db.add(addr)
    db.flush()

    # Create category and product
    cat = Category(name="Fresh Greens", is_active=True)
    db.add(cat)
    db.flush()
    prod = Product(name="Spinach Palak", category_id=cat.id, unit="1 Bunch", is_active=True)
    db.add(prod)
    db.flush()
    sp = SellerProduct(
        seller_id=seller_user.id,
        product_id=prod.id,
        price=Decimal("40.00"),
        stock_quantity=100,
        is_available=True,
    )
    db.add(sp)
    db.flush()

    order = Order(
        order_number="VG-SEC-9901",
        customer_id=cust_user.id,
        seller_id=seller_user.id,
        address_id=addr.id,
        delivery_partner_id=partner_assigned.id,
        delivery_latitude=Decimal("17.6920"),
        delivery_longitude=Decimal("75.9180"),
        status=OrderStatus.PACKING.value,
        subtotal=Decimal("80.00"),
        delivery_charge=Decimal("25.00"),
        total_amount=Decimal("105.00"),
        payment_method="COD",
    )
    db.add(order)
    db.flush()

    item = OrderItem(
        order_id=order.id,
        seller_product_id=sp.id,
        product_name="Spinach Palak",
        unit="1 Bunch",
        quantity=Decimal("2"),
        unit_price=Decimal("40.00"),
        subtotal=Decimal("80.00"),
    )
    db.add(item)
    db.flush()

    task, _ = DeliveryService.create_task_for_order(db, order)
    task.delivery_partner_id = partner_assigned.id
    db.flush()

    seller_token = create_access_token({"sub": str(seller_user.id), "role": "SELLER", "role_id": 2})
    seller_unauth_token = create_access_token({"sub": str(seller_unauth.id), "role": "SELLER", "role_id": 2})
    dp_assigned_token = create_access_token({"sub": str(dp_assigned.id), "role": "DELIVERY_PARTNER", "role_id": 3})
    dp_unauth_token = create_access_token({"sub": str(dp_unauth.id), "role": "DELIVERY_PARTNER", "role_id": 3})
    cust_token = create_access_token({"sub": str(cust_user.id), "role": "CUSTOMER", "role_id": 1})
    cust_unauth_token = create_access_token({"sub": str(cust_unauth.id), "role": "CUSTOMER", "role_id": 1})

    return {
        "seller_user": seller_user,
        "seller_unauth": seller_unauth,
        "dp_assigned": dp_assigned,
        "dp_unauth": dp_unauth,
        "cust_user": cust_user,
        "cust_unauth": cust_unauth,
        "shop": shop,
        "partner_assigned": partner_assigned,
        "partner_unauth": partner_unauth,
        "addr": addr,
        "order": order,
        "task": task,
        "seller_token": seller_token,
        "seller_unauth_token": seller_unauth_token,
        "dp_assigned_token": dp_assigned_token,
        "dp_unauth_token": dp_unauth_token,
        "cust_token": cust_token,
        "cust_unauth_token": cust_unauth_token,
    }


def test_seller_location_privacy_and_idor(client: TestClient, db, secure_setup):
    """Sellers MUST NEVER see customer address, coordinates, or phone, and unauthorized sellers get 403."""
    d = secure_setup
    order = d["order"]
    addr = d["addr"]

    # 1. Seller viewing their order gets NULL for customer address, lat, lng, and phone
    seller_detail = OrderService.get_order_detail(db, d["seller_user"], order.id)
    assert seller_detail.address is None
    assert seller_detail.customer_latitude is None
    assert seller_detail.customer_longitude is None
    assert seller_detail.customer_phone is None
    assert seller_detail.delivery_latitude is None
    assert seller_detail.delivery_longitude is None

    # 2. Seller trying to access GET /addresses/{address_id} gets 403 Forbidden
    resp = client.get(f"/api/v1/addresses/{addr.id}", headers={"Authorization": f"Bearer {d['seller_token']}"})
    assert resp.status_code == 403

    # 3. Unauthorized seller accessing the order gets 403 Forbidden
    resp_unauth = client.get(f"/api/v1/orders/{order.id}", headers={"Authorization": f"Bearer {d['seller_unauth_token']}"})
    assert resp_unauth.status_code == 403


def test_delivery_partner_privacy_before_and_after_pickup(client: TestClient, db, secure_setup):
    """Delivery partner cannot see customer address/coords before pickup; unlocked after pickup verification."""
    d = secure_setup
    order = d["order"]
    task = d["task"]
    addr = d["addr"]

    # Seller marks READY -> generates pickup OTP
    OrderService.update_order_status(db, d["seller_user"], order.id, OrderStatus.READY.value)
    pickup_code = order.pickup_otp
    assert pickup_code is not None

    # 1. Before pickup verification: task has NO delivery_address and NO customer coords
    task_res = client.get(f"/api/v1/delivery/tasks/{task.id}", headers={"Authorization": f"Bearer {d['dp_assigned_token']}"})
    assert task_res.status_code == 200
    task_data = task_res.json()["data"]
    assert task_data["delivery_address"] is None
    assert task_data["customer_latitude"] is None
    assert task_data["customer_longitude"] is None
    assert task_data["customer_phone"] is None
    # Anti-cheat requirement: pickup_otp MUST NOT be returned in API to delivery partner
    assert task_data["pickup_otp"] is None

    # 2. Direct address access before pickup verification is 403 Forbidden
    addr_res = client.get(f"/api/v1/addresses/{addr.id}", headers={"Authorization": f"Bearer {d['dp_assigned_token']}"})
    assert addr_res.status_code == 403

    # 3. Delivery partner CANNOT complete delivery before pickup verification (Prerequisite enforcement)
    doorstep_otp = "1234"
    comp_res = client.post(
        f"/api/v1/delivery/tasks/{task.id}/verify-otp",
        headers={"Authorization": f"Bearer {d['dp_assigned_token']}"},
        json={"delivery_otp": doorstep_otp},
    )
    assert comp_res.status_code == 400
    assert "pickup" in (comp_res.json().get("detail") or comp_res.json().get("error", {}).get("message", "")).lower()

    # 4. Delivery partner verifies pickup OTP from seller
    verify_res = client.post(
        f"/api/v1/delivery/tasks/{task.id}/verify-pickup",
        headers={"Authorization": f"Bearer {d['dp_assigned_token']}"},
        json={"otp": pickup_code},
    )
    assert verify_res.status_code == 200

    # 5. After pickup verification: customer address and coordinates are UNLOCKED
    task_after = client.get(f"/api/v1/delivery/tasks/{task.id}", headers={"Authorization": f"Bearer {d['dp_assigned_token']}"}).json()["data"]
    assert task_after["delivery_address"] is not None
    assert task_after["delivery_address"]["address_line1"] == addr.address_line1
    assert float(task_after["customer_latitude"]) == float(addr.latitude)
    assert float(task_after["customer_longitude"]) == float(addr.longitude)
    assert task_after["customer_phone"] == d["cust_user"].phone
    assert task_after["pickup_verified"] is True

    # 6. Direct address access now succeeds
    addr_unlocked = client.get(f"/api/v1/addresses/{addr.id}", headers={"Authorization": f"Bearer {d['dp_assigned_token']}"})
    assert addr_unlocked.status_code == 200
    assert addr_unlocked.json()["data"]["address_line1"] == addr.address_line1


def test_delivery_partner_idor_prevention(client: TestClient, db, secure_setup):
    """Intruder delivery partner cannot access another partner's task or perform pickup/delivery verification."""
    d = secure_setup
    task = d["task"]

    # Intruder partner cannot get task details
    resp = client.get(f"/api/v1/delivery/tasks/{task.id}", headers={"Authorization": f"Bearer {d['dp_unauth_token']}"})
    assert resp.status_code == 403

    # Intruder partner cannot verify pickup
    resp_pickup = client.post(
        f"/api/v1/delivery/tasks/{task.id}/verify-pickup",
        headers={"Authorization": f"Bearer {d['dp_unauth_token']}"},
        json={"otp": "123456"},
    )
    assert resp_pickup.status_code == 403

    # Intruder partner cannot complete delivery
    resp_complete = client.post(
        f"/api/v1/delivery/tasks/{task.id}/verify-otp",
        headers={"Authorization": f"Bearer {d['dp_unauth_token']}"},
        json={"delivery_otp": "1234"},
    )
    assert resp_complete.status_code == 403
