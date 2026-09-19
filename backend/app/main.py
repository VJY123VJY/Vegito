"""
main.py — FastAPI application entry point for the Vegito API.

Registers all routers, middleware, and exception handlers.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.error_handlers import register_error_handlers
from app.core.logging import setup_logging

# Import all 30 models to ensure they're registered with SQLAlchemy metadata
import app.models  # noqa: F401

from app.routers import (
    health_router,
    auth_router,
    customers_router,
    addresses_router,
    categories_router,
    products_router,
    cart_router,
    orders_router,
    favorites_router,
    reviews_router,
    complaints_router,
    coupons_router,
    notifications_router,
    seller_router,
    seller_products_router,
    seller_orders_router,
    inventory_router,
    delivery_router,
    delivery_batches_router,
    payments_router,
    admin_router,
)
from app.routers.location import router as location_router
from app.routers.delivery_tracking import router as delivery_tracking_router
from app.routers.admin_analytics import router as admin_analytics_router
from app.routers.admin_sellers import router as admin_sellers_router
from app.routers.admin_delivery import router as admin_delivery_router
from app.routers.websocket_tracking import router as websocket_tracking_router


# ---------------------------------------------------------------------------
# Setup structured logging
# ---------------------------------------------------------------------------
setup_logging(debug=settings.DEBUG)

# ---------------------------------------------------------------------------
# Application instance
# ---------------------------------------------------------------------------
app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Production-ready Vegetable Marketplace & Delivery Platform — VEGITO. "
        "Supports customer ordering, seller management, delivery tracking, "
        "inventory management, payments, coupons, and admin operations."
    ),
    version="1.0.0",
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS Middleware
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    # Capacitor WebViews use http://localhost, https://localhost, or capacitor://localhost.
    # Also support local private network IPs (10.*, 192.168.*, 172.16-31.*) for development.
    allow_origin_regex=r"^(?:https?|capacitor)://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Global exception handlers
# ---------------------------------------------------------------------------
register_error_handlers(app)

# ---------------------------------------------------------------------------
# Health routes are available both at the legacy root URL and under the public
# API prefix used by mobile clients and deployment health checks.
# ---------------------------------------------------------------------------
app.include_router(health_router)

# ---------------------------------------------------------------------------
# API v1 routes
# ---------------------------------------------------------------------------
API_PREFIX = settings.API_V1_STR

app.include_router(health_router, prefix=API_PREFIX)
app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(customers_router, prefix=API_PREFIX)
app.include_router(addresses_router, prefix=API_PREFIX)
app.include_router(categories_router, prefix=API_PREFIX)
app.include_router(products_router, prefix=API_PREFIX)
app.include_router(cart_router, prefix=API_PREFIX)
app.include_router(orders_router, prefix=API_PREFIX)
app.include_router(favorites_router, prefix=API_PREFIX)
app.include_router(reviews_router, prefix=API_PREFIX)
app.include_router(complaints_router, prefix=API_PREFIX)
app.include_router(coupons_router, prefix=API_PREFIX)
app.include_router(notifications_router, prefix=API_PREFIX)
app.include_router(seller_router, prefix=API_PREFIX)
app.include_router(seller_products_router, prefix=API_PREFIX)
app.include_router(seller_orders_router, prefix=API_PREFIX)
app.include_router(inventory_router, prefix=API_PREFIX)
app.include_router(delivery_router, prefix=API_PREFIX)
app.include_router(delivery_batches_router, prefix=API_PREFIX)
app.include_router(payments_router, prefix=API_PREFIX)
app.include_router(admin_router, prefix=API_PREFIX)
app.include_router(location_router, prefix=API_PREFIX)
app.include_router(delivery_tracking_router, prefix=API_PREFIX)
app.include_router(admin_analytics_router, prefix=API_PREFIX)
app.include_router(admin_sellers_router, prefix=API_PREFIX)
app.include_router(admin_delivery_router, prefix=API_PREFIX)
app.include_router(websocket_tracking_router)
app.include_router(websocket_tracking_router, prefix=API_PREFIX)
