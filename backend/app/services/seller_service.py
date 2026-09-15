from typing import List, Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from app.models.user import User
from app.models.seller_profile import SellerProfile
from app.models.seller_product import SellerProduct
from app.models.product import Product
from app.models.inventory import Inventory
from app.models.order import Order
from app.models.order_item import OrderItem
from app.schemas.seller import (
    SellerProfileCreate,
    SellerProfileUpdate,
    SellerProductCreate,
    SellerProductUpdate,
)
from app.core.exceptions import NotFoundException, ForbiddenException, ConflictException
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
    def update_profile(db: Session, user: User, update_in: SellerProfileUpdate) -> SellerProfile:
        profile = SellerService.get_profile(db, user)
        update_dict = update_in.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(profile, key, value)
        db.commit()
        db.refresh(profile)
        return profile

    @staticmethod
    def list_seller_products(db: Session, user: User) -> List[SellerProduct]:
        return (
            db.query(SellerProduct)
            .options(joinedload(SellerProduct.product))
            .filter(SellerProduct.seller_id == user.id)
            .all()
        )

    @staticmethod
    def add_product(db: Session, user: User, product_in: SellerProductCreate) -> SellerProduct:
        # Check if master product exists
        master_product = db.query(Product).filter(Product.id == product_in.product_id).first()
        if not master_product:
            raise NotFoundException(f"Master product {product_in.product_id} does not exist")

        existing = (
            db.query(SellerProduct)
            .filter(
                SellerProduct.seller_id == user.id,
                SellerProduct.product_id == product_in.product_id,
            )
            .first()
        )
        if existing:
            raise ConflictException("You have already added this product. Update your existing listing instead.")

        seller_product = SellerProduct(
            seller_id=user.id,
            product_id=product_in.product_id,
            price=product_in.price,
            stock_quantity=product_in.stock_quantity,
            minimum_order_quantity=product_in.minimum_order_quantity,
            is_available=product_in.is_available,
        )
        db.add(seller_product)
        db.flush()

        # Automatically create or sync inventory row
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
