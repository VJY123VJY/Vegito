from typing import List, Optional, Tuple
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
    def list_seller_products(db: Session, user: User) -> List[SellerProduct]:
        return (
            db.query(SellerProduct)
            .options(joinedload(SellerProduct.product).joinedload(Product.images))
            .filter(SellerProduct.seller_id == user.id)
            .all()
        )

    @staticmethod
    def add_product(db: Session, user: User, product_in: SellerProductCreate) -> SellerProduct:
        target_product_id = product_in.product_id

        # If product_id not provided, look up by name or create master product
        if not target_product_id:
            if not product_in.product_name:
                raise BadRequestException("Either product_id or product_name must be provided")

            existing_product = db.query(Product).filter(
                Product.name.ilike(product_in.product_name.strip())
            ).first()

            if existing_product:
                target_product_id = existing_product.id
            else:
                cat_id = product_in.category_id
                if not cat_id:
                    first_cat = db.query(Category).first()
                    cat_id = first_cat.id if first_cat else 1

                new_product = Product(
                    category_id=cat_id,
                    name=product_in.product_name.strip(),
                    description=product_in.description or f"Fresh {product_in.product_name.strip()} directly from farm.",
                    unit=product_in.unit or "1 KG",
                    is_active=True,
                )
                db.add(new_product)
                db.flush()
                target_product_id = new_product.id

                if product_in.image_url:
                    img = ProductImage(
                        product_id=new_product.id,
                        image_url=product_in.image_url,
                        is_primary=True,
                        display_order=0,
                    )
                    db.add(img)

        # Check if already listed by seller
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
            db.flush()
            inv = db.query(Inventory).filter(Inventory.seller_product_id == existing.id).first()
            if inv:
                inv.quantity = product_in.stock_quantity
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
    def list_orders(
        db: Session, user: User, pagination: PaginationParams, status: Optional[str] = None
    ) -> Tuple[List[Order], int]:
        """Lists orders that contain products from this seller."""
        query = (
            db.query(Order)
            .join(OrderItem, Order.id == OrderItem.order_id)
            .join(SellerProduct, OrderItem.seller_product_id == SellerProduct.id)
            .filter(SellerProduct.seller_id == user.id)
            .distinct()
        )
        if status:
            query = query.filter(Order.status == status)

        total_count = query.count()
        orders = (
            query.order_by(Order.placed_at.desc())
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
