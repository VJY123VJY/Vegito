import datetime
from decimal import Decimal
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models.delivery_partner import DeliveryPartner
from app.models.delivery_partner_location import DeliveryPartnerLocation
from app.models.delivery_task import DeliveryTask
from app.models.order import Order
from app.models.user import User
from app.models.address import Address
from app.core.constants import DeliveryTaskStatus
from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException
from app.schemas.delivery_location import (
    DeliveryLocationCreate,
    DeliveryLocationRead,
    LivePartnerLocationRead,
)
from app.routers.location import LOCATION_STORE


class DeliveryTrackingService:
    @staticmethod
    def record_location(
        db: Session, partner_user: User, location_in: DeliveryLocationCreate
    ) -> DeliveryLocationRead:
        partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == partner_user.id).first()
        if not partner:
            raise ForbiddenException("User is not registered as a delivery partner.")

        lat = location_in.latitude
        lng = location_in.longitude
        if lat < Decimal("-90") or lat > Decimal("90"):
            raise BadRequestException("Latitude must be between -90 and 90 degrees.")
        if lng < Decimal("-180") or lng > Decimal("180"):
            raise BadRequestException("Longitude must be between -180 and 180 degrees.")

        now = datetime.datetime.now(datetime.timezone.utc)
        record = DeliveryPartnerLocation(
            delivery_partner_id=partner.id,
            latitude=lat,
            longitude=lng,
            accuracy_meters=location_in.accuracy_meters,
            heading=location_in.heading,
            speed_kmh=location_in.speed_kmh,
            recorded_at=now,
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        # Update in-memory LOCATION_STORE for active task(s) if any
        active_task = (
            db.query(DeliveryTask)
            .filter(
                DeliveryTask.delivery_partner_id == partner.id,
                DeliveryTask.status == DeliveryTaskStatus.STARTED.value,
            )
            .first()
        )
        if active_task:
            LOCATION_STORE[active_task.id] = {
                "lat": float(lat),
                "lng": float(lng),
                "accuracy": float(location_in.accuracy_meters) if location_in.accuracy_meters else None,
                "ts": now.isoformat(),
                "partner_name": partner_user.name or "Delivery Partner",
                "task_id": active_task.id,
            }

        return DeliveryLocationRead.model_validate(record)

    @staticmethod
    def get_location_history(
        db: Session, partner_id: int, limit: int = 50
    ) -> List[DeliveryLocationRead]:
        records = (
            db.query(DeliveryPartnerLocation)
            .filter(DeliveryPartnerLocation.delivery_partner_id == partner_id)
            .order_by(DeliveryPartnerLocation.recorded_at.desc())
            .limit(limit)
            .all()
        )
        return [DeliveryLocationRead.model_validate(r) for r in reversed(records)]

    @staticmethod
    def get_latest_partner_location(
        db: Session, partner_id: int
    ) -> Optional[DeliveryLocationRead]:
        record = (
            db.query(DeliveryPartnerLocation)
            .filter(DeliveryPartnerLocation.delivery_partner_id == partner_id)
            .order_by(DeliveryPartnerLocation.recorded_at.desc())
            .first()
        )
        if not record:
            return None
        return DeliveryLocationRead.model_validate(record)

    @staticmethod
    def get_live_delivery_overview(db: Session) -> List[LivePartnerLocationRead]:
        partners = (
            db.query(DeliveryPartner)
            .options(joinedload(DeliveryPartner.user))
            .all()
        )

        results: List[LivePartnerLocationRead] = []
        for p in partners:
            user = p.user
            latest_loc = (
                db.query(DeliveryPartnerLocation)
                .filter(DeliveryPartnerLocation.delivery_partner_id == p.id)
                .order_by(DeliveryPartnerLocation.recorded_at.desc())
                .first()
            )

            # Check active task
            active_task = (
                db.query(DeliveryTask)
                .options(
                    joinedload(DeliveryTask.order).joinedload(Order.customer),
                    joinedload(DeliveryTask.order).joinedload(Order.address),
                )
                .filter(
                    DeliveryTask.delivery_partner_id == p.id,
                    DeliveryTask.status.in_([
                        DeliveryTaskStatus.STARTED.value,
                        DeliveryTaskStatus.ASSIGNED.value,
                    ]),
                )
                .order_by(DeliveryTask.updated_at.desc())
                .first()
            )

            partner_status = "AVAILABLE"
            if not p.is_available:
                partner_status = "OFFLINE"
            elif active_task and active_task.status == DeliveryTaskStatus.STARTED.value:
                partner_status = "BUSY"
            elif active_task:
                partner_status = "ASSIGNED"
            else:
                partner_status = "ONLINE"

            cust_name = None
            cust_phone = None
            cust_addr = None
            cust_lat = None
            cust_lng = None
            active_order_num = None
            active_order_id = None
            active_task_id = None

            if active_task and active_task.order:
                active_task_id = active_task.id
                active_order_id = active_task.order.id
                active_order_num = active_task.order.order_number
                if active_task.order.customer:
                    cust_name = active_task.order.customer.name
                    cust_phone = active_task.order.customer.phone
                if active_task.order.address:
                    addr = active_task.order.address
                    cust_addr = f"{addr.address_line1}, {addr.city} {addr.pincode}"
                    cust_lat = addr.latitude
                    cust_lng = addr.longitude

            item = LivePartnerLocationRead(
                partner_id=p.id,
                user_id=p.user_id,
                partner_name=user.name if user and user.name else f"Partner #{p.id}",
                phone=user.phone if user else None,
                vehicle_type=p.vehicle_type,
                vehicle_number=p.vehicle_number,
                is_available=p.is_available,
                is_verified=p.is_verified,
                rating=p.rating,
                total_deliveries=p.total_deliveries,
                status=partner_status,
                latitude=latest_loc.latitude if latest_loc else None,
                longitude=latest_loc.longitude if latest_loc else None,
                accuracy_meters=latest_loc.accuracy_meters if latest_loc else None,
                heading=latest_loc.heading if latest_loc else None,
                speed_kmh=latest_loc.speed_kmh if latest_loc else None,
                recorded_at=latest_loc.recorded_at if latest_loc else None,
                active_task_id=active_task_id,
                active_order_id=active_order_id,
                active_order_number=active_order_num,
                customer_name=cust_name,
                customer_phone=cust_phone,
                delivery_address=cust_addr,
                customer_latitude=cust_lat,
                customer_longitude=cust_lng,
            )
            results.append(item)

        return results
