"""
main.py — FastAPI application entry point for the Vegito API.

Registers all routers, middleware, and exception handlers.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.error_handlers import register_error_handlers
from app.core.logging import setup_logging

# Import all models so SQLAlchemy metadata is populated
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
from app.routers.promotions import router as promotions_router
from app.routers.websocket_tracking import router as websocket_tracking_router


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

setup_logging(debug=settings.DEBUG)


# ---------------------------------------------------------------------------
# FastAPI application
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
# CORS
# ---------------------------------------------------------------------------

configured_origins = settings.CORS_ORIGINS or []

if isinstance(configured_origins, str):
    configured_origins = [
        origin.strip().rstrip("/")
        for origin in configured_origins.split(",")
        if origin.strip()
    ]
else:
    configured_origins = [
        str(origin).strip().rstrip("/")
        for origin in configured_origins
        if str(origin).strip()
    ]


# Production / Vercel frontend URLs
production_origins = [
    "https://vegito-eqf3.vercel.app",
    "https://vegito-iota.vercel.app",

    # Current frontend deployment
    "https://vegito-eqf3-3520zel2w-vijaydhavan04-1868s-projects.vercel.app",

    # Git/main deployment
    "https://vegito-git-main-vijaydhavan04-1868s-projects.vercel.app",
]


# Combine configured + production origins
cors_origins = list(
    dict.fromkeys(
        configured_origins + production_origins
    )
)


app.add_middleware(
    CORSMiddleware,

    # Explicit origins
    allow_origins=cors_origins,

    # Vercel preview deployments
    # localhost
    # 127.0.0.1
    # LAN IPs
    # Capacitor
    allow_origin_regex=(
        r"^(https://([a-zA-Z0-9_-]+\.)*vercel\.app(?::[0-9]+)?"
        r"|http://localhost(?::[0-9]+)?"
        r"|http://127\.0\.0\.1(?::[0-9]+)?"
        r"|http://10\.\d+\.\d+\.\d+(?::[0-9]+)?"
        r"|http://192\.168\.\d+\.\d+(?::[0-9]+)?"
        r"|http://172\.(?:1[6-9]|2\d|3[0-1])\.\d+\.\d+(?::[0-9]+)?"
        r"|capacitor://localhost"
        r")$"
    ),

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------

register_error_handlers(app)


# ---------------------------------------------------------------------------
# Health routes
# ---------------------------------------------------------------------------

app.include_router(health_router)


# ---------------------------------------------------------------------------
# API v1 routes
# ---------------------------------------------------------------------------

API_PREFIX = settings.API_V1_STR

app.include_router(
    health_router,
    prefix=API_PREFIX,
)

app.include_router(
    auth_router,
    prefix=API_PREFIX,
)

app.include_router(
    customers_router,
    prefix=API_PREFIX,
)

app.include_router(
    addresses_router,
    prefix=API_PREFIX,
)

app.include_router(
    categories_router,
    prefix=API_PREFIX,
)

app.include_router(
    products_router,
    prefix=API_PREFIX,
)

app.include_router(
    cart_router,
    prefix=API_PREFIX,
)

app.include_router(
    orders_router,
    prefix=API_PREFIX,
)

app.include_router(
    favorites_router,
    prefix=API_PREFIX,
)

app.include_router(
    reviews_router,
    prefix=API_PREFIX,
)

app.include_router(
    complaints_router,
    prefix=API_PREFIX,
)

app.include_router(
    coupons_router,
    prefix=API_PREFIX,
)

app.include_router(
    notifications_router,
    prefix=API_PREFIX,
)

app.include_router(
    seller_router,
    prefix=API_PREFIX,
)

app.include_router(
    seller_products_router,
    prefix=API_PREFIX,
)

app.include_router(
    seller_orders_router,
    prefix=API_PREFIX,
)

app.include_router(
    inventory_router,
    prefix=API_PREFIX,
)

app.include_router(
    delivery_router,
    prefix=API_PREFIX,
)

app.include_router(
    delivery_batches_router,
    prefix=API_PREFIX,
)

app.include_router(
    payments_router,
    prefix=API_PREFIX,
)

app.include_router(
    admin_router,
    prefix=API_PREFIX,
)

app.include_router(
    promotions_router,
    prefix=API_PREFIX,
)

app.include_router(
    location_router,
    prefix=API_PREFIX,
)

app.include_router(
    delivery_tracking_router,
    prefix=API_PREFIX,
)

app.include_router(
    admin_analytics_router,
    prefix=API_PREFIX,
)

app.include_router(
    admin_sellers_router,
    prefix=API_PREFIX,
)

app.include_router(
    admin_delivery_router,
    prefix=API_PREFIX,
)


# ---------------------------------------------------------------------------
# WebSocket tracking
# ---------------------------------------------------------------------------

app.include_router(
    websocket_tracking_router
)

app.include_router(
    websocket_tracking_router,
    prefix=API_PREFIX,
)


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def on_startup():
    from app.routers.websocket_tracking import register_main_event_loop

    register_main_event_loop()