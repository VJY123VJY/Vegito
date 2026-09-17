import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.order import Order
from app.models.delivery_partner import DeliveryPartner
from app.models.address import Address
from app.services.jwt_service import create_access_token
from app.core.constants import OrderStatus

client = TestClient(app)

def test_websocket_tracking_flow():
    db = SessionLocal()
    try:
        # Create test customer
        cust = db.query(User).filter(User.phone == "9988776655").first()
        if not cust:
            cust = User(role_id=1, name="WS Customer", phone="9988776655", is_active=True, is_verified=True)
            db.add(cust)
            db.commit()
            db.refresh(cust)

        # Create test delivery partner
        partner_user = db.query(User).filter(User.phone == "9988776656").first()
        if not partner_user:
            partner_user = User(role_id=3, name="WS Rider", phone="9988776656", is_active=True, is_verified=True)
            db.add(partner_user)
            db.commit()
            db.refresh(partner_user)

        partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == partner_user.id).first()
        if not partner:
            partner = DeliveryPartner(user_id=partner_user.id, is_available=True)
            db.add(partner)
            db.commit()
            db.refresh(partner)

        # Address
        addr = db.query(Address).filter(Address.user_id == cust.id).first()
        if not addr:
            addr = Address(user_id=cust.id, address_line1="Test St", city="Solapur", state="MH", pincode="413001")
            db.add(addr)
            db.commit()
            db.refresh(addr)

        # Order
        order = db.query(Order).filter(Order.order_number == "ORD-WS-TEST-01").first()
        if not order:
            order = Order(
                order_number="ORD-WS-TEST-01",
                customer_id=cust.id,
                address_id=addr.id,
                delivery_partner_id=partner.id,
                status=OrderStatus.OUT_FOR_DELIVERY.value,
            )
            db.add(order)
            db.commit()
            db.refresh(order)

        cust_token = create_access_token({"sub": str(cust.id), "role": "CUSTOMER"})
        rider_token = create_access_token({"sub": str(partner_user.id), "role": "DELIVERY_PARTNER"})

        # 1. Unauthorized customer connection should receive error
        with client.websocket_connect(f"/ws/customer/{order.id}") as ws:
            msg = ws.receive_json()
            assert "Unauthorized" in msg.get("error", "")

        # 2. Authorized customer connects
        with client.websocket_connect(f"/ws/customer/{order.id}?token={cust_token}") as cust_ws:
            init_msg = cust_ws.receive_json()
            assert "order_id" in init_msg or "type" in init_msg

            # 3. Delivery partner connects and sends GPS
            with client.websocket_connect(f"/ws/delivery/{order.id}?token={rider_token}") as rider_ws:
                ack = rider_ws.receive_json()
                assert ack.get("status") == "connected"

                # Send GPS update
                rider_ws.send_json({
                    "order_id": order.id,
                    "latitude": 17.6820,
                    "longitude": 75.9080,
                    "accuracy": 5.0
                })

                # Customer should receive the broadcasted GPS!
                cust_received = cust_ws.receive_json()
                assert cust_received.get("type") == "location_update"
                assert cust_received.get("latitude") == 17.6820
                assert cust_received.get("longitude") == 75.9080
    finally:
        db.close()
