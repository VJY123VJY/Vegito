import logging
from decimal import Decimal
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.models.address import Address
from app.models.seller_profile import SellerProfile
from app.core.exceptions import BadRequestException, NotFoundException
from app.config import settings

logger = logging.getLogger(__name__)


from dataclasses import dataclass

@dataclass
class DeliveryEligibilityResult:
    delivery_fee: Decimal
    distance_km: float
    is_deliverable: bool
    reason: str
    max_allowed_km: float
    total_weight_kg: float


class DeliveryPricingService:
    @staticmethod
    def get_seller_shop_coordinates(db: Session, seller_id: Optional[int] = None) -> Tuple[Optional[float], Optional[float]]:
        """
        Retrieves real coordinates for the seller's shop or depot.

        No fake urban fallback is allowed: if the seller profile has no actual GPS pin,
        the caller must reject the order instead of substituting a fabricated Solapur coordinate.
        """
        from app.models.user import User

        shop_prof = None
        if seller_id is not None:
            shop_prof = (
                db.query(SellerProfile)
                .filter(SellerProfile.user_id == seller_id)
                .first()
            )
            if not shop_prof:
                return None, None
        else:
            from app.models.seller_product import SellerProduct
            shop_prof = (
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
        if not shop_prof and seller_id is None:
            shop_prof = (
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
        if not shop_prof and seller_id is None:
            shop_prof = db.query(SellerProfile).filter(
                SellerProfile.latitude.isnot(None),
                SellerProfile.longitude.isnot(None),
            ).order_by(SellerProfile.id.desc()).first()

        if not shop_prof:
            return None, None

        if shop_prof.latitude is not None and shop_prof.longitude is not None:
            return float(shop_prof.latitude), float(shop_prof.longitude)

        if shop_prof.address_id:
            shop_addr = db.query(Address).filter(Address.id == shop_prof.address_id).first()
            if shop_addr and shop_addr.latitude is not None and shop_addr.longitude is not None:
                return float(shop_addr.latitude), float(shop_addr.longitude)

        return None, None

    @staticmethod
    def check_eligibility_and_pricing(
        db: Session,
        address_id: Optional[int] = None,
        seller_id: Optional[int] = None,
        cust_lat: Optional[float] = None,
        cust_lng: Optional[float] = None,
        total_weight_kg: Optional[float] = None,
        raise_on_ineligible: bool = False,
    ) -> DeliveryEligibilityResult:
        """
        Calculates distance, validates eligibility, and computes delivery fee:
        - Customer and seller at same address (distance 0 km) MUST be deliverable.
        - Rule A: Order weight <= 30 kg -> Max delivery distance 20 km.
        - Rule B: Order weight > 30 kg -> Max delivery distance 50 km.
        - Tiered pricing bands.
        """
        from app.services.location_service import LocationService

        # 1. Resolve customer coordinates
        if address_id:
            address = db.query(Address).filter(Address.id == address_id).first()
            if address:
                try:
                    c_lat, c_lng = LocationService.resolve_address_coordinates(db, address)
                    if c_lat is not None and c_lng is not None:
                        cust_lat, cust_lng = c_lat, c_lng
                except Exception:
                    pass

        if cust_lat is None or cust_lng is None:
            if raise_on_ineligible:
                raise BadRequestException(
                    message="Customer delivery coordinates are missing. Please re-pin or select a valid address.",
                    code="ADDRESS_COORDINATES_MISSING",
                )
            return DeliveryEligibilityResult(
                delivery_fee=Decimal("0.00"),
                distance_km=0.0,
                is_deliverable=False,
                reason="Please select a delivery address with valid location coordinates.",
                max_allowed_km=20.0,
                total_weight_kg=total_weight_kg or 0.0,
            )

        # 2. Resolve seller shop coordinates
        if seller_id is None:
            shop_lat, shop_lng = LocationService.resolve_seller_coordinates(db, fallback_to_default=True)
        else:
            shop_lat, shop_lng = LocationService.resolve_seller_coordinates(db, seller_id)
            if shop_lat is None or shop_lng is None:
                shop_lat, shop_lng = DeliveryPricingService.get_seller_shop_coordinates(db, seller_id)

        if shop_lat is None or shop_lng is None:
            if raise_on_ineligible:
                raise BadRequestException(
                    message="This seller is missing pickup GPS coordinates. The order cannot be routed.",
                    code="SELLER_LOCATION_MISSING",
                )
            return DeliveryEligibilityResult(
                delivery_fee=Decimal("0.00"),
                distance_km=0.0,
                is_deliverable=False,
                reason="Seller pickup location is unavailable.",
                max_allowed_km=20.0,
                total_weight_kg=total_weight_kg or 0.0,
            )

        # 3. Compute distance (Haversine)
        distance_km = LocationService.calculate_distance(shop_lat, shop_lng, cust_lat, cust_lng)

        # 4. Resolve effective weight (default 1.0 kg if unspecified)
        effective_weight = total_weight_kg if (total_weight_kg is not None and total_weight_kg > 0) else 1.0

        # 5. Check operational delivery bounds (0 km same address, Rule A <=30kg -> 20km, Rule B >30kg -> 50km)
        is_deliverable, reason = LocationService.is_within_delivery_bounds(
            distance_km=distance_km,
            allow_same_location=True,
            total_weight_kg=effective_weight,
        )
        max_limit = LocationService.get_max_delivery_distance_km(effective_weight)

        if not is_deliverable and raise_on_ineligible:
            logger.warning(
                f"[DELIVERY_PRICING] Distance {distance_km:.2f} km exceeds limit {max_limit} km for {effective_weight:.1f} kg. Checkout blocked."
            )
            raise BadRequestException(
                message=reason,
                code="DELIVERY_OUT_OF_RANGE",
                details={
                    "distance": round(distance_km, 2),
                    "max_distance": max_limit,
                    "weight_kg": round(effective_weight, 2),
                    "message": reason,
                },
            )

        # 6. Tiered Pricing calculation
        if distance_km <= 1.0:
            fee = getattr(settings, "DELIVERY_FEE_0_TO_1_KM", 20.0)
        elif distance_km <= 3.0:
            fee = getattr(settings, "DELIVERY_FEE_1_TO_3_KM", 30.0)
        elif distance_km <= 5.0:
            fee = getattr(settings, "DELIVERY_FEE_3_TO_5_KM", 40.0)
        elif distance_km <= 20.0:
            fee = getattr(settings, "DELIVERY_FEE_5_TO_20_KM", 50.0)
        else:
            # Distance 20.0 to 50.0 km (eligible for orders > 30 kg)
            fee = 50.0 + round((distance_km - 20.0) * 2.0, 2)

        delivery_charge = Decimal(str(fee)).quantize(Decimal("0.01"))
        logger.info(
            f"[DELIVERY_PRICING] cust=({cust_lat:.4f},{cust_lng:.4f}) shop=({shop_lat:.4f},{shop_lng:.4f}) "
            f"distance={distance_km:.2f} km weight={effective_weight:.1f} kg deliverable={is_deliverable} fee=₹{delivery_charge}"
        )

        return DeliveryEligibilityResult(
            delivery_fee=delivery_charge,
            distance_km=round(distance_km, 2),
            is_deliverable=is_deliverable,
            reason=reason,
            max_allowed_km=max_limit,
            total_weight_kg=round(effective_weight, 2),
        )

    @staticmethod
    def calculate_delivery_distance_and_fee(
        db: Session,
        address_id: Optional[int] = None,
        seller_id: Optional[int] = None,
        cust_lat: Optional[float] = None,
        cust_lng: Optional[float] = None,
        total_weight_kg: Optional[float] = None,
        raise_on_ineligible: bool = True,
    ) -> Tuple[Decimal, float]:
        res = DeliveryPricingService.check_eligibility_and_pricing(
            db=db,
            address_id=address_id,
            seller_id=seller_id,
            cust_lat=cust_lat,
            cust_lng=cust_lng,
            total_weight_kg=total_weight_kg,
            raise_on_ineligible=raise_on_ineligible,
        )
        return res.delivery_fee, res.distance_km
