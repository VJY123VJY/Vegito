import datetime
from decimal import Decimal
from typing import List, Optional, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from app.models.user import User
from app.models.review import Review
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.seller_product import SellerProduct
from app.models.seller_profile import SellerProfile
from app.models.delivery_partner import DeliveryPartner
from app.models.delivery_task import DeliveryTask
from app.models.product import Product
from app.schemas.review import (
    ReviewCreate,
    ReviewRead,
    OrderReviewStatusRead,
    EntityReviewSummary,
)
from app.core.constants import OrderStatus
from app.core.exceptions import BadRequestException, NotFoundException, ForbiddenException
import logging

logger = logging.getLogger(__name__)


class ReviewService:
    @staticmethod
    def _recalculate_ratings(db: Session, seller_id: Optional[int], delivery_partner_id: Optional[int]):
        """Recalculates and updates the database aggregate ratings for Seller and Delivery Partner."""
        if seller_id:
            avg_seller = (
                db.query(func.avg(Review.seller_rating))
                .filter(Review.seller_id == seller_id, Review.seller_rating.isnot(None))
                .scalar()
            )
            seller_prof = db.query(SellerProfile).filter(SellerProfile.user_id == seller_id).first()
            if seller_prof and avg_seller is not None:
                seller_prof.rating = Decimal(str(round(float(avg_seller), 2)))
                db.flush()

        if delivery_partner_id:
            avg_dp = (
                db.query(func.avg(Review.delivery_rating))
                .filter(Review.delivery_partner_id == delivery_partner_id, Review.delivery_rating.isnot(None))
                .scalar()
            )
            dp = db.query(DeliveryPartner).filter(DeliveryPartner.id == delivery_partner_id).first()
            if dp and avg_dp is not None:
                dp.rating = Decimal(str(round(float(avg_dp), 2)))
                db.flush()

    @staticmethod
    def submit_order_review(db: Session, customer: User, payload: ReviewCreate) -> List[ReviewRead]:
        """
        Validates order completion and ownership, verifies eligible entities,
        prevents duplicate reviews, and writes review records with live rating re-aggregation.
        """
        # 1. Verify order exists and belongs to customer
        order = db.query(Order).filter(Order.id == payload.order_id).first()
        if not order:
            raise NotFoundException("Order not found")

        if order.customer_id != customer.id:
            raise ForbiddenException("You do not have permission to review this order")

        # 2. Strict eligibility check: MUST BE DELIVERED
        if order.status != OrderStatus.DELIVERED.value:
            raise BadRequestException("You can only review orders that have been successfully delivered.")

        # 3. Resolve Seller ID from order
        seller_id = order.seller_id
        if not seller_id and order.shop_id:
            shop_prof = db.query(SellerProfile).filter(SellerProfile.id == order.shop_id).first()
            if shop_prof:
                seller_id = shop_prof.user_id
        if not seller_id and order.items:
            first_sp = db.query(SellerProduct).filter(SellerProduct.id == order.items[0].seller_product_id).first()
            if first_sp:
                seller_id = first_sp.seller_id

        # 4. Resolve Delivery Partner ID from order / delivery_task
        delivery_partner_id = order.delivery_partner_id
        if not delivery_partner_id and order.delivery_task:
            delivery_partner_id = order.delivery_task.delivery_partner_id
        if not delivery_partner_id:
            task = db.query(DeliveryTask).filter(DeliveryTask.order_id == order.id).first()
            if task:
                delivery_partner_id = task.delivery_partner_id

        # Map purchased products in this order: product_id -> order_item
        purchased_items = {it.product_id: it for it in order.items if it.product_id}
        # Fallback to seller_product lookup if order_item.product_id is unset
        for it in order.items:
            if not it.product_id and it.seller_product_id:
                sp = db.query(SellerProduct).filter(SellerProduct.id == it.seller_product_id).first()
                if sp and sp.product_id:
                    purchased_items[sp.product_id] = it

        existing_reviews = db.query(Review).filter(
            Review.order_id == order.id,
            Review.customer_id == customer.id,
        ).all()

        has_existing_seller_review = any(r.seller_rating is not None for r in existing_reviews)
        has_existing_dp_review = any(r.delivery_rating is not None for r in existing_reviews)
        existing_reviewed_product_ids = {r.product_id for r in existing_reviews if r.product_id}

        created_reviews: List[Review] = []

        # Target Type specific or Multi-part dispatch
        target_type = (payload.target_type or "").upper()

        if target_type == "SELLER":
            # Direct target: SELLER
            if not seller_id:
                raise BadRequestException("No seller found for this order")
            if has_existing_seller_review:
                raise BadRequestException("This order's seller has already been reviewed.")
            rating = payload.rating or payload.seller_rating
            if not rating or rating < 1 or rating > 5:
                raise BadRequestException("Please select a rating from 1 to 5.")
            rev = Review(
                order_id=order.id,
                customer_id=customer.id,
                seller_id=seller_id,
                seller_rating=rating,
                comment=payload.comment or payload.seller_comment,
            )
            db.add(rev)
            created_reviews.append(rev)

        elif target_type == "DELIVERY_PARTNER":
            # Direct target: DELIVERY_PARTNER
            if not delivery_partner_id:
                raise BadRequestException("No delivery partner was assigned to this order")
            if has_existing_dp_review:
                raise BadRequestException("This order's delivery partner has already been reviewed.")
            rating = payload.rating or payload.delivery_rating
            if not rating or rating < 1 or rating > 5:
                raise BadRequestException("Please select a rating from 1 to 5.")
            rev = Review(
                order_id=order.id,
                customer_id=customer.id,
                delivery_partner_id=delivery_partner_id,
                delivery_rating=rating,
                comment=payload.comment or payload.delivery_comment,
            )
            db.add(rev)
            created_reviews.append(rev)

        elif target_type == "PRODUCT":
            # Direct target: PRODUCT
            if not payload.product_id:
                raise BadRequestException("product_id is required for product review")
            if payload.product_id not in purchased_items:
                raise BadRequestException("The specified product was not part of this order.")
            if payload.product_id in existing_reviewed_product_ids:
                raise BadRequestException("This product has already been reviewed for this order.")
            rating = payload.rating or payload.product_rating
            if not rating or rating < 1 or rating > 5:
                raise BadRequestException("Please select a rating from 1 to 5.")
            item = purchased_items[payload.product_id]
            rev = Review(
                order_id=order.id,
                order_item_id=item.id,
                customer_id=customer.id,
                product_id=payload.product_id,
                product_rating=rating,
                comment=payload.comment,
            )
            db.add(rev)
            created_reviews.append(rev)

        else:
            # Multi-part or Combined Order Review
            # 1. Seller review
            if payload.seller_rating:
                if not (1 <= payload.seller_rating <= 5):
                    raise BadRequestException("Please select a rating from 1 to 5 for the seller.")
                if has_existing_seller_review:
                    raise BadRequestException("This order's seller has already been reviewed.")
                rev_seller = Review(
                    order_id=order.id,
                    customer_id=customer.id,
                    seller_id=seller_id,
                    seller_rating=payload.seller_rating,
                    comment=payload.seller_comment or payload.comment,
                )
                db.add(rev_seller)
                created_reviews.append(rev_seller)

            # 2. Delivery partner review
            if payload.delivery_rating:
                if not delivery_partner_id:
                    raise BadRequestException("No delivery partner was assigned to this order")
                if not (1 <= payload.delivery_rating <= 5):
                    raise BadRequestException("Please select a rating from 1 to 5 for the delivery partner.")
                if has_existing_dp_review:
                    raise BadRequestException("This order's delivery partner has already been reviewed.")
                rev_dp = Review(
                    order_id=order.id,
                    customer_id=customer.id,
                    delivery_partner_id=delivery_partner_id,
                    delivery_rating=payload.delivery_rating,
                    comment=payload.delivery_comment or payload.comment,
                )
                db.add(rev_dp)
                created_reviews.append(rev_dp)

            # 3. Product reviews (single or list)
            if payload.product_id and payload.product_rating:
                if payload.product_id not in purchased_items:
                    raise BadRequestException("The specified product was not part of this order.")
                if payload.product_id in existing_reviewed_product_ids:
                    raise BadRequestException("This product has already been reviewed for this order.")
                if not (1 <= payload.product_rating <= 5):
                    raise BadRequestException("Please select a rating from 1 to 5 for the product.")
                item = purchased_items[payload.product_id]
                rev_prod = Review(
                    order_id=order.id,
                    order_item_id=item.id,
                    customer_id=customer.id,
                    product_id=payload.product_id,
                    product_rating=payload.product_rating,
                    comment=payload.comment,
                )
                db.add(rev_prod)
                created_reviews.append(rev_prod)

            if payload.product_reviews:
                for pr in payload.product_reviews:
                    if pr.product_id not in purchased_items:
                        raise BadRequestException(f"Product {pr.product_id} was not part of this order.")
                    if pr.product_id in existing_reviewed_product_ids:
                        raise BadRequestException(f"Product {pr.product_id} has already been reviewed for this order.")
                    if not (1 <= pr.rating <= 5):
                        raise BadRequestException("Please select a rating from 1 to 5 for all products.")
                    item = purchased_items[pr.product_id]
                    rev_p = Review(
                        order_id=order.id,
                        order_item_id=item.id,
                        customer_id=customer.id,
                        product_id=pr.product_id,
                        product_rating=pr.rating,
                        comment=pr.comment,
                    )
                    db.add(rev_p)
                    created_reviews.append(rev_p)
                    existing_reviewed_product_ids.add(pr.product_id)

        if not created_reviews:
            raise BadRequestException("Please provide a rating for at least one item, seller, or delivery partner.")

        db.commit()
        for r in created_reviews:
            db.refresh(r)

        # Recalculate seller & delivery partner database ratings
        ReviewService._recalculate_ratings(db, seller_id, delivery_partner_id)
        db.commit()

        results = []
        for r in created_reviews:
            item = ReviewRead.model_validate(r)
            item.customer_name = customer.name or "Customer"
            if r.product:
                item.product_name = r.product.name
            results.append(item)
        return results

    @staticmethod
    def get_order_review_status(db: Session, customer: User, order_id: int) -> OrderReviewStatusRead:
        """Returns the current review completion state for an order."""
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise NotFoundException("Order not found")
        if order.customer_id != customer.id:
            raise ForbiddenException("You do not have permission to view this order's reviews")

        reviews = (
            db.query(Review)
            .options(joinedload(Review.product))
            .filter(Review.order_id == order.id, Review.customer_id == customer.id)
            .all()
        )

        seller_rev = next((r for r in reviews if r.seller_rating is not None), None)
        dp_rev = next((r for r in reviews if r.delivery_rating is not None), None)
        reviewed_prod_ids = [r.product_id for r in reviews if r.product_id is not None]

        # Shop name
        seller_name = "Vegito Fresh Farm"
        if order.shop:
            seller_name = order.shop.business_name
        elif order.seller_id:
            sp = db.query(SellerProfile).filter(SellerProfile.user_id == order.seller_id).first()
            if sp:
                seller_name = sp.business_name

        # Partner name
        dp_name = "Delivery Partner"
        if order.delivery_partner and order.delivery_partner.user:
            dp_name = order.delivery_partner.user.name or dp_name

        read_items = []
        for r in reviews:
            read_obj = ReviewRead.model_validate(r)
            read_obj.customer_name = customer.name or "Customer"
            if r.product:
                read_obj.product_name = r.product.name
            read_items.append(read_obj)

        return OrderReviewStatusRead(
            order_id=order.id,
            is_delivered=(order.status == OrderStatus.DELIVERED.value),
            has_reviewed=len(reviews) > 0,
            has_reviewed_seller=(seller_rev is not None),
            has_reviewed_delivery=(dp_rev is not None),
            seller_rating=seller_rev.seller_rating if seller_rev else None,
            seller_comment=seller_rev.comment if seller_rev else None,
            delivery_rating=dp_rev.delivery_rating if dp_rev else None,
            delivery_comment=dp_rev.comment if dp_rev else None,
            reviewed_product_ids=reviewed_prod_ids,
            seller_name=seller_name,
            delivery_partner_name=dp_name,
            reviews=read_items,
        )

    @staticmethod
    def get_product_reviews(db: Session, product_id: int) -> EntityReviewSummary:
        """Returns customer reviews and average rating for a product."""
        reviews = (
            db.query(Review)
            .options(joinedload(Review.customer), joinedload(Review.product))
            .filter(Review.product_id == product_id, Review.product_rating.isnot(None))
            .order_by(Review.created_at.desc())
            .all()
        )
        total = len(reviews)
        avg = round(sum(r.product_rating for r in reviews) / total, 2) if total > 0 else 0.0

        items = []
        for r in reviews:
            item = ReviewRead.model_validate(r)
            item.customer_name = r.customer.name if r.customer else "Customer"
            item.product_name = r.product.name if r.product else None
            items.append(item)

        return EntityReviewSummary(average_rating=avg, total_reviews=total, reviews=items)

    @staticmethod
    def get_seller_reviews(db: Session, seller_id: int) -> EntityReviewSummary:
        """Returns customer reviews and average rating for a seller/shop."""
        # Find seller user_id if seller_profiles.id was passed
        seller_user_id = seller_id
        sp = db.query(SellerProfile).filter((SellerProfile.user_id == seller_id) | (SellerProfile.id == seller_id)).first()
        if sp:
            seller_user_id = sp.user_id

        reviews = (
            db.query(Review)
            .options(joinedload(Review.customer))
            .filter(Review.seller_id == seller_user_id, Review.seller_rating.isnot(None))
            .order_by(Review.created_at.desc())
            .all()
        )
        total = len(reviews)
        avg = round(sum(r.seller_rating for r in reviews) / total, 2) if total > 0 else 0.0

        items = []
        for r in reviews:
            item = ReviewRead.model_validate(r)
            item.customer_name = r.customer.name if r.customer else "Customer"
            items.append(item)

        return EntityReviewSummary(average_rating=avg, total_reviews=total, reviews=items)

    @staticmethod
    def get_delivery_partner_reviews(db: Session, partner_id: int) -> EntityReviewSummary:
        """Returns customer reviews and average rating for a delivery partner."""
        reviews = (
            db.query(Review)
            .options(joinedload(Review.customer))
            .filter(Review.delivery_partner_id == partner_id, Review.delivery_rating.isnot(None))
            .order_by(Review.created_at.desc())
            .all()
        )
        total = len(reviews)
        avg = round(sum(r.delivery_rating for r in reviews) / total, 2) if total > 0 else 0.0

        items = []
        for r in reviews:
            item = ReviewRead.model_validate(r)
            item.customer_name = r.customer.name if r.customer else "Customer"
            items.append(item)

        return EntityReviewSummary(average_rating=avg, total_reviews=total, reviews=items)

    @staticmethod
    def list_reviews_for_admin(
        db: Session,
        rating: Optional[int] = None,
        target_type: Optional[str] = None,
        seller_id: Optional[int] = None,
        delivery_partner_id: Optional[int] = None,
        product_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ReviewRead], int]:
        """Admin query with multi-attribute filtering and pagination."""
        query = db.query(Review).options(
            joinedload(Review.customer),
            joinedload(Review.product),
            joinedload(Review.order),
        )

        if rating:
            query = query.filter(
                (Review.product_rating == rating)
                | (Review.seller_rating == rating)
                | (Review.delivery_rating == rating)
            )

        if target_type:
            tt = target_type.upper()
            if tt == "SELLER":
                query = query.filter(Review.seller_rating.isnot(None))
            elif tt == "DELIVERY_PARTNER":
                query = query.filter(Review.delivery_rating.isnot(None))
            elif tt == "PRODUCT":
                query = query.filter(Review.product_rating.isnot(None))

        if seller_id:
            query = query.filter(Review.seller_id == seller_id)
        if delivery_partner_id:
            query = query.filter(Review.delivery_partner_id == delivery_partner_id)
        if product_id:
            query = query.filter(Review.product_id == product_id)

        total_count = query.count()
        records = query.order_by(Review.created_at.desc()).offset(offset).limit(limit).all()

        results = []
        for r in records:
            item = ReviewRead.model_validate(r)
            item.customer_name = r.customer.name if r.customer else "Customer"
            item.product_name = r.product.name if r.product else None
            results.append(item)

        return results, total_count
