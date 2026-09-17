import pytest
from decimal import Decimal
from app.models.user import User
from app.models.seller_profile import SellerProfile
from app.models.delivery_partner import DeliveryPartner
from app.models.order import Order
from app.models.product import Product
from app.models.seller_product import SellerProduct
from app.models.review import Review
from app.models.complaint import Complaint
from app.models.address import Address
from app.models.notification import Notification
from app.services.jwt_service import create_access_token


def test_sidebar_endpoints_integration(client, db):
    # Setup users
    customer = User(role_id=1, name="Priya Patil", email="priya@vegito.com", phone="9988776611", is_active=True)
    seller = User(role_id=2, name="Ramesh Kale", email="ramesh@farm.com", phone="9988776612", is_active=True)
    partner = User(role_id=3, name="Anil Shinde", email="anil@delivery.com", phone="9988776613", is_active=True)
    db.add_all([customer, seller, partner])
    db.flush()

    # Seller Profile
    sp = SellerProfile(
        user_id=seller.id,
        business_name="Solapur Fresh Veggies",
        business_type="Organic Farm",
    )
    # Delivery Partner
    dp = DeliveryPartner(
        user_id=partner.id,
        vehicle_type="EV Bike",
        vehicle_number="MH-13-EV-9999",
        is_available=True,
        is_verified=True,
    )
    # Address
    addr = Address(
        user_id=customer.id,
        address_line1="Plot 45, Hotgi Road",
        city="Solapur",
        state="Maharashtra",
        pincode="413003",
    )
    # Product
    prod = Product(
        name="Fresh Cauliflower",
        unit="piece",
        category_id=1,
        is_active=True,
    )
    db.add_all([sp, dp, addr, prod])
    db.flush()

    # Seller Product
    sel_prod = SellerProduct(
        seller_id=seller.id,
        product_id=prod.id,
        price=Decimal("35.00"),
        is_available=True,
    )
    db.add(sel_prod)
    db.flush()

    # Completed Order
    ord1 = Order(
        order_number="VGTEST-001",
        customer_id=customer.id,
        seller_id=seller.id,
        address_id=addr.id,
        delivery_partner_id=dp.id,
        status="DELIVERED",
        total_amount=Decimal("150.00"),
    )
    # Pending Order
    ord2 = Order(
        order_number="VGTEST-002",
        customer_id=customer.id,
        seller_id=seller.id,
        address_id=addr.id,
        delivery_partner_id=dp.id,
        status="READY_FOR_PICKUP",
        total_amount=Decimal("200.00"),
    )
    db.add_all([ord1, ord2])
    db.flush()

    # Review
    rev = Review(
        order_id=ord1.id,
        customer_id=customer.id,
        seller_id=seller.id,
        product_id=prod.id,
        product_rating=5,
        seller_rating=5,
        comment="Extremely fresh cauliflower!",
    )
    # Complaint
    comp = Complaint(
        order_id=ord1.id,
        customer_id=customer.id,
        complaint_type="DELIVERY_DELAY",
        description="Delivery arrived 10 minutes late.",
        status="RESOLVED",
    )
    # Notification
    notif = Notification(
        user_id=customer.id,
        notification_type="ORDER_UPDATE",
        title="Order Delivered",
        message="Your fresh cauliflower has arrived!",
        channel="IN_APP",
        is_sent=True,
    )
    db.add_all([rev, comp, notif])
    db.commit()

    # Generate tokens
    customer_token = create_access_token({"sub": str(customer.id), "role_id": 1})
    seller_token = create_access_token({"sub": str(seller.id), "role_id": 2})
    delivery_token = create_access_token({"sub": str(partner.id), "role_id": 3})

    # 1. Test Seller Earnings
    resp = client.get("/api/v1/seller/earnings", headers={"Authorization": f"Bearer {seller_token}"})
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["total_revenue"] == 150.0
    assert data["pending_amount"] == 200.0
    assert data["delivered_orders_count"] == 1
    assert data["pending_orders_count"] == 1
    assert len(data["transactions"]) == 1
    assert data["transactions"][0]["order_number"] == "VGTEST-001"

    # 2. Test Seller Reviews
    resp = client.get("/api/v1/seller/reviews", headers={"Authorization": f"Bearer {seller_token}"})
    assert resp.status_code == 200, resp.text
    reviews = resp.json()["data"]
    assert len(reviews) == 1
    assert reviews[0]["rating"] == 5
    assert "Extremely fresh" in reviews[0]["comment"]

    # 3. Test Seller Complaints
    resp = client.get("/api/v1/seller/complaints", headers={"Authorization": f"Bearer {seller_token}"})
    assert resp.status_code == 200, resp.text
    complaints = resp.json()["data"]
    assert len(complaints) == 1
    assert complaints[0]["order_number"] == "VGTEST-001"
    assert complaints[0]["complaint_type"] == "DELIVERY_DELAY"

    # 4. Test Delivery Partner Profile GET & PATCH
    resp = client.get("/api/v1/delivery/profile", headers={"Authorization": f"Bearer {delivery_token}"})
    assert resp.status_code == 200, resp.text
    prof = resp.json()["data"]
    assert prof["vehicle_type"] == "EV Bike"
    assert prof["name"] == "Anil Shinde"

    resp = client.patch(
        "/api/v1/delivery/profile",
        json={"vehicle_number": "MH-13-EV-8888", "name": "Anil S."},
        headers={"Authorization": f"Bearer {delivery_token}"},
    )
    assert resp.status_code == 200, resp.text
    updated = resp.json()["data"]
    assert updated["vehicle_number"] == "MH-13-EV-8888"
    assert updated["name"] == "Anil S."

    # 5. Test Customer Notifications
    resp = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {customer_token}"})
    assert resp.status_code == 200, resp.text
    notifs = resp.json()["data"]
    assert len(notifs) == 1
    assert notifs[0]["title"] == "Order Delivered"

    # 6. Test Customer Profile
    resp = client.get("/api/v1/customers/me", headers={"Authorization": f"Bearer {customer_token}"})
    assert resp.status_code == 200, resp.text
    cust_prof = resp.json()["data"]
    assert cust_prof["user"]["name"] == "Priya Patil"
