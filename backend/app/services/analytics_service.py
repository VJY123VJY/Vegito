import datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, case, desc

from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.seller_product import SellerProduct
from app.models.product import Product
from app.models.user import User
from app.models.seller_profile import SellerProfile
from app.core.constants import OrderStatus, PaymentStatus
from app.schemas.admin_dashboard import TimeSeriesPoint, TopSellerSummary, TopProductSummary


class AnalyticsService:
    @staticmethod
    def _get_start_date(range_days: int) -> datetime.datetime:
        now = datetime.datetime.now(datetime.timezone.utc)
        return now - datetime.timedelta(days=range_days)

    # -----------------------------------------------------------------------
    # Admin Analytics
    # -----------------------------------------------------------------------
    @staticmethod
    def get_revenue_analytics(db: Session, range_days: int = 30) -> List[TimeSeriesPoint]:
        start = AnalyticsService._get_start_date(range_days)
        # Group by day
        rows = (
            db.query(
                func.date(Order.placed_at).label("day"),
                func.coalesce(func.sum(Order.total_amount), 0).label("rev"),
                func.count(Order.id).label("cnt"),
            )
            .filter(
                Order.placed_at >= start,
                Order.status != OrderStatus.CANCELLED.value,
                Order.status != OrderStatus.REJECTED.value,
            )
            .group_by(func.date(Order.placed_at))
            .order_by(func.date(Order.placed_at).asc())
            .all()
        )

        return [
            TimeSeriesPoint(
                date=str(r.day),
                value=Decimal(str(r.rev)),
                orders_count=r.cnt,
            )
            for r in rows
        ]

    @staticmethod
    def get_order_analytics(db: Session, range_days: int = 30) -> List[TimeSeriesPoint]:
        start = AnalyticsService._get_start_date(range_days)
        rows = (
            db.query(
                func.date(Order.placed_at).label("day"),
                func.count(Order.id).label("cnt"),
                func.coalesce(func.sum(Order.total_amount), 0).label("tot"),
            )
            .filter(Order.placed_at >= start)
            .group_by(func.date(Order.placed_at))
            .order_by(func.date(Order.placed_at).asc())
            .all()
        )

        return [
            TimeSeriesPoint(
                date=str(r.day),
                value=Decimal(str(r.cnt)),
                orders_count=r.cnt,
            )
            for r in rows
        ]

    @staticmethod
    def get_customer_growth_analytics(db: Session, range_days: int = 30) -> List[TimeSeriesPoint]:
        start = AnalyticsService._get_start_date(range_days)
        rows = (
            db.query(
                func.date(User.created_at).label("day"),
                func.count(User.id).label("cnt"),
            )
            .filter(User.role_id == 1, User.created_at >= start)
            .group_by(func.date(User.created_at))
            .order_by(func.date(User.created_at).asc())
            .all()
        )

        return [
            TimeSeriesPoint(
                date=str(r.day),
                value=Decimal(str(r.cnt)),
                customers_count=r.cnt,
            )
            for r in rows
        ]

    @staticmethod
    def get_top_sellers(db: Session, limit: int = 5) -> List[TopSellerSummary]:
        rows = (
            db.query(
                SellerProfile.user_id.label("seller_id"),
                SellerProfile.business_name,
                SellerProfile.rating,
                SellerProfile.is_verified,
                func.count(func.distinct(Order.id)).label("order_count"),
                func.coalesce(func.sum(OrderItem.subtotal), 0).label("rev"),
            )
            .join(SellerProduct, SellerProduct.seller_id == SellerProfile.user_id, isouter=True)
            .join(OrderItem, OrderItem.seller_product_id == SellerProduct.id, isouter=True)
            .join(Order, Order.id == OrderItem.order_id, isouter=True)
            .group_by(
                SellerProfile.user_id,
                SellerProfile.business_name,
                SellerProfile.rating,
                SellerProfile.is_verified,
            )
            .order_by(desc("rev"))
            .limit(limit)
            .all()
        )

        return [
            TopSellerSummary(
                seller_id=r.seller_id,
                business_name=r.business_name,
                total_orders=r.order_count or 0,
                total_revenue=Decimal(str(r.rev or "0.00")),
                rating=r.rating or Decimal("0.00"),
                is_verified=r.is_verified or False,
            )
            for r in rows
        ]

    @staticmethod
    def get_top_products(db: Session, limit: int = 5) -> List[TopProductSummary]:
        rows = (
            db.query(
                Product.id.label("product_id"),
                Product.name.label("product_name"),
                func.coalesce(func.sum(OrderItem.quantity), 0).label("qty_sold"),
                func.coalesce(func.sum(OrderItem.subtotal), 0).label("tot_rev"),
                func.coalesce(func.sum(SellerProduct.stock_quantity), 0).label("in_stock"),
            )
            .join(SellerProduct, SellerProduct.product_id == Product.id, isouter=True)
            .join(OrderItem, OrderItem.seller_product_id == SellerProduct.id, isouter=True)
            .group_by(Product.id, Product.name)
            .order_by(desc("qty_sold"))
            .limit(limit)
            .all()
        )

        return [
            TopProductSummary(
                product_id=r.product_id,
                product_name=r.product_name,
                total_quantity_sold=Decimal(str(r.qty_sold or "0")),
                total_revenue=Decimal(str(r.tot_rev or "0.00")),
                in_stock=Decimal(str(r.in_stock or "0")),
            )
            for r in rows
        ]

    # -----------------------------------------------------------------------
    # Seller Analytics (Scoped to seller_id)
    # -----------------------------------------------------------------------
    @staticmethod
    def get_seller_revenue(
        db: Session, seller_id: int, range_days: int = 30
    ) -> List[TimeSeriesPoint]:
        start = AnalyticsService._get_start_date(range_days)
        rows = (
            db.query(
                func.date(Order.placed_at).label("day"),
                func.coalesce(func.sum(OrderItem.subtotal), 0).label("rev"),
                func.count(func.distinct(Order.id)).label("orders_count"),
            )
            .join(OrderItem, OrderItem.order_id == Order.id)
            .join(SellerProduct, SellerProduct.id == OrderItem.seller_product_id)
            .filter(
                SellerProduct.seller_id == seller_id,
                Order.placed_at >= start,
                Order.status != OrderStatus.CANCELLED.value,
                Order.status != OrderStatus.REJECTED.value,
            )
            .group_by(func.date(Order.placed_at))
            .order_by(func.date(Order.placed_at).asc())
            .all()
        )

        return [
            TimeSeriesPoint(
                date=str(r.day),
                value=Decimal(str(r.rev)),
                orders_count=r.orders_count,
            )
            for r in rows
        ]

    @staticmethod
    def get_seller_orders(
        db: Session, seller_id: int, range_days: int = 30
    ) -> List[TimeSeriesPoint]:
        start = AnalyticsService._get_start_date(range_days)
        rows = (
            db.query(
                func.date(Order.placed_at).label("day"),
                func.count(func.distinct(Order.id)).label("cnt"),
            )
            .join(OrderItem, OrderItem.order_id == Order.id)
            .join(SellerProduct, SellerProduct.id == OrderItem.seller_product_id)
            .filter(
                SellerProduct.seller_id == seller_id,
                Order.placed_at >= start,
            )
            .group_by(func.date(Order.placed_at))
            .order_by(func.date(Order.placed_at).asc())
            .all()
        )

        return [
            TimeSeriesPoint(
                date=str(r.day),
                value=Decimal(str(r.cnt)),
                orders_count=r.cnt,
            )
            for r in rows
        ]

    @staticmethod
    def get_seller_top_products(
        db: Session, seller_id: int, limit: int = 5
    ) -> List[TopProductSummary]:
        rows = (
            db.query(
                Product.id.label("product_id"),
                Product.name.label("product_name"),
                func.coalesce(func.sum(OrderItem.quantity), 0).label("qty_sold"),
                func.coalesce(func.sum(OrderItem.subtotal), 0).label("tot_rev"),
                func.coalesce(SellerProduct.stock_quantity, 0).label("in_stock"),
            )
            .join(SellerProduct, SellerProduct.product_id == Product.id)
            .join(OrderItem, OrderItem.seller_product_id == SellerProduct.id, isouter=True)
            .filter(SellerProduct.seller_id == seller_id)
            .group_by(Product.id, Product.name, SellerProduct.stock_quantity)
            .order_by(desc("tot_rev"))
            .limit(limit)
            .all()
        )

        return [
            TopProductSummary(
                product_id=r.product_id,
                product_name=r.product_name,
                total_quantity_sold=Decimal(str(r.qty_sold or "0")),
                total_revenue=Decimal(str(r.tot_rev or "0.00")),
                in_stock=Decimal(str(r.in_stock or "0")),
            )
            for r in rows
        ]
