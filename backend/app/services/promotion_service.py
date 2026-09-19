import datetime
from decimal import Decimal
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.models.promotion import Promotion, PromotionItem
from app.models.seller_product import SellerProduct
from app.models.product import Product
from app.models.order import Order
from app.models.user import User
from app.schemas.promotion import PromotionCreate, PromotionRead, PromotionItemRead
from app.core.exceptions import NotFoundException, ForbiddenException, BadRequestException

class PromotionService:
    @staticmethod
    def create_promotion(db: Session, user: User, promo_in: PromotionCreate) -> Promotion:
        # Validate that seller owns all products in the bundle
        seller_product_ids = [item.seller_product_id for item in promo_in.items]
        owned_count = db.query(SellerProduct).filter(
            SellerProduct.id.in_(seller_product_ids),
            SellerProduct.seller_id == user.id
        ).count()

        if owned_count != len(seller_product_ids):
            raise ForbiddenException("Unauthorized: One or more products do not belong to you")

        promotion = Promotion(
            seller_id=user.id,
            title=promo_in.title,
            description=promo_in.description,
            type=promo_in.type,
            price=promo_in.price,
            is_repeat_only=promo_in.is_repeat_only,
            min_order_count=promo_in.min_order_count,
            period_days=promo_in.period_days,
            status=promo_in.status,
            starts_at=promo_in.starts_at,
            ends_at=promo_in.ends_at,
        )
        db.add(promotion)
        db.flush()

        for item in promo_in.items:
            db.add(PromotionItem(
                promotion_id=promotion.id,
                seller_product_id=item.seller_product_id,
                quantity=item.quantity
            ))

        db.commit()
        db.refresh(promotion)
        return promotion

    @staticmethod
    def get_active_promotions(db: Session, customer: Optional[User] = None) -> List[PromotionRead]:
        now = datetime.datetime.now(datetime.timezone.utc)
        query = db.query(Promotion).options(
            joinedload(Promotion.items).joinedload(PromotionItem.seller_product).joinedload(SellerProduct.product)
        ).filter(
            Promotion.status == "ACTIVE",
            (Promotion.starts_at == None) | (Promotion.starts_at <= now),
            (Promotion.ends_at == None) | (Promotion.ends_at >= now)
        )

        promos = query.all()
        results = []

        for p in promos:
            is_eligible = True
            if p.is_repeat_only and customer:
                is_eligible = PromotionService.check_eligibility(db, customer, p)
            elif p.is_repeat_only and not customer:
                is_eligible = False # Hide repeat offers for guests

            # Bundle Stock Check
            has_stock = True
            for item in p.items:
                if item.seller_product.stock_quantity < item.quantity or not item.seller_product.is_available:
                    has_stock = False
                    break

            if not has_stock:
                continue # Dynamic deactivation if any item is OOS

            read_obj = PromotionRead.model_validate(p)
            read_obj.eligible = is_eligible

            # Enrich items
            for ri, mi in zip(read_obj.items, p.items):
                ri.product_name = mi.seller_product.product.name
                ri.unit = mi.seller_product.product.unit

            results.append(read_obj)

        return results

    @staticmethod
    def check_eligibility(db: Session, user: User, promotion: Promotion) -> bool:
        if not promotion.is_repeat_only:
            return True

        period_start = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=promotion.period_days)
        order_count = db.query(Order).filter(
            Order.customer_id == user.id,
            Order.placed_at >= period_start,
            Order.status.in_(["DELIVERED", "COMPLETED"])
        ).count()

        return order_count >= promotion.min_order_count
