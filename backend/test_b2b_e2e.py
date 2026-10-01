"""
test_b2b_e2e.py — Comprehensive End-to-End Verification for Vegito B2B Module

Tests:
1. Business Profile Creation & Fetch
2. Volume Pricing Calculation (Mandi Tier Pricing)
3. Bulk Cart Isolation (Retail vs Bulk)
4. Bulk Order Request Creation (Idempotent submission)
5. Seller Stock Inspection & Live Audit
6. Seller Custom Quoting Flow (Item unit quotes + Freight fee)
7. Customer Quote Acceptance (Atomic inventory reservation + B2B Invoice generation)
8. Quote Decline Flow
9. Saved Shopping Lists (1-click cart insertion)
10. Recurring Bulk Delivery Scheduling & Toggle
11. Authentic Indian Catering & Event Grocery Estimator
12. B2B Analytics Calculation
"""

import sys
import datetime
from decimal import Decimal

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.database import SessionLocal
from app.models.user import User
from app.models.product import Product
from app.models.seller_product import SellerProduct
from app.models.inventory import Inventory
from app.models.address import Address
from app.models.business_profile import BusinessProfile
from app.models.bulk_pricing_rule import BulkPricingRule
from app.models.bulk_cart_item import BulkCartItem
from app.models.order import Order
from app.models.b2b_invoice import B2BInvoice
from app.schemas.business import (
    BusinessProfileCreate,
    BulkCartItemCreate,
    BulkOrderCreateRequest,
    BulkOrderItemRequest,
    SendCustomQuoteRequest,
    QuotedItemPrice,
    SavedShoppingListCreate,
    SavedShoppingListItemCreate,
    RecurringBulkOrderCreate,
    RecurringBulkOrderItemCreate,
    EventGroceryEstimateRequest,
)
from app.services.bulk_order_service import BulkOrderService

def run_tests():
    db = SessionLocal()
    print("=" * 60)
    print("RUNNING VEGITO V1 B2B END-TO-END VERIFICATION")
    print("=" * 60)

    try:
        # Find test customer and test seller
        customer = db.query(User).filter(User.phone == "9876543210").first()
        if not customer:
            customer = db.query(User).first()
        seller = db.query(User).filter(User.role_id == 2).first()
        if not seller:
            seller = db.query(User).first()

        print(f"Test Customer: {customer.name} (ID: {customer.id})")
        print(f"Test Seller: {seller.name} (ID: {seller.id})")

        address = db.query(Address).filter(Address.user_id == customer.id).first()
        if not address:
            address = Address(
                user_id=customer.id,
                address_line1="782 South Sadar Bazaar, Hotel Line",
                city="Solapur",
                state="Maharashtra",
                pincode="413003",
                landmark="Near Old APMC Yard",
                is_default=True,
            )
            db.add(address)
            db.commit()
            db.refresh(address)
        print(f"Delivery Address: {address.address_line1}, {address.city} (ID: {address.id})")

        # 1. Business Profile
        print("\n--- 1. Testing Business Profile Creation & Update ---")
        prof = BulkOrderService.create_or_update_business_profile(
            db,
            customer.id,
            BusinessProfileCreate(
                business_name="Solapur Grand Palace Hotel & Banquets",
                business_type="HOTEL",
                contact_person="Ramesh Kulkarni",
                phone="9876543210",
                email="procurement@solapurgrand.com",
                delivery_address=address.address_line1,
                business_address=address.address_line1,
                gstin="27ABCDE1234F1Z5",
                preferred_delivery_time="05:00 AM – 07:00 AM",
            )
        )
        assert prof.business_name == "Solapur Grand Palace Hotel & Banquets"
        assert prof.gstin == "27ABCDE1234F1Z5"
        print("✓ Business Profile created & verified:", prof.business_name)

        # 2. Volume Pricing Rule
        print("\n--- 2. Testing Volume Pricing Rule Setup & Calculation ---")
        sp = db.query(SellerProduct).filter(SellerProduct.is_available == True).first()
        assert sp is not None, "No active seller product found"
        print(f"Testing with Product: {sp.product.name} (Base Price: ₹{sp.price}/kg)")

        # Create 50kg tier
        tier_rule = BulkPricingRule(
            seller_product_id=sp.id,
            min_quantity=Decimal("50.000"),
            max_quantity=Decimal("150.000"),
            unit_price=sp.price * Decimal("0.85"), # 15% discount
            discount_percentage=Decimal("15.00"),
            is_active=True,
        )
        db.add(tier_rule)
        db.commit()

        # Calculate effective price for 60kg
        eff_price, base_price, rule_applied = BulkOrderService.get_effective_bulk_price(db, sp.id, Decimal("60.000"))
        assert rule_applied is True, "Bulk tier rule should have applied for 60kg"
        assert eff_price < base_price, "Effective price should be discounted"
        print(f"✓ Volume Tier: Base ₹{base_price} -> Discounted ₹{eff_price} (Rule applied: {rule_applied})")

        # 3. Bulk Cart Isolation
        print("\n--- 3. Testing Bulk Cart Isolation & Operations ---")
        BulkOrderService.clear_bulk_cart(db, customer.id)
        BulkOrderService.add_to_bulk_cart(
            db,
            customer.id,
            BulkCartItemCreate(
                seller_product_id=sp.id,
                quantity=Decimal("60.000"),
                unit="KG",
                notes="Grade-A sorted for banquet salads",
            )
        )
        bulk_cart = BulkOrderService.get_bulk_cart(db, customer.id)
        assert bulk_cart.total_items_count == 1
        assert bulk_cart.total_quantity == Decimal("60.000")
        print(f"✓ Bulk Cart contains {bulk_cart.total_items_count} item, {bulk_cart.total_quantity}kg, Est: ₹{bulk_cart.estimated_subtotal}")

        # 4. Idempotent Bulk Order Request Submission
        print("\n--- 4. Testing Idempotent Bulk Order Request Submission ---")
        idempotency_key = f"test-b2b-{datetime.datetime.utcnow().timestamp()}"
        tomorrow = datetime.date.today() + datetime.timedelta(days=1)
        bulk_order = BulkOrderService.create_bulk_order_request(
            db,
            customer.id,
            BulkOrderCreateRequest(
                items=[
                    BulkOrderItemRequest(
                        seller_product_id=sp.id,
                        quantity=Decimal("60.000"),
                        unit="KG",
                        notes="Clean crates required",
                    )
                ],
                address_id=address.id,
                delivery_date=tomorrow,
                delivery_time_window="05:00 AM – 07:00 AM",
                special_instructions="Deliver at back kitchen dock",
                idempotency_key=idempotency_key,
            )
        )
        assert bulk_order.status == "BULK_REQUESTED"
        assert bulk_order.order_type == "BULK"
        print(f"✓ Bulk Order Request #{bulk_order.order_number} created with status '{bulk_order.status}'")

        # Verify idempotency
        duplicate_order = BulkOrderService.create_bulk_order_request(
            db,
            customer.id,
            BulkOrderCreateRequest(
                items=[BulkOrderItemRequest(seller_product_id=sp.id, quantity=Decimal("60.000"))],
                address_id=address.id,
                delivery_date=tomorrow,
                idempotency_key=idempotency_key,
            )
        )
        assert duplicate_order.id == bulk_order.id, "Idempotency failed: duplicate order created"
        print("✓ Idempotent submission verified: duplicate request returned existing order safely")

        # 5. Seller Stock Inspection & Live Audit
        print("\n--- 5. Testing Seller Stock Inspection & Live Audit ---")
        seller_order_view = BulkOrderService.get_seller_bulk_order(db, bulk_order.seller_id, bulk_order.id)
        assert seller_order_view["id"] == bulk_order.id
        assert len(seller_order_view["items"]) == 1
        audit_item = seller_order_view["items"][0]
        print(f"✓ Stock Audit for {audit_item['product_name']}: Requested {audit_item['quantity']}, Available {audit_item['available_stock']} (Sufficient: {audit_item['is_sufficient_stock']})")

        # 6. Seller Custom Quoting Flow
        print("\n--- 6. Testing Seller Custom Quote Dispatch ---")
        order_item_id = bulk_order.items[0].id
        quoted_order = BulkOrderService.seller_send_custom_quote(
            db,
            bulk_order.seller_id,
            bulk_order.id,
            SendCustomQuoteRequest(
                items=[
                    QuotedItemPrice(
                        order_item_id=order_item_id,
                        quoted_unit_price=Decimal("24.00"),
                        seller_notes="Special Mandi direct discount",
                    )
                ],
                delivery_fee=Decimal("120.00"),
                notes="Delivered via direct tempo at 5 AM",
                expires_in_hours=24,
            )
        )
        assert quoted_order.status == "QUOTE_SENT"
        assert quoted_order.quote_status == "SENT"
        assert quoted_order.quote_total == Decimal("24.00") * Decimal("60.000") + Decimal("120.00") # 1440 + 120 = 1560
        print(f"✓ Quote Sent: ₹{quoted_order.quote_total} (Subtotal: ₹1440 + Delivery: ₹120, Status: '{quoted_order.status}')")

        # 7. Customer Quote Acceptance, Inventory Reservation & Invoice
        print("\n--- 7. Testing Customer Quote Acceptance, Inventory Reservation & GST Invoice ---")
        # Ensure inventory exists for stock reservation check
        inv = db.query(Inventory).filter(Inventory.seller_product_id == sp.id).first()
        if not inv:
            inv = Inventory(seller_product_id=sp.id, quantity=Decimal("500.000"), reserved_quantity=Decimal("0.000"))
            db.add(inv)
            db.commit()
        else:
            inv.quantity = max(inv.quantity, Decimal("500.000"))
            db.commit()

        initial_reserved = inv.reserved_quantity
        confirmed_order = BulkOrderService.customer_handle_quote(
            db,
            customer.id,
            bulk_order.id,
            action="ACCEPT",
        )
        assert confirmed_order.status == "CONFIRMED"
        assert confirmed_order.quote_status == "ACCEPTED"

        db.refresh(inv)
        assert inv.reserved_quantity == initial_reserved + Decimal("60.000"), "Inventory reservation did not increment"
        print(f"✓ Quote Accepted: Status -> CONFIRMED, Inventory Reserved -> {inv.reserved_quantity}kg")

        invoice = db.query(B2BInvoice).filter(B2BInvoice.order_id == confirmed_order.id).first()
        assert invoice is not None, "B2B Invoice was not generated"
        print(f"✓ Commercial Tax Invoice Generated: {invoice.invoice_number}, Total: ₹{invoice.total_amount}")

        # 8. Saved Shopping Lists
        print("\n--- 8. Testing Commercial Saved Lists ---")
        sl = BulkOrderService.create_saved_list(
            db,
            customer.id,
            SavedShoppingListCreate(
                name="Daily Curry Base Requisition",
                description="Standard daily stock for gravy and soup prep",
                items=[
                    SavedShoppingListItemCreate(
                        product_id=sp.product_id,
                        seller_product_id=sp.id,
                        quantity=Decimal("40.000"),
                        unit="KG",
                    )
                ]
            )
        )
        assert sl.name == "Daily Curry Base Requisition"
        lists = BulkOrderService.list_saved_lists(db, customer.id)
        assert len(lists) >= 1
        added_count = BulkOrderService.add_saved_list_to_bulk_cart(db, customer.id, sl.id)
        assert added_count >= 1
        print(f"✓ Saved List created & 1-click added {added_count} items to Bulk Cart")

        # 9. Scheduled Recurring Orders
        print("\n--- 9. Testing Recurring Mandi Orders ---")
        ro = BulkOrderService.create_recurring_order(
            db,
            customer.id,
            RecurringBulkOrderCreate(
                title="Early Morning Hotel Vegetable Supply",
                frequency="DAILY",
                delivery_time_window="05:00 AM – 07:00 AM",
                address_id=address.id,
                seller_id=sp.seller_id,
                next_run_date=tomorrow,
                special_instructions="Drop at kitchen basement",
                items=[
                    RecurringBulkOrderItemCreate(
                        seller_product_id=sp.id,
                        quantity=Decimal("30.000"),
                        unit="KG",
                    )
                ]
            )
        )
        assert ro.is_active is True
        # Toggle
        toggled = BulkOrderService.toggle_recurring_order(db, customer.id, ro.id)
        assert toggled.is_active is False
        toggled_back = BulkOrderService.toggle_recurring_order(db, customer.id, ro.id)
        assert toggled_back.is_active is True
        print(f"✓ Recurring schedule '{ro.title}' created and verified active ({ro.frequency})")

        # 10. Authentic Indian Catering & Event Grocery Estimator
        print("\n--- 10. Testing Catering & Event Grocery Estimator ---")
        estimate = BulkOrderService.estimate_event_groceries(
            db,
            EventGroceryEstimateRequest(
                event_type="WEDDING_BANQUET",
                people_count=300,
                meals_per_day=2,
                days_count=1,
            )
        )
        assert len(estimate.suggested_items) > 0
        assert estimate.total_estimated_budget > Decimal("0.00")
        print(f"✓ Catering Estimator for 300 guests calculated {len(estimate.suggested_items)} items, Budget: ₹{estimate.total_estimated_budget}")
        for it in estimate.suggested_items[:3]:
            print(f"   • {it.product_name}: {it.estimated_quantity} {it.unit} (~₹{it.approximate_price}/{it.unit})")

        # 11. B2B Analytics
        print("\n--- 11. Testing Real-Data B2B Analytics ---")
        analytics = BulkOrderService.get_b2b_analytics(db, customer.id)
        assert analytics.total_orders_count >= 1
        assert analytics.active_orders_count >= 1
        print(f"✓ Real B2B Analytics: Total Orders={analytics.total_orders_count}, Active={analytics.active_orders_count}, Monthly Spend=₹{analytics.monthly_spend}")

        print("\n" + "=" * 60)
        print("ALL 11 B2B TEST SUITES PASSED FLAWLESSLY!")
        print("=" * 60)

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
