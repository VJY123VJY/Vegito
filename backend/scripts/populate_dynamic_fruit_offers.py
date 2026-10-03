import sys
import datetime
from decimal import Decimal

sys.path.insert(0, "backend")

from app.database import SessionLocal
from app.models.promotion import Promotion, PromotionItem
from app.models.seller_product import SellerProduct
from app.models.product import Product

def populate_fruit_and_family_offers():
    db = SessionLocal()
    try:
        now = datetime.datetime.now(datetime.timezone.utc)
        start_time = now - datetime.timedelta(days=1)
        end_time = now + datetime.timedelta(days=90)

        # Clear existing promotions to ensure fresh, clean data
        db.query(PromotionItem).delete()
        db.query(Promotion).delete()
        db.commit()

        # Find seller 3908 or any active seller
        seller_id = 3908

        # Define fruit and family pack promotions linked to real seller products
        promotions_data = [
            {
                "title": "Himachal Royal Delicious Apples - Farm Fresh Deal",
                "description": "Crisp, sweet, handpicked Royal Delicious Apples from Himachal orchards. Rich in antioxidants and dietary fiber.",
                "type": "FRUIT_OFFER",
                "price": Decimal("124.00"),  # Regular ₹155.00 -> 20% OFF
                "product_search": "Royal Delicious Apples",
                "quantity": Decimal("1.000"),
            },
            {
                "title": "Fresh Robusta Bananas - Energy Booster Offer",
                "description": "Naturally ripened Robusta Bananas, packed with potassium and natural sweetness. Fresh morning harvest.",
                "type": "FRUIT_OFFER",
                "price": Decimal("38.00"),  # Regular ₹45.00 -> 15% OFF
                "product_search": "Robusta Bananas",
                "quantity": Decimal("1.000"),
            },
            {
                "title": "Ratnagiri Alphonso Mango (Hapus) - Summer Special",
                "description": "Authentic GI-tagged King of Mangoes with heavenly aroma, golden pulp, and rich saffron sweetness.",
                "type": "FRUIT_OFFER",
                "price": Decimal("238.00"),  # Regular ₹280.00 -> 15% OFF
                "product_search": "Alphonso Mango",
                "quantity": Decimal("1.000"),
            },
            {
                "title": "Nagpur Sweet Oranges (Santra) - Vitamin C Pack",
                "description": "Juicy, zesty Nagpur table oranges with thin peel and high vitamin C juice content. Direct mandi procurement.",
                "type": "FRUIT_OFFER",
                "price": Decimal("68.00"),  # Regular ₹85.00 -> 20% OFF
                "product_search": "Sweet Oranges",
                "quantity": Decimal("1.000"),
            },
            {
                "title": "Nashik Green Seedless Grapes - Crisp & Sweet",
                "description": "Crunchy, sweet green Thompson seedless grapes picked fresh from Nashik vineyards. Thoroughly sorted.",
                "type": "FRUIT_OFFER",
                "price": Decimal("44.00"),  # Regular ₹55.00 -> 20% OFF
                "product_search": "Green Seedless Grapes",
                "quantity": Decimal("1.000"),
            },
            {
                "title": "Solapur Kesar Pomegranate - Ruby Red Arils",
                "description": "Geographical GI Pride of Solapur. Deep red arils with sweet juice, high iron, and rich antioxidants.",
                "type": "FRUIT_OFFER",
                "price": Decimal("115.00"),  # Regular ₹135.00 -> 15% OFF
                "product_search": "Solapur Kesar Pomegranate",
                "quantity": Decimal("1.000"),
            },
            {
                "title": "Sweet Table Papaya - Daily Digestion Essential",
                "description": "Farm-ripened yellow-orange sweet papaya, rich in papain enzyme, dietary fiber, and vitamin A.",
                "type": "FRUIT_OFFER",
                "price": Decimal("36.00"),  # Regular ₹45.00 -> 20% OFF
                "product_search": "Sweet Papaya",
                "quantity": Decimal("1.000"),
            },
            {
                "title": "Chilled Striped Watermelon - Hydration Blast",
                "description": "Sweet, deep red flesh with dark green stripes. Guaranteed sweet and hydrating for the entire family.",
                "type": "FRUIT_OFFER",
                "price": Decimal("52.00"),  # Regular ₹65.00 -> 20% OFF
                "product_search": "Striped Watermelon",
                "quantity": Decimal("1.000"),
            },
            {
                "title": "Mahabaleshwar Fresh Strawberries - Handpicked Delight",
                "description": "Fragrant, heart-shaped red strawberries freshly transported in cool packs from Mahabaleshwar farms.",
                "type": "FRUIT_OFFER",
                "price": Decimal("59.00"),  # Regular ₹70.00 -> 15% OFF
                "product_search": "Strawberries",
                "quantity": Decimal("1.000"),
            },
            {
                "title": "Fresh Fruit Family Health Saver Basket",
                "description": "Complete weekly family fruit basket: 1 KG Royal Apples + 1 Dozen Bananas + 1 KG Sweet Oranges + 1 KG Solapur Pomegranates. 25% Combo Discount!",
                "type": "FAMILY_PACK",
                "price": Decimal("315.00"),  # Regular ₹420.00 -> 25% OFF
                "bundle_items": [
                    {"product_search": "Royal Delicious Apples", "quantity": Decimal("1.000")},
                    {"product_search": "Robusta Bananas", "quantity": Decimal("1.000")},
                    {"product_search": "Sweet Oranges", "quantity": Decimal("1.000")},
                    {"product_search": "Solapur Kesar Pomegranate", "quantity": Decimal("1.000")},
                ],
            },
            {
                "title": "Daily Kitchen Vegetable & Fruit Family Combo",
                "description": "All essentials in one pack: Hybrid Tomato 1KG + Nashik Onion 1KG + Robusta Banana 1 Dozen + Fresh Palak 1 Bunch. Freshness guaranteed.",
                "type": "FAMILY_PACK",
                "price": Decimal("145.00"),  # Regular ₹185.00 -> 22% OFF
                "bundle_items": [
                    {"product_search": "Tomato", "quantity": Decimal("1.000")},
                    {"product_search": "Onion", "quantity": Decimal("1.000")},
                    {"product_search": "Robusta Bananas", "quantity": Decimal("1.000")},
                    {"product_search": "Palak", "quantity": Decimal("1.000")},
                ],
            },
        ]

        count = 0
        for pdata in promotions_data:
            promo = Promotion(
                seller_id=seller_id,
                title=pdata["title"],
                description=pdata["description"],
                type=pdata["type"],
                price=pdata["price"],
                status="ACTIVE",
                is_repeat_only=False,
                starts_at=start_time,
                ends_at=end_time,
            )
            db.add(promo)
            db.flush()

            if "bundle_items" in pdata:
                for bitem in pdata["bundle_items"]:
                    sp = db.query(SellerProduct).join(Product).filter(
                        Product.name.ilike(f"%{bitem['product_search']}%"),
                        SellerProduct.seller_id == seller_id
                    ).first()
                    if not sp:
                        # Fallback to any seller
                        sp = db.query(SellerProduct).join(Product).filter(
                            Product.name.ilike(f"%{bitem['product_search']}%")
                        ).first()
                    if sp:
                        db.add(PromotionItem(
                            promotion_id=promo.id,
                            seller_product_id=sp.id,
                            quantity=bitem["quantity"]
                        ))
            else:
                sp = db.query(SellerProduct).join(Product).filter(
                    Product.name.ilike(f"%{pdata['product_search']}%"),
                    SellerProduct.seller_id == seller_id
                ).first()
                if not sp:
                    sp = db.query(SellerProduct).join(Product).filter(
                        Product.name.ilike(f"%{pdata['product_search']}%")
                    ).first()
                if sp:
                    db.add(PromotionItem(
                        promotion_id=promo.id,
                        seller_product_id=sp.id,
                        quantity=pdata["quantity"]
                    ))

            count += 1

        db.commit()
        print(f"Successfully populated {count} real dynamic fruit and family pack promotions!")

    except Exception as e:
        db.rollback()
        print(f"Error populating promotions: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    populate_fruit_and_family_offers()
