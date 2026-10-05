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
from app.models.address import Address
from app.services.jwt_service import create_access_token
from app.core.constants import OrderStatus


def test_registration_and_login_role_assignment(client: TestClient, db):
    ts = int(datetime.datetime.now().timestamp())
    
    # 1. Customer Registration
    cust_phone = f"9191{ts % 1000000:06d}"
    cust_resp = client.post("/api/v1/auth/register/customer", json={
        "name": "E2E Customer Test",
        "phone": cust_phone,
        "email": f"cust_reg_{ts}@vegito.in",
        "password": "Password123!",
    })
    assert cust_resp.status_code == 201, cust_resp.text
    cust_data = cust_resp.json()["data"]
    assert cust_data["role"] == "CUSTOMER"

    # Customer Login with Password
    cust_login_resp = client.post("/api/v1/auth/login", json={
        "phone": cust_phone,
        "password": "Password123!"
    })
    assert cust_login_resp.status_code == 200, cust_login_resp.text
    login_data = cust_login_resp.json()["data"]
    assert login_data["role"] == "CUSTOMER"
    assert login_data["authorized_roles"] == ["CUSTOMER"]

    # 2. Seller Registration
    seller_phone = f"9192{ts % 1000000:06d}"
    seller_resp = client.post("/api/v1/auth/register/seller", json={
        "name": "E2E Seller Owner",
        "phone": seller_phone,
        "email": f"seller_reg_{ts}@vegito.in",
        "password": "Password123!",
        "business_name": "E2E Organic Store",
        "business_address": "Market Yard Solapur",
    })
    assert seller_resp.status_code == 201, seller_resp.text
    seller_data = seller_resp.json()["data"]
    assert seller_data["role"] == "SELLER"

    # Seller Login with Password
    seller_login_resp = client.post("/api/v1/auth/login", json={
        "phone": seller_phone,
        "password": "Password123!"
    })
    assert seller_login_resp.status_code == 200, seller_login_resp.text
    seller_login_data = seller_login_resp.json()["data"]
    assert seller_login_data["role"] == "SELLER"
    assert "SELLER" in seller_login_data["authorized_roles"]

    # 3. Delivery Partner Registration
    rider_phone = f"9193{ts % 1000000:06d}"
    rider_resp = client.post("/api/v1/auth/register/delivery-partner", json={
        "name": "E2E Delivery Hero",
        "phone": rider_phone,
        "email": f"rider_reg_{ts}@vegito.in",
        "password": "Password123!",
        "vehicle_type": "Motorcycle",
        "vehicle_number": "MH-13-EE-1234",
    })
    assert rider_resp.status_code == 201, rider_resp.text
    rider_data = rider_resp.json()["data"]
    assert rider_data["role"] == "DELIVERY_PARTNER"

    # Delivery Partner Login with Password
    rider_login_resp = client.post("/api/v1/auth/login", json={
        "phone": rider_phone,
        "password": "Password123!"
    })
    assert rider_login_resp.status_code == 200, rider_login_resp.text
    rider_login_data = rider_login_resp.json()["data"]
    assert rider_login_data["role"] == "DELIVERY_PARTNER"
    assert rider_login_data["authorized_roles"] == ["DELIVERY_PARTNER"]


def test_unified_operator_workspace_switching(client: TestClient, db):
    ts = int(datetime.datetime.now().timestamp())
    operator = User(
        role_id=2, # SELLER
        name="Operator Dual Role",
        email=f"operator_{ts}@vegito.in",
        phone=f"9194{ts % 1000000:06d}",
        is_active=True
    )
    db.add(operator)
    db.flush()

    seller_prof = SellerProfile(
        user_id=operator.id,
        business_name="Solapur Dual Mart",
        latitude=Decimal("17.6599"),
        longitude=Decimal("75.9064"),
        is_verified=True
    )
    delivery_prof = DeliveryPartner(
        user_id=operator.id,
        vehicle_type="Motorcycle",
        vehicle_number="MH-13-OP-5555",
        is_verified=True,
        is_available=True
    )
    db.add_all([seller_prof, delivery_prof])
    db.commit()

    # Get Me for operator
    seller_token = create_access_token({"sub": str(operator.id), "role": "SELLER", "phone": operator.phone})
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {seller_token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()["data"]
    assert set(me_data["authorized_roles"]) == {"SELLER", "DELIVERY_PARTNER"}
    assert me_data["role_name"] == "SELLER"

    # Switch to DELIVERY_PARTNER workspace
    switch_resp = client.post(
        "/api/v1/auth/switch-workspace",
        json={"target_role": "DELIVERY_PARTNER"},
        headers={"Authorization": f"Bearer {seller_token}"}
    )
    assert switch_resp.status_code == 200, switch_resp.text
    switch_data = switch_resp.json()["data"]
    assert switch_data["role"] == "DELIVERY_PARTNER"
    new_token = switch_data["access_token"]

    # Verify new token acts with DELIVERY_PARTNER role
    me_resp_switched = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {new_token}"})
    assert me_resp_switched.status_code == 200
    assert me_resp_switched.json()["data"]["role_name"] == "DELIVERY_PARTNER"

    # Switch back to SELLER workspace
    switch_back_resp = client.post(
        "/api/v1/auth/switch-workspace",
        json={"target_role": "SELLER"},
        headers={"Authorization": f"Bearer {new_token}"}
    )
    assert switch_back_resp.status_code == 200
    assert switch_back_resp.json()["data"]["role"] == "SELLER"


def test_customer_data_isolation(client: TestClient, db):
    ts = int(datetime.datetime.now().timestamp())
    cust_a = User(role_id=1, name="Customer Alice", email=f"alice_{ts}@vegito.in", phone=f"9190{ts % 1000000:06d}", is_active=True)
    cust_b = User(role_id=1, name="Customer Bob", email=f"bob_{ts}@vegito.in", phone=f"9189{ts % 1000000:06d}", is_active=True)
    seller_u = User(role_id=2, name="Farmer Rao", email=f"rao_{ts}@vegito.in", phone=f"9188{ts % 1000000:06d}", is_active=True)
    db.add_all([cust_a, cust_b, seller_u])
    db.flush()

    seller_prof = SellerProfile(user_id=seller_u.id, business_name="Rao Organics", is_verified=True)
    addr_a = Address(user_id=cust_a.id, address_line1="Alice Home", city="Solapur", state="Maharashtra", pincode="413001")
    addr_b = Address(user_id=cust_b.id, address_line1="Bob Home", city="Solapur", state="Maharashtra", pincode="413002")
    prod = Product(name=f"Fresh Palak {ts}", unit="bundle", category_id=1)
    db.add_all([seller_prof, addr_a, addr_b, prod])
    db.flush()

    sp = SellerProduct(seller_id=seller_u.id, product_id=prod.id, price=Decimal("20.00"), stock_quantity=100)
    db.add(sp)
    db.flush()

    # Create order for Alice
    order_a = Order(
        order_number=f"ORD-{ts}-001",
        customer_id=cust_a.id,
        seller_id=seller_u.id,
        address_id=addr_a.id,
        total_amount=Decimal("40.00"),
        subtotal=Decimal("40.00"),
        status=OrderStatus.ORDER_PLACED.value
    )
    db.add(order_a)
    db.flush()

    order_item = OrderItem(
        order_id=order_a.id,
        seller_product_id=sp.id,
        product_name=prod.name,
        unit="bundle",
        quantity=Decimal("2"),
        unit_price=Decimal("20.00"),
        subtotal=Decimal("40.00")
    )
    db.add(order_item)
    db.commit()

    token_a = create_access_token({"sub": str(cust_a.id), "role": "CUSTOMER", "phone": cust_a.phone})
    token_b = create_access_token({"sub": str(cust_b.id), "role": "CUSTOMER", "phone": cust_b.phone})

    # 1. Alice can view her order
    resp_a = client.get(f"/api/v1/orders/{order_a.id}", headers={"Authorization": f"Bearer {token_a}"})
    assert resp_a.status_code == 200
    assert resp_a.json()["data"]["id"] == order_a.id

    # 2. Bob CANNOT view Alice's order (returns 403 or 404)
    resp_b = client.get(f"/api/v1/orders/{order_a.id}", headers={"Authorization": f"Bearer {token_b}"})
    assert resp_b.status_code in [403, 404]

    # 3. Bob CANNOT access Seller endpoints
    seller_endpoint_resp = client.get("/api/v1/seller/orders", headers={"Authorization": f"Bearer {token_b}"})
    assert seller_endpoint_resp.status_code in [401, 403]

    # 4. Bob CANNOT access Delivery endpoints
    delivery_endpoint_resp = client.get("/api/v1/delivery/tasks", headers={"Authorization": f"Bearer {token_b}"})
    assert delivery_endpoint_resp.status_code in [401, 403]
