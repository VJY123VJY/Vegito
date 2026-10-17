import pytest
from decimal import Decimal
from unittest.mock import MagicMock
from app.services.location_service import (
    LocationService,
    calculate_item_weight_kg,
    calculate_haversine_distance_km,
)
from app.services.delivery_pricing_service import DeliveryPricingService, DeliveryEligibilityResult


def test_calculate_item_weight_kg():
    # Standard kg
    assert calculate_item_weight_kg("kg", 2.0) == 2.0
    assert calculate_item_weight_kg("1.5 kg", 2.0) == 3.0

    # Grams
    assert calculate_item_weight_kg("500g", 2.0) == 1.0
    assert calculate_item_weight_kg("250g", 4.0) == 1.0
    assert calculate_item_weight_kg("100g", 10.0) == 1.0
    assert calculate_item_weight_kg("200 gm", 5.0) == 1.0

    # Heavy units
    assert calculate_item_weight_kg("quintal", 1.0) == 100.0

    # Pieces / bundles / dozen
    assert calculate_item_weight_kg("bundle", 4.0) == 1.0
    assert calculate_item_weight_kg("piece", 2.0) == 1.0
    assert calculate_item_weight_kg("dozen", 2.0) == 3.0


def test_same_address_zero_km_is_eligible():
    # 0.0 km (exact same coordinates)
    is_valid, msg = LocationService.is_within_delivery_bounds(0.0, total_weight_kg=5.0)
    assert is_valid is True
    assert "same-location" in msg.lower() or "0.00 km" in msg

    # Very close (e.g. within 50 meters in same building/compound)
    is_valid_close, _ = LocationService.is_within_delivery_bounds(0.03, total_weight_kg=10.0)
    assert is_valid_close is True


def test_rule_a_weight_under_30kg():
    weight = 25.0  # <= 30 kg -> max 20 km

    # Within 20 km
    valid_5km, msg_5km = LocationService.is_within_delivery_bounds(5.0, total_weight_kg=weight)
    assert valid_5km is True
    assert "within operational bounds" in msg_5km

    valid_20km, msg_20km = LocationService.is_within_delivery_bounds(20.0, total_weight_kg=weight)
    assert valid_20km is True

    # Exceeding 20 km
    invalid_25km, msg_25km = LocationService.is_within_delivery_bounds(25.0, total_weight_kg=weight)
    assert invalid_25km is False
    assert "exceeds the 20 km limit" in msg_25km
    assert "orders up to 30 kg" in msg_25km
    assert "25.0 kg" in msg_25km


def test_rule_b_weight_over_30kg():
    weight = 40.0  # > 30 kg -> max 50 km

    # 25 km is within 50 km for heavy orders
    valid_25km, msg_25km = LocationService.is_within_delivery_bounds(25.0, total_weight_kg=weight)
    assert valid_25km is True

    valid_50km, msg_50km = LocationService.is_within_delivery_bounds(50.0, total_weight_kg=weight)
    assert valid_50km is True

    # Exceeding 50 km
    invalid_52km, msg_52km = LocationService.is_within_delivery_bounds(52.0, total_weight_kg=weight)
    assert invalid_52km is False
    assert "exceeds the 50 km limit" in msg_52km
    assert "orders over 30 kg" in msg_52km
    assert "40.0 kg" in msg_52km


def test_delivery_pricing_service_tiered_fees():
    db_mock = MagicMock()

    # Mock seller coordinates
    LocationService.resolve_seller_coordinates = MagicMock(return_value=(18.4989, 73.8312))

    # Same location (0 km)
    res_0km = DeliveryPricingService.check_eligibility_and_pricing(
        db=db_mock,
        cust_lat=18.4989,
        cust_lng=73.8312,
        total_weight_kg=5.0,
    )
    assert res_0km.is_deliverable is True
    assert res_0km.distance_km == 0.0
    assert res_0km.delivery_fee == Decimal("20.00")

    # 12 km (Rule A <= 30kg) -> fee 50.00
    res_12km = DeliveryPricingService.check_eligibility_and_pricing(
        db=db_mock,
        cust_lat=18.6000,
        cust_lng=73.8312,
        total_weight_kg=15.0,
    )
    assert res_12km.is_deliverable is True
    assert res_12km.delivery_fee == Decimal("50.00")

    # 25 km with 10 kg produce -> Ineligible (Rule A)
    res_25km_light = DeliveryPricingService.check_eligibility_and_pricing(
        db=db_mock,
        cust_lat=18.7200,
        cust_lng=73.8312,
        total_weight_kg=10.0,
        raise_on_ineligible=False,
    )
    assert res_25km_light.is_deliverable is False
    assert "exceeds the 20 km limit" in res_25km_light.reason

    # 25 km with 35 kg produce -> Eligible (Rule B)
    res_25km_heavy = DeliveryPricingService.check_eligibility_and_pricing(
        db=db_mock,
        cust_lat=18.7200,
        cust_lng=73.8312,
        total_weight_kg=35.0,
        raise_on_ineligible=False,
    )
    assert res_25km_heavy.is_deliverable is True
    assert res_25km_heavy.max_allowed_km == 50.0
    assert res_25km_heavy.delivery_fee > Decimal("50.00")
