import datetime
from decimal import Decimal
from typing import Dict, Any, List, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.order import Order
from app.models.user import User
from app.models.inventory import Inventory
from app.models.complaint import Complaint
from app.models.payment import Payment
from app.core.constants import OrderStatus, PaymentStatus, RoleEnum
from app.core.exceptions import NotFoundException
from app.schemas.user import UserRead
from app.schemas.complaint import ComplaintRead, ComplaintUpdate
from app.utils.pagination import PaginationParams


class AdminService:
    @staticmethod
    def get_dashboard_metrics(db: Session) -> Dict[str, Any]:
        from app.models.delivery_task import DeliveryTask
        from app.models.seller_profile import SellerProfile
        from app.services.analytics_service import AnalyticsService
        from app.services.delivery_tracking_service import DeliveryTrackingService

        total_orders = db.query(Order).count()
        pending_orders = (
            db.query(Order)
            .filter(Order.status.in_([OrderStatus.NEW.value, OrderStatus.ACCEPTED.value, OrderStatus.PACKING.value]))
            .count()
        )
        delivered_orders = db.query(Order).filter(Order.status == OrderStatus.DELIVERED.value).count()
        failed_deliveries = db.query(DeliveryTask).filter(DeliveryTask.status == "FAILED").count()

        total_revenue = (
            db.query(func.coalesce(func.sum(Order.total_amount), 0))
            .filter(Order.payment_status == PaymentStatus.PAID.value)
            .scalar()
        )

        active_customers = db.query(User).filter(User.role_id == 1, User.is_active == True).count()
        active_sellers = db.query(User).filter(User.role_id == 2, User.is_active == True).count()
        active_delivery_partners = db.query(User).filter(User.role_id == 3, User.is_active == True).count()

        low_stock_count = db.query(Inventory).filter(Inventory.quantity <= Inventory.low_stock_threshold).count()
        open_complaints_count = db.query(Complaint).filter(Complaint.status == "OPEN").count()

        # Structured summary
        summary = {
            "customers": active_customers,
            "sellers": active_sellers,
            "delivery_partners": active_delivery_partners,
            "orders": total_orders,
            "revenue": Decimal(str(total_revenue)),
            "pending_orders": pending_orders,
            "low_stock": low_stock_count,
            "failed_deliveries": failed_deliveries,
        }

        # Charts & aggregated lists
        revenue_chart = AnalyticsService.get_revenue_analytics(db, range_days=30)
        order_chart = AnalyticsService.get_order_analytics(db, range_days=30)
        customer_growth = AnalyticsService.get_customer_growth_analytics(db, range_days=30)
        top_sellers = AnalyticsService.get_top_sellers(db, limit=5)
        top_products = AnalyticsService.get_top_products(db, limit=5)

        # Recent orders (last 6)
        recent_orders_rows = (
            db.query(Order)
            .order_by(Order.placed_at.desc())
            .limit(6)
            .all()
        )
        recent_orders = [
            {
                "id": o.id,
                "order_number": o.order_number,
                "customer_name": o.customer.name if o.customer else "Customer",
                "status": o.status,
                "total_amount": o.total_amount,
                "items_count": len(o.items),
                "placed_at": o.placed_at,
            }
            for o in recent_orders_rows
        ]

        # Pending seller verifications
        pending_sellers_rows = (
            db.query(SellerProfile)
            .filter(SellerProfile.is_verified == False)
            .order_by(SellerProfile.created_at.desc())
            .limit(5)
            .all()
        )
        pending_seller_verifications = [
            {
                "seller_id": s.user_id,
                "business_name": s.business_name,
                "contact_name": s.user.name if s.user else None,
                "phone": s.user.phone if s.user else "",
                "city": s.address.city if s.address else None,
                "created_at": s.created_at,
            }
            for s in pending_sellers_rows
        ]

        # Active delivery
        active_delivery_data = DeliveryTrackingService.get_live_delivery_overview(db)
        active_delivery = [p.model_dump() for p in active_delivery_data]

        return {
            "summary": summary,
            "revenue_chart": [p.model_dump() for p in revenue_chart],
            "order_chart": [p.model_dump() for p in order_chart],
            "customer_growth": [p.model_dump() for p in customer_growth],
            "recent_orders": recent_orders,
            "top_sellers": [s.model_dump() for s in top_sellers],
            "top_products": [p.model_dump() for p in top_products],
            "pending_seller_verifications": pending_seller_verifications,
            "active_delivery": active_delivery,
            # Backward compatibility keys for existing minimal components
            "total_orders": total_orders,
            "pending_orders": pending_orders,
            "delivered_orders": delivered_orders,
            "total_revenue": Decimal(str(total_revenue)),
            "active_customers": active_customers,
            "active_sellers": active_sellers,
            "active_delivery_partners": active_delivery_partners,
            "low_stock_count": low_stock_count,
            "open_complaints_count": open_complaints_count,
        }


    @staticmethod
    def list_users(
        db: Session, pagination: PaginationParams, role_id: Optional[int] = None
    ) -> Tuple[List[UserRead], int]:
        query = db.query(User)
        if role_id:
            query = query.filter(User.role_id == role_id)
        total_count = query.count()
        users = (
            query.order_by(User.id.desc())
            .offset(pagination.offset)
            .limit(pagination.limit)
            .all()
        )
        results = [UserRead.model_validate(u) for u in users]
        return results, total_count

    @staticmethod
    def update_user_status(db: Session, user_id: int, is_active: bool) -> UserRead:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundException(f"User {user_id} not found")
        user.is_active = is_active
        db.commit()
        db.refresh(user)
        return UserRead.model_validate(user)

    @staticmethod
    def list_complaints(
        db: Session, pagination: PaginationParams, status: Optional[str] = None
    ) -> Tuple[List[ComplaintRead], int]:
        query = db.query(Complaint)
        if status:
            query = query.filter(Complaint.status == status)
        total_count = query.count()
        complaints = (
            query.order_by(Complaint.created_at.desc())
            .offset(pagination.offset)
            .limit(pagination.limit)
            .all()
        )
        results = []
        for c in complaints:
            read_obj = ComplaintRead.model_validate(c)
            read_obj.customer_name = c.customer.name if c.customer else None
            results.append(read_obj)
        return results, total_count

    @staticmethod
    def resolve_complaint(
        db: Session, complaint_id: int, admin_user: User, update_in: ComplaintUpdate
    ) -> ComplaintRead:
        complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
        if not complaint:
            raise NotFoundException(f"Complaint {complaint_id} not found")

        complaint.status = update_in.status
        complaint.resolution = update_in.resolution
        complaint.resolved_by = admin_user.id
        if update_in.status in ["RESOLVED", "CLOSED"]:
            complaint.resolved_at = datetime.datetime.now(datetime.timezone.utc)

        db.commit()
        db.refresh(complaint)
        read_obj = ComplaintRead.model_validate(complaint)
        read_obj.customer_name = complaint.customer.name if complaint.customer else None
        return read_obj
