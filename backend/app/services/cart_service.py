from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from app.models.user import User
from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.models.seller_product import SellerProduct
from app.models.product import Product
from app.models.product_image import ProductImage
from app.schemas.cart import CartRead, CartItemRead
from app.core.exceptions import NotFoundException, BadRequestException
from app.utils.helpers import round_currency


class CartService:
    @staticmethod
    def get_or_create_cart(db: Session, user: User) -> Cart:
        cart = db.query(Cart).filter(Cart.user_id == user.id).first()
        if not cart:
            cart = Cart(user_id=user.id)
            db.add(cart)
            db.commit()
            db.refresh(cart)
        return cart

    @staticmethod
    def get_cart_details(db: Session, user: User) -> CartRead:
        cart = CartService.get_or_create_cart(db, user)
        items = (
            db.query(CartItem)
            .options(
                joinedload(CartItem.seller_product).joinedload(SellerProduct.product).joinedload(Product.images)
            )
            .filter(CartItem.cart_id == cart.id)
            .order_by(CartItem.id.asc())
            .all()
        )

        subtotal = Decimal("0.00")
        item_reads = []

        for item in items:
            sp = item.seller_product
            product = sp.product if sp else None
            if not sp or not product:
                continue

            # First primary image or first available
            image_url = None
            if product.images:
                primaries = [img.image_url for img in product.images if img.is_primary]
                image_url = primaries[0] if primaries else product.images[0].image_url

            price_per_unit = sp.price
            item_total = round_currency(price_per_unit * item.quantity)
            subtotal += item_total

            item_reads.append(
                CartItemRead(
                    id=item.id,
                    cart_id=item.cart_id,
                    seller_product_id=sp.id,
                    product_id=product.id,
                    product_name=product.name,
                    unit=product.unit,
                    image_url=image_url,
                    price_per_unit=price_per_unit,
                    quantity=item.quantity,
                    item_total=item_total,
                    is_available=sp.is_available,
                    stock_available=sp.stock_quantity,
                    created_at=item.created_at,
                    updated_at=item.updated_at,
                )
            )

        # Standard delivery charge: free if subtotal >= 300, else 30
        delivery_charge = Decimal("0.00") if (subtotal >= Decimal("300.00") or subtotal == 0) else Decimal("30.00")
        discount_amount = Decimal("0.00")
        total_amount = subtotal + delivery_charge - discount_amount

        return CartRead(
            id=cart.id,
            user_id=cart.user_id,
            items=item_reads,
            total_items_count=len(item_reads),
            subtotal=round_currency(subtotal),
            delivery_charge=round_currency(delivery_charge),
            discount_amount=round_currency(discount_amount),
            total_amount=round_currency(total_amount),
        )

    @staticmethod
    def add_to_cart(db: Session, user: User, seller_product_id: int, quantity: Decimal) -> CartRead:
        cart = CartService.get_or_create_cart(db, user)

        seller_product = db.query(SellerProduct).filter(SellerProduct.id == seller_product_id).first()
        if not seller_product or not seller_product.is_available:
            raise BadRequestException("Product is currently unavailable from this seller.")

        if quantity <= 0:
            raise BadRequestException("Quantity must be greater than zero.")

        if quantity > seller_product.stock_quantity:
            raise BadRequestException(
                f"Requested quantity ({quantity}) exceeds available stock ({seller_product.stock_quantity})."
            )

        if quantity < seller_product.minimum_order_quantity:
            raise BadRequestException(
                f"Minimum order quantity for this product is {seller_product.minimum_order_quantity}."
            )

        existing_item = (
            db.query(CartItem)
            .filter(
                CartItem.cart_id == cart.id,
                CartItem.seller_product_id == seller_product_id,
            )
            .first()
        )

        if existing_item:
            new_qty = existing_item.quantity + quantity
            if new_qty > seller_product.stock_quantity:
                raise BadRequestException(
                    f"Combined quantity ({new_qty}) exceeds available stock ({seller_product.stock_quantity})."
                )
            existing_item.quantity = new_qty
        else:
            new_item = CartItem(
                cart_id=cart.id,
                seller_product_id=seller_product_id,
                quantity=quantity,
            )
            db.add(new_item)

        db.commit()
        return CartService.get_cart_details(db, user)

    @staticmethod
    def update_cart_item(db: Session, user: User, cart_item_id: int, new_quantity: Decimal) -> CartRead:
        cart = CartService.get_or_create_cart(db, user)
        item = (
            db.query(CartItem)
            .filter(CartItem.id == cart_item_id, CartItem.cart_id == cart.id)
            .first()
        )
        if not item:
            raise NotFoundException(f"Cart item {cart_item_id} not found")

        if new_quantity <= 0:
            db.delete(item)
        else:
            sp = db.query(SellerProduct).filter(SellerProduct.id == item.seller_product_id).first()
            if sp and new_quantity > sp.stock_quantity:
                raise BadRequestException(
                    f"Quantity ({new_quantity}) exceeds available stock ({sp.stock_quantity})."
                )
            item.quantity = new_quantity

        db.commit()
        return CartService.get_cart_details(db, user)

    @staticmethod
    def remove_cart_item(db: Session, user: User, cart_item_id: int) -> CartRead:
        cart = CartService.get_or_create_cart(db, user)
        item = (
            db.query(CartItem)
            .filter(CartItem.id == cart_item_id, CartItem.cart_id == cart.id)
            .first()
        )
        if not item:
            raise NotFoundException(f"Cart item {cart_item_id} not found")

        db.delete(item)
        db.commit()
        return CartService.get_cart_details(db, user)

    @staticmethod
    def clear_cart(db: Session, user: User) -> bool:
        cart = CartService.get_or_create_cart(db, user)
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
        db.commit()
        return True
