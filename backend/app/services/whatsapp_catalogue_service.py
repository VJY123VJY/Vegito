from typing import List, Optional, Dict, Any
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.product import Product
from app.models.category import Category
from app.models.seller_product import SellerProduct
from app.models.user import User
from pydantic import BaseModel


class CatalogueSyncItem(BaseModel):
    name: str
    category_id: int
    category_name: str
    unit: str
    price: Optional[Decimal] = None
    seller_name: Optional[str] = "Vegito Farm Store"
    status: str  # "REUSED" | "CONFIRMED" | "PENDING_CONFIRMATION"
    confirmation_reason: Optional[str] = None
    shelf_life_days: int = 7


class WhatsAppCatalogueService:
    WHATSAPP_PHONE = "+91 88559 69612"
    CATALOGUE_URL = "https://wa.me/c/918855969612"
    BUSINESS_NAME = "Rohit Mhetre / Vegito Solapur"

    # Known catalogue items from reference with status
    REFERENCE_CATALOGUE = [
        {
            "name": "Tomato",
            "category_name": "Vegetables",
            "unit": "kg",
            "price": Decimal("38.00"),
            "shelf_life_days": 7,
            "requires_manual_confirmation": False,
        },
        {
            "name": "Potato",
            "category_name": "Root Vegetables",
            "unit": "kg",
            "price": Decimal("35.00"),
            "shelf_life_days": 21,
            "requires_manual_confirmation": False,
        },
        {
            "name": "Onion",
            "category_name": "Root Vegetables",
            "unit": "kg",
            "price": Decimal("40.00"),
            "shelf_life_days": 21,
            "requires_manual_confirmation": False,
        },
        {
            "name": "Spinach",
            "category_name": "Leafy Vegetables",
            "unit": "bunch",
            "price": Decimal("35.00"),
            "shelf_life_days": 3,
            "requires_manual_confirmation": False,
        },
        {
            "name": "Banana",
            "category_name": "Fruits",
            "unit": "dozen",
            "price": Decimal("35.00"),
            "shelf_life_days": 6,
            "requires_manual_confirmation": False,
        },
        {
            "name": "Solapur Fresh Hybrid Tomatoes",
            "category_name": "Vegetables",
            "unit": "1 KG",
            "price": Decimal("47.00"),
            "shelf_life_days": 7,
            "requires_manual_confirmation": False,
        },
        {
            "name": "Green finger",
            "category_name": "Vegetables",
            "unit": "1 KG",
            "price": Decimal("40.00"),
            "shelf_life_days": 7,
            "requires_manual_confirmation": False,
        },
        # Items requiring manual price confirmation as WhatsApp client restricts programmatic extraction
        {
            "name": "Carrot",
            "category_name": "Root Vegetables",
            "unit": "kg",
            "price": None,
            "shelf_life_days": 14,
            "requires_manual_confirmation": True,
            "confirmation_reason": "Price not published in plain HTML; requires seller manual confirmation via WhatsApp catalogue.",
        },
        {
            "name": "Cabbage",
            "category_name": "Vegetables",
            "unit": "piece",
            "price": None,
            "shelf_life_days": 7,
            "requires_manual_confirmation": True,
            "confirmation_reason": "Price requires seller manual confirmation from current Solapur Mandi rate.",
        },
        {
            "name": "Cauliflower",
            "category_name": "Vegetables",
            "unit": "piece",
            "price": None,
            "shelf_life_days": 6,
            "requires_manual_confirmation": True,
            "confirmation_reason": "Price requires seller manual confirmation.",
        },
        {
            "name": "Apple",
            "category_name": "Fruits",
            "unit": "kg",
            "price": None,
            "shelf_life_days": 14,
            "requires_manual_confirmation": True,
            "confirmation_reason": "Fruit seasonal price requires seller confirmation.",
        },
        {
            "name": "Coriander",
            "category_name": "Leafy Vegetables",
            "unit": "bunch",
            "price": None,
            "shelf_life_days": 3,
            "requires_manual_confirmation": True,
            "confirmation_reason": "Daily harvest batch price requires seller confirmation.",
        },
        {
            "name": "Fenugreek",
            "category_name": "Leafy Vegetables",
            "unit": "bunch",
            "price": None,
            "shelf_life_days": 3,
            "requires_manual_confirmation": True,
            "confirmation_reason": "Daily harvest batch price requires seller confirmation.",
        },
        {
            "name": "Radish",
            "category_name": "Root Vegetables",
            "unit": "kg",
            "price": None,
            "shelf_life_days": 10,
            "requires_manual_confirmation": True,
            "confirmation_reason": "Harvest batch price requires seller confirmation.",
        },
        {
            "name": "Beetroot",
            "category_name": "Root Vegetables",
            "unit": "kg",
            "price": None,
            "shelf_life_days": 18,
            "requires_manual_confirmation": True,
            "confirmation_reason": "Harvest batch price requires seller confirmation.",
        },
    ]

    @classmethod
    def get_catalogue_status(cls, db: Session) -> Dict[str, Any]:
        """
        Inspects existing database products against WhatsApp reference.
        Reuses existing products and identifies items requiring manual price confirmation.
        """
        existing_products = {p.name.lower(): p for p in db.query(Product).all()}
        categories = {c.name.lower(): c for c in db.query(Category).all()}

        reused_items = []
        pending_confirmation_items = []

        for item in cls.REFERENCE_CATALOGUE:
            name_lower = item["name"].lower()
            existing_p = existing_products.get(name_lower)

            cat = categories.get(item["category_name"].lower())
            cat_id = cat.id if cat else 1

            if existing_p:
                reused_items.append({
                    "product_id": existing_p.id,
                    "name": existing_p.name,
                    "category": item["category_name"],
                    "unit": existing_p.unit,
                    "status": "REUSED_FROM_POSTGRESQL",
                    "requires_manual_confirmation": False,
                })
            elif item["requires_manual_confirmation"]:
                pending_confirmation_items.append({
                    "name": item["name"],
                    "category": item["category_name"],
                    "unit": item["unit"],
                    "status": "REQUIRES_MANUAL_CONFIRMATION",
                    "reason": item.get("confirmation_reason"),
                })

        return {
            "source": "WhatsApp Business Catalogue",
            "phone": cls.WHATSAPP_PHONE,
            "catalogue_url": cls.CATALOGUE_URL,
            "business": cls.BUSINESS_NAME,
            "total_items_reviewed": len(cls.REFERENCE_CATALOGUE),
            "reused_count": len(reused_items),
            "pending_confirmation_count": len(pending_confirmation_items),
            "reused_products": reused_items,
            "items_requiring_manual_confirmation": pending_confirmation_items,
        }
