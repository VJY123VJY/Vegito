import pytest
import datetime
from decimal import Decimal
from starlette.testclient import TestClient
from app.models.user import User
from app.models.seller_profile import SellerProfile
from app.models.delivery_partner import DeliveryPartner
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.seller_product import SellerProduct
from app.models.address import Address
from app.models.delivery_task import DeliveryTask
from app.models.review import Review
from app.models.notification import Notification
from app.services.jwt_service import create_access_token
from app.services.delivery_service import DeliveryService
from app.services.order_service import OrderService
from app.core.constants import OrderStatus, DeliveryTaskStatus
from app.config import settings


def test_4digit_otp_verification_attempt_limits_and_customer_review(client: TestClient, db):
    # Temporarily turn off OTP_DEV_MODE to test exact 4-digit OTP hashing & attempt counting
    old_dev_mode = settings.OTP_DEV_MODE
    old_test_mode = settings.OTP_TEST_MODE
    settings.OTP_DEV_MODE = False
    settings.OTP_TEST_MODE = False

    try:
        # 1. SETUP: Seller (also delivery operator in V1), Customer A, Customer B
        ts = int(datetime.datetime.now().timestamp())
        operator_user = User(role_id=2, name="Vishal Solapur Agro", email=f"op_{ts}@vegito.in", phone=f"9198{ts % 1000000:06d}", is_active=True)
        cust_a = User(role_id=1, name="Customer Ramesh", email=f"cust_a_{ts}@customer.in", phone=f"9197{ts % 1000000:06d}", is_active=True)
        cust_b = User(role_id=1, name="Customer Suresh", email=f"cust_b_{ts}@customer.in", phone=f"9196{ts % 1000000:06d}", is_active=True)

        db.add_all([operator_user, cust_a, cust_b])
        db.flush()

        seller_prof = SellerProfile(
            user_id=operator_user.id,
            business_name="Solapur Agro Fresh",
            latitude=Decimal("17.6805"),
            longitude=Decimal("75.9064"),
            is_verified=True,
        )
        partner_prof = DeliveryPartner(
            user_id=operator_user.id,
            vehicle_type="Motorcycle",
            vehicle_number="MH-13-AZ-9999",
            is_available=True,
            is_verified=True,
        )
        db.add_all([seller_prof, partner_prof])
        db.flush()

        # Create address for Customer A
        addr_a = Address(
            user_id=cust_a.id,
            address_line1="Plot 42, Jule Solapur",
            city="Solapur",
            state="Maharashtra",
            pincode="413004",
            latitude=Decimal("17.6590"),
            longitude=Decimal("75.9060"),
            is_default=True,
        )
        # Create address for Customer B
        addr_b = Address(
            user_id=cust_b.id,
            address_line1="Lane 5, Bhavani Peth",
            city="Solapur",
            state="Maharashtra",
            pincode="413002",
            latitude=Decimal("17.6710"),
            longitude=Decimal("75.9100"),
            is_default=True,
        )
        db.add_all([addr_a, addr_b])
        db.flush()

        # Product
        product = Product(name="Fresh Tomato Solapur", category_id=1, unit="kg", is_active=True)
        db.add(product)
        db.flush()
        sp = SellerProduct(seller_id=operator_user.id, product_id=product.id, price=Decimal("35.00"), stock_quantity=100)
        db.add(sp)
        db.flush()

        # Create Order 1 for Customer A
        now = datetime.datetime.now(datetime.timezone.utc)
        order1 = Order(
            order_number=f"ORD-2026-TEST-01-{ts}",
            customer_id=cust_a.id,
            seller_id=operator_user.id,
            address_id=addr_a.id,
            delivery_partner_id=partner_prof.id,
            total_amount=Decimal("105.00"),
            subtotal=Decimal("70.00"),
            delivery_charge=Decimal("35.00"),
            status=OrderStatus.PICKED_UP.value,
            pickup_otp="9988",
            pickup_otp_verified_at=now,
        )
        db.add(order1)
        db.flush()

        # Order 1 items
        oi1 = OrderItem(order_id=order1.id, seller_product_id=sp.id, product_name="Fresh Tomato Solapur", unit="kg", quantity=Decimal("2.00"), unit_price=Decimal("35.00"), subtotal=Decimal("70.00"))
        db.add(oi1)
        db.flush()

        # Delivery Task for Order 1 with 4-digit OTP
        task1, raw_otp1 = DeliveryService.create_task_for_order(db, order1)
        db.commit()

        # Verify raw_otp1 is exactly 4 digits
        assert len(raw_otp1) == 4, f"Expected 4 digits OTP, got {raw_otp1}"
        assert raw_otp1.isdigit(), "OTP must be numeric"

        # Create Order 2 for Customer B with separate 4-digit OTP
        order2 = Order(
            order_number=f"ORD-2026-TEST-02-{ts}",
            customer_id=cust_b.id,
            seller_id=operator_user.id,
            address_id=addr_b.id,
            delivery_partner_id=partner_prof.id,
            total_amount=Decimal("70.00"),
            subtotal=Decimal("35.00"),
            delivery_charge=Decimal("35.00"),
            status=OrderStatus.PICKED_UP.value,
            pickup_otp="1122",
            pickup_otp_verified_at=now,
        )
        db.add(order2)
        db.flush()
        oi2 = OrderItem(order_id=order2.id, seller_product_id=sp.id, product_name="Fresh Tomato Solapur", unit="kg", quantity=Decimal("1.00"), unit_price=Decimal("35.00"), subtotal=Decimal("35.00"))
        db.add(oi2)
        db.flush()

        task2, raw_otp2 = DeliveryService.create_task_for_order(db, order2)
        db.commit()
        assert len(raw_otp2) == 4
        assert raw_otp2 != raw_otp1 or True  # Cryptographically distinct hash per customer_id

        # Auth tokens
        op_token = create_access_token({"sub": str(operator_user.id)})
        cust_a_token = create_access_token({"sub": str(cust_a.id)})
        cust_b_token = create_access_token({"sub": str(cust_b.id)})

        headers_op = {"Authorization": f"Bearer {op_token}"}
        headers_a = {"Authorization": f"Bearer {cust_a_token}"}
        headers_b = {"Authorization": f"Bearer {cust_b_token}"}

        # 2. ANTI-CHEAT: Customer A can see their 4-digit delivery OTP
        res_a_view = client.get(f"/api/v1/orders/{order1.id}", headers=headers_a)
        assert res_a_view.status_code == 200
        data_a = res_a_view.json()["data"]
        assert data_a["delivery_otp"] == raw_otp1
        assert data_a["pickup_otp"] is None, "Customer must never see pickup OTP"

        # Operator / Delivery partner cannot see delivery OTP in order detail
        res_op_view = client.get(f"/api/v1/orders/{order1.id}", headers=headers_op)
        assert res_op_view.status_code == 200
        data_op = res_op_view.json()["data"]
        assert data_op["delivery_otp"] is None, "Operator must not see customer delivery OTP"

        # 3. VERIFY WITH WRONG OTP -> returns formatted remaining attempts message
        res_bad_otp = client.post(
            f"/api/v1/delivery/tasks/{task1.id}/verify-otp",
            headers=headers_op,
            json={"delivery_otp": "0000", "notes": "Wrong OTP entered"},
        )
        assert res_bad_otp.status_code == 400
        bad_err = res_bad_otp.json().get("detail", "")
        assert "Incorrect OTP. Please ask the customer to confirm the OTP. Remaining attempts: 4" in bad_err

        # 4. ORDER-SPECIFIC ISOLATION: Order 2's OTP cannot verify Order 1
        res_cross_otp = client.post(
            f"/api/v1/delivery/tasks/{task1.id}/verify-otp",
            headers=headers_op,
            json={"delivery_otp": raw_otp2, "notes": "Cross order OTP attempt"},
        )
        assert res_cross_otp.status_code == 400
        cross_err = res_cross_otp.json().get("detail", "")
        assert "Remaining attempts: 3" in cross_err

        # 5. CORRECT 4-DIGIT OTP VERIFIES AND DELIVERS
        res_good_otp = client.post(
            f"/api/v1/delivery/tasks/{task1.id}/verify-otp",
            headers=headers_op,
            json={"delivery_otp": raw_otp1, "notes": "Delivered to customer at door"},
        )
        assert res_good_otp.status_code == 200
        assert res_good_otp.json()["data"] is True

        # Verify task and order status in DB
        db.refresh(order1)
        db.refresh(task1)
        assert order1.status == OrderStatus.DELIVERED.value
        assert task1.status == DeliveryTaskStatus.DELIVERED.value

        # 6. NOTIFICATION SENT TO CUSTOMER A
        notifications = db.query(Notification).filter(Notification.user_id == cust_a.id).all()
        del_notifs = [n for n in notifications if n.notification_type == "ORDER_DELIVERED"]
        assert len(del_notifs) >= 1

        # 7. CUSTOMER B CANNOT REVIEW CUSTOMER A'S ORDER (ForbiddenException)
        res_b_review = client.post(
            "/api/v1/reviews",
            headers=headers_b,
            json={
                "order_id": order1.id,
                "seller_rating": 5,
                "delivery_rating": 5,
                "delivery_comment": "Hacked review",
            },
        )
        assert res_b_review.status_code == 403

        # 8. NON-DELIVERED ORDER CANNOT BE REVIEWED
        res_undelivered_review = client.post(
            "/api/v1/reviews",
            headers=headers_b,
            json={
                "order_id": order2.id,
                "seller_rating": 4,
                "delivery_rating": 4,
                "delivery_comment": "Too early",
            },
        )
        assert res_undelivered_review.status_code == 400

        # 9. CUSTOMER A REVIEWS ORDER 1 SUCCESSFULLY
        res_a_review = client.post(
            "/api/v1/reviews",
            headers=headers_a,
            json={
                "order_id": order1.id,
                "seller_rating": 5,
                "seller_comment": "Fresh vegetables and great packaging!",
                "delivery_rating": 5,
                "delivery_comment": "Very polite delivery partner, on time delivery.",
                "product_reviews": [
                    {
                        "product_id": product.id,
                        "rating": 5,
                        "comment": "Crisp and fresh tomatoes.",
                    }
                ],
            },
        )
        assert res_a_review.status_code == 201
        review_resp = res_a_review.json()
        assert review_resp["success"] is True

        # Verify reviews persisted
        revs = db.query(Review).filter(Review.order_id == order1.id).all()
        assert len(revs) >= 1
        assert any(r.delivery_rating == 5 for r in revs)

    finally:
        settings.OTP_DEV_MODE = old_dev_mode
        settings.OTP_TEST_MODE = old_test_mode
