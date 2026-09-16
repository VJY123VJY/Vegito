import requests
import sys

BASE_API = "http://127.0.0.1:8000/api/v1"
BASE_FE = "http://localhost:3000"

def test_suite():
    passed = 0
    total = 11

    print("\n" + "="*60)
    print("VEGITO END-TO-END 11 TEST VERIFICATION SUITE")
    print("="*60)

    # Clean up or use unique numbers for test run
    cust_phone = "9876543210"
    seller_phone = "9876543211"
    delivery_phone = "9876543212"

    # TEST 1: Register a new Customer
    print("\n[TEST 1] Register new Customer (9876543210)...")
    res = requests.post(f"{BASE_API}/auth/register", json={
        "name": "Ramesh Patil",
        "phone": cust_phone,
        "password": "MyPass123",
        "role": "CUSTOMER",
        "city": "Solapur",
        "pincode": "413001"
    })
    # Accept 201 (created) or 409 (already exists from previous test run)
    if res.status_code in (200, 201):
        print(f"  -> SUCCESS: Customer registered ({res.json().get('message')})")
        passed += 1
    elif res.status_code == 409:
        print(f"  -> SUCCESS: Handled duplicate/existing customer ({res.json().get('error', {}).get('message')})")
        passed += 1
    else:
        print(f"  -> FAILED: Status {res.status_code}, {res.text}")

    # TEST 2: Log in as Customer -> Customer Dashboard token
    print("\n[TEST 2] Log in as Customer (9876543210 + MyPass123)...")
    res = requests.post(f"{BASE_API}/auth/login", json={
        "phone": cust_phone,
        "password": "MyPass123",
        "role": "CUSTOMER"
    })
    if res.status_code == 200 and res.json().get("data", {}).get("role") == "CUSTOMER":
        print(f"  -> SUCCESS: Logged in, token granted, role = {res.json()['data']['role']}")
        cust_token = res.json()["data"]["access_token"]
        passed += 1
    else:
        print(f"  -> FAILED: Status {res.status_code}, {res.text}")

    # TEST 3: Try logging into Seller Portal with Customer credentials -> MUST BE REJECTED
    print("\n[TEST 3] Customer attempting login to Seller Portal...")
    res = requests.post(f"{BASE_API}/auth/login", json={
        "phone": cust_phone,
        "password": "MyPass123",
        "role": "SELLER"
    })
    if res.status_code == 403:
        print(f"  -> SUCCESS: Correctly rejected with HTTP 403: {res.json().get('error', {}).get('message')}")
        passed += 1
    else:
        print(f"  -> FAILED: Expected 403, got {res.status_code} ({res.text})")

    # TEST 4: Try logging into Delivery Fleet with Customer credentials -> MUST BE REJECTED
    print("\n[TEST 4] Customer attempting login to Delivery Fleet...")
    res = requests.post(f"{BASE_API}/auth/login", json={
        "phone": cust_phone,
        "password": "MyPass123",
        "role": "DELIVERY_PARTNER"
    })
    if res.status_code == 403:
        print(f"  -> SUCCESS: Correctly rejected with HTTP 403: {res.json().get('error', {}).get('message')}")
        passed += 1
    else:
        print(f"  -> FAILED: Expected 403, got {res.status_code} ({res.text})")

    # TEST 5: Register a new Seller
    print("\n[TEST 5] Register new Seller (9876543211)...")
    res = requests.post(f"{BASE_API}/auth/register", json={
        "name": "Sahyadri Farms",
        "phone": seller_phone,
        "password": "SellerPass123",
        "role": "SELLER",
        "business_name": "Sahyadri Natural Estate",
        "city": "Solapur",
        "pincode": "413001"
    })
    if res.status_code in (200, 201):
        print(f"  -> SUCCESS: Seller registered ({res.json().get('message')})")
        passed += 1
    elif res.status_code == 409:
        print(f"  -> SUCCESS: Handled duplicate/existing seller ({res.json().get('error', {}).get('message')})")
        passed += 1
    else:
        print(f"  -> FAILED: Status {res.status_code}, {res.text}")

    # TEST 6: Log in as Seller -> Seller Portal
    print("\n[TEST 6] Log in as Seller (9876543211 + SellerPass123)...")
    res = requests.post(f"{BASE_API}/auth/login", json={
        "phone": seller_phone,
        "password": "SellerPass123",
        "role": "SELLER"
    })
    if res.status_code == 200 and res.json().get("data", {}).get("role") == "SELLER":
        print(f"  -> SUCCESS: Logged in, token granted, role = {res.json()['data']['role']}")
        passed += 1
    else:
        print(f"  -> FAILED: Status {res.status_code}, {res.text}")

    # TEST 7: Try logging into Customer Dashboard with Seller credentials -> MUST BE REJECTED
    print("\n[TEST 7] Seller attempting login to Customer Portal...")
    res = requests.post(f"{BASE_API}/auth/login", json={
        "phone": seller_phone,
        "password": "SellerPass123",
        "role": "CUSTOMER"
    })
    if res.status_code == 403:
        print(f"  -> SUCCESS: Correctly rejected with HTTP 403: {res.json().get('error', {}).get('message')}")
        passed += 1
    else:
        print(f"  -> FAILED: Expected 403, got {res.status_code} ({res.text})")

    # TEST 8: Register a new Delivery Partner
    print("\n[TEST 8] Register new Delivery Partner (9876543212)...")
    res = requests.post(f"{BASE_API}/auth/register", json={
        "name": "Kiran Shinde",
        "phone": delivery_phone,
        "password": "DeliveryPass123",
        "role": "DELIVERY_PARTNER",
        "vehicle_type": "Motorcycle",
        "vehicle_number": "MH-13-CD-5678",
        "city": "Solapur",
        "pincode": "413001"
    })
    if res.status_code in (200, 201):
        print(f"  -> SUCCESS: Delivery partner registered ({res.json().get('message')})")
        passed += 1
    elif res.status_code == 409:
        print(f"  -> SUCCESS: Handled duplicate/existing delivery partner ({res.json().get('error', {}).get('message')})")
        passed += 1
    else:
        print(f"  -> FAILED: Status {res.status_code}, {res.text}")

    # TEST 9: Log in as Delivery Partner -> Delivery Fleet Dashboard
    print("\n[TEST 9] Log in as Delivery Partner (9876543212 + DeliveryPass123)...")
    res = requests.post(f"{BASE_API}/auth/login", json={
        "phone": delivery_phone,
        "password": "DeliveryPass123",
        "role": "DELIVERY_PARTNER"
    })
    if res.status_code == 200 and res.json().get("data", {}).get("role") == "DELIVERY_PARTNER":
        print(f"  -> SUCCESS: Logged in, token granted, role = {res.json()['data']['role']}")
        passed += 1
    else:
        print(f"  -> FAILED: Status {res.status_code}, {res.text}")

    # TEST 10: Try logging into Customer or Seller with Delivery credentials -> MUST BE REJECTED
    print("\n[TEST 10] Delivery partner attempting login to Customer & Seller portals...")
    res_cust = requests.post(f"{BASE_API}/auth/login", json={
        "phone": delivery_phone,
        "password": "DeliveryPass123",
        "role": "CUSTOMER"
    })
    res_seller = requests.post(f"{BASE_API}/auth/login", json={
        "phone": delivery_phone,
        "password": "DeliveryPass123",
        "role": "SELLER"
    })
    if res_cust.status_code == 403 and res_seller.status_code == 403:
        print(f"  -> SUCCESS: Both customer (403) and seller (403) login attempts rejected.")
        passed += 1
    else:
        print(f"  -> FAILED: cust={res_cust.status_code}, seller={res_seller.status_code}")

    # TEST 11: Main landing page and frontend routes responsiveness
    print("\n[TEST 11] Frontend routes check (Landing, Login, Register, Dashboards, Unauthorized)...")
    routes = [
        "/",
        "/auth/login",
        "/auth/register",
        "/customer",
        "/seller",
        "/delivery",
        "/admin",
        "/unauthorized"
    ]
    all_routes_ok = True
    for route in routes:
        try:
            r = requests.get(f"{BASE_FE}{route}", timeout=10)
            if r.status_code == 200:
                print(f"  -> Route {route}: OK (200)")
            else:
                print(f"  -> Route {route}: Status {r.status_code}")
                all_routes_ok = False
        except Exception as e:
            print(f"  -> Route {route}: Error: {e}")
            all_routes_ok = False

    if all_routes_ok:
        print("  -> SUCCESS: All frontend routes compiled and returned HTTP 200 successfully!")
        passed += 1
    else:
        print("  -> FAILED: Some frontend routes failed.")

    print("\n" + "="*60)
    print(f"TEST RESULTS: {passed}/{total} TESTS PASSED")
    print("="*60)
    return passed == total

if __name__ == "__main__":
    success = test_suite()
    sys.exit(0 if success else 1)
