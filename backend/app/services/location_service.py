"""
location_service.py — Centralized Geographic Distance & 1–15 KM Routing Service for Vegito.

Implements:
1. Haversine distance calculation between two GPS coordinates (lat/lon).
2. Configurable delivery distance bounds (MIN_DELIVERY_DISTANCE_KM = 1.0, MAX_DELIVERY_DISTANCE_KM = 15.0).
3. Safe handling for same-location / same-building edge cases (< 1.0 km).
4. Address coordinate resolution and persistence.
5. Seller coordinate resolution and validation.
6. Geographic eligibility checks for Sellers and Delivery Partners.
"""

import math
import logging
from decimal import Decimal
from typing import Optional, Tuple, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.config import settings
from app.models.address import Address
from app.models.seller_profile import SellerProfile
from app.models.delivery_partner import DeliveryPartner
from app.models.delivery_partner_location import DeliveryPartnerLocation
from app.models.seller_product import SellerProduct
from app.models.user import User
from app.core.exceptions import BadRequestException

logger = logging.getLogger(__name__)

# Configurable bounds
MIN_DELIVERY_DISTANCE_KM: float = getattr(settings, "MIN_DELIVERY_DISTANCE_KM", 1.0)
MAX_DELIVERY_DISTANCE_KM: float = getattr(settings, "DELIVERY_MAX_DISTANCE_KM", 20.0)
ALLOW_SAME_BUILDING_DELIVERY: bool = getattr(settings, "ALLOW_SAME_BUILDING_DELIVERY", True)

def calculate_haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates great-circle distance between two geographic coordinates in kilometers
    using the Haversine formula.
    """
    if not all(math.isfinite(value) for value in (lat1, lon1, lat2, lon2)):
        raise ValueError("Coordinates must be finite numbers.")
    if not (-90 <= lat1 <= 90 and -90 <= lat2 <= 90):
        raise ValueError("Latitude is outside valid bounds.")
    if not (-180 <= lon1 <= 180 and -180 <= lon2 <= 180):
        raise ValueError("Longitude is outside valid bounds.")

    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


class LocationService:
    @staticmethod
    def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Standard wrapper for Haversine distance in KM."""
        return calculate_haversine_distance_km(lat1, lon1, lat2, lon2)

    @staticmethod
    def is_within_delivery_bounds(
        distance_km: float,
        allow_same_location: bool = True,
        min_km: Optional[float] = None,
        max_km: Optional[float] = None,
    ) -> Tuple[bool, str]:
        """
        Validates if distance is within Vegito's operational bounds:
        - Must be <= MAX_DELIVERY_DISTANCE_KM (20.0 km).
        - If < MIN_DELIVERY_DISTANCE_KM (1.0 km), allowed as local/same-location delivery if allow_same_location is True.
        """
        min_limit = min_km if min_km is not None else MIN_DELIVERY_DISTANCE_KM
        max_limit = max_km if max_km is not None else MAX_DELIVERY_DISTANCE_KM

        if distance_km > max_limit:
            return False, f"Distance of {distance_km:.2f} km exceeds maximum delivery radius of {max_limit:.1f} km."

        if distance_km < min_limit:
            if allow_same_location:
                return True, f"Distance of {distance_km:.2f} km is within local neighborhood delivery zone (< {min_limit:.1f} km)."
            return False, f"Distance of {distance_km:.2f} km is below minimum delivery distance of {min_limit:.1f} km."

        return True, f"Distance of {distance_km:.2f} km is within operational bounds ({min_limit:.1f}–{max_limit:.1f} km)."

    @staticmethod
    def is_within_b2b_bulk_bounds(
        distance_km: float,
        total_weight_kg: float,
    ) -> Tuple[bool, str]:
        """
        Validates B2B Bulk order eligibility per Section 50:
        Total eligible weight > 50 KG AND 1.0 KM <= distance <= 35.0 KM.
        """
        if total_weight_kg <= 50.0:
            return False, f"B2B Bulk delivery requires total order weight > 50 KG. Current weight: {total_weight_kg:.1f} KG."

        if distance_km < 1.0:
            return False, f"B2B Bulk orders require a minimum delivery distance of 1.0 km. Current distance: {distance_km:.2f} km."

        if distance_km > 35.0:
            return False, f"B2B Bulk orders are limited to a maximum delivery distance of 35.0 km. Current distance: {distance_km:.2f} km."

        return True, f"B2B Bulk delivery eligible: {total_weight_kg:.1f} KG produce over {distance_km:.2f} km (1–35 km)."

    @staticmethod
    def resolve_address_coordinates(db: Session, address: Address) -> Tuple[Optional[float], Optional[float]]:
        """
        Returns actual coordinates for an address.

        Important: the backend must never fabricate GPS coordinates for a missing address pin.
        If coordinates are absent, the flow must reject the request with a clear validation error.
        """
        if address.latitude is not None and address.longitude is not None:
            return float(address.latitude), float(address.longitude)

        raise BadRequestException(
            message="This delivery address is missing real GPS coordinates. Please select a valid saved address or re-pin the location.",
            code="ADDRESS_COORDINATES_MISSING",
            details={
                "address_id": address.id,
                "message": "Selected address has no GPS coordinates.",
            },
        )

    @staticmethod
    def resolve_seller_coordinates(
        db: Session, seller_id: Optional[int] = None, fallback_to_default: bool = False
    ) -> Tuple[Optional[float], Optional[float]]:
        """
        Retrieves real coordinates for a seller.
        If seller_id is not specified (e.g. single-seller V1), resolves the active seller with real coordinates.

        Synthetic Solapur defaults are intentionally not used. If a seller profile cannot provide
        a real GPS pin, the system must fail closed and reject the operation rather than inventing
        coordinates for routing or checkout decisions.
        """
        profile = None
        if seller_id is not None:
            profile = (
                db.query(SellerProfile)
                .filter(or_(SellerProfile.user_id == seller_id, SellerProfile.id == seller_id))
                .first()
            )
        if not profile:
            profile = (
                db.query(SellerProfile)
                .join(SellerProduct, SellerProduct.seller_id == SellerProfile.user_id)
                .join(User, SellerProfile.user_id == User.id)
                .filter(
                    User.is_active == True,
                    SellerProfile.latitude.isnot(None),
                    SellerProfile.longitude.isnot(None),
                    SellerProduct.is_available == True,
                )
                .order_by(SellerProfile.id.desc())
                .first()
            )
        if not profile:
            profile = (
                db.query(SellerProfile)
                .join(User, SellerProfile.user_id == User.id)
                .filter(
                    User.is_active == True,
                    SellerProfile.latitude.isnot(None),
                    SellerProfile.longitude.isnot(None),
                )
                .order_by(SellerProfile.id.desc())
                .first()
            )
        if not profile:
            profile = db.query(SellerProfile).filter(
                SellerProfile.latitude.isnot(None),
                SellerProfile.longitude.isnot(None)
            ).order_by(SellerProfile.id.desc()).first()

        if not profile:
            return None, None

        if profile.latitude is not None and profile.longitude is not None:
            return float(profile.latitude), float(profile.longitude)

        if profile.address_id:
            addr = db.query(Address).filter(Address.id == profile.address_id).first()
            if addr and addr.latitude is not None and addr.longitude is not None:
                return float(addr.latitude), float(addr.longitude)

        return None, None

    @staticmethod
    def find_eligible_sellers(
        db: Session,
        customer_lat: float,
        customer_lon: float,
        product_ids: Optional[List[int]] = None,
        max_distance_km: float = 20.0,
    ) -> List[Dict[str, Any]]:
        """
        Finds all active, nearby sellers within max_distance_km (1–20 km) from customer location.
        Filters out:
          - Sellers that are inactive or offline.
          - Sellers beyond 20 km.
          - Sellers lacking stock if product_ids is specified.
        """
        profiles = (
            db.query(SellerProfile)
            .join(User, SellerProfile.user_id == User.id)
            .filter(
                SellerProfile.is_available == True,
                User.is_active == True,
            )
            .all()
        )

        eligible: List[Dict[str, Any]] = []

        for p in profiles:
            s_lat = float(p.latitude) if p.latitude else None
            s_lon = float(p.longitude) if p.longitude else None

            if s_lat is None or s_lon is None:
                # Attempt to resolve from profile address
                if p.address_id:
                    addr = db.query(Address).filter(Address.id == p.address_id).first()
                    if addr and addr.latitude and addr.longitude:
                        s_lat, s_lon = float(addr.latitude), float(addr.longitude)

            if s_lat is None or s_lon is None:
                logger.warning(f"[LOCATION] Seller {p.id} (user {p.user_id}) has no valid coordinates. Skipping.")
                continue

            dist = calculate_haversine_distance_km(customer_lat, customer_lon, s_lat, s_lon)
            is_valid, _ = LocationService.is_within_delivery_bounds(dist, max_km=max_distance_km)
            if not is_valid:
                continue

            # If product_ids specified, check if seller carries them
            if product_ids:
                seller_products = (
                    db.query(SellerProduct)
                    .filter(
                        SellerProduct.seller_id == p.user_id,
                        SellerProduct.product_id.in_(product_ids),
                        SellerProduct.is_available == True,
                        SellerProduct.stock_quantity > 0,
                    )
                    .all()
                )
                carrying_ids = {sp.product_id for sp in seller_products}
                if not carrying_ids.issuperset(set(product_ids)):
                    # Seller doesn't carry all requested products
                    continue

            eligible.append({
                "seller_profile": p,
                "user_id": p.user_id,
                "business_name": p.business_name,
                "distance_km": dist,
                "latitude": s_lat,
                "longitude": s_lon,
            })

        eligible.sort(key=lambda x: x["distance_km"])
        return eligible

    @staticmethod
    def find_eligible_delivery_partners(
        db: Session,
        seller_lat: float,
        seller_lon: float,
        max_distance_km: float = 15.0,
    ) -> List[Tuple[DeliveryPartner, float]]:
        """
        Finds eligible delivery partners within 1–15 km of the seller's pickup location.
        Criteria:
          1. User active and partner available.
          2. No active concurrent delivery.
          3. Distance from partner latest location to seller <= max_distance_km.
        """
        candidates = (
            db.query(DeliveryPartner)
            .join(User, DeliveryPartner.user_id == User.id)
            .filter(
                DeliveryPartner.is_available == True,
                User.is_active == True,
            )
            .all()
        )

        eligible: List[Tuple[DeliveryPartner, float]] = []

        from app.models.delivery_task import DeliveryTask
        from app.models.order import Order

        for partner in candidates:
            # Check for active delivery task
            active_task = (
                db.query(DeliveryTask)
                .join(Order, DeliveryTask.order_id == Order.id)
                .filter(
                    DeliveryTask.delivery_partner_id == partner.id,
                    DeliveryTask.status.in_(["ASSIGNED", "STARTED", "OUT_FOR_DELIVERY", "PICKED_UP"]),
                    Order.status.notin_(["DELIVERED", "CANCELLED", "REJECTED"]),
                )
                .first()
            )
            if active_task:
                continue

            # Get partner's latest recorded location
            loc = (
                db.query(DeliveryPartnerLocation)
                .filter(DeliveryPartnerLocation.delivery_partner_id == partner.id)
                .order_by(DeliveryPartnerLocation.recorded_at.desc())
                .first()
            )

            if loc and loc.latitude is not None and loc.longitude is not None:
                p_lat = float(loc.latitude)
                p_lon = float(loc.longitude)
                dist = calculate_haversine_distance_km(p_lat, p_lon, seller_lat, seller_lon)
            else:
                logger.info(
                    "Skipping delivery partner %s because no current GPS location is available.",
                    partner.id,
                )
                continue

            is_valid, _ = LocationService.is_within_delivery_bounds(dist, max_km=max_distance_km)
            if is_valid:
                eligible.append((partner, dist))

        eligible.sort(key=lambda x: x[1])
        return eligible
