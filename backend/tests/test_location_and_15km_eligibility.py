import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.user import User
from app.models.address import Address
from app.models.seller_profile import SellerProfile
from app.services.jwt_service import create_access_token
from app.services.location_service import LocationService


# Helper to compute lat/lon at an exact distance north of seller
# 1 degree latitude = 6371 * pi / 180 ~= 111.1949 km
def get_coords_at_distance(base_lat: float, base_lon: float, distance_km: float):
    delta_lat = distance_km / 111.1949
    return (base_lat + delta_lat, base_lon)


@pytest.fixture
def auth_customer(db: Session):
    user = db.query(User).filter(User.phone == "9881001501").first()
    if not user:
        user = User(
            phone="9881001501",
            name="Location Test Customer",
            role_id=1,
            is_active=True,
            password_hash="testhash123",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    token = create_access_token({"sub": str(user.id), "phone": user.phone, "role": "CUSTOMER"})
    return {"user": user, "token": token, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture
def active_seller(db: Session):
    seller_user = db.query(User).filter(User.phone == "9881001502").first()
    if not seller_user:
        seller_user = User(
            phone="9881001502",
            name="Location Test Seller",
            role_id=2,
            is_active=True,
            password_hash="testhash123",
        )
        db.add(seller_user)
        db.commit()
        db.refresh(seller_user)

    seller_profile = db.query(SellerProfile).filter(SellerProfile.user_id == seller_user.id).first()
    if not seller_profile:
        seller_profile = SellerProfile(
            user_id=seller_user.id,
            business_name="Solapur Fresh Depot",
            latitude=Decimal("17.6599187"),
            longitude=Decimal("75.9063875"),
            is_available=True,
            is_verified=True,
        )
        db.add(seller_profile)
        db.commit()
        db.refresh(seller_profile)
    else:
        seller_profile.latitude = Decimal("17.6599187")
        seller_profile.longitude = Decimal("75.9063875")
        seller_profile.is_available = True
        db.commit()

    return seller_profile


def test_haversine_boundary_calculation(active_seller):
    s_lat = float(active_seller.latitude)
    s_lon = float(active_seller.longitude)

    # 1. Same location (0 km) -> PASS
    dist_zero = LocationService.calculate_distance(s_lat, s_lon, s_lat, s_lon)
    assert round(dist_zero, 2) == 0.0
    in_bounds, _ = LocationService.is_within_delivery_bounds(dist_zero, max_km=20.0)
    assert in_bounds is True

    # 2. Test 5 km -> PASS
    c_lat_5, c_lon_5 = get_coords_at_distance(s_lat, s_lon, 5.0)
    dist_5 = LocationService.calculate_distance(c_lat_5, c_lon_5, s_lat, s_lon)
    assert 4.9 <= dist_5 <= 5.1
    in_bounds, _ = LocationService.is_within_delivery_bounds(dist_5, max_km=20.0)
    assert in_bounds is True

    # 3. Test 15.0 km -> PASS
    c_lat_15, c_lon_15 = get_coords_at_distance(s_lat, s_lon, 15.0)
    dist_15 = LocationService.calculate_distance(c_lat_15, c_lon_15, s_lat, s_lon)
    assert 14.9 <= dist_15 <= 15.1
    in_bounds, _ = LocationService.is_within_delivery_bounds(dist_15, max_km=20.0)
    assert in_bounds is True

    # 4. Test 19.9 km -> PASS
    c_lat_19_9, c_lon_19_9 = get_coords_at_distance(s_lat, s_lon, 19.9)
    dist_19_9 = LocationService.calculate_distance(c_lat_19_9, c_lon_19_9, s_lat, s_lon)
    in_bounds, _ = LocationService.is_within_delivery_bounds(dist_19_9, max_km=20.0)
    assert in_bounds is True

    # 5. Test 20.0 km -> PASS
    c_lat_20, c_lon_20 = get_coords_at_distance(s_lat, s_lon, 20.0)
    dist_20 = LocationService.calculate_distance(c_lat_20, c_lon_20, s_lat, s_lon)
    in_bounds, _ = LocationService.is_within_delivery_bounds(20.0, max_km=20.0)
    assert in_bounds is True

    # 6. Test 20.1 km -> FAIL
    c_lat_20_1, c_lon_20_1 = get_coords_at_distance(s_lat, s_lon, 20.1)
    dist_20_1 = LocationService.calculate_distance(c_lat_20_1, c_lon_20_1, s_lat, s_lon)
    in_bounds, _ = LocationService.is_within_delivery_bounds(dist_20_1, max_km=20.0)
    assert in_bounds is False

    # 7. Test 25.0 km -> FAIL
    c_lat_25, c_lon_25 = get_coords_at_distance(s_lat, s_lon, 25.0)
    dist_25 = LocationService.calculate_distance(c_lat_25, c_lon_25, s_lat, s_lon)
    in_bounds, _ = LocationService.is_within_delivery_bounds(dist_25, max_km=20.0)
    assert in_bounds is False


def test_delivery_eligibility_endpoint_within_15km(client: TestClient, active_seller):
    s_lat = float(active_seller.latitude)
    s_lon = float(active_seller.longitude)

    # 3 km away from seller
    cust_lat, cust_lon = get_coords_at_distance(s_lat, s_lon, 3.0)

    res = client.get(f"/api/v1/customers/delivery-eligibility?lat={cust_lat}&lon={cust_lon}&seller_id={active_seller.user_id}")
    assert res.status_code == 200
    data = res.json()["data"]

    assert data["is_eligible"] is True
    assert data["distance_km"] <= 20.0
    assert data["max_radius_km"] == 20.0
    assert data["seller_name"] == active_seller.business_name
    assert "Delivery available" in data["message"]


def test_delivery_eligibility_endpoint_outside_15km(client: TestClient, active_seller):
    s_lat = float(active_seller.latitude)
    s_lon = float(active_seller.longitude)

    # 25 km away from seller (outside 20 km operational radius)
    cust_lat, cust_lon = get_coords_at_distance(s_lat, s_lon, 25.0)

    res = client.get(f"/api/v1/customers/delivery-eligibility?lat={cust_lat}&lon={cust_lon}&seller_id={active_seller.user_id}")
    assert res.status_code == 200
    data = res.json()["data"]

    assert data["is_eligible"] is False
    assert data["distance_km"] > 20.0
    assert data["max_radius_km"] == 20.0
    assert "Outside delivery area" in data["message"]


def test_address_creation_within_15km_succeeds(client: TestClient, auth_customer, active_seller):
    s_lat = float(active_seller.latitude)
    s_lon = float(active_seller.longitude)

    # Within 15 KM: 4 km away
    cust_lat, cust_lon = get_coords_at_distance(s_lat, s_lon, 4.0)

    payload = {
        "address_line1": "Flat 201, Green Meadows, Saat Rasta",
        "city": "Solapur",
        "state": "Maharashtra",
        "country": "India",
        "pincode": "413003",
        "latitude": cust_lat,
        "longitude": cust_lon,
        "address_type": "HOME",
    }

    res = client.post("/api/v1/addresses", json=payload, headers=auth_customer["headers"])
    assert res.status_code in [200, 201]
    created = res.json()["data"]
    assert created["city"].lower() == "solapur"
    assert float(created["latitude"]) == pytest.approx(cust_lat, abs=0.001)


def test_address_creation_outside_15km_rejected(client: TestClient, auth_customer, active_seller):
    s_lat = float(active_seller.latitude)
    s_lon = float(active_seller.longitude)

    # Outside 15 KM: 22 km away
    cust_lat, cust_lon = get_coords_at_distance(s_lat, s_lon, 22.0)

    payload = {
        "address_line1": "Rural Farmhouse, Far Highway",
        "city": "Solapur",
        "state": "Maharashtra",
        "country": "India",
        "pincode": "413001",
        "latitude": cust_lat,
        "longitude": cust_lon,
        "address_type": "HOME",
    }

    res = client.post("/api/v1/addresses", json=payload, headers=auth_customer["headers"])
    assert res.status_code == 400
    res_body = res.json()
    err = res_body.get("error", {})
    detail = res_body.get("detail", "")
    assert err.get("code") == "DELIVERY_OUT_OF_RANGE"
    assert "delivery area" in (err.get("message", "") + detail).lower()


def test_address_update_outside_15km_rejected(client: TestClient, auth_customer, active_seller):
    s_lat = float(active_seller.latitude)
    s_lon = float(active_seller.longitude)

    # 1. Create valid address at 2 km
    cust_lat, cust_lon = get_coords_at_distance(s_lat, s_lon, 2.0)
    payload = {
        "address_line1": "Flat 101, Ashok Chowk",
        "city": "Solapur",
        "state": "Maharashtra",
        "country": "India",
        "pincode": "413005",
        "latitude": cust_lat,
        "longitude": cust_lon,
        "address_type": "HOME",
    }
    res = client.post("/api/v1/addresses", json=payload, headers=auth_customer["headers"])
    assert res.status_code in [200, 201]
    addr_id = res.json()["data"]["id"]

    # 2. Attempt to update GPS to 25 km away
    far_lat, far_lon = get_coords_at_distance(s_lat, s_lon, 25.0)
    update_res = client.patch(
        f"/api/v1/addresses/{addr_id}",
        json={"latitude": far_lat, "longitude": far_lon},
        headers=auth_customer["headers"]
    )
    assert update_res.status_code == 400
    res_body = update_res.json()
    err = res_body.get("error", {})
    detail = res_body.get("detail", "")
    assert err.get("code") == "DELIVERY_OUT_OF_RANGE"
    assert "delivery area" in (err.get("message", "") + detail).lower()
