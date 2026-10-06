import os
import sys

os.environ["DATABASE_URL"] = "postgresql://neondb_owner:npg_KLXukTJPW6F0@ep-empty-sky-au5bwvek-pooler.c-10.us-east-1.aws.neon.tech/neondb?sslmode=require"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.database import engine
from sqlalchemy import text

with engine.begin() as conn:
    print("=== LINKING ACTIVE SELLER 1142 (VIJAY SHOP) ===")
    
    # 1. Update seller_products to user 1142
    res_sp = conn.execute(text("UPDATE seller_products SET seller_id = 1142 WHERE seller_id = 6;"))
    print(f"Updated {res_sp.rowcount} seller_products to seller_id = 1142")

    # 2. Update orders to user 1142 and shop 282
    res_ord = conn.execute(text("UPDATE orders SET seller_id = 1142, shop_id = 282 WHERE seller_id = 6;"))
    print(f"Updated {res_ord.rowcount} orders to seller_id = 1142, shop_id = 282")

    # 3. Verify
    sp_count = conn.execute(text("SELECT count(*) FROM seller_products WHERE seller_id = 1142;")).scalar()
    ord_count = conn.execute(text("SELECT count(*) FROM orders WHERE seller_id = 1142;")).scalar()
    print(f"Verification: seller_products count for 1142 = {sp_count}")
    print(f"Verification: orders count for 1142 = {ord_count}")
