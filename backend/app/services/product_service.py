from typing import List, Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from app.models.category import Category
from app.models.product import Product
from app.models.product_image import ProductImage
from app.models.seller_product import SellerProduct
from app.models.seller_profile import SellerProfile
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.schemas.product import ProductCreate, ProductUpdate, ProductRead, ProductSellerOffer, ProductImageRead
from app.core.exceptions import NotFoundException, ConflictException
from app.utils.pagination import PaginationParams


class ProductService:
    # Categories
    @staticmethod
    def list_categories(db: Session, active_only: bool = True) -> List[Category]:
        query = db.query(Category)
        if active_only:
            query = query.filter(Category.is_active == True)
        return query.order_by(Category.display_order.asc(), Category.name.asc()).all()

    @staticmethod
    def get_category_by_id(db: Session, category_id: int) -> Category:
        category = db.query(Category).filter(Category.id == category_id).first()
        if not category:
            raise NotFoundException(f"Category with id {category_id} not found")
        return category

    @staticmethod
    def create_category(db: Session, category_in: CategoryCreate) -> Category:
        existing = db.query(Category).filter(Category.name == category_in.name).first()
        if existing:
            raise ConflictException(f"Category '{category_in.name}' already exists")

        category = Category(**category_in.model_dump())
        db.add(category)
        db.commit()
        db.refresh(category)
        return category

    @staticmethod
    def update_category(db: Session, category_id: int, category_in: CategoryUpdate) -> Category:
        category = ProductService.get_category_by_id(db, category_id)
        update_dict = category_in.model_dump(exclude_unset=True)

        if "name" in update_dict and update_dict["name"] != category.name:
            existing = db.query(Category).filter(Category.name == update_dict["name"]).first()
            if existing:
                raise ConflictException(f"Category '{update_dict['name']}' already exists")

        for key, value in update_dict.items():
            setattr(category, key, value)

        db.commit()
        db.refresh(category)
        return category

    # Products
    @staticmethod
    def list_products(
        db: Session,
        pagination: PaginationParams,
        search: Optional[str] = None,
        category_id: Optional[int] = None,
        active_only: bool = True,
    ) -> Tuple[List[ProductRead], int]:
        query = db.query(Product).options(
            joinedload(Product.category),
            joinedload(Product.images),
            joinedload(Product.seller_products).joinedload(SellerProduct.seller).joinedload(User.seller_profile),
        )

        if active_only:
            query = query.filter(Product.is_active == True)
        if category_id:
            query = query.filter(Product.category_id == category_id)
        if search:
            query = query.filter(
                or_(
                    Product.name.ilike(f"%{search}%"),
                    Product.description.ilike(f"%{search}%"),
                )
            )

        total_count = query.count()
        products = (
            query.order_by(Product.name.asc())
            .offset(pagination.offset)
            .limit(pagination.limit)
            .all()
        )

        # Build enriched ProductRead responses
        result: List[ProductRead] = []
        for p in products:
            offers: List[ProductSellerOffer] = []
            prices = []
            total_stock = 0
            for sp in p.seller_products:
                if sp.is_available:
                    prices.append(sp.price)
                    total_stock += sp.stock_quantity
                    b_name = (
                        sp.seller.seller_profile.business_name
                        if (sp.seller and sp.seller.seller_profile)
                        else (sp.seller.name if sp.seller else "Farmer Direct")
                    )
                    b_rating = (
                        sp.seller.seller_profile.rating
                        if (sp.seller and sp.seller.seller_profile)
                        else Decimal("4.80")
                    )
                    offers.append(
                        ProductSellerOffer(
                            seller_product_id=sp.id,
                            seller_id=sp.seller_id,
                            seller_business_name=b_name,
                            seller_rating=b_rating,
                            price=sp.price,
                            stock_quantity=sp.stock_quantity,
                            minimum_order_quantity=sp.minimum_order_quantity,
                            is_available=sp.is_available,
                        )
                    )

            min_price = min(prices) if prices else None
            is_in_stock = total_stock > 0

            read_obj = ProductRead.model_validate(p)
            read_obj.min_price = min_price
            read_obj.is_in_stock = is_in_stock
            read_obj.seller_products = offers
            result.append(read_obj)

        return result, total_count

    @staticmethod
    def get_product_by_id(db: Session, product_id: int) -> ProductRead:
        product = (
            db.query(Product)
            .options(
                joinedload(Product.category),
                joinedload(Product.images),
                joinedload(Product.seller_products).joinedload(SellerProduct.seller).joinedload(User.seller_profile),
            )
            .filter(Product.id == product_id)
            .first()
        )
        if not product:
            raise NotFoundException(f"Product {product_id} not found")

        offers: List[ProductSellerOffer] = []
        prices = []
        total_stock = 0
        for sp in product.seller_products:
            if sp.is_available:
                prices.append(sp.price)
                total_stock += sp.stock_quantity
                b_name = (
                    sp.seller.seller_profile.business_name
                    if (sp.seller and sp.seller.seller_profile)
                    else (sp.seller.name if sp.seller else "Farmer Direct")
                )
                b_rating = (
                    sp.seller.seller_profile.rating
                    if (sp.seller and sp.seller.seller_profile)
                    else Decimal("4.80")
                )
                offers.append(
                    ProductSellerOffer(
                        seller_product_id=sp.id,
                        seller_id=sp.seller_id,
                        seller_business_name=b_name,
                        seller_rating=b_rating,
                        price=sp.price,
                        stock_quantity=sp.stock_quantity,
                        minimum_order_quantity=sp.minimum_order_quantity,
                        is_available=sp.is_available,
                    )
                )

        read_obj = ProductRead.model_validate(product)
        read_obj.min_price = min_price = min(prices) if prices else None
        read_obj.is_in_stock = total_stock > 0
        read_obj.seller_products = offers
        return read_obj

    @staticmethod
    def create_product(db: Session, product_in: ProductCreate) -> Product:
        if product_in.category_id:
            ProductService.get_category_by_id(db, product_in.category_id)

        product = Product(**product_in.model_dump())
        db.add(product)
        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def update_product(db: Session, product_id: int, product_in: ProductUpdate) -> Product:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise NotFoundException(f"Product with id {product_id} not found")

        update_dict = product_in.model_dump(exclude_unset=True)
        if "category_id" in update_dict and update_dict["category_id"]:
            ProductService.get_category_by_id(db, update_dict["category_id"])

        for key, value in update_dict.items():
            setattr(product, key, value)

        db.commit()
        db.refresh(product)
        return product
