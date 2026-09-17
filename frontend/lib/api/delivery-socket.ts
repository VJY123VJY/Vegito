/**
 * delivery-socket.ts — Real-time WebSocket connection manager for the Delivery Dashboard.
 *
 * Subscribes to /ws/delivery-dashboard to receive live ORDER_PACKED notifications,
 * pickup OTPs, and recovery state on reconnect without requiring manual page refresh.
 */

export type DeliveryPackedPayload = {
  type?: string;
  event?: string;
  event_id?: string;
  order_id: number;
  order_number: string;
  status: string;
  otp: string;
  pickup_code?: string;
  message?: string;
  shop_name?: string;
  delivery_partner_id?: number | null;
  delivery_task_id?: number | null;
  total_amount?: number;
};

export type DeliverySocketCallbacks = {
  onOrderPacked: (notification: DeliveryPackedPayload) => void;
  onPendingOrders?: (orders: DeliveryPackedPayload[]) => void;
  onStatusChange?: (status: "connected" | "disconnected" | "connecting") => void;
  onError?: (err: any) => void;
};

export function subscribeToDeliveryDashboard(
  token: string,
  callbacks: DeliverySocketCallbacks
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const rawBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
  const wsBase = rawBase.replace(/^http/, "ws").replace(/\/api\/v1\/?$/, "");
  const wsUrl = `${wsBase}/ws/delivery-dashboard?token=${encodeURIComponent(token)}`;

  let ws: WebSocket | null = null;
  let isClosed = false;
  let reconnectTimer: any = null;
  let pingInterval: any = null;

  function connect() {
    if (isClosed) return;
    try {
      callbacks.onStatusChange?.("connecting");
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        callbacks.onStatusChange?.("connected");
        // Start 20s keepalive ping
        if (pingInterval) clearInterval(pingInterval);
        pingInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 20000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "connection_ack") {
            if (Array.isArray(data.pending_ready_orders) && data.pending_ready_orders.length > 0) {
              callbacks.onPendingOrders?.(data.pending_ready_orders as DeliveryPackedPayload[]);
            }
          } else if (
            data.type === "ORDER_PACKED" ||
            data.type === "DELIVERY_ASSIGNED" ||
            data.event === "DELIVERY_ASSIGNED"
          ) {
            callbacks.onOrderPacked(data as DeliveryPackedPayload);
          }
        } catch {
          // Ignore unparseable frames
        }
      };

      ws.onclose = () => {
        callbacks.onStatusChange?.("disconnected");
        if (pingInterval) clearInterval(pingInterval);
        if (!isClosed) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      ws.onerror = (e) => {
        callbacks.onError?.(e);
      };
    } catch (e) {
      callbacks.onError?.(e);
      if (!isClosed) {
        reconnectTimer = setTimeout(connect, 4000);
      }
    }
  }

  connect();

  return () => {
    isClosed = true;
    if (pingInterval) clearInterval(pingInterval);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) {
      ws.onclose = null;
      ws.onerror = null;
      ws.close();
      ws = null;
    }
  };
}
