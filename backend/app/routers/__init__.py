from app.routers.health import router as health_router
from app.routers.auth import router as auth_router
from app.routers.customers import router as customers_router
from app.routers.addresses import router as addresses_router
from app.routers.categories import router as categories_router
from app.routers.products import router as products_router
from app.routers.cart import router as cart_router
from app.routers.orders import router as orders_router
from app.routers.favorites import router as favorites_router
from app.routers.reviews import router as reviews_router
from app.routers.complaints import router as complaints_router
from app.routers.coupons import router as coupons_router
from app.routers.notifications import router as notifications_router
from app.routers.seller import router as seller_router
from app.routers.seller_products import router as seller_products_router
from app.routers.seller_orders import router as seller_orders_router
from app.routers.inventory import router as inventory_router
from app.routers.delivery import router as delivery_router
from app.routers.delivery_batches import router as delivery_batches_router
from app.routers.payments import router as payments_router
from app.routers.admin import router as admin_router

__all__ = [
    "health_router",
    "auth_router",
    "customers_router",
    "addresses_router",
    "categories_router",
    "products_router",
    "cart_router",
    "orders_router",
    "favorites_router",
    "reviews_router",
    "complaints_router",
    "coupons_router",
    "notifications_router",
    "seller_router",
    "seller_products_router",
    "seller_orders_router",
    "inventory_router",
    "delivery_router",
    "delivery_batches_router",
    "payments_router",
    "admin_router",
]
