import os
import sys

os.environ["DATABASE_URL"] = "postgresql://neondb_owner:npg_KLXukTJPW6F0@ep-empty-sky-au5bwvek-pooler.c-10.us-east-1.aws.neon.tech/neondb?sslmode=require"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    u = conn.execute(text("SELECT id, phone, name, is_active FROM users WHERE id = 6")).fetchone()
    print("User 6:", dict(u._mapping) if u else "Not found")

    sp = conn.execute(text("SELECT id, user_id, business_name, latitude, longitude, address, is_available FROM seller_profiles WHERE user_id = 6")).fetchone()
    print("SellerProfile for User 6:", dict(sp._mapping) if sp else "Not found")

    u1142 = conn.execute(text("SELECT id, phone, name, is_active FROM users WHERE id = 1142")).fetchone()
    print("User 1142:", dict(u1142._mapping) if u1142 else "Not found")

    sp1142 = conn.execute(text("SELECT id, user_id, business_name, latitude, longitude, address, is_available FROM seller_profiles WHERE user_id = 1142")).fetchone()
    print("SellerProfile for User 1142:", dict(sp1142._mapping) if sp1142 else "Not found")
