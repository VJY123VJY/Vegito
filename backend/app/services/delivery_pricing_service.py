import logging
from decimal import Decimal
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.models.address import Address
from app.models.seller_profile import SellerProfile
from app.core.exceptions import BadRequestException, NotFoundException
from app.config import settings

logger = logging.getLogger(__name__)


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
    def calculate_delivery_distance_and_fee(
        db: Session,
        address_id: int,
        seller_id: Optional[int] = None,
    ) -> Tuple[Decimal, float]:
        """
        Calculates the distance from Seller Shop -> Customer Address and computes
        the delivery fee according to Vegito's operational bands:
          - 0.0 to 1.0 km: ₹20.00
          - 1.0 to 3.0 km: ₹30.00
          - 3.0 to 5.0 km: ₹40.00
          - 5.0 to 20.0 km: ₹50.00
          - > 20.0 km: Blocked with exact message:
            "Sorry, this delivery address is outside our 20 KM delivery area."
        """
        from app.services.location_service import LocationService

        address = db.query(Address).filter(Address.id == address_id).first()
        if not address:
            raise NotFoundException("Selected delivery address was not found.")

        # Ensure customer address coordinates are resolved and persisted
        cust_lat, cust_lng = LocationService.resolve_address_coordinates(db, address)

        if seller_id is None:
            raise BadRequestException(
                message="A seller must be selected before delivery eligibility can be checked.",
                code="SELLER_REQUIRED",
            )

        # Resolve only the selected seller's shop coordinates.
        shop_lat, shop_lng = LocationService.resolve_seller_coordinates(db, seller_id)
        if shop_lat is None or shop_lng is None:
            shop_lat, shop_lng = DeliveryPricingService.get_seller_shop_coordinates(db, seller_id)
        if shop_lat is None or shop_lng is None:
            raise BadRequestException(
                message="This seller is missing real pickup GPS coordinates. The order cannot be routed.",
                code="SELLER_LOCATION_MISSING",
                details={
                    "seller_id": seller_id,
                    "message": "Seller location coordinates are missing.",
                },
            )

        distance_km = LocationService.calculate_distance(shop_lat, shop_lng, cust_lat, cust_lng)

        max_radius = float(getattr(settings, "DELIVERY_MAX_DISTANCE_KM", 20.0))
        if distance_km > max_radius:
            logger.warning(
                f"[DELIVERY_PRICING] Distance {distance_km} km exceeds maximum limit of {max_radius} km. Checkout blocked."
            )
            out_msg = f"Sorry, this delivery address is outside our {int(max_radius)} KM delivery area."
            raise BadRequestException(
                message=out_msg,
                code="DELIVERY_OUT_OF_RANGE",
                details={
                    "distance": distance_km,
                    "max_distance": max_radius,
                    "message": out_msg,
                },
            )

        # Calculate tiered pricing
        if distance_km <= 1.0:
            fee = getattr(settings, "DELIVERY_FEE_0_TO_1_KM", 20.0)
        elif distance_km <= 3.0:
            fee = getattr(settings, "DELIVERY_FEE_1_TO_3_KM", 30.0)
        elif distance_km <= 5.0:
            fee = getattr(settings, "DELIVERY_FEE_3_TO_5_KM", 40.0)
        else:
            fee = getattr(settings, "DELIVERY_FEE_5_TO_20_KM", getattr(settings, "DELIVERY_FEE_5_TO_15_KM", 50.0))

        delivery_charge = Decimal(str(fee)).quantize(Decimal("0.01"))
        logger.info(
            f"[DELIVERY_PRICING] address={address_id} distance={distance_km:.3f} km -> delivery_charge=₹{delivery_charge}"
        )
        return delivery_charge, distance_km
