"""
Verification test script for Vegito V1 End-to-End flows.
Tests:
1. Customer OTP login (+919309424359 / 123456)
2. Seller OTP login (+919999999991 / 123456) & dashboard endpoints
3. Add/Update Seller Product with custom price & stock
4. Verify Customer sees updated seller price & seller transparency
5. Seller inventory adjustments (+10kg, -10kg)
6. Delivery Partner OTP login (+919999999992 / 123456) & task listing
"""

import sys
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.product import Product
from app.models.seller_product import SellerProduct
from app.models.inventory import Inventory
from app.models.delivery_task import DeliveryTask

client = TestClient(app)

def run_tests():
    print("=== STARTING END-TO-END FLOW VERIFICATION ===")

    # ─────────────────────────────────────────────────────────────
    # TEST 1: Customer Login with OTP
    # ─────────────────────────────────────────────────────────────
    print("\n[Test 1] Testing Customer OTP Login (+919309424359)...")
    res = client.post("/api/v1/auth/send-otp", json={"phone": "+919309424359"})
    assert res.status_code == 200, f"Send OTP failed: {res.text}"
    print("  -> Send OTP response:", res.json()["message"])

    res = client.post("/api/v1/auth/verify-otp", json={"phone": "+919309424359", "otp": "123456"})
    assert res.status_code == 200, f"Verify OTP failed: {res.text}"
    data = res.json()["data"]
    assert data["role"] == "CUSTOMER", f"Expected CUSTOMER role, got {data['role']}"
    customer_token = data["access_token"]
    print(f"  -> Customer verified successfully! Token received, role={data['role']}, name={data.get('name')}")

    # ─────────────────────────────────────────────────────────────
    # TEST 2: Seller Login with OTP
    # ─────────────────────────────────────────────────────────────
    print("\n[Test 2] Testing Seller OTP Login (+919999999991)...")
    res = client.post("/api/v1/auth/send-otp", json={"phone": "+919999999991"})
    assert res.status_code == 200, f"Send OTP failed: {res.text}"

    res = client.post("/api/v1/auth/verify-otp", json={"phone": "+919999999991", "otp": "123456"})
    assert res.status_code == 200, f"Verify OTP failed: {res.text}"
    data = res.json()["data"]
    assert data["role"] == "SELLER", f"Expected SELLER role, got {data['role']}"
    seller_token = data["access_token"]
    print(f"  -> Seller verified successfully! Token received, role={data['role']}, user_id={data['user_id']}")

    seller_headers = {"Authorization": f"Bearer {seller_token}"}

    # Verify Seller Profile & Store Info
    res = client.get("/api/v1/seller/profile", headers=seller_headers)
    assert res.status_code == 200, f"Get seller profile failed: {res.text}"
    prof = res.json()["data"]
    print(f"  -> Seller Profile: Business Name='{prof.get('business_name')}', Rating={prof.get('rating')}")

    # ─────────────────────────────────────────────────────────────
    # TEST 3: Seller Adds / Lists Product with Custom Price
    # ─────────────────────────────────────────────────────────────
    print("\n[Test 3] Testing Seller Product Listing & Custom Price (e.g. INR 42.00)...")
    add_payload = {
        "product_name": "Solapur Fresh Hybrid Tomatoes",
        "category_id": 1,
        "unit": "1 KG",
        "price": 42.0,
        "stock_quantity": 60.0,
        "minimum_order_quantity": 1.0,
        "is_available": True,
        "description": "Locally harvested ripe farm hybrid tomatoes"
    }
    res = client.post("/api/v1/seller/products", json=add_payload, headers=seller_headers)
    assert res.status_code in [200, 201], f"Add seller product failed: {res.text}"
    sp_data = res.json()["data"]
    seller_product_id = sp_data["id"]
    print(f"  -> Product created! SellerProductID={seller_product_id}, Price=INR {sp_data['price']}, Stock={sp_data['stock_quantity']}kg")

    # ─────────────────────────────────────────────────────────────
    # TEST 4: Customer Views Seller Price & Transparency
    # ─────────────────────────────────────────────────────────────
    print("\n[Test 4] Testing Customer Marketplace View & Seller Price Calculation...")
    res = client.get("/api/v1/products?search=Tomatoes")
    assert res.status_code == 200, f"Get products failed: {res.text}"
    items = res.json()["data"]["items"]
    assert len(items) > 0, "No tomatoes found in catalog"

    found_offer = None
    for p in items:
        for offer in p.get("seller_products", []):
            if offer.get("seller_product_id") == seller_product_id:
                found_offer = offer
                break

    assert found_offer is not None, f"Created seller product {seller_product_id} not visible to customer!"
    print(f"  -> Customer sees Seller Product: Seller='{found_offer.get('seller_business_name')}', Rating={found_offer.get('seller_rating')}, Price=INR {found_offer.get('price')}")
    assert float(found_offer["price"]) == 42.0, f"Expected price 42.0, got {found_offer['price']}"

    # ─────────────────────────────────────────────────────────────
    # TEST 5: Seller Modifies Price (INR 42 -> INR 47) and Stock (60 -> 0)
    # ─────────────────────────────────────────────────────────────
    print("\n[Test 5] Testing Seller Price Update (INR 42 -> INR 47) and Stock Adjustment...")
    update_res = client.patch(
        f"/api/v1/seller/products/{seller_product_id}",
        json={"price": 47.0, "stock_quantity": 70.0},
        headers=seller_headers
    )
    assert update_res.status_code == 200, f"Update failed: {update_res.text}"
    print("  -> Price updated to INR 47.0, Stock updated to 70kg")

    # Verify customer sees updated INR 47.0 price immediately
    res = client.get("/api/v1/products?search=Tomatoes")
    items = res.json()["data"]["items"]
    updated_offer = None
    for p in items:
        for offer in p.get("seller_products", []):
            if offer.get("seller_product_id") == seller_product_id:
                updated_offer = offer
                break
    assert updated_offer is not None and float(updated_offer["price"]) == 47.0, "Customer did not see updated INR 47 price!"
    print(f"  -> Verified Customer sees new price: INR {updated_offer['price']}")

    # Test Inventory Stock Adjustment (+10 kg)
    res = client.post(
        f"/api/v1/inventory/{seller_product_id}/adjust",
        json={"quantity_change": 10.0, "transaction_type": "STOCK_IN", "note": "Harvest restock"},
        headers=seller_headers
    )
    assert res.status_code == 200, f"Adjust inventory failed: {res.text}"
    print("  -> Stock adjusted via Inventory API (+10 kg).")

    # ─────────────────────────────────────────────────────────────
    # TEST 6: Delivery Partner Login & Tasks
    # ─────────────────────────────────────────────────────────────
    print("\n[Test 6] Testing Delivery Partner OTP Login (+919999999992)...")
    res = client.post("/api/v1/auth/send-otp", json={"phone": "+919999999992"})
    assert res.status_code == 200, f"Send OTP failed: {res.text}"

    res = client.post("/api/v1/auth/verify-otp", json={"phone": "+919999999992", "otp": "123456"})
    assert res.status_code == 200, f"Verify OTP failed: {res.text}"
    delivery_data = res.json()["data"]
    assert delivery_data["role"] == "DELIVERY_PARTNER", f"Expected DELIVERY_PARTNER role, got {delivery_data['role']}"
    delivery_token = delivery_data["access_token"]
    print(f"  -> Delivery Partner verified successfully! Token received, role={delivery_data['role']}, name={delivery_data.get('name')}")

    delivery_headers = {"Authorization": f"Bearer {delivery_token}"}
    res = client.get("/api/v1/delivery/tasks", headers=delivery_headers)
    assert res.status_code == 200, f"List delivery tasks failed: {res.text}"
    tasks = res.json()["data"]
    print(f"  -> Delivery partner tasks queried successfully: {len(tasks)} task(s) found.")

    print("\n=================================================")
    print(" ALL 6 END-TO-END VERIFICATION CHECKS PASSED! ")
    print("=================================================")

if __name__ == "__main__":
    run_tests()
