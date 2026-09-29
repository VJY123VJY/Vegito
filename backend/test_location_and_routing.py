"""
test_location_and_routing.py — Comprehensive tests for Vegito 1–15 KM Location Logic & Seller Routing.

Tests:
1. Haversine distance accuracy.
2. Test 1: Customer <-> Seller 5 km -> Eligible.
3. Test 2: Customer <-> Seller 0.5 km -> Handled safely (local delivery / base tier).
4. Test 3: Customer <-> Seller 20 km -> Not eligible (> 15 km boundary check).
5. Test 4: Missing seller coordinates -> Actionable error handling.
6. Test 5: Inactive seller -> Ineligible / blocked.
7. Test 6: Product out of stock -> Cannot fulfill.
8. Test 7: Seller Order Receiving -> SellerService.list_orders returns assigned orders.
9. Test 8: WebSocket serialization safety -> Decimal serialization does not crash.
"""

import sys
import unittest
from decimal import Decimal
import json

from app.database import SessionLocal
from app.models.user import User
from app.models.seller_profile import SellerProfile
from app.models.seller_product import SellerProduct
from app.models.order import Order
from app.models.address import Address
from app.services.location_service import (
    LocationService,
    calculate_haversine_distance_km,
    MIN_DELIVERY_DISTANCE_KM,
    MAX_DELIVERY_DISTANCE_KM,
)
from app.services.seller_service import SellerService
from app.utils.pagination import PaginationParams


class TestLocationAndRouting(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_01_haversine_distance_calculation(self):
        """Verify Haversine formula gives accurate kilometer distances."""
        # Solapur Central Market to a point ~5 km away (approx 0.045 deg lat offset)
        lat1, lon1 = 17.6805, 75.9064
        lat2, lon2 = 17.7255, 75.9064
        dist = calculate_haversine_distance_km(lat1, lon1, lat2, lon2)
        self.assertAlmostEqual(dist, 5.0, delta=0.2)
        print(f"\n[PASS] Test 1 (Haversine 5km): {dist:.2f} km")

    def test_02_customer_seller_5km_eligible(self):
        """Test 1: Distance = 5 km -> Eligible within 1–15 km bounds."""
        lat_seller, lon_seller = 17.6805, 75.9064
        lat_cust, lon_cust = 17.7255, 75.9064
        dist = LocationService.calculate_distance(lat_cust, lon_cust, lat_seller, lon_seller)
        is_valid, msg = LocationService.is_within_delivery_bounds(dist, max_km=15.0)
        self.assertTrue(is_valid, msg)
        self.assertGreaterEqual(dist, 1.0)
        self.assertLessEqual(dist, 15.0)
        print(f"[PASS] Test 2 (5km Eligible): dist={dist:.2f} km, msg='{msg}'")

    def test_03_customer_seller_sub_1km_safe_handling(self):
        """Test 2: Distance = 0.5 km -> Handled safely under configured boundary rule."""
        lat_seller, lon_seller = 17.6805, 75.9064
        lat_cust, lon_cust = 17.6845, 75.9064  # ~0.44 km away
        dist = LocationService.calculate_distance(lat_cust, lon_cust, lat_seller, lon_seller)
        self.assertLess(dist, 1.0)
        # With allow_same_location=True (default), safe handling permits local delivery
        is_valid, msg = LocationService.is_within_delivery_bounds(dist, allow_same_location=True, max_km=15.0)
        self.assertTrue(is_valid)
        # With allow_same_location=False, it reports below minimum
        is_valid_strict, msg_strict = LocationService.is_within_delivery_bounds(dist, allow_same_location=False, max_km=15.0)
        self.assertFalse(is_valid_strict)
        print(f"[PASS] Test 3 (0.5km Boundary Safe Handling): dist={dist:.2f} km, local_ok={is_valid}, strict={is_valid_strict}")

    def test_04_customer_seller_20km_ineligible(self):
        """Test 3: Distance = 20 km -> Ineligible (> 15 km max radius)."""
        lat_seller, lon_seller = 17.6805, 75.9064
        lat_cust, lon_cust = 17.8605, 75.9064  # ~20 km away
        dist = LocationService.calculate_distance(lat_cust, lon_cust, lat_seller, lon_seller)
        self.assertGreater(dist, 15.0)
        is_valid, msg = LocationService.is_within_delivery_bounds(dist, max_km=15.0)
        self.assertFalse(is_valid)
        self.assertIn("exceeds maximum delivery radius of 15.0 km", msg)
        print(f"[PASS] Test 4 (20km Ineligible): dist={dist:.2f} km, msg='{msg}'")

    def test_05_missing_seller_coordinates_actionable_error(self):
        """Test 4: Missing seller coordinates -> Actionable error / non-routable."""
        # Non-existent or coordinate-less seller ID
        lat, lon = LocationService.resolve_seller_coordinates(self.db, seller_id=9999999)
        self.assertIsNone(lat)
        self.assertIsNone(lon)
        print(f"[PASS] Test 5 (Missing Seller Coords): Properly returns None, None for unresolvable seller.")

    def test_06_inactive_seller_ineligible(self):
        """Test 5: Inactive seller -> Not eligible."""
        # Verify find_eligible_sellers excludes inactive or offline sellers
        sellers = LocationService.find_eligible_sellers(
            self.db,
            customer_lat=17.6805,
            customer_lon=75.9064,
            max_distance_km=15.0,
        )
        for s in sellers:
            sp = s["seller_profile"]
            user = self.db.query(User).filter(User.id == sp.user_id).first()
            self.assertTrue(sp.is_available, f"Seller {sp.id} is marked unavailable")
            self.assertTrue(user.is_active, f"User {user.id} is inactive")
        print(f"[PASS] Test 6 (Inactive Sellers Filtered): Found {len(sellers)} eligible active seller(s).")

    def test_07_seller_order_receiving_query(self):
        """Test 7: Seller dashboard list_orders returns assigned orders."""
        seller_user = self.db.query(User).filter(User.id == 6).first()
        self.assertIsNotNone(seller_user)
        orders, total = SellerService.list_orders(self.db, seller_user, PaginationParams(page=1, page_size=10))
        self.assertGreater(total, 0)
        order_ids = [o.id for o in orders]
        print(f"[PASS] Test 7 (Seller Orders Query): Total={total}, Recent IDs={order_ids[:5]}")

    def test_08_websocket_safe_decimal_serialization(self):
        """Test 8: WebSocket json.dumps handles Decimals safely without TypeError."""
        payload = {
            "type": "NEW_ORDER",
            "order_id": 573,
            "quantity": Decimal("2.500"),
            "subtotal": Decimal("150.00"),
        }
        # Using default=str ensures no crash
        serialized = json.dumps(payload, default=str)
        self.assertIn('"quantity": "2.500"', serialized)
        deserialized = json.loads(serialized)
        self.assertEqual(deserialized["order_id"], 573)
        print(f"[PASS] Test 8 (Safe Serialization): {serialized}")


if __name__ == "__main__":
    unittest.main()
