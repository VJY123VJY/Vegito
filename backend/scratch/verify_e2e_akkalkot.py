import os
import sys

os.environ["DATABASE_URL"] = "postgresql://neondb_owner:npg_KLXukTJPW6F0@ep-empty-sky-au5bwvek-pooler.c-10.us-east-1.aws.neon.tech/neondb?sslmode=require"
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.user import User
from app.models.seller_profile import SellerProfile
from app.models.seller_product import SellerProduct
from app.models.order import Order
from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.models.address import Address
from app.services.location_service import LocationService
from app.services.order_service import OrderService
from app.services.seller_service import SellerService
from app.schemas.order import OrderCreate
from app.schemas.address import AddressCreate
from app.services.customer_service import CustomerService
from app.utils.pagination import PaginationParams

db = SessionLocal()

try:
    print("=== TESTING AKKALKOT SELLER & MULTI-CUSTOMER FLOW ===")
    
    # 1. Verify Active Seller 1142
    seller_user = db.query(User).filter(User.id == 1142).first()
    seller_prof = db.query(SellerProfile).filter(SellerProfile.user_id == 1142).first()
    print(f"Seller: id={seller_user.id}, name={seller_user.name}, business={seller_prof.business_name}")
    print(f"Current GPS: lat={seller_prof.latitude}, lng={seller_prof.longitude}")

    # Temporarily set shop GPS to Akkalkot center for the test
    akkalkot_shop_lat = 17.5253
    akkalkot_shop_lng = 76.2052
    old_lat = float(seller_prof.latitude) if seller_prof.latitude else None
    old_lng = float(seller_prof.longitude) if seller_prof.longitude else None
    old_addr = seller_prof.address

    seller_prof.latitude = akkalkot_shop_lat
    seller_prof.longitude = akkalkot_shop_lng
    seller_prof.address = "Akkalkot Main Market, Akkalkot"
    seller_prof.is_available = True
    db.commit()
    print(f"Set Seller GPS to Akkalkot: {akkalkot_shop_lat}, {akkalkot_shop_lng}")

    # 2. Verify Seller Products
    products = SellerService.list_seller_products(db, seller_user)
    print(f"Seller Products for 1142: {len(products)} products available")
    assert len(products) > 0, "No seller products found for seller 1142"
    sp = products[0]

    # 3. Customer A in Akkalkot (1.2 KM from shop)
    cust_a = db.query(User).filter(User.id == 1141).first() # Vinay
    print(f"\nTesting Customer A: id={cust_a.id}, name={cust_a.name}")
    cust_a_lat = 17.5280
    cust_a_lng = 76.2100

    # Distance check
    dist_a = LocationService.calculate_distance(cust_a_lat, cust_a_lng, akkalkot_shop_lat, akkalkot_shop_lng)
    print(f"Distance Shop -> Customer A: {dist_a:.2f} KM")
    is_valid, msg = LocationService.is_within_delivery_bounds(dist_a, max_km=20.0)
    print(f"Eligibility Customer A: valid={is_valid} ({msg})")
    assert is_valid, "Customer A should be eligible"

    # Create address for Customer A in Akkalkot
    addr_a = CustomerService.create_address(
        db, cust_a, AddressCreate(
            address_line1="Near Swami Samarth Temple, Akkalkot",
            city="Akkalkot",
            state="Maharashtra",
            country="India",
            pincode="413216",
            latitude=cust_a_lat,
            longitude=cust_a_lng,
            address_type="HOME",
            is_default=True,
        )
    )
    print(f"Created Address A: id={addr_a.id}, city={addr_a.city}")

    # Setup Cart for Customer A
    cart_a = db.query(Cart).filter(Cart.user_id == cust_a.id).first()
    if not cart_a:
        cart_a = Cart(user_id=cust_a.id)
        db.add(cart_a)
        db.commit()
        db.refresh(cart_a)

    db.query(CartItem).filter(CartItem.cart_id == cart_a.id).delete()
    db.add(CartItem(cart_id=cart_a.id, seller_product_id=sp.id, quantity=2))
    db.commit()

    # Checkout Customer A
    order_a = OrderService.checkout(db, cust_a, OrderCreate(address_id=addr_a.id, payment_method="COD"))
    print(f"✓ Checkout A succeeded: Order #{order_a.order_number}, seller_id={order_a.seller_id}, total=₹{order_a.total_amount}")
    assert order_a.seller_id == 1142, f"Expected seller_id 1142, got {order_a.seller_id}"

    # 4. Customer B in Akkalkot (2.5 KM from shop)
    cust_b = db.query(User).filter(User.id == 1140).first() # Vishal
    print(f"\nTesting Customer B: id={cust_b.id}, name={cust_b.name}")
    cust_b_lat = 17.5150
    cust_b_lng = 76.1950

    dist_b = LocationService.calculate_distance(cust_b_lat, cust_b_lng, akkalkot_shop_lat, akkalkot_shop_lng)
    print(f"Distance Shop -> Customer B: {dist_b:.2f} KM")

    addr_b = CustomerService.create_address(
        db, cust_b, AddressCreate(
            address_line1="Station Road, Akkalkot",
            city="Akkalkot",
            state="Maharashtra",
            country="India",
            pincode="413216",
            latitude=cust_b_lat,
            longitude=cust_b_lng,
            address_type="HOME",
            is_default=True,
        )
    )
    print(f"Created Address B: id={addr_b.id}, city={addr_b.city}")

    cart_b = db.query(Cart).filter(Cart.user_id == cust_b.id).first()
    if not cart_b:
        cart_b = Cart(user_id=cust_b.id)
        db.add(cart_b)
        db.commit()
        db.refresh(cart_b)

    db.query(CartItem).filter(CartItem.cart_id == cart_b.id).delete()
    db.add(CartItem(cart_id=cart_b.id, seller_product_id=sp.id, quantity=1))
    db.commit()

    order_b = OrderService.checkout(db, cust_b, OrderCreate(address_id=addr_b.id, payment_method="COD"))
    print(f"✓ Checkout B succeeded: Order #{order_b.order_number}, seller_id={order_b.seller_id}, total=₹{order_b.total_amount}")
    assert order_b.seller_id == 1142, f"Expected seller_id 1142, got {order_b.seller_id}"

    # 5. Verify Seller Dashboard listing
    print("\n=== VERIFYING SELLER DASHBOARD (USER 1142) ===")
    orders, total_count = SellerService.list_orders(db, seller_user, PaginationParams(page=1, page_size=10), status="NEW")
    print(f"Total NEW orders in Seller Dashboard: {total_count}")
    order_ids = [o.id for o in orders]
    print(f"Recent NEW order IDs: {order_ids[:5]}")
    assert order_a.id in order_ids, "Order A must be in seller orders"
    assert order_b.id in order_ids, "Order B must be in seller orders"

    # Verify Customer names and items are accessible
    from app.schemas.order import OrderRead, OrderItemRead
    for o in orders[:2]:
        cust_name = o.customer.name if o.customer else "Unknown"
        items_summary = [(it.product_name, float(it.quantity), float(it.unit_price)) for it in o.items]
        print(f"Order #{o.order_number}: Customer='{cust_name}', Status={o.status}, Items={items_summary}")
        assert cust_name in [cust_a.name, cust_b.name]

    # 6. Test Status transitions: ACCEPT -> PACKING -> READY
    print("\n=== TESTING STATUS TRANSITIONS (ACCEPT -> PACKING -> READY) ===")
    o_acc = OrderService.update_order_status(db, seller_user, order_a.id, "ACCEPTED", note="Accepted by Vijay Shop")
    print(f"Order #{order_a.order_number} status updated to: {o_acc.status}")
    assert o_acc.status == "ACCEPTED"

    o_pack = OrderService.update_order_status(db, seller_user, order_a.id, "PACKING", note="Packing produce")
    print(f"Order #{order_a.order_number} status updated to: {o_pack.status}")
    assert o_pack.status == "PACKING"

    o_rdy = OrderService.update_order_status(db, seller_user, order_a.id, "READY", note="Ready for pickup")
    print(f"Order #{order_a.order_number} status updated to: {o_rdy.status}")
    assert o_rdy.status == "READY"

    print("\n✓ ALL TESTS PASSED SUCCESSFULLY!")

finally:
    db.close()
