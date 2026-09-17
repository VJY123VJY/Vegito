import { api, type ApiEnvelope } from "./client";

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
  const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1")
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
  orderId: number,
  token: string,
  onCoords?: (coords: { lat: number; lng: number; accuracy?: number }) => void,
  onError?: (err: any) => void,
): () => void {
  if (typeof window === "undefined" || !navigator.geolocation) {
    onError?.({ message: "Geolocation API not supported by this browser" });
    return () => {};
  }

  const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1")
    .replace(/^http/, "ws")
    .replace(/\/api\/v1$/, ""); // ws://host:port

  const wsUrl = `${apiBase}/ws/delivery/${orderId}?token=${encodeURIComponent(token)}`;

  let ws: WebSocket | null = null;
  let isStopped = false;
  let lastSentTime = 0;
  let lastLat: number | null = null;
  let lastLng: number | null = null;
  let watchId: number | null = null;
  let reconnectTimer: any = null;

  function connectWs() {
    if (isStopped) return;
    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        // Send keepalive ping
      };

      ws.onclose = () => {
        if (!isStopped) {
          reconnectTimer = setTimeout(connectWs, 3000);
        }
      };

      ws.onerror = (e) => {
        onError?.(e);
      };
    } catch (e) {
      onError?.(e);
      if (!isStopped) reconnectTimer = setTimeout(connectWs, 4000);
    }
  }

  connectWs();

  // Watch position with high accuracy
  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, accuracy, heading, speed } = position.coords;
      onCoords?.({ lat: latitude, lng: longitude, accuracy });

      const now = Date.now();
      const timeElapsed = now - lastSentTime;

      // Distance check
      let movedSignificantly = false;
      if (lastLat !== null && lastLng !== null) {
        const dLat = Math.abs(latitude - lastLat);
        const dLng = Math.abs(longitude - lastLng);
        // ~10-15 meters approx
        movedSignificantly = dLat > 0.0001 || dLng > 0.0001;
      } else {
        movedSignificantly = true;
      }

      // Throttle: Send if >= 3.5s elapsed or moved significantly after 2s
      if (timeElapsed >= 3500 || (movedSignificantly && timeElapsed >= 2000)) {
        lastSentTime = now;
        lastLat = latitude;
        lastLng = longitude;

        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              order_id: orderId,
              latitude,
              longitude,
              accuracy: accuracy ?? null,
              heading: heading ?? null,
              speed: speed ? speed * 3.6 : null, // convert m/s to km/h
            }),
          );
        }
      }
    },
    (err) => {
      console.warn("GPS watchPosition error:", err);
      onError?.(err);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    },
  );

  return () => {
    isStopped = true;
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
    }
  };
}

/**
 * Customer live delivery tracker via WebSocket /ws/customer/{orderId}.
 * Receives live coordinate updates broadcasted by backend.
 */
export function subscribeToOrderTracking(
  orderId: number,
  token: string,
  onLocation: (data: { latitude: number; longitude: number; status?: string; partner_name?: string }) => void,
  onError?: (err: any) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1")
    .replace(/^http/, "ws")
    .replace(/\/api\/v1$/, "");

  const wsUrl = `${apiBase}/ws/customer/${orderId}?token=${encodeURIComponent(token)}`;

  let ws: WebSocket | null = null;
  let isClosed = false;
  let reconnectTimer: any = null;
  let pingInterval: any = null;

  function connect() {
    if (isClosed) return;
    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.latitude !== undefined && payload.longitude !== undefined) {
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
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      ws.onerror = (e) => {
        onError?.(e);
      };
    } catch (e) {
      onError?.(e);
      if (!isClosed) reconnectTimer = setTimeout(connect, 4000);
    }
  }

  connect();

  return () => {
    isClosed = true;
    if (pingInterval) clearInterval(pingInterval);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
    }
  };
}
