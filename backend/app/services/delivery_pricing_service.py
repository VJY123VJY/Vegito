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
    def get_seller_shop_coordinates(db: Session, seller_id: Optional[int] = None) -> Tuple[float, float]:
        """
        Retrieves the geographical coordinates (lat, lon) for the seller's shop or farm depot.
        Defaults to Solapur Central Market (17.6805, 75.9064).
        """
        shop_lat = 17.6805
        shop_lng = 75.9064

        shop_prof = None
        if seller_id:
            shop_prof = db.query(SellerProfile).filter(SellerProfile.user_id == seller_id).first()

        if not shop_prof:
            shop_prof = db.query(SellerProfile).first()

        if shop_prof:
            if shop_prof.latitude and shop_prof.longitude:
                shop_lat = float(shop_prof.latitude)
                shop_lng = float(shop_prof.longitude)
            elif shop_prof.address_id:
                shop_addr = db.query(Address).filter(Address.id == shop_prof.address_id).first()
                if shop_addr and shop_addr.latitude and shop_addr.longitude:
                    shop_lat = float(shop_addr.latitude)
                    shop_lng = float(shop_addr.longitude)

        return shop_lat, shop_lng

    @staticmethod
    def calculate_delivery_distance_and_fee(
        db: Session,
        address_id: int,
        seller_id: Optional[int] = None,
    ) -> Tuple[Decimal, float]:
        """
        Calculates the distance from Seller Shop -> Customer Address and computes
        the delivery fee according to Vegito's 1–7 KM operational bands:
          - 0.0 to 1.0 km: ₹20.00
          - 1.0 to 3.0 km: ₹30.00
          - 3.0 to 5.0 km: ₹40.00
          - 5.0 to 7.0 km: ₹50.00
          - > 7.0 km: Blocked with exact message:
            "Sorry, this address is outside Vegito's current delivery area."
        """
        from app.services.mapbox_service import MapboxService

        address = db.query(Address).filter(Address.id == address_id).first()
        if not address:
            raise NotFoundException("Selected delivery address was not found.")

        # If customer address coordinates are recorded, use them; otherwise default to Solapur residential area (1.5 km away)
        if address.latitude and address.longitude:
            cust_lat = float(address.latitude)
            cust_lng = float(address.longitude)
        else:
            cust_lat = 17.6860
            cust_lng = 75.9120

        shop_lat, shop_lng = DeliveryPricingService.get_seller_shop_coordinates(db, seller_id)
        distance_km, is_mapbox = MapboxService.get_route_distance_km(shop_lat, shop_lng, cust_lat, cust_lng)

        max_radius = float(getattr(settings, "DELIVERY_MAX_DISTANCE_KM", 15.0))
        if distance_km > max_radius:
            logger.warning(
                f"[DELIVERY_PRICING] Distance {distance_km} km exceeds maximum limit of {max_radius} km. Checkout blocked."
            )
            raise BadRequestException(
                message="Sorry, this delivery address is outside our 15 KM delivery area.",
                code="DELIVERY_OUT_OF_RANGE",
                details={
                    "distance": distance_km,
                    "max_distance": max_radius,
                    "message": "Sorry, this delivery address is outside our 15 KM delivery area.",
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
            fee = getattr(settings, "DELIVERY_FEE_5_TO_15_KM", getattr(settings, "DELIVERY_FEE_5_TO_6_KM", 50.0))

        delivery_charge = Decimal(str(fee)).quantize(Decimal("0.01"))
        logger.info(
            f"[DELIVERY_PRICING] address={address_id} distance={distance_km} km (is_mapbox={is_mapbox}) -> delivery_charge=₹{delivery_charge}"
        )
        return delivery_charge, distance_km
