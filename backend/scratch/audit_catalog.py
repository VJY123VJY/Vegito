import sys
from app.database import SessionLocal
from app.models.category import Category
from app.models.product import Product
from app.models.seller_product import SellerProduct
from app.models.product_image import ProductImage

db = SessionLocal()

print("--- CATEGORIES ---")
categories = db.query(Category).all()
print(f"Total categories: {len(categories)}")
for c in categories:
    print(f"ID: {c.id} | Name: {c.name} | Slug: {getattr(c, 'slug', None)} | ParentID: {getattr(c, 'parent_id', None)}")

print("\n--- PRODUCTS COUNT & TAXONOMY ---")
products = db.query(Product).all()
print(f"Total products: {len(products)}")

# Check attributes of Product model
prod_sample = products[0] if products else None
if prod_sample:
    attrs = [col.name for col in prod_sample.__table__.columns]
    print(f"Product columns: {attrs}")

# Group products by category
cat_map = {c.id: c.name for c in categories}
counts_by_cat = {}
for p in products:
    c_name = cat_map.get(p.category_id, "Unknown")
    counts_by_cat[c_name] = counts_by_cat.get(c_name, 0) + 1

for c_name, cnt in counts_by_cat.items():
    print(f"  {c_name}: {cnt} products")

print("\n--- SELLER PRODUCTS ---")
sp_count = db.query(SellerProduct).count()
print(f"Total seller products: {sp_count}")

# Check seller product columns
sp_sample = db.query(SellerProduct).first()
if sp_sample:
    sp_attrs = [col.name for col in sp_sample.__table__.columns]
    print(f"SellerProduct columns: {sp_attrs}")

db.close()
