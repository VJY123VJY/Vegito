from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.customer_profile import CustomerProfile
from app.models.address import Address
from app.models.seller_profile import SellerProfile
from app.schemas.customer import CustomerProfileUpdate
from app.schemas.address import AddressCreate, AddressUpdate
from app.core.exceptions import NotFoundException, ForbiddenException, BadRequestException
from app.services.location_service import LocationService
from app.config import settings


class CustomerService:
    @staticmethod
    def get_profile(db: Session, user: User) -> CustomerProfile:
        profile = db.query(CustomerProfile).filter(CustomerProfile.user_id == user.id).first()
        if not profile:
            profile = CustomerProfile(user_id=user.id)
            db.add(profile)
            db.commit()
            db.refresh(profile)
        return profile

    @staticmethod
    def update_profile(db: Session, user: User, update_data: CustomerProfileUpdate) -> CustomerProfile:
        profile = CustomerService.get_profile(db, user)

        if update_data.name is not None:
            user.name = update_data.name
        if update_data.email is not None:
            user.email = update_data.email
        if update_data.date_of_birth is not None:
            profile.date_of_birth = update_data.date_of_birth
        if update_data.profile_image_url is not None:
            profile.profile_image_url = update_data.profile_image_url

        db.commit()
        db.refresh(profile)
        db.refresh(user)
        return profile

    @staticmethod
    def list_addresses(db: Session, user: User) -> List[Address]:
        return db.query(Address).filter(Address.user_id == user.id).order_by(Address.is_default.desc(), Address.id.desc()).all()

    @staticmethod
    def create_address(db: Session, user: User, address_in: AddressCreate) -> Address:
        if address_in.city.strip().casefold() != settings.SERVICE_CITY.casefold():
            raise BadRequestException(
                f"Vegito currently delivers only in {settings.SERVICE_CITY}."
            )

        # Validate 20 KM radius against real seller shop location
        if address_in.latitude is not None and address_in.longitude is not None:
            seller = (
                db.query(SellerProfile)
                .join(User, SellerProfile.user_id == User.id)
                .filter(
                    User.is_active == True,
                    SellerProfile.latitude.isnot(None),
                    SellerProfile.longitude.isnot(None),
                )
                .first()
            )
            if not seller:
                seller = db.query(SellerProfile).filter(SellerProfile.latitude.isnot(None), SellerProfile.longitude.isnot(None)).first()
            if seller:
                s_lat, s_lon = LocationService.resolve_seller_coordinates(db, seller.user_id, fallback_to_default=False)
                if s_lat is not None and s_lon is not None:
                    dist = LocationService.calculate_distance(
                        float(address_in.latitude), float(address_in.longitude), s_lat, s_lon
                    )
                    max_km = float(getattr(settings, "DELIVERY_MAX_DISTANCE_KM", 20.0))
                    if dist > max_km:
                        raise BadRequestException(
                            message=f"This address is outside our {int(max_km)} km delivery area (Distance: {dist:.1f} km from {seller.business_name}). Vegito currently delivers within {int(max_km)} km of our seller.",
                            code="DELIVERY_OUT_OF_RANGE",
                            details={"distance_km": round(dist, 2), "max_distance_km": max_km, "seller_name": seller.business_name}
                        )

        # If this is the user's first address or marked default, ensure single default
        existing_count = db.query(Address).filter(Address.user_id == user.id).count()
        is_default = address_in.is_default or existing_count == 0

        if is_default:
            db.query(Address).filter(Address.user_id == user.id).update({"is_default": False})

        address = Address(
            user_id=user.id,
            address_line1=address_in.address_line1,
            address_line2=address_in.address_line2,
            landmark=address_in.landmark,
            city=address_in.city,
            state=address_in.state,
            country=address_in.country,
            pincode=address_in.pincode,
            latitude=address_in.latitude,
            longitude=address_in.longitude,
            address_type=address_in.address_type or "HOME",
            is_default=is_default,
        )
        db.add(address)
        db.commit()
        db.refresh(address)
        return address

    @staticmethod
    def update_address(db: Session, user: User, address_id: int, update_in: AddressUpdate) -> Address:
        address = db.query(Address).filter(Address.id == address_id, Address.user_id == user.id).first()
        if not address:
            raise NotFoundException(f"Address with id {address_id} not found")

        update_dict = update_in.model_dump(exclude_unset=True)
        if "city" in update_dict and update_dict["city"] is not None:
            if update_dict["city"].strip().casefold() != settings.SERVICE_CITY.casefold():
                raise BadRequestException(
                    f"Vegito currently delivers only in {settings.SERVICE_CITY}."
                )

        new_lat = update_dict.get("latitude", address.latitude)
        new_lon = update_dict.get("longitude", address.longitude)
        if new_lat is not None and new_lon is not None and ("latitude" in update_dict or "longitude" in update_dict):
            seller = (
                db.query(SellerProfile)
                .join(User, SellerProfile.user_id == User.id)
                .filter(
                    User.is_active == True,
                    SellerProfile.latitude.isnot(None),
                    SellerProfile.longitude.isnot(None),
                )
                .first()
            )
            if not seller:
                seller = db.query(SellerProfile).filter(SellerProfile.latitude.isnot(None), SellerProfile.longitude.isnot(None)).first()
            if seller:
                s_lat, s_lon = LocationService.resolve_seller_coordinates(db, seller.user_id, fallback_to_default=False)
                if s_lat is not None and s_lon is not None:
                    dist = LocationService.calculate_distance(float(new_lat), float(new_lon), s_lat, s_lon)
                    max_km = float(getattr(settings, "DELIVERY_MAX_DISTANCE_KM", 20.0))
                    if dist > max_km:
                        raise BadRequestException(
                            message=f"This address is outside our {int(max_km)} km delivery area (Distance: {dist:.1f} km from {seller.business_name}). Vegito currently delivers within {int(max_km)} km of our seller.",
                            code="DELIVERY_OUT_OF_RANGE",
                            details={"distance_km": round(dist, 2), "max_distance_km": max_km, "seller_name": seller.business_name}
                        )

        if update_dict.get("is_default") is True:
            db.query(Address).filter(Address.user_id == user.id).update({"is_default": False})

        for key, value in update_dict.items():
            setattr(address, key, value)

        db.commit()
        db.refresh(address)
        return address

    @staticmethod
    def delete_address(db: Session, user: User, address_id: int) -> bool:
        address = db.query(Address).filter(Address.id == address_id, Address.user_id == user.id).first()
        if not address:
            raise NotFoundException(f"Address with id {address_id} not found")

        db.delete(address)
        db.commit()
        return True
