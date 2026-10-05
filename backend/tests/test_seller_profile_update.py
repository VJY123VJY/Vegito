import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.seller_profile import SellerProfile
from app.services.jwt_service import create_access_token

def test_seller_profile_update_address_and_coords(client: TestClient, db: Session):
    seller = db.query(User).filter(User.phone == "9881001502").first()
    if not seller:
        seller = User(phone="9881001502", name="Seller Test", role_id=2, is_active=True, password_hash="hash")
        db.add(seller)
        db.commit()
        db.refresh(seller)
    
    token = create_access_token({"sub": str(seller.id), "phone": seller.phone, "role": "SELLER"})
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "address": "Shop at 17.6805, 75.9064",
        "latitude": 17.6805,
        "longitude": 75.9064,
    }
    res = client.patch("/api/v1/seller/profile", json=payload, headers=headers)
    print("RES STATUS:", res.status_code)
    print("RES JSON:", res.json())
    assert res.status_code == 200
    data = res.json()["data"]
    assert float(data["latitude"]) == pytest.approx(17.6805, abs=0.001)
    assert float(data["longitude"]) == pytest.approx(75.9064, abs=0.001)
