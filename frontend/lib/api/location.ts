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
