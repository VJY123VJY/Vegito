import os
import sys

os.environ["DATABASE_URL"] = "postgresql://neondb_owner:npg_KLXukTJPW6F0@ep-empty-sky-au5bwvek-pooler.c-10.us-east-1.aws.neon.tech/neondb?sslmode=require"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("=== USERS & SELLER PROFILES ===")
    res = conn.execute(text("""
        SELECT u.id, u.phone, u.name, sp.id AS sp_id, sp.business_name, sp.latitude, sp.longitude, sp.address 
        FROM users u 
        LEFT JOIN seller_profiles sp ON u.id = sp.user_id 
        WHERE sp.id IS NOT NULL 
        ORDER BY sp.id DESC;
    """))
    for r in res.fetchall():
        d = dict(r._mapping)
        print(f"User {d['id']} ({d['phone']}): SellerProfile #{d['sp_id']} - {ascii(d['business_name'])} | Lat: {d['latitude']}, Lng: {d['longitude']} | Addr: {ascii(d['address'])}")

    print("\n=== RECENT CUSTOMER ADDRESSES ===")
    res = conn.execute(text("""
        SELECT a.id, a.user_id, a.address_line1, a.city, a.latitude, a.longitude, a.is_default, u.name, u.phone
        FROM addresses a
        JOIN users u ON a.user_id = u.id
        ORDER BY a.id DESC
        LIMIT 10;
    """))
    for r in res.fetchall():
        d = dict(r._mapping)
        print(f"Address #{d['id']} for User {d['user_id']} ({d['name']}, {d['phone']}): city={d['city']}, lat={d['latitude']}, lng={d['longitude']}, addr={ascii(d['address_line1'])}")
