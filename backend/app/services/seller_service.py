from typing import List, Optional, Tuple
from decimal import Decimal
from app.models.market_intelligence import MarketIntelligence
from app.models.price_history import PriceHistory
from sqlalchemy.orm import Session, joinedload
from app.models.user import User
from app.models.seller_profile import SellerProfile
from app.models.seller_product import SellerProduct
from app.models.product import Product
from app.models.category import Category
from app.models.product_image import ProductImage
from app.models.inventory import Inventory
from app.models.order import Order
from app.models.order_item import OrderItem
from app.schemas.seller import (
    SellerProfileCreate,
    SellerProfileUpdate,
    SellerProductCreate,
    SellerProductUpdate,
)
from app.core.exceptions import NotFoundException, ForbiddenException, ConflictException, BadRequestException
from app.utils.pagination import PaginationParams


class SellerService:
    @staticmethod
    def get_profile(db: Session, user: User) -> SellerProfile:
        profile = db.query(SellerProfile).filter(SellerProfile.user_id == user.id).first()
        if not profile:
            profile = SellerProfile(user_id=user.id, business_name=user.name or f"Seller {user.phone[-4:]}")
            db.add(profile)
            db.commit()
            db.refresh(profile)
        return profile

    @staticmethod
    def update_profile(
        db: Session, user: User, profile_in: SellerProfileUpdate
    ) -> SellerProfile:
        profile = SellerService.get_profile(db, user)
        update_data = profile_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(profile, field, value)
        db.commit()
        db.refresh(profile)
        return profile

    @staticmethod
    def set_availability(db: Session, user: User, is_available: bool) -> SellerProfile:
        profile = SellerService.get_profile(db, user)
        if is_available and (profile.latitude is None or profile.longitude is None):
            raise BadRequestException(
                message="Seller pickup location is not configured. Please set the seller shop location before accepting orders.",
                code="SELLER_LOCATION_MISSING",
                details={"message": "Please enable location and set your shop pickup location before going online."}
            )
        profile.is_available = is_available
        db.commit()
        db.refresh(profile)
        return profile

    @staticmethod
    def list_seller_products(db: Session, user: User) -> List[SellerProduct]:
        profile = db.query(SellerProfile).filter(SellerProfile.user_id == user.id).first()
        seller_ids = [user.id]
        if profile and profile.id not in seller_ids:
            seller_ids.append(profile.id)
        return (
            db.query(SellerProduct)
            .options(joinedload(SellerProduct.product).joinedload(Product.images))
            .filter(SellerProduct.seller_id.in_(seller_ids))
            .all()
        )

    @staticmethod
    def add_product(db: Session, user: User, product_in: SellerProductCreate) -> SellerProduct:
        from app.services.taxonomy_service import TaxonomyService
        # One transaction owns the canonical product (when needed), seller offer,
        # and authoritative inventory row. Nothing is published on a partial write.
        target_product_id = product_in.product_id
        if target_product_id:
            product = db.query(Product).filter(Product.id == target_product_id, Product.is_active == True).first()
            if not product:
                raise NotFoundException("Product not found or inactive")
            # Validate against taxonomy if product_type is supplied
            if product_in.product_type and product.category_id:
                TaxonomyService.validate_category_and_type(product_in.product_type, product.category_id)

        try:
            # If product_id not provided, look up by name or create master product with auto-classification.
            if not target_product_id:
                if not product_in.product_name:
                    raise BadRequestException("Either product_id or product_name must be provided")

                # Validate provided category against product_type if present
                if product_in.category_id and product_in.product_type:
                    TaxonomyService.validate_category_and_type(product_in.product_type, product_in.category_id)

                existing_product = db.query(Product).filter(
                    Product.name.ilike(product_in.product_name.strip())
                ).first()

                if existing_product:
                    target_product_id = existing_product.id
                else:
                    target_cat_id = product_in.category_id
                    if not target_cat_id:
                        # Auto-route category from name and product_type
                        _, auto_cat_id = TaxonomyService.auto_classify_produce(
                            product_in.product_name, product_in.product_type
                        )
                        target_cat_id = auto_cat_id

                    category = db.query(Category).filter(
                        Category.id == target_cat_id, Category.is_active == True
                    ).first()
                    if not category:
                        raise BadRequestException("Selected category is invalid or inactive")

                    # Final validation
                    TaxonomyService.validate_category_and_type(product_in.product_type, category.id)

                    new_product = Product(
                        category_id=category.id,
                        name=product_in.product_name.strip(),
                        description=product_in.description,
                        unit=product_in.unit or "1 KG",
                        is_active=True,
                    )
                    db.add(new_product)
                    db.flush()
                    target_product_id = new_product.id

                    if product_in.image_url:
                        db.add(ProductImage(
                            product_id=new_product.id, image_url=product_in.image_url,
                            is_primary=True, display_order=0,
                        ))

            # Seller identity always comes from the authenticated user.
            existing = (
            db.query(SellerProduct)
            .filter(
                SellerProduct.seller_id == user.id,
                SellerProduct.product_id == target_product_id,
            )
            .first()
        )
            if existing:
                existing.price = product_in.price
                existing.stock_quantity = product_in.stock_quantity
                existing.minimum_order_quantity = product_in.minimum_order_quantity
                existing.is_available = product_in.is_available
                if product_in.added_date: existing.added_date = product_in.added_date
                if product_in.added_time: existing.added_time = product_in.added_time
                if product_in.harvest_date: existing.harvest_date = product_in.harvest_date
                if product_in.harvest_time: existing.harvest_time = product_in.harvest_time
                if product_in.storage_condition: existing.storage_condition = product_in.storage_condition
                if product_in.origin: existing.origin = product_in.origin
                inv = db.query(Inventory).filter(Inventory.seller_product_id == existing.id).first()
                if inv:
                    inv.quantity = product_in.stock_quantity
                else:
                    db.add(Inventory(seller_product_id=existing.id, quantity=product_in.stock_quantity, reserved_quantity=0, low_stock_threshold=5))
                db.commit()
                db.refresh(existing)
                return existing

            seller_product = SellerProduct(
                seller_id=user.id,
                product_id=target_product_id,
                price=product_in.price,
                stock_quantity=product_in.stock_quantity,
                minimum_order_quantity=product_in.minimum_order_quantity,
                is_available=product_in.is_available,
                added_date=product_in.added_date or datetime.date.today(),
                added_time=product_in.added_time or datetime.datetime.now().time(),
                harvest_date=product_in.harvest_date,
                harvest_time=product_in.harvest_time,
                storage_condition=product_in.storage_condition,
                origin=product_in.origin or "Solapur Local Farm",
            )
            db.add(seller_product)
            db.flush()

            inventory = Inventory(
            seller_product_id=seller_product.id,
            quantity=product_in.stock_quantity,
            reserved_quantity=0,
            low_stock_threshold=5,
        )
            db.add(inventory)
            db.commit()
            db.refresh(seller_product)
            return seller_product
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def update_product(
        db: Session, user: User, seller_product_id: int, update_in: SellerProductUpdate
    ) -> SellerProduct:
        seller_product = (
            db.query(SellerProduct)
            .filter(
                SellerProduct.id == seller_product_id,
                SellerProduct.seller_id == user.id,
            )
            .first()
        )
        if not seller_product:
            raise NotFoundException(f"Seller product {seller_product_id} not found or unauthorized")

        update_dict = update_in.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(seller_product, key, value)

        # If stock quantity is updated, sync to inventory
        if "stock_quantity" in update_dict:
            inv = db.query(Inventory).filter(Inventory.seller_product_id == seller_product.id).first()
            if inv:
                inv.quantity = update_dict["stock_quantity"]

        db.commit()
        db.refresh(seller_product)
        return seller_product

    @staticmethod
    def publish_price(db: Session, user: User, seller_product_id: int, new_price: Decimal) -> SellerProduct:
        seller_product = (
            db.query(SellerProduct)
            .filter(
                SellerProduct.id == seller_product_id,
                SellerProduct.seller_id == user.id,
            )
            .first()
        )
        if not seller_product:
            raise NotFoundException(f"Seller product {seller_product_id} not found or unauthorized")

        # Record to PriceHistory before updating
        db.add(PriceHistory(
            seller_product_id=seller_product.id,
            price=seller_product.price
        ))

        seller_product.price = new_price
        db.commit()
        db.refresh(seller_product)
        return seller_product

    @staticmethod
    def get_market_intelligence(db: Session, seller_id: int) -> List[MarketIntelligence]:
        # Get market intelligence for all products this seller lists
        product_ids = db.query(SellerProduct.product_id).filter(SellerProduct.seller_id == seller_id).all()
        ids = [p[0] for p in product_ids]

        return (
            db.query(MarketIntelligence)
            .options(joinedload(MarketIntelligence.product))
            .filter(MarketIntelligence.product_id.in_(ids))
            .order_by(MarketIntelligence.timestamp.desc())
            .all()
        )

    @staticmethod
    def get_price_history(db: Session, user: User, seller_product_id: int) -> List[PriceHistory]:
        # Verify ownership
        exists = db.query(SellerProduct).filter(
            SellerProduct.id == seller_product_id,
            SellerProduct.seller_id == user.id
        ).first()
        if not exists:
            raise NotFoundException("Seller product not found")

        return (
            db.query(PriceHistory)
            .filter(PriceHistory.seller_product_id == seller_product_id)
            .order_by(PriceHistory.created_at.desc())
            .all()
        )

    @staticmethod
    def list_orders(
        db: Session, user: User, pagination: PaginationParams, status: Optional[str] = None
    ) -> Tuple[List[Order], int]:
        """Lists orders that contain products from or are routed/assigned to this seller."""
        from sqlalchemy import or_
        from app.models.seller_order_fulfillment import SellerOrderFulfillment

        profile = db.query(SellerProfile).filter(SellerProfile.user_id == user.id).first()
        profile_id = profile.id if profile else None

        seller_ids = [user.id]
        if profile_id and profile_id not in seller_ids:
            seller_ids.append(profile_id)

        query = (
            db.query(Order)
            .outerjoin(OrderItem, Order.id == OrderItem.order_id)
            .outerjoin(SellerProduct, OrderItem.seller_product_id == SellerProduct.id)
            .outerjoin(SellerOrderFulfillment, Order.id == SellerOrderFulfillment.order_id)
            .filter(
                or_(
                    Order.seller_id.in_(seller_ids),
                    Order.shop_id.in_(seller_ids),
                    SellerProduct.seller_id.in_(seller_ids),
                    SellerOrderFulfillment.seller_id.in_(seller_ids),
                )
            )
            .distinct()
        )
        if status:
            query = query.filter(Order.status == status)

        total_count = query.count()
        orders = (
            query.order_by(Order.id.desc())
            .offset(pagination.offset)
            .limit(pagination.limit)
            .all()
        )
        return orders, total_count


    @staticmethod
    def delete_product(db: Session, user: User, seller_product_id: int) -> bool:
        seller_product = (
            db.query(SellerProduct)
            .filter(
                SellerProduct.id == seller_product_id,
                SellerProduct.seller_id == user.id,
            )
            .first()
        )
        if not seller_product:
            raise NotFoundException(f"Seller product {seller_product_id} not found or unauthorized")

        # Deactivate and zero stock for customer safety while preserving order history
        seller_product.is_available = False
        seller_product.stock_quantity = 0
        inv = db.query(Inventory).filter(Inventory.seller_product_id == seller_product.id).first()
        if inv:
            inv.quantity = 0
        db.commit()
        return True
