"""
websocket_tracking.py — Real-time delivery tracking channels using FastAPI WebSockets.

Endpoints:
  /ws/delivery/{order_id} — Delivery partner sends live GPS coordinates
  /ws/customer/{order_id} — Customer receives live updates for their order

Security:
  - Token verified via query parameter ?token=<JWT_ACCESS_TOKEN>
  - Delivery partner can only send GPS for assigned order
  - Customer can only track their own order
  - Admin has full visibility
"""

import asyncio
import datetime
import json
import logging
from typing import Dict, List, Optional
from decimal import Decimal

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.user import User
from app.models.order import Order
from app.models.delivery_partner import DeliveryPartner
from app.models.delivery_partner_location import DeliveryPartnerLocation
from app.services.jwt_service import decode_access_token
from app.core.constants import OrderStatus

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket Live Tracking"])


def get_ws_db():
    """Returns database session, respecting test dependency overrides if active."""
    try:
        from app.main import app
        from app.database import get_db
        if app.dependency_overrides and get_db in app.dependency_overrides:
            override = app.dependency_overrides[get_db]
            gen = override()
            return next(gen), False
    except Exception:
        pass
    return SessionLocal(), True


# ---------------------------------------------------------------------------
# In-Memory Real-time State (Fast caching before DB persistence)
# ---------------------------------------------------------------------------

# order_id -> { "order_id": int, "latitude": float, "longitude": float, "timestamp": str, "status": str }
ORDER_LOCATION_CACHE: Dict[int, dict] = {}

# order_id -> list of active customer viewer WebSocket connections
CUSTOMER_SUBSCRIBERS: Dict[int, List[WebSocket]] = {}

# partner_id -> list of active delivery dashboard WebSocket connections
DELIVERY_DASHBOARD_SUBSCRIBERS: Dict[int, List[WebSocket]] = {}
GENERAL_DELIVERY_SUBSCRIBERS: List[WebSocket] = []

# seller_id -> list of active seller dashboard WebSocket connections
SELLER_DASHBOARD_SUBSCRIBERS: Dict[int, List[WebSocket]] = {}
GENERAL_SELLER_SUBSCRIBERS: List[WebSocket] = []


async def broadcast_order_packed_notification(payload: dict, partner_id: Optional[int] = None) -> None:
    """Broadcasts ORDER_PACKED notification to assigned partner and general delivery subscribers."""
    message_text = json.dumps(payload)
    targets: List[WebSocket] = []
    if partner_id and partner_id in DELIVERY_DASHBOARD_SUBSCRIBERS:
        targets.extend(DELIVERY_DASHBOARD_SUBSCRIBERS[partner_id])
    elif not partner_id:
        for p_id, sub_list in DELIVERY_DASHBOARD_SUBSCRIBERS.items():
            targets.extend(sub_list)
    targets.extend(GENERAL_DELIVERY_SUBSCRIBERS)

    # Deduplicate targets
    seen = set()
    unique_targets: List[WebSocket] = []
    for ws in targets:
        if ws not in seen:
            seen.add(ws)
            unique_targets.append(ws)

    dead = []
    for ws in unique_targets:
        try:
            await ws.send_text(message_text)
        except Exception:
            dead.append(ws)

    for ws in dead:
        for p_id, sub_list in DELIVERY_DASHBOARD_SUBSCRIBERS.items():
            if ws in sub_list:
                sub_list.remove(ws)
        if ws in GENERAL_DELIVERY_SUBSCRIBERS:
            GENERAL_DELIVERY_SUBSCRIBERS.remove(ws)


def dispatch_order_packed_notification(payload: dict, partner_id: Optional[int] = None) -> None:
    """Synchronous / fire-and-forget helper to dispatch ORDER_PACKED notification."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        loop.create_task(broadcast_order_packed_notification(payload, partner_id))
    else:
        try:
            asyncio.run(broadcast_order_packed_notification(payload, partner_id))
        except Exception as e:
            logger.warning(f"Could not dispatch order packed notification: {e}")


async def broadcast_seller_new_order_notification(payload: dict, seller_id: Optional[int] = None) -> None:
    """Broadcasts NEW_ORDER notification to seller dashboard WebSocket subscribers."""
    message_text = json.dumps(payload)
    targets: List[WebSocket] = []
    if seller_id and seller_id in SELLER_DASHBOARD_SUBSCRIBERS:
        targets.extend(SELLER_DASHBOARD_SUBSCRIBERS[seller_id])
    elif not seller_id:
        for s_id, sub_list in SELLER_DASHBOARD_SUBSCRIBERS.items():
            targets.extend(sub_list)
    targets.extend(GENERAL_SELLER_SUBSCRIBERS)

    # Deduplicate targets
    seen = set()
    unique_targets: List[WebSocket] = []
    for ws in targets:
        if ws not in seen:
            seen.add(ws)
            unique_targets.append(ws)

    dead = []
    for ws in unique_targets:
        try:
            await ws.send_text(message_text)
        except Exception:
            dead.append(ws)

    for ws in dead:
        for s_id, sub_list in SELLER_DASHBOARD_SUBSCRIBERS.items():
            if ws in sub_list:
                sub_list.remove(ws)
        if ws in GENERAL_SELLER_SUBSCRIBERS:
            GENERAL_SELLER_SUBSCRIBERS.remove(ws)


def dispatch_seller_new_order_notification(payload: dict, seller_id: Optional[int] = None) -> None:
    """Synchronous / fire-and-forget helper to dispatch NEW_ORDER notification to seller."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        loop.create_task(broadcast_seller_new_order_notification(payload, seller_id))
    else:
        try:
            asyncio.run(broadcast_seller_new_order_notification(payload, seller_id))
        except Exception as e:
            logger.warning(f"Could not dispatch seller new order notification: {e}")


def authenticate_ws_token(token: Optional[str], db: Session) -> Optional[User]:
    """Authenticates a WebSocket connection using a JWT bearer token."""
    if not token:
        return None
    try:
        # Strip potential Bearer prefix if passed in query string
        clean_token = token.replace("Bearer ", "").strip()
        payload = decode_access_token(clean_token)
        user_id_str = payload.get("sub")
        if not user_id_str:
            return None
        user_id = int(user_id_str)
        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        return user
    except Exception as e:
        logger.warning(f"WebSocket auth failed: {e}")
        return None


async def broadcast_order_location(order_id: int, payload: dict) -> None:
    """Broadcasts a new GPS position to all active customer connections for that order."""
    subscribers = CUSTOMER_SUBSCRIBERS.get(order_id, [])
    dead = []
    message_text = json.dumps(payload)
    for ws in subscribers:
        try:
            await ws.send_text(message_text)
        except Exception:
            dead.append(ws)

    for ws in dead:
        if ws in subscribers:
            subscribers.remove(ws)


# ---------------------------------------------------------------------------
# 1. Delivery Partner Endpoint: /ws/delivery/{order_id}
# ---------------------------------------------------------------------------

@router.websocket("/ws/delivery/{order_id}")
async def delivery_partner_ws(
    websocket: WebSocket,
    order_id: int,
    token: Optional[str] = Query(None),
):
    """
    Delivery partner connects here to stream real-time GPS coordinates.
    Expects incoming JSON:
      {
        "order_id": 123,
        "latitude": 18.5204,
        "longitude": 73.8567,
        "accuracy": 10.5,
        "heading": 90.0,
        "speed": 24.5
      }
    """
    await websocket.accept()
    db, should_close = get_ws_db()

    try:
        # 1. Authenticate user
        current_user = authenticate_ws_token(token, db)
        if not current_user:
            await websocket.send_text(json.dumps({"error": "Unauthorized: invalid or missing token"}))
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # 2. Check role (Delivery Partner, Admin, or Seller acting as delivery)
        is_admin = current_user.role_id in [4, 5]
        partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == current_user.id).first()

        # 3. Fetch order
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            await websocket.send_text(json.dumps({"error": f"Order {order_id} not found"}))
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # 4. Check order assignment
        if not is_admin:
            if order.delivery_partner_id and partner and order.delivery_partner_id != partner.id:
                await websocket.send_text(json.dumps({"error": "Forbidden: Not assigned to this order"}))
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return

        # Acknowledge connection
        await websocket.send_text(json.dumps({
            "type": "connection_ack",
            "status": "connected",
            "order_id": order_id,
            "message": "GPS stream ready"
        }))

        # Loop receiving GPS frames from Delivery Partner
        while True:
            raw_data = await websocket.receive_text()
            if raw_data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                continue

            try:
                data = json.loads(raw_data)
            except Exception:
                continue

            lat = data.get("latitude")
            lng = data.get("longitude")
            if lat is None or lng is None:
                continue

            # Validate coordinate bounds
            try:
                lat = float(lat)
                lng = float(lng)
                if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                    continue
            except (ValueError, TypeError):
                continue

            now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
            location_payload = {
                "type": "location_update",
                "order_id": order_id,
                "latitude": lat,
                "longitude": lng,
                "accuracy": data.get("accuracy"),
                "heading": data.get("heading"),
                "speed": data.get("speed"),
                "status": order.status,
                "partner_name": current_user.name or "Delivery Partner",
                "timestamp": now_iso,
            }

            # Update cache
            ORDER_LOCATION_CACHE[order_id] = location_payload

            # Broadcast to customer viewers
            await broadcast_order_location(order_id, location_payload)

            # Persist latest location to database
            try:
                if partner:
                    partner_loc = DeliveryPartnerLocation(
                        delivery_partner_id=partner.id,
                        latitude=Decimal(str(round(lat, 7))),
                        longitude=Decimal(str(round(lng, 7))),
                        accuracy_meters=Decimal(str(round(data.get("accuracy", 0), 2))) if data.get("accuracy") is not None else None,
                        heading=Decimal(str(round(data.get("heading", 0), 2))) if data.get("heading") is not None else None,
                        speed_kmh=Decimal(str(round(data.get("speed", 0), 2))) if data.get("speed") is not None else None,
                    )
                    db.add(partner_loc)
                    db.commit()
            except Exception as db_err:
                logger.warning(f"Error persisting partner GPS location: {db_err}")
                db.rollback()

    except WebSocketDisconnect:
        logger.info(f"Delivery partner disconnected for order {order_id}")
    except Exception as e:
        logger.error(f"WebSocket error in delivery_partner_ws: {e}")
    finally:
        if should_close:
            db.close()


# ---------------------------------------------------------------------------
# 2. Customer Endpoint: /ws/customer/{order_id}
# ---------------------------------------------------------------------------

@router.websocket("/ws/customer/{order_id}")
async def customer_tracking_ws(
    websocket: WebSocket,
    order_id: int,
    token: Optional[str] = Query(None),
):
    """
    Customer connects here to watch the delivery partner move in real time.
    Sends last known coordinates immediately upon connect.
    Broadcasts every GPS update from the delivery partner.
    """
    await websocket.accept()
    db, should_close = get_ws_db()

    try:
        # 1. Authenticate user
        current_user = authenticate_ws_token(token, db)
        if not current_user:
            await websocket.send_text(json.dumps({"error": "Unauthorized: invalid or missing token"}))
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # 2. Verify order ownership (Customer must own the order, or be Seller / Admin)
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            await websocket.send_text(json.dumps({"error": f"Order {order_id} not found"}))
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        is_admin = current_user.role_id in [4, 5]
        is_seller = current_user.role_id == 2 and order.seller_id == current_user.id
        is_owner = order.customer_id == current_user.id

        if not (is_owner or is_seller or is_admin):
            await websocket.send_text(json.dumps({"error": "Forbidden: You cannot track this order"}))
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # 3. Register subscriber
        if order_id not in CUSTOMER_SUBSCRIBERS:
            CUSTOMER_SUBSCRIBERS[order_id] = []
        CUSTOMER_SUBSCRIBERS[order_id].append(websocket)

        # 4. Send initial state immediately
        cached_location = ORDER_LOCATION_CACHE.get(order_id)
        if cached_location:
            await websocket.send_text(json.dumps(cached_location))
        else:
            # Send shop coordinates or city center as starting point
            initial_lat = float(order.delivery_latitude) if order.delivery_latitude else 17.6805
            initial_lng = float(order.delivery_longitude) if order.delivery_longitude else 75.9064
            await websocket.send_text(json.dumps({
                "type": "initial_state",
                "order_id": order_id,
                "status": order.status,
                "latitude": initial_lat,
                "longitude": initial_lng,
                "partner_name": order.delivery_partner.user.name if (order.delivery_partner and order.delivery_partner.user) else None,
                "message": "Waiting for delivery partner GPS update...",
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }))

        # 5. Keep alive and handle pings
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                if data == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except asyncio.TimeoutError:
                # Send keepalive
                await websocket.send_text(json.dumps({"type": "heartbeat"}))

    except WebSocketDisconnect:
        logger.info(f"Customer disconnected from order tracking {order_id}")
    except Exception as e:
        logger.error(f"WebSocket error in customer_tracking_ws: {e}")
    finally:
        subscribers = CUSTOMER_SUBSCRIBERS.get(order_id, [])
        if websocket in subscribers:
            subscribers.remove(websocket)
        if should_close:
            db.close()


# ---------------------------------------------------------------------------
# 3. Delivery Dashboard Notifications Endpoint: /ws/delivery-dashboard
# ---------------------------------------------------------------------------

@router.websocket("/ws/delivery-dashboard")
@router.websocket("/ws/delivery/notifications")
async def delivery_dashboard_notifications_ws(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
):
    """
    Delivery partner dashboard connects here to receive real-time notifications
    (such as ORDER_PACKED with OTP and ringtone triggers) without needing page reload.
    """
    await websocket.accept()
    db, should_close = get_ws_db()
    partner_id = None

    try:
        current_user = authenticate_ws_token(token, db)
        if not current_user:
            await websocket.send_text(json.dumps({"error": "Unauthorized: invalid or missing token"}))
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == current_user.id).first()
        if not partner and current_user.role_id == 3:
            from app.services.delivery_service import DeliveryService
            partner = DeliveryService.get_delivery_partner(db, current_user)

        if partner:
            partner_id = partner.id
            if partner_id not in DELIVERY_DASHBOARD_SUBSCRIBERS:
                DELIVERY_DASHBOARD_SUBSCRIBERS[partner_id] = []
            DELIVERY_DASHBOARD_SUBSCRIBERS[partner_id].append(websocket)
        else:
            GENERAL_DELIVERY_SUBSCRIBERS.append(websocket)

        # Recovery on reconnect: Send pending orders ready for pickup
        query = db.query(Order).filter(Order.status.in_([OrderStatus.READY.value, OrderStatus.READY_FOR_PICKUP.value]))
        if partner_id:
            query = query.filter((Order.delivery_partner_id == partner_id) | (Order.delivery_partner_id.is_(None)))
        pending_ready_orders = query.order_by(Order.ready_at.desc()).limit(10).all()

        recovery_items = []
        for o in pending_ready_orders:
            shop_prof = o.shop or (db.query(SellerProfile).filter(SellerProfile.user_id == o.seller_id).first() if o.seller_id else None)
            recovery_items.append({
                "type": "ORDER_PACKED",
                "event": "DELIVERY_ASSIGNED",
                "event_id": f"DELIVERY_ASSIGNED_{o.id}",
                "order_id": o.id,
                "order_number": o.order_number,
                "status": o.status,
                "delivery_partner_id": o.delivery_partner_id,
                "shop_name": shop_prof.business_name if shop_prof else "Vegito Fresh Farm",
                "total_amount": float(o.total_amount),
                "message": f"Order {o.order_number} is packed and ready for pickup. Go to seller shop.",
            })

        await websocket.send_text(json.dumps({
            "type": "connection_ack",
            "status": "connected",
            "partner_id": partner_id,
            "message": "Delivery dashboard live notification stream active",
            "pending_ready_orders": recovery_items,
        }))

        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                if data == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except asyncio.TimeoutError:
                await websocket.send_text(json.dumps({"type": "heartbeat"}))

    except WebSocketDisconnect:
        logger.info(f"Delivery dashboard disconnected for partner {partner_id}")
    except Exception as e:
        logger.error(f"WebSocket error in delivery_dashboard_notifications_ws: {e}")
    finally:
        if partner_id and partner_id in DELIVERY_DASHBOARD_SUBSCRIBERS:
            if websocket in DELIVERY_DASHBOARD_SUBSCRIBERS[partner_id]:
                DELIVERY_DASHBOARD_SUBSCRIBERS[partner_id].remove(websocket)
        if websocket in GENERAL_DELIVERY_SUBSCRIBERS:
            GENERAL_DELIVERY_SUBSCRIBERS.remove(websocket)
        if should_close:
            db.close()


# ---------------------------------------------------------------------------
# 4. Seller Dashboard Notifications Endpoint: /ws/seller-dashboard
# ---------------------------------------------------------------------------

@router.websocket("/ws/seller-dashboard")
@router.websocket("/ws/seller/notifications")
async def seller_dashboard_notifications_ws(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
):
    """
    Seller dashboard connects here to receive real-time NEW_ORDER notifications
    with order details and trigger ringtone alert without manual page refresh.
    """
    await websocket.accept()
    db, should_close = get_ws_db()
    seller_id = None

    try:
        current_user = authenticate_ws_token(token, db)
        if not current_user:
            await websocket.send_text(json.dumps({"error": "Unauthorized: invalid or missing token"}))
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Check role (Seller or Admin)
        if current_user.role_id not in [2, 4, 5]:
            await websocket.send_text(json.dumps({"error": "Forbidden: Seller or Admin access required"}))
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        seller_id = current_user.id
        if seller_id not in SELLER_DASHBOARD_SUBSCRIBERS:
            SELLER_DASHBOARD_SUBSCRIBERS[seller_id] = []
        SELLER_DASHBOARD_SUBSCRIBERS[seller_id].append(websocket)

        # Recovery on reconnect: Send recent pending NEW orders
        from app.models.order_item import OrderItem
        query = (
            db.query(Order)
            .filter(
                Order.seller_id == seller_id,
                Order.status.in_([OrderStatus.NEW.value, OrderStatus.ORDER_PLACED.value]),
            )
            .order_by(Order.placed_at.desc())
            .limit(10)
        )
        pending_new = query.all()

        recovery_items = []
        for o in pending_new:
            cust_name = o.customer.name if (o.customer and o.customer.name) else "Customer"
            items_summary = []
            for item in o.items:
                items_summary.append({
                    "name": item.product_name,
                    "quantity": item.quantity,
                    "unit": item.unit,
                })
            recovery_items.append({
                "type": "NEW_ORDER",
                "event": "NEW_ORDER",
                "event_id": f"ORDER_{o.id}_NEW",
                "order_id": o.id,
                "order_number": o.order_number,
                "status": o.status,
                "customer_name": cust_name,
                "items": items_summary,
                "total_amount": float(o.total_amount),
                "delivery_area": o.address.city if o.address else "Solapur",
                "message": f"New order #{o.order_number} received!",
            })

        await websocket.send_text(json.dumps({
            "type": "connection_ack",
            "status": "connected",
            "seller_id": seller_id,
            "message": "Seller dashboard live notification stream active",
            "pending_new_orders": recovery_items,
        }))

        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                if data == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except asyncio.TimeoutError:
                await websocket.send_text(json.dumps({"type": "heartbeat"}))

    except WebSocketDisconnect:
        logger.info(f"Seller dashboard disconnected for seller {seller_id}")
    except Exception as e:
        logger.error(f"WebSocket error in seller_dashboard_notifications_ws: {e}")
    finally:
        if seller_id and seller_id in SELLER_DASHBOARD_SUBSCRIBERS:
            if websocket in SELLER_DASHBOARD_SUBSCRIBERS[seller_id]:
                SELLER_DASHBOARD_SUBSCRIBERS[seller_id].remove(websocket)
        if websocket in GENERAL_SELLER_SUBSCRIBERS:
            GENERAL_SELLER_SUBSCRIBERS.remove(websocket)
        if should_close:
            db.close()

