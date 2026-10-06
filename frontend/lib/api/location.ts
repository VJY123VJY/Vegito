import { api, getApiBaseUrl, type ApiEnvelope } from "./client";

export type LocationUpdate = {
  task_id: number;
  lat: number;
  lng: number;
  accuracy?: number;
};

export type LocationData = {
  lat: number;
  lng: number;
  accuracy?: number | null;
  ts: string;
  partner_name?: string | null;
  task_id?: number;
};

/** POST current GPS position to backend — called by delivery partner */
export async function postLocation(payload: LocationUpdate): Promise<void> {
  await api.post<ApiEnvelope<boolean>>("/location/update", payload);
}

/** GET the last known location for a task (used on initial load) */
export async function getLastLocation(taskId: number): Promise<LocationData | null> {
  const { data } = await api.get<ApiEnvelope<LocationData | null>>(`/location/current/${taskId}`);
  return data.data ?? null;
}

/**
 * Start watching GPS and POST updates to server.
 * Returns a cleanup function that stops watching + clears interval.
 *
 * Scalable: Replace postLocation with WebSocket emit in V2.
 */
export function startLocationTracking(
  taskId: number,
  onLocation?: (loc: GeolocationCoordinates) => void,
  onError?: (err: GeolocationPositionError) => void,
): () => void {
  if (!navigator.geolocation) {
    console.warn("Geolocation not supported");
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude: lat, longitude: lng, accuracy } = position.coords;
      onLocation?.(position.coords);
      try {
        await postLocation({ task_id: taskId, lat, lng, accuracy });
      } catch (err) {
        console.warn("Location POST failed:", err);
      }
    },
    (err) => {
      console.warn("GPS error:", err);
      onError?.(err);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    },
  );

  return () => navigator.geolocation.clearWatch(watchId);
}

/**
 * Subscribe to live delivery location via WebSocket.
 * Returns a cleanup function.
 *
 * Scalable: Backend WebSocket handler is in location.py — swap
 * LOCATION_STORE with Redis pub/sub for multi-instance V2.
 */
export function subscribeToLocation(
  taskId: number,
  onData: (data: LocationData) => void,
  onError?: () => void,
): () => void {
  const apiBase = getApiBaseUrl()
    .replace(/^http/, "ws");
  const wsUrl = `${apiBase}/location/ws/track/${taskId}`;
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.lat !== undefined) {
        onData(payload as LocationData);
      }
    } catch {
      // ignore malformed
    }
  };

  ws.onerror = () => onError?.();

  // Ping keepalive every 20 seconds
  const pingInterval = window.setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send("ping");
    }
  }, 20000);

  return () => {
    clearInterval(pingInterval);
    ws.close();
  };
}

/**
 * Real-time Delivery Partner GPS Watcher over WebSocket.
 *
 * Uses real browser GPS (navigator.geolocation.watchPosition) with high accuracy.
 * Throttles sending updates to WebSocket every 3–5 seconds or significant movement.
 * Never sends fake GPS.
 */
export function watchDeliveryBoyGps(
  taskId: number,
  _token: string,
  onCoords?: (coords: {
    lat: number;
    lng: number;
    accuracy?: number;
  }) => void,
  onError?: (err: any) => void,
): () => void {
  return startLocationTracking(
    taskId,
    (coords) => {
      onCoords?.({
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy,
      });
    },
    (err) => {
      onError?.(err);
    },
  );
}

/**
 * Customer live delivery tracker via WebSocket + HTTP Polling Dual Transport.
 * Receives live coordinate updates broadcasted by backend or polls HTTP endpoints.
 */
export function subscribeToOrderTracking(
  orderId: number,
  token: string,
  onLocation: (data: { latitude: number; longitude: number; status?: string; partner_name?: string }) => void,
  onError?: (err: any) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const apiBase = getApiBaseUrl()
    .replace(/^http/, "ws")
    .replace(/\/api\/v1$/, "");

  const wsUrl = `${apiBase}/ws/customer/${orderId}?token=${encodeURIComponent(token)}`;

  let ws: WebSocket | null = null;
  let isClosed = false;
  let reconnectTimer: any = null;
  let pingInterval: any = null;
  let pollInterval: any = null;
  let hasReceivedWsData = false;

  // 1. Initial HTTP poll to get coordinates immediately on page load
  async function pollLatestLocation() {
    if (isClosed) return;
    try {
      // First try /location/current/{orderId}
      const locRes = await api.get<ApiEnvelope<LocationData | null>>(`/location/current/${orderId}`).catch(() => null);
      if (locRes?.data?.data?.lat && locRes?.data?.data?.lng) {
        onLocation({
          latitude: Number(locRes.data.data.lat),
          longitude: Number(locRes.data.data.lng),
          partner_name: locRes.data.data.partner_name || undefined,
        });
        return;
      }

      // Next try order detail for delivery_latitude / delivery_longitude
      const orderRes = await api.get<ApiEnvelope<any>>(`/orders/${orderId}`).catch(() => null);
      const ord = orderRes?.data?.data;
      if (ord) {
        const lat = ord.delivery_latitude != null ? Number(ord.delivery_latitude) : null;
        const lng = ord.delivery_longitude != null ? Number(ord.delivery_longitude) : null;
        if (lat !== null && lng !== null) {
          onLocation({
            latitude: lat,
            longitude: lng,
            status: ord.status,
            partner_name: ord.delivery_partner_name,
          });
          return;
        }

        // If partner assigned, check partner latest location
        if (ord.delivery_partner_id) {
          const partLoc = await api.get<ApiEnvelope<any>>(`/delivery/location/latest/${ord.delivery_partner_id}`).catch(() => null);
          const pData = partLoc?.data?.data;
          if (pData?.latitude && pData?.longitude) {
            onLocation({
              latitude: Number(pData.latitude),
              longitude: Number(pData.longitude),
              status: ord.status,
              partner_name: ord.delivery_partner_name,
            });
          }
        }
      }
    } catch {
      // Silent error during polling
    }
  }

  // Poll immediately on mount
  pollLatestLocation();

  // Poll every 5 seconds as a guaranteed backup in serverless or WS-restricted environments
  pollInterval = setInterval(pollLatestLocation, 5000);

  // 2. Connect to WebSocket for instant real-time streaming
  function connect() {
    if (isClosed) return;
    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.latitude !== undefined && payload.longitude !== undefined) {
            hasReceivedWsData = true;
            onLocation({
              latitude: Number(payload.latitude),
              longitude: Number(payload.longitude),
              status: payload.status,
              partner_name: payload.partner_name,
            });
          }
        } catch {
          // ignore
        }
      };

      ws.onopen = () => {
        if (pingInterval) clearInterval(pingInterval);
        pingInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 20000);
      };

      ws.onclose = () => {
        if (pingInterval) clearInterval(pingInterval);
        if (!isClosed) {
          reconnectTimer = setTimeout(connect, 4000);
        }
      };

      ws.onerror = (e) => {
        // Fallback polling is already running, notify handler
        onError?.(e);
      };
    } catch (e) {
      onError?.(e);
      if (!isClosed) reconnectTimer = setTimeout(connect, 5000);
    }
  }

  connect();

  return () => {
    isClosed = true;
    if (pingInterval) clearInterval(pingInterval);
    if (pollInterval) clearInterval(pollInterval);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
    }
  };
}
