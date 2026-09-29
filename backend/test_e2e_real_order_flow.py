"""
test_e2e_real_order_flow.py — End-to-end test of the complete order routing and delivery flow:
Customer (real DB user) -> Place Order (within 1-15 km) ->
Seller Dashboard receives order as NEW ->
Seller Accepts -> Packs -> Marks READY ->
Eligible Delivery Partner (within 1-15 km) assigned ->
Partner Pickups (with pickup OTP) ->
Partner Delivers (with delivery OTP) -> DELIVERED.
"""

from decimal import Decimal
import requests
import sys

from app.database import SessionLocal
from app.models.user import User
from app.services.jwt_service import create_access_token

BASE_URL = "http://localhost:8000/api/v1"
with SessionLocal() as db:
    # 1. Login Customer (user 1911: 9850403123 or user 1: 9309424359)
    print("--> Getting Customer Token...", flush=True)
    cust_user = db.query(User).filter(User.role_id == 1, User.is_active == True).order_by(User.id.desc()).first()
    assert cust_user is not None, "No active customer found"
    cust_id = cust_user.id
    cust_phone = cust_user.phone
    cust_name = cust_user.name

    # 2. Login Seller (user 6: 9999999991)
    print("--> Getting Seller Token...", flush=True)
    seller_user = db.query(User).filter(User.role_id == 2, User.is_active == True).first()
    assert seller_user is not None, "No active seller found"
    seller_id = seller_user.id
    seller_phone = seller_user.phone
    seller_name = seller_user.name

    # 3. Login Delivery Partner (user 7: 9999999992)
    print("--> Getting Delivery Partner Token...", flush=True)
    delivery_user = db.query(User).filter(User.role_id == 3, User.is_active == True).first()
    assert delivery_user is not None, "No active delivery partner found"
    delivery_id = delivery_user.id
    delivery_phone = delivery_user.phone
    delivery_name = delivery_user.name

cust_token = create_access_token({"sub": str(cust_id), "role": "CUSTOMER"})
cust_headers = {"Authorization": f"Bearer {cust_token}"}
print(f"Customer logged in: id={cust_id}, phone={cust_phone}, name={cust_name}", flush=True)

seller_token = create_access_token({"sub": str(seller_id), "role": "SELLER"})
seller_headers = {"Authorization": f"Bearer {seller_token}"}
print(f"Seller logged in: id={seller_id}, phone={seller_phone}, name={seller_name}", flush=True)

delivery_token = create_access_token({"sub": str(delivery_id), "role": "DELIVERY_PARTNER"})
delivery_headers = {"Authorization": f"Bearer {delivery_token}"}
print(f"Delivery partner logged in: id={delivery_id}, phone={delivery_phone}, name={delivery_name}", flush=True)

# 4. Get or Create Customer Address with real Solapur coordinates (~3 km from seller)
print("--> Getting Customer Address...")
res_addrs = requests.get(f"{BASE_URL}/addresses", headers=cust_headers)
assert res_addrs.status_code == 200, f"List addresses failed: {res_addrs.text}"
addrs = res_addrs.json()["data"]
if addrs:
    address = addrs[0]
else:
    res_addr = requests.post(f"{BASE_URL}/addresses", headers=cust_headers, json={
        "address_line1": "Civil Hospital Road, Solapur",
        "city": "Solapur",
        "state": "Maharashtra",
        "country": "India",
        "pincode": "413001",
        "latitude": 17.6720,
        "longitude": 75.9120,
        "address_type": "HOME",
    })
    assert res_addr.status_code == 201, f"Address creation failed: {res_addr.text}"
    address = res_addr.json()["data"]

address_id = address["id"]
print(f"Using address id={address_id}, lat={address.get('latitude')}, lon={address.get('longitude')}")

# 5. Clear cart & add item to cart
print("--> Adding product to Cart...")
requests.delete(f"{BASE_URL}/cart", headers=cust_headers)
# Seller product 416 (Tomato offered by seller 1912)
res_cart = requests.post(f"{BASE_URL}/cart/items", headers=cust_headers, json={
    "seller_product_id": 416,
    "quantity": 2,
})
assert res_cart.status_code in [200, 201], f"Add to cart failed: {res_cart.text}"
print("Item added to cart.")


# 6. Customer Checkout
print("--> Customer checking out order...")
res_order = requests.post(f"{BASE_URL}/orders", headers=cust_headers, json={
    "address_id": address_id,
    "payment_method": "COD",
})
assert res_order.status_code == 201, f"Checkout failed: {res_order.text}"
order_data = res_order.json()["data"]

order_id = order_data["id"]
order_number = order_data["order_number"]
doorstep_otp = order_data.get("delivery_otp")
print(f"Order created successfully! id={order_id}, number={order_number}, total=Rs.{order_data['total_amount']}, status={order_data['status']}")

# 7. Verify Order on Seller Dashboard API
print(f"--> Verifying Order #{order_number} appears on Seller Dashboard...")
res_seller_orders = requests.get(f"{BASE_URL}/seller/orders", headers=seller_headers)
assert res_seller_orders.status_code == 200, f"Seller list_orders failed: {res_seller_orders.text}"
seller_orders = res_seller_orders.json()["data"]["items"]
found = any(o["id"] == order_id for o in seller_orders)
assert found, f"Order #{order_number} (id={order_id}) was NOT found on the seller dashboard!"
print(f"PASS: Order #{order_number} is visible on Seller Dashboard!")

# 8. Seller Accepts Order
print(f"--> Seller accepting order #{order_number}...")
res_accept = requests.patch(f"{BASE_URL}/seller/orders/{order_id}/status", headers=seller_headers, json={"status": "ACCEPTED"})
assert res_accept.status_code == 200, f"Seller accept failed: {res_accept.text}"
print("Order status updated to ACCEPTED.")

# 9. Seller Starts Packing
print(f"--> Seller packing order #{order_number}...")
res_packing = requests.patch(f"{BASE_URL}/seller/orders/{order_id}/status", headers=seller_headers, json={"status": "PACKING"})
assert res_packing.status_code == 200, f"Seller packing failed: {res_packing.text}"
print("Order status updated to PACKING.")

# 10. Seller Marks Ready
print(f"--> Seller marking order #{order_number} READY...")
res_ready = requests.patch(f"{BASE_URL}/seller/orders/{order_id}/status", headers=seller_headers, json={"status": "READY"})
assert res_ready.status_code == 200, f"Seller ready failed: {res_ready.text}"
ready_data = res_ready.json()["data"]
pickup_otp = ready_data.get("pickup_otp")
print(f"Order status updated to READY. Pickup OTP generated: {pickup_otp}")

# 11. Delivery Partner Receives Task
print(f"--> Delivery partner checking assigned tasks...")
res_tasks = requests.get(f"{BASE_URL}/delivery/tasks", headers=delivery_headers)
assert res_tasks.status_code == 200, f"Delivery tasks list failed: {res_tasks.text}"
tasks = res_tasks.json()["data"]
partner_task = next((t for t in tasks if t["order_id"] == order_id), None)
assert partner_task is not None, f"Delivery task for order {order_id} not found on delivery dashboard!"
task_id = partner_task["id"]
print(f"PASS: Delivery partner received task id={task_id} for order #{order_number}!")

# 12. Delivery Partner Verifies Seller Pickup OTP
print(f"--> Delivery partner verifying pickup at seller shop with OTP={pickup_otp}...")
res_verify_pickup = requests.post(f"{BASE_URL}/delivery/tasks/{task_id}/verify-pickup", headers=delivery_headers, json={
    "otp": pickup_otp or "123456"
})
assert res_verify_pickup.status_code == 200, f"Pickup verification failed: {res_verify_pickup.text}"
print("PASS: Pickup verified successfully!")

# 13. Delivery Partner Delivers to Customer with Doorstep OTP
print(f"--> Delivery partner completing delivery with doorstep OTP...")
if not doorstep_otp:
    doorstep_otp = "123456"
res_deliver = requests.post(f"{BASE_URL}/delivery/tasks/{task_id}/verify-otp", headers=delivery_headers, json={
    "delivery_otp": doorstep_otp
})
assert res_deliver.status_code == 200, f"Delivery completion failed: {res_deliver.text}"
print(f"PASS: Order #{order_number} marked DELIVERED!")


print("\n==================================================")
print("SUCCESS: COMPLETE END-TO-END FLOW VERIFIED!")
print("==================================================")
db.close()
