from typing import List, Optional, Tuple

from decimal import Decimal

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models.category import Category
from app.models.product import Product
from app.models.product_image import ProductImage
from app.models.seller_product import SellerProduct
from app.models.inventory import Inventory
from app.models.seller_profile import SellerProfile
from app.models.user import User

from app.schemas.category import CategoryCreate, CategoryUpdate
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductRead,
    ProductSellerOffer,
    ProductImageRead,
)

from app.core.exceptions import NotFoundException, ConflictException
from app.utils.pagination import PaginationParams
from app.services.freshness_service import FreshnessService


class ProductService:

    # Categories

    @staticmethod
    def list_categories(
        db: Session,
        active_only: bool = True,
    ) -> List[Category]:

        query = db.query(Category)

        if active_only:
            query = query.filter(Category.is_active == True)

        return query.order_by(
            Category.display_order.asc(),
            Category.name.asc(),
        ).all()

    @staticmethod
    def get_category_by_id(
        db: Session,
        category_id: int,
    ) -> Category:

        category = (
            db.query(Category)
            .filter(Category.id == category_id)
            .first()
        )

        if not category:
            raise NotFoundException(
                f"Category with id {category_id} not found"
            )

        return category

    @staticmethod
    def create_category(
        db: Session,
        category_in: CategoryCreate,
    ) -> Category:

        existing = (
            db.query(Category)
            .filter(Category.name == category_in.name)
            .first()
        )

        if existing:
            raise ConflictException(
                f"Category '{category_in.name}' already exists"
            )

        category = Category(**category_in.model_dump())

        db.add(category)
        db.commit()
        db.refresh(category)

        return category

    @staticmethod
    def update_category(
        db: Session,
        category_id: int,
        category_in: CategoryUpdate,
    ) -> Category:

        category = ProductService.get_category_by_id(
            db,
            category_id,
        )

        update_dict = category_in.model_dump(
            exclude_unset=True
        )

        if (
            "name" in update_dict
            and update_dict["name"] != category.name
        ):
            existing = (
                db.query(Category)
                .filter(
                    Category.name == update_dict["name"]
                )
                .first()
            )

            if existing:
                raise ConflictException(
                    f"Category '{update_dict['name']}' already exists"
                )

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
        product_type: Optional[str] = None,
        active_only: bool = True,
        marketplace_only: bool = True,
    ) -> Tuple[List[ProductRead], int]:
        """
        Lists canonical products with aggregated seller offers.

        If marketplace_only is True, only returns products
        with at least one active offer.
        """
        from app.services.taxonomy_service import TaxonomyService, VEGETABLE_CATEGORY_IDS, FRUIT_CATEGORY_IDS

        query = db.query(Product).options(
            joinedload(Product.category),
            joinedload(Product.images),
            joinedload(Product.seller_products)
            .joinedload(SellerProduct.seller)
            .joinedload(User.seller_profile),
            joinedload(Product.seller_products)
            .joinedload(SellerProduct.inventory),
        )

        if active_only:
            query = query.filter(
                Product.is_active == True
            )

        if product_type:
            p_type = product_type.strip().upper()
            if p_type == "VEGETABLE":
                query = query.filter(Product.category_id.in_(list(VEGETABLE_CATEGORY_IDS)))
            elif p_type == "FRUIT":
                query = query.filter(Product.category_id.in_(list(FRUIT_CATEGORY_IDS)))

        if category_id:
            target_cat = db.query(Category).filter(Category.id == category_id).first()
            if target_cat and target_cat.name.lower() in ["vegetables", "all vegetables"]:
                veg_subcategories = [1, 3, 4, 50, 51, 52, 53, 54, 55]
                query = query.filter(Product.category_id.in_(veg_subcategories))
            elif target_cat and target_cat.name.lower() in ["fruits", "all fruits"]:
                fruit_subcategories = [2, 56, 57, 58, 59, 60]
                query = query.filter(Product.category_id.in_(fruit_subcategories))
            else:
                query = query.filter(Product.category_id == category_id)

        clean_search = search.strip() if search else None
        if clean_search:
            # Check if search is a category intent (e.g. "vegetables", "fruits", "citrus", "leafy")
            cat_intent = TaxonomyService.get_category_intent(clean_search)
            if cat_intent:
                _, cat_ids = cat_intent
                query = query.filter(Product.category_id.in_(cat_ids))
            else:
                expanded_terms = TaxonomyService.expand_search_terms(clean_search)
                clauses = []
                for term in expanded_terms:
                    clauses.append(Product.name.ilike(f"%{term}%"))
                    clauses.append(Product.description.ilike(f"%{term}%"))
                query = query.filter(or_(*clauses))

        # Filter for products that have at least one seller offering it
        if marketplace_only:
            query = (
                query
                .join(SellerProduct)
                .filter(
                    SellerProduct.is_available == True
                )
            )

        total_count = query.distinct(Product.id).count()

        # Fetch products matching query
        raw_products = (
            query
            .distinct(Product.id)
            .all()
        )

        # Relevance scoring for search queries
        if clean_search and not TaxonomyService.get_category_intent(clean_search):
            import re
            s_lower = clean_search.lower()
            pattern = re.compile(rf"\b{re.escape(s_lower)}\b", re.IGNORECASE)

            def calc_relevance(p: Product) -> int:
                p_name = p.name.lower()
                # 1. Exact match on product name
                if p_name == s_lower:
                    return 100
                # 2. Whole word exact match on product name (e.g. "Apple" in "Royal Delicious Apple")
                if pattern.search(p_name):
                    return 90
                # 3. Prefix match on product name
                if p_name.startswith(s_lower):
                    return 80
                # 4. Prefix of any word in product name (e.g. "tom" in "Fresh Tomatoes")
                words = p_name.split()
                if any(w.startswith(s_lower) for w in words):
                    return 75
                # 5. Multilingual synonym match on product name
                for term in TaxonomyService.expand_search_terms(clean_search):
                    if term in p_name:
                        return 60
                # 6. Substring match on product name
                if s_lower in p_name:
                    return 40
                # 7. Description match
                return 20

            raw_products.sort(key=calc_relevance, reverse=True)

        products = raw_products[pagination.offset : pagination.offset + pagination.limit]

        # Build enriched ProductRead responses
        result: List[ProductRead] = []

        for p in products:

            offers: List[ProductSellerOffer] = []
            prices = []
            total_stock = 0

            for sp in p.seller_products:

                # Seller offers, not master products, define
                # marketplace price and stock.
                # Inventory is authoritative when it exists.

                profile = (
                    sp.seller.seller_profile
                    if sp.seller
                    else None
                )

                if (
                    sp.is_available
                    and (
                        profile is None
                        or profile.is_available
                    )
                ):

                    inventory = sp.inventory

                    available_stock = (
                        max(
                            Decimal("0"),
                            inventory.quantity
                            - inventory.reserved_quantity,
                        )
                        if inventory
                        else sp.stock_quantity
                    )

                    prices.append(sp.price)
                    total_stock += available_stock

                    b_name = (
                        sp.seller.seller_profile.business_name
                        if (
                            sp.seller
                            and sp.seller.seller_profile
                        )
                        else (
                            sp.seller.name
                            if sp.seller
                            else "Farmer Direct"
                        )
                    )

                    b_rating = (
                        sp.seller.seller_profile.rating
                        if (
                            sp.seller
                            and sp.seller.seller_profile
                        )
                        else Decimal("4.80")
                    )

                    freshness_info = FreshnessService.calculate(sp, p)

                    offers.append(
                        ProductSellerOffer(
                            seller_product_id=sp.id,
                            seller_id=sp.seller_id,
                            seller_business_name=b_name,
                            seller_rating=b_rating,
                            price=sp.price,
                            stock_quantity=available_stock,
                            minimum_order_quantity=(
                                sp.minimum_order_quantity
                            ),
                            is_available=sp.is_available,
                            added_date=getattr(sp, "added_date", None),
                            added_time=getattr(sp, "added_time", None),
                            harvest_date=getattr(sp, "harvest_date", None),
                            harvest_time=getattr(sp, "harvest_time", None),
                            storage_condition=getattr(sp, "storage_condition", None),
                            origin=getattr(sp, "origin", None),
                            freshness=freshness_info,
                        )
                    )

            min_price = (
                min(prices)
                if prices
                else None
            )

            is_in_stock = total_stock > 0

            read_obj = ProductRead.model_validate(p)

            read_obj.min_price = min_price
            read_obj.is_in_stock = is_in_stock
            read_obj.seller_products = offers

            if offers:
                best_offer = next((o for o in offers if o.is_available and o.stock_quantity > 0), offers[0])
                read_obj.freshness = best_offer.freshness

            result.append(read_obj)

        return result, total_count

    @staticmethod
    def get_product_by_id(
        db: Session,
        product_id: int,
    ) -> ProductRead:

        product = (
            db.query(Product)
            .options(
                joinedload(Product.category),
                joinedload(Product.images),
                joinedload(Product.seller_products)
                .joinedload(SellerProduct.seller)
                .joinedload(User.seller_profile),
            )
            .filter(Product.id == product_id)
            .first()
        )

        if not product:
            raise NotFoundException(
                f"Product {product_id} not found"
            )

        offers: List[ProductSellerOffer] = []
        prices = []
        total_stock = 0

        for sp in product.seller_products:

            profile = (
                sp.seller.seller_profile
                if sp.seller
                else None
            )

            if (
                sp.is_available
                and (
                    profile is None
                    or profile.is_available
                )
            ):

                inventory = sp.inventory

                available_stock = (
                    max(
                        Decimal("0"),
                        inventory.quantity
                        - inventory.reserved_quantity,
                    )
                    if inventory
                    else sp.stock_quantity
                )

                prices.append(sp.price)
                total_stock += available_stock

                b_name = (
                    sp.seller.seller_profile.business_name
                    if (
                        sp.seller
                        and sp.seller.seller_profile
                    )
                    else (
                        sp.seller.name
                        if sp.seller
                        else "Farmer Direct"
                    )
                )

                b_rating = (
                    sp.seller.seller_profile.rating
                    if (
                        sp.seller
                        and sp.seller.seller_profile
                    )
                    else Decimal("4.80")
                )

                freshness_info = FreshnessService.calculate(sp, product)

                offers.append(
                    ProductSellerOffer(
                        seller_product_id=sp.id,
                        seller_id=sp.seller_id,
                        seller_business_name=b_name,
                        seller_rating=b_rating,
                        price=sp.price,
                        stock_quantity=available_stock,
                        minimum_order_quantity=(
                            sp.minimum_order_quantity
                        ),
                        is_available=sp.is_available,
                        added_date=getattr(sp, "added_date", None),
                        added_time=getattr(sp, "added_time", None),
                        harvest_date=getattr(sp, "harvest_date", None),
                        harvest_time=getattr(sp, "harvest_time", None),
                        storage_condition=getattr(sp, "storage_condition", None),
                        origin=getattr(sp, "origin", None),
                        freshness=freshness_info,
                    )
                )

        read_obj = ProductRead.model_validate(product)

        read_obj.min_price = (
            min(prices)
            if prices
            else None
        )

        read_obj.is_in_stock = total_stock > 0
        read_obj.seller_products = offers

        if offers:
            best_offer = next((o for o in offers if o.is_available and o.stock_quantity > 0), offers[0])
            read_obj.freshness = best_offer.freshness

        return read_obj

    @staticmethod
    def create_product(
        db: Session,
        product_in: ProductCreate,
    ) -> Product:

        if product_in.category_id:
            ProductService.get_category_by_id(
                db,
                product_in.category_id,
            )

        product = Product(
            **product_in.model_dump()
        )

        db.add(product)
        db.commit()
        db.refresh(product)

        return product

    @staticmethod
    def update_product(
        db: Session,
        product_id: int,
        product_in: ProductUpdate,
    ) -> Product:

        product = (
            db.query(Product)
            .filter(Product.id == product_id)
            .first()
        )

        if not product:
            raise NotFoundException(
                f"Product with id {product_id} not found"
            )

        update_dict = product_in.model_dump(
            exclude_unset=True
        )

        if (
            "category_id" in update_dict
            and update_dict["category_id"]
        ):
            ProductService.get_category_by_id(
                db,
                update_dict["category_id"],
            )

        for key, value in update_dict.items():
            setattr(product, key, value)

        db.commit()
        db.refresh(product)

        return product