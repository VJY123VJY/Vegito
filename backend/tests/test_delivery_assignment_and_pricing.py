import pytest
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
from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.services.jwt_service import create_access_token
from app.core.constants import OrderStatus, DeliveryTaskStatus
from app.services.delivery_service import calculate_haversine_distance_km
from app.services.delivery_pricing_service import DeliveryPricingService


def test_distance_based_delivery_pricing_bands_and_over_limit(client: TestClient, db):
    # Setup Seller & Shop at Solapur Market (17.6805, 75.9064)
    seller_user = User(role_id=2, name="Test Seller 101", email="seller101@vegito.in", phone="9111000001", is_active=True)
    cust_user = User(role_id=1, name="Test Customer 101", email="cust101@vegito.in", phone="9111000002", is_active=True)
    db.add_all([seller_user, cust_user])
    db.flush()

    shop = SellerProfile(
        user_id=seller_user.id,
        business_name="Solapur Market Farm Store",
        latitude=Decimal("17.6805"),
        longitude=Decimal("75.9064"),
        is_verified=True,
    )
    db.add(shop)
    db.flush()

    # Address 1: 0.5 km away (Tier 1: <= 1 km -> ₹20.00)
    # Approx 0.004 deg lat ~ 0.44 km
    # Address 1: 0.5 km away (Tier 1: <= 1 km -> ₹20.00)
    addr_tier1 = Address(user_id=cust_user.id, address_line1="Near Market 0.5km", city="Solapur", state="MH", pincode="413001", latitude=Decimal("17.6840"), longitude=Decimal("75.9064"))
    
    # Address 2: ~1.5 km away (Tier 2: 1-3 km -> ₹30.00)
    addr_tier2 = Address(user_id=cust_user.id, address_line1="Colony 1.5km", city="Solapur", state="MH", pincode="413002", latitude=Decimal("17.6900"), longitude=Decimal("75.9064"))

    # Address 3: ~3.9 km away (Tier 3: 3-5 km -> ₹40.00)
    addr_tier3 = Address(user_id=cust_user.id, address_line1="Outer Ring 3.9km", city="Solapur", state="MH", pincode="413003", latitude=Decimal("17.7156"), longitude=Decimal("75.9064"))

    # Address 4: ~5.5 km away (Tier 4: 5-6 km -> ₹50.00)
    addr_tier4 = Address(user_id=cust_user.id, address_line1="Suburb 5.5km", city="Solapur", state="MH", pincode="413004", latitude=Decimal("17.7300"), longitude=Decimal("75.9064"))

    # Address 5: 18.0 km away (> 15 km -> BLOCKED)
    addr_outside = Address(user_id=cust_user.id, address_line1="Highway Bypass 18km", city="Solapur", state="MH", pincode="413008", latitude=Decimal("17.8500"), longitude=Decimal("75.9064"))

    db.add_all([addr_tier1, addr_tier2, addr_tier3, addr_tier4, addr_outside])
    db.commit()

    # Verify Service Calculations
    fee1, dist1 = DeliveryPricingService.calculate_delivery_distance_and_fee(db, addr_tier1.id, seller_user.id)
    assert dist1 <= 1.0
    assert fee1 == Decimal("20.00")

    fee2, dist2 = DeliveryPricingService.calculate_delivery_distance_and_fee(db, addr_tier2.id, seller_user.id)
    assert 1.0 < dist2 <= 3.0
    assert fee2 == Decimal("30.00")

    fee3, dist3 = DeliveryPricingService.calculate_delivery_distance_and_fee(db, addr_tier3.id, seller_user.id)
    assert 3.0 < dist3 <= 5.0
    assert fee3 == Decimal("40.00")

    fee4, dist4 = DeliveryPricingService.calculate_delivery_distance_and_fee(db, addr_tier4.id, seller_user.id)
    assert 5.0 < dist4 <= 6.0
    assert fee4 == Decimal("50.00")

    # Address outside 15 km must raise exception
    with pytest.raises(Exception) as exc_info:
        DeliveryPricingService.calculate_delivery_distance_and_fee(db, addr_outside.id, seller_user.id)
    assert "outside our 15 KM delivery area" in str(exc_info.value)

    # Test HTTP Endpoint GET /orders/delivery-fee
    cust_token = create_access_token({"sub": str(cust_user.id), "role": "CUSTOMER", "role_id": 1})
    headers = {"Authorization": f"Bearer {cust_token}"}

    res1 = client.get(f"/api/v1/orders/delivery-fee?address_id={addr_tier1.id}&seller_id={seller_user.id}", headers=headers)
    assert res1.status_code == 200
    assert res1.json()["data"]["delivery_fee"] == 20.0

    res_out = client.get(f"/api/v1/orders/delivery-fee?address_id={addr_outside.id}&seller_id={seller_user.id}", headers=headers)
    assert res_out.status_code == 400
    assert "outside our 15 KM delivery area" in res_out.text


def test_checkout_blocks_outside_area_and_accepts_valid_address(client: TestClient, db):
    # Setup Customer, Seller, Products, and Addresses
    seller_user = User(role_id=2, name="Test Seller 102", email="seller102@vegito.in", phone="9111000003", is_active=True)
    cust_user = User(role_id=1, name="Test Customer 102", email="cust102@vegito.in", phone="9111000004", is_active=True)
    db.add_all([seller_user, cust_user])
    db.flush()

    shop = SellerProfile(
        user_id=seller_user.id,
        business_name="Solapur Market Farm Store 2",
        latitude=Decimal("17.6805"),
        longitude=Decimal("75.9064"),
        is_verified=True,
    )
    db.add(shop)

    prod = Product(name="Spinach Leaves", unit="bunch", category_id=1, is_active=True)
    db.add(prod)
    db.flush()

    sp = SellerProduct(seller_id=seller_user.id, product_id=prod.id, price=Decimal("25.00"), stock_quantity=100, is_available=True)
    db.add(sp)

    addr_valid = Address(user_id=cust_user.id, address_line1="Close Address 1.2km", city="Solapur", state="MH", pincode="413001", latitude=Decimal("17.6910"), longitude=Decimal("75.9064"))
    addr_far = Address(user_id=cust_user.id, address_line1="Far Beyond 18km", city="Solapur", state="MH", pincode="413005", latitude=Decimal("17.8500"), longitude=Decimal("75.9064"))
    db.add_all([addr_valid, addr_far])
    db.commit()

    cust_token = create_access_token({"sub": str(cust_user.id), "role": "CUSTOMER", "role_id": 1})
    headers = {"Authorization": f"Bearer {cust_token}"}

    # Add item to cart
    add_res = client.post("/api/v1/cart/items", json={"seller_product_id": sp.id, "quantity": 2}, headers=headers)
    assert add_res.status_code == 201

    # Attempt Checkout with Far Address (> 15km) -> MUST FAIL with 400
    bad_res = client.post(
        "/api/v1/orders",
        json={"address_id": addr_far.id, "payment_method": "COD"},
        headers=headers,
    )
    assert bad_res.status_code == 400
    assert "outside our 15 KM delivery area" in bad_res.text

    # Checkout with Valid Address (approx 1.2 km -> ₹30 fee) -> MUST SUCCEED
    ok_res = client.post(
        "/api/v1/orders",
        json={"address_id": addr_valid.id, "payment_method": "COD"},
        headers=headers,
    )
    assert ok_res.status_code == 201
    order_data = ok_res.json()["data"]
    assert float(order_data["delivery_charge"]) == 30.0
    assert float(order_data["subtotal"]) == 50.0  # 2 * 25.0
    assert float(order_data["total_amount"]) == 80.0  # 50 + 30


def test_seller_ready_assigns_partner_and_enforces_concurrency(client: TestClient, db):
    # Setup Seller, 2 Delivery Partners, 1 Customer
    seller = User(role_id=2, name="Organic Garden Seller", email="seller_og@vegito.in", phone="9111000005", is_active=True)
    rider_busy = User(role_id=3, name="Rider Busy", email="rider_busy@vegito.in", phone="9111000006", is_active=True)
    rider_free = User(role_id=3, name="Rider Free", email="rider_free@vegito.in", phone="9111000007", is_active=True)
    cust = User(role_id=1, name="Happy Buyer", email="buyer@vegito.in", phone="9111000008", is_active=True)

    db.add_all([seller, rider_busy, rider_free, cust])
    db.flush()

    shop = SellerProfile(
        user_id=seller.id,
        business_name="Organic Garden Store",
        latitude=Decimal("17.6805"),
        longitude=Decimal("75.9064"),
        is_verified=True,
    )
    p_busy = DeliveryPartner(user_id=rider_busy.id, vehicle_type="Motorbike", is_available=True, is_verified=True)
    p_free = DeliveryPartner(user_id=rider_free.id, vehicle_type="Bicycle", is_available=True, is_verified=True)
    db.add_all([shop, p_busy, p_free])
    db.flush()

    # Rider busy location: 0.5 km from shop
    loc_busy = DeliveryPartnerLocation(delivery_partner_id=p_busy.id, latitude=Decimal("17.6840"), longitude=Decimal("75.9064"))
    # Rider free location: 1.0 km from shop
    loc_free = DeliveryPartnerLocation(delivery_partner_id=p_free.id, latitude=Decimal("17.6890"), longitude=Decimal("75.9064"))
    db.add_all([loc_busy, loc_free])

    # Address
    addr = Address(user_id=cust.id, address_line1="Home 1", city="Solapur", state="MH", pincode="413001", latitude=Decimal("17.6850"), longitude=Decimal("75.9064"))
    db.add(addr)

    # Product & Seller Product
    prod = Product(name="Organic Carrots", unit="1kg", category_id=1, is_active=True)
    db.add(prod)
    db.flush()
    sp = SellerProduct(seller_id=seller.id, product_id=prod.id, price=Decimal("60.00"), stock_quantity=50, is_available=True)
    db.add(sp)
    db.commit()

    # Step 1: Give rider_busy an ACTIVE ongoing delivery (order_x in OUT_FOR_DELIVERY)
    order_x = Order(
        order_number="VG-CONCUR-001",
        customer_id=cust.id,
        seller_id=seller.id,
        address_id=addr.id,
        status="OUT_FOR_DELIVERY",
        payment_method="COD",
        subtotal=Decimal("60.00"),
        delivery_charge=Decimal("20.00"),
        total_amount=Decimal("80.00"),
        delivery_partner_id=p_busy.id,
    )
    db.add(order_x)
    db.flush()

    task_x = DeliveryTask(order_id=order_x.id, delivery_partner_id=p_busy.id, status="STARTED")
    db.add(task_x)
    db.commit()

    # Step 2: Create a fresh new order for Seller to accept and pack
    order_new = Order(
        order_number="VG-CONCUR-002",
        customer_id=cust.id,
        seller_id=seller.id,
        address_id=addr.id,
        status="NEW",
        payment_method="COD",
        subtotal=Decimal("60.00"),
        delivery_charge=Decimal("20.00"),
        total_amount=Decimal("80.00"),
    )
    db.add(order_new)
    db.flush()
    item_new = OrderItem(order_id=order_new.id, seller_product_id=sp.id, product_name="Organic Carrots", unit="1kg", quantity=1, unit_price=Decimal("60.00"), subtotal=Decimal("60.00"))
    db.add(item_new)
    task_new = DeliveryTask(order_id=order_new.id, status="ASSIGNED")
    db.add(task_new)
    db.commit()

    seller_token = create_access_token({"sub": str(seller.id), "role": "SELLER", "role_id": 2})
    s_headers = {"Authorization": f"Bearer {seller_token}"}

    # Step 3: Seller ACCEPTS order
    res_accept = client.patch(f"/api/v1/seller/orders/{order_new.id}/status", json={"status": "ACCEPTED"}, headers=s_headers)
    assert res_accept.status_code == 200
    assert res_accept.json()["data"]["status"] == "ACCEPTED"

    # Step 4: Seller STARTS PACKING
    res_pack = client.patch(f"/api/v1/seller/orders/{order_new.id}/status", json={"status": "PACKING"}, headers=s_headers)
    assert res_pack.status_code == 200
    assert res_pack.json()["data"]["status"] == "PACKING"

    # Step 5: Seller MARKS READY
    # Concurrency test: rider_busy is closer (0.5 km) BUT busy with order_x!
    # Therefore, system MUST assign rider_free (1.0 km)!
    res_ready = client.patch(f"/api/v1/seller/orders/{order_new.id}/status", json={"status": "READY_FOR_PICKUP"}, headers=s_headers)
    assert res_ready.status_code == 200
    ready_data = res_ready.json()["data"]
    assert ready_data["status"] == "READY_FOR_PICKUP"
    assert ready_data["delivery_partner_id"] == p_free.id
    assert ready_data["assignment_status"] == "ASSIGNED"
    assert ready_data["delivery_task_id"] == task_new.id

    # Step 6: Verify Delivery Partner can list tasks via both endpoints
    free_token = create_access_token({"sub": str(rider_free.id), "role": "DELIVERY_PARTNER", "role_id": 3})
    f_headers = {"Authorization": f"Bearer {free_token}"}

    res_tasks = client.get("/api/v1/delivery/tasks", headers=f_headers)
    assert res_tasks.status_code == 200
    tasks_list = res_tasks.json()["data"]
    assert any(t["order_id"] == order_new.id for t in tasks_list)

    res_alias = client.get("/api/v1/delivery/orders", headers=f_headers)
    assert res_alias.status_code == 200
    alias_list = res_alias.json()["data"]
    assert any(t["order_id"] == order_new.id for t in alias_list)
