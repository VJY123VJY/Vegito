import datetime
from decimal import Decimal
from app.models.user import User
from app.models.delivery_partner import DeliveryPartner
from app.models.delivery_partner_location import DeliveryPartnerLocation
from app.models.seller_profile import SellerProfile
from app.models.order import Order
from app.models.seller_order_fulfillment import SellerOrderFulfillment
from app.services.delivery_tracking_service import DeliveryTrackingService
from app.services.seller_fulfillment_service import SellerFulfillmentService
from app.schemas.delivery_location import DeliveryLocationCreate


def test_delivery_location_record_and_history(db):
    # Setup test user & partner
    user = User(role_id=3, name="Test Delivery", phone="9999999901", is_active=True, is_verified=True)
    db.add(user)
    db.flush()
    partner = DeliveryPartner(user_id=user.id, is_available=True, is_verified=True)
    db.add(partner)
    db.flush()

    loc_in = DeliveryLocationCreate(
        latitude=Decimal("17.6599"),
        longitude=Decimal("75.9064"),
        accuracy_meters=Decimal("4.5"),
        heading=Decimal("120"),
        speed_kmh=Decimal("28"),
    )
    res = DeliveryTrackingService.record_location(db, user, loc_in)
    assert res.id is not None
    assert float(res.latitude) == 17.6599
    assert float(res.longitude) == 75.9064

    history = DeliveryTrackingService.get_location_history(db, partner.id)
    assert len(history) >= 1
    assert float(history[0].latitude) == 17.6599


def test_seller_fulfillment_transitions(db):
    # Setup customer and 2 sellers
    cust = User(role_id=1, name="Customer", phone="9999999902")
    seller_a = User(role_id=2, name="Seller A", phone="9999999903")
    seller_b = User(role_id=2, name="Seller B", phone="9999999904")
    db.add_all([cust, seller_a, seller_b])
    db.flush()

    # Create dummy address and order
    from app.models.address import Address
    addr = Address(
        user_id=cust.id,
        address_line1="123 Market St",
        city="Solapur",
        state="Maharashtra",
        pincode="413001",
        latitude=Decimal("17.68"),
        longitude=Decimal("75.91"),
    )
    db.add(addr)
    db.flush()

    order = Order(
        order_number="VG-TEST-101",
        customer_id=cust.id,
        address_id=addr.id,
        status="NEW",
        total_amount=Decimal("250.00"),
    )
    db.add(order)
    db.flush()

    # Create 2 fulfillments
    f_a = SellerOrderFulfillment(
        order_id=order.id,
        seller_id=seller_a.id,
        status="NEW",
        subtotal=Decimal("150.00"),
        seller_amount=Decimal("150.00"),
    )
    f_b = SellerOrderFulfillment(
        order_id=order.id,
        seller_id=seller_b.id,
        status="NEW",
        subtotal=Decimal("100.00"),
        seller_amount=Decimal("100.00"),
    )
    db.add_all([f_a, f_b])
    db.flush()

    # Seller A accepts and packs
    SellerFulfillmentService.update_fulfillment_status(db, seller_a, f_a.id, "ACCEPTED")
    assert f_a.status == "ACCEPTED"
    assert order.status == "ACCEPTED"

    SellerFulfillmentService.update_fulfillment_status(db, seller_a, f_a.id, "PACKING")
    assert f_a.status == "PACKING"
    assert order.status == "PACKING"

    SellerFulfillmentService.update_fulfillment_status(db, seller_a, f_a.id, "READY")
    assert f_a.status == "READY"
    # Order should NOT be READY yet because Seller B is still NEW!
    assert order.status != "READY"

    # Seller B accepts, packs, marks READY
    SellerFulfillmentService.update_fulfillment_status(db, seller_b, f_b.id, "ACCEPTED")
    SellerFulfillmentService.update_fulfillment_status(db, seller_b, f_b.id, "PACKING")
    SellerFulfillmentService.update_fulfillment_status(db, seller_b, f_b.id, "READY")
    assert f_b.status == "READY"

    # Now ALL seller fulfillments are READY, so overall order transitions to READY!
    db.refresh(order)
    assert order.status == "READY"
