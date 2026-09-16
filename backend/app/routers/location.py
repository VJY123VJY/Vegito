"""
location.py — Real-time GPS location sharing for active deliveries.

Architecture (V1 — single instance, in-memory):
  - DeliveryPartner POSTs location → stored in LOCATION_STORE dict
  - Customer subscribes via WebSocket → receives live updates
  - V2: Replace LOCATION_STORE with Redis pub/sub for horizontal scaling

WebSocket protocol:
  Client connects: ws://host/api/v1/location/ws/track/{task_id}
  Server sends JSON: {"lat": 17.68, "lng": 75.91, "accuracy": 10, "ts": "ISO8601"}
  Sends on: initial connect + every partner location POST
"""

import asyncio
import json
import datetime
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.delivery_task import DeliveryTask
from app.models.delivery_partner import DeliveryPartner
from app.core.constants import DeliveryTaskStatus
from app.schemas.common import APIResponse

router = APIRouter(prefix="/location", tags=["Live Location"])


# ---------------------------------------------------------------------------
# In-memory stores (V1) — replace with Redis in V2
# ---------------------------------------------------------------------------

# task_id → {lat, lng, accuracy, ts, partner_name}
LOCATION_STORE: Dict[int, dict] = {}

# task_id → list of active WebSocket connections (customer viewers)
LOCATION_SUBSCRIBERS: Dict[int, List[WebSocket]] = {}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class LocationUpdate(BaseModel):
    task_id: int
    lat: float
    lng: float
    accuracy: Optional[float] = None


class LocationResponse(BaseModel):
    lat: float
    lng: float
    accuracy: Optional[float] = None
    ts: str
    partner_name: Optional[str] = None


# ---------------------------------------------------------------------------
# Helper: broadcast to all subscribers for a task
# ---------------------------------------------------------------------------

async def _broadcast(task_id: int, payload: dict) -> None:
    subscribers = LOCATION_SUBSCRIBERS.get(task_id, [])
    dead = []
    for ws in subscribers:
        try:
            await ws.send_text(json.dumps(payload))
        except Exception:
            dead.append(ws)
    for ws in dead:
        subscribers.remove(ws)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post(
    "/update",
    response_model=APIResponse[bool],
    summary="Delivery partner POSTs current GPS coordinates",
)
async def update_location(
    payload: LocationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Called by the Seller+Delivery PWA every few seconds via navigator.geolocation.watchPosition().
    Stores the latest position and broadcasts to all WebSocket subscribers for this task.
    """
    # Verify task belongs to this user's delivery partner record
    partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == current_user.id).first()
    task = db.query(DeliveryTask).filter(DeliveryTask.id == payload.task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Delivery task not found")

    if partner and task.delivery_partner_id and task.delivery_partner_id != partner.id:
        raise HTTPException(status_code=403, detail="This task is not assigned to you")

    # Only track during active delivery
    if task.status not in (DeliveryTaskStatus.STARTED.value, DeliveryTaskStatus.ASSIGNED.value):
        raise HTTPException(status_code=400, detail="Location tracking only allowed for active tasks")

    ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
    location_data = {
        "lat": payload.lat,
        "lng": payload.lng,
        "accuracy": payload.accuracy,
        "ts": ts,
        "partner_name": current_user.name or "Delivery Partner",
        "task_id": payload.task_id,
    }

    LOCATION_STORE[payload.task_id] = location_data

    # Broadcast to all listening customers
    await _broadcast(payload.task_id, location_data)

    return APIResponse(data=True, message="Location updated")


@router.get(
    "/current/{task_id}",
    response_model=APIResponse[Optional[LocationResponse]],
    summary="Get the last known location for a delivery task",
)
def get_current_location(task_id: int):
    """
    Returns the last known GPS position for a task.
    Used by customer on initial page load before WebSocket connects.
    """
    loc = LOCATION_STORE.get(task_id)
    if not loc:
        return APIResponse(data=None, message="No location data available yet")
    return APIResponse(data=LocationResponse(**{k: loc[k] for k in LocationResponse.model_fields if k in loc}))


@router.websocket("/ws/track/{task_id}")
async def websocket_track(task_id: int, websocket: WebSocket):
    """
    Customer connects here to receive live delivery partner coordinates.
    Sends the last known location immediately on connect, then pushes
    updates whenever the partner POSTs a new position.
    """
    await websocket.accept()

    if task_id not in LOCATION_SUBSCRIBERS:
        LOCATION_SUBSCRIBERS[task_id] = []
    LOCATION_SUBSCRIBERS[task_id].append(websocket)

    try:
        # Send last known location immediately
        if task_id in LOCATION_STORE:
            await websocket.send_text(json.dumps(LOCATION_STORE[task_id]))
        else:
            await websocket.send_text(json.dumps({"status": "waiting", "message": "Waiting for partner location..."}))

        # Keep alive — client can send pings, we echo; main updates come from POST /update
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                if data == "ping":
                    await websocket.send_text(json.dumps({"status": "pong"}))
            except asyncio.TimeoutError:
                # Send keepalive
                await websocket.send_text(json.dumps({"status": "alive"}))

    except WebSocketDisconnect:
        subscribers = LOCATION_SUBSCRIBERS.get(task_id, [])
        if websocket in subscribers:
            subscribers.remove(websocket)
