import pytest
import uuid
from decimal import Decimal
from app.models.user import User
from app.models.seller_profile import SellerProfile
from app.models.delivery_partner import DeliveryPartner
from app.models.order import Order
from app.models.address import Address
from app.services.jwt_service import create_access_token


def test_batch_creation_and_lifecycle(client, db):
    uid_suffix = uuid.uuid4().hex[:6]
    seller_user = User(
        role_id=2,
        name="Omkar Seller",
        email=f"omkar_{uid_suffix}@vegito.com",
        phone=f"99{uid_suffix[:8]}",
        is_active=True,
    )
    customer = User(
        role_id=1,
        name="Sunita Customer",
        email=f"sunita_{uid_suffix}@vegito.com",
        phone=f"98{uid_suffix[:8]}",
        is_active=True,
    )
    db.add_all([seller_user, customer])
    db.flush()

    seller_addr = Address(
        user_id=seller_user.id,
        address_line1="Solapur APMC Market",
        city="Solapur",
        state="Maharashtra",
        pincode="413002",
        latitude=Decimal("17.6599"),
        longitude=Decimal("75.9064"),
    )
    addr1 = Address(
        user_id=customer.id,
        address_line1="Jule Solapur Sector 2",
        landmark="Near D-Mart",
        city="Solapur",
        state="Maharashtra",
        pincode="413004",
        latitude=Decimal("17.6700"),
        longitude=Decimal("75.9100"),
    )
    addr2 = Address(
        user_id=customer.id,
        address_line1="Ashok Chowk",
        landmark="Near Datta Temple",
        city="Solapur",
        state="Maharashtra",
        pincode="413005",
        latitude=Decimal("17.6620"),
        longitude=Decimal("75.9080"),
    )
    db.add_all([seller_addr, addr1, addr2])
    db.flush()

    sp = SellerProfile(
        user_id=seller_user.id,
        business_name="Solapur Central Depot",
        address_id=seller_addr.id,
        latitude=Decimal("17.6599"),
        longitude=Decimal("75.9064"),
    )
    dp = DeliveryPartner(
        user_id=seller_user.id,
        vehicle_type="Bike",
        vehicle_number="MH-13-BK-1010",
        is_available=True,
        is_verified=True,
    )
    db.add_all([sp, dp])
    db.flush()

    o1 = Order(
        order_number=f"VG-B1-{uid_suffix}",
        customer_id=customer.id,
        seller_id=seller_user.id,
        address_id=addr1.id,
        total_amount=Decimal("250.00"),
        status="READY",
    )
    o2 = Order(
        order_number=f"VG-B2-{uid_suffix}",
        customer_id=customer.id,
        seller_id=seller_user.id,
        address_id=addr2.id,
        total_amount=Decimal("450.00"),
        status="READY",
    )
    db.add_all([o1, o2])
    db.flush()

    token = create_access_token({"sub": str(seller_user.id), "role_id": 2})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Suggest grouping
    resp = client.get("/api/v1/delivery-batches/suggest-grouping", headers=headers)
    assert resp.status_code == 200
    suggestions = resp.json()["data"]
    assert len(suggestions) >= 1
    assert suggestions[0]["order_count"] >= 2

    # 2. Create batch using order_ids
    payload = {
        "order_ids": [o1.id, o2.id],
        "notes": "Morning Round 1",
    }
    create_resp = client.post("/api/v1/delivery-batches", json=payload, headers=headers)
    assert create_resp.status_code == 201
    batch_data = create_resp.json()["data"]
    batch_id = batch_data["id"]
    assert batch_data["total_orders"] == 2
    assert batch_data["status"] == "READY"
    assert len(batch_data["tasks"]) == 2

    # 3. List batches
    list_resp = client.get("/api/v1/delivery-batches", headers=headers)
    assert list_resp.status_code == 200
    batches = list_resp.json()["data"]
    assert any(b["id"] == batch_id for b in batches)

    # 4. Start batch
    start_resp = client.post(f"/api/v1/delivery-batches/{batch_id}/start", headers=headers)
    assert start_resp.status_code == 200
    assert start_resp.json()["data"]["status"] == "IN_PROGRESS"

    # Verify orders are now OUT_FOR_DELIVERY
    db.refresh(o1)
    db.refresh(o2)
    assert o1.status == "OUT_FOR_DELIVERY"
    assert o2.status == "OUT_FOR_DELIVERY"

    # 5. Complete batch
    comp_resp = client.post(f"/api/v1/delivery-batches/{batch_id}/complete", headers=headers)
    assert comp_resp.status_code == 200
    assert comp_resp.json()["data"]["status"] == "COMPLETED"


def test_batch_enforces_max_10_limit(client, db):
    uid_suffix = uuid.uuid4().hex[:6]
    seller_user = User(
        role_id=2,
        name="Limit Seller",
        email=f"limit_{uid_suffix}@vegito.com",
        phone=f"97{uid_suffix[:8]}",
        is_active=True,
    )
    db.add(seller_user)
    db.flush()

    sp = SellerProfile(user_id=seller_user.id, business_name="Limit Shop")
    dp = DeliveryPartner(user_id=seller_user.id, is_available=True, is_verified=True)
    db.add_all([sp, dp])
    db.flush()

    token = create_access_token({"sub": str(seller_user.id), "role_id": 2})
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to create batch with 11 orders
    payload = {"order_ids": list(range(1, 12))}
    resp = client.post("/api/v1/delivery-batches", json=payload, headers=headers)
    assert resp.status_code == 400
    assert "exceeds maximum allowed limit" in resp.json()["detail"] or "Selected orders exceed" in resp.json()["detail"]
