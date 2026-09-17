"""
mapbox_service.py — Mapbox Directions API integration for server-side distance calculation.

Calculates road driving distance between coordinates (e.g. Seller Shop -> Customer,
or Delivery Partner -> Seller Shop). Normalizes distances to kilometers.
Provides in-memory caching and graceful fallback to the Haversine formula.
"""

import logging
import time
from typing import Tuple, Dict, Optional
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

# Bounded in-memory route distance cache: key -> (distance_km, is_mapbox, timestamp)
_ROUTE_DISTANCE_CACHE: Dict[str, Tuple[float, bool, float]] = {}
_CACHE_TTL_SECONDS = 300.0  # 5 minutes
_MAX_CACHE_ENTRIES = 2000


class MapboxService:
    @staticmethod
    def _get_cache_key(start_lat: float, start_lng: float, end_lat: float, end_lng: float) -> str:
        return f"{round(start_lat, 4)},{round(start_lng, 4)}->{round(end_lat, 4)},{round(end_lng, 4)}"

    @staticmethod
    def get_route_distance_km(
        start_lat: float,
        start_lng: float,
        end_lat: float,
        end_lng: float,
    ) -> Tuple[float, bool]:
        """
        Calculates the driving route distance between two points in kilometers.
        Returns (distance_km, is_mapbox_route).
        If Mapbox Directions API is unavailable or fails, falls back to Haversine distance.
        """
        # 1. Check in-memory cache
        cache_key = MapboxService._get_cache_key(start_lat, start_lng, end_lat, end_lng)
        now = time.time()
        if cache_key in _ROUTE_DISTANCE_CACHE:
            cached_dist, cached_is_mb, cached_time = _ROUTE_DISTANCE_CACHE[cache_key]
            if now - cached_time < _CACHE_TTL_SECONDS:
                return cached_dist, cached_is_mb

        # 2. Check Mapbox Access Token
        token = getattr(settings, "MAPBOX_ACCESS_TOKEN", None) or getattr(settings, "MAP_API_KEY", None)
        if token and not token.startswith("mock") and len(token) > 10:
            try:
                # Mapbox Directions API expects {longitude},{latitude}
                url = (
                    f"https://api.mapbox.com/directions/v5/mapbox/driving/"
                    f"{start_lng},{start_lat};{end_lng},{end_lat}"
                )
                params = {
                    "access_token": token,
                    "overview": "false",
                    "geometries": "geojson",
                }
                with httpx.Client(timeout=4.0) as client:
                    resp = client.get(url, params=params)
                    if resp.status_code == 200:
                        data = resp.json()
                        routes = data.get("routes", [])
                        if routes and "distance" in routes[0]:
                            distance_meters = float(routes[0]["distance"])
                            distance_km = round(distance_meters / 1000.0, 2)
                            logger.info(
                                f"[MAPBOX] Calculated route distance: {distance_meters}m -> {distance_km}km "
                                f"between ({start_lat},{start_lng}) and ({end_lat},{end_lng})"
                            )
                            # Store in cache
                            if len(_ROUTE_DISTANCE_CACHE) > _MAX_CACHE_ENTRIES:
                                _ROUTE_DISTANCE_CACHE.clear()
                            _ROUTE_DISTANCE_CACHE[cache_key] = (distance_km, True, now)
                            return distance_km, True
                    else:
                        logger.warning(
                            f"[MAPBOX] Directions API returned HTTP {resp.status_code}: {resp.text[:120]}"
                        )
            except Exception as e:
                logger.warning(f"[MAPBOX] Directions API request failed: {e}. Falling back to Haversine.")

        # 3. Fallback to Haversine great-circle calculation
        from app.services.delivery_service import calculate_haversine_distance_km
        fallback_dist = calculate_haversine_distance_km(start_lat, start_lng, end_lat, end_lng)
        logger.info(
            f"[MAPBOX] Using fallback Haversine distance: {fallback_dist}km "
            f"between ({start_lat},{start_lng}) and ({end_lat},{end_lng})"
        )
        if len(_ROUTE_DISTANCE_CACHE) > _MAX_CACHE_ENTRIES:
            _ROUTE_DISTANCE_CACHE.clear()
        _ROUTE_DISTANCE_CACHE[cache_key] = (fallback_dist, False, now)
        return fallback_dist, False
