import datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.product import Product
from app.models.market_intelligence import MarketIntelligence

def seed_market_intelligence():
    db = SessionLocal()
    try:
        products = db.query(Product).all()
        if not products:
            print("No products found to seed market intelligence.")
            return

        for p in products:
            # Generate realistic market data for Solapur
            base_price = Decimal("30.00")
            if "Tomato" in p.name: base_price = Decimal("35.00")
            elif "Onion" in p.name: base_price = Decimal("28.00")
            elif "Potato" in p.name: base_price = Decimal("25.00")
            elif "Spinach" in p.name: base_price = Decimal("20.00")

            ref_price = base_price + Decimal("3.50")

            intel = MarketIntelligence(
                product_id=p.id,
                reference_price=ref_price,
                previous_price=base_price,
                trend="INCREASING",
                suggested_range_min=ref_price,
                suggested_range_max=ref_price + Decimal("10.00"),
                demand_signal="HIGH",
                supply_signal="NORMAL",
                source="Solapur Mandi (Real-time)",
                confidence=Decimal("0.95"),
                timestamp=datetime.datetime.now(datetime.timezone.utc)
            )
            db.add(intel)

        db.commit()
        print(f"Successfully seeded market intelligence for {len(products)} products.")
    except Exception as e:
        print(f"Error seeding market data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_market_intelligence()
