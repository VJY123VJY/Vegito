/**
 * seller-socket.ts — Real-time WebSocket connection manager for the Seller Dashboard.
 *
 * Subscribes to /ws/seller-dashboard to receive live NEW_ORDEE notifications,
 * order items summaries, and recovery state on reconnect without requiring manual page refresh.
 */

export type SellerNewOrderPayload = {
  type: "NEW_ORDER";
  event?: string;
  event_id?: string;
  order_id: number;
  order_number: string;
  status: string;
  customer_name: string;
  items: Array<{ name: string; quantity: number; unit?: string }>;
  total_amount: number;
  delivery_area: string;
  created_at?: string;
  message?: string;
};

export type SellerSocketCallbacks = {
  onNewOrder: (notification: SellerNewOrderPayload) => void;
  onPendingOrders?: (orders: SellerNewOrderPayload[]) => void;
  onStatusChange?: (status: "connected" | "disconnected" | "connecting") => void;
  onError?: (err: any) => void;
};

export function subscribeToSellerDashboard(
  token: string,
  callbacks: SellerSocketCallbacks
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  // Use the platform-aware URL (LAN IP on Android, web URL on browser)
  const { getApiBaseUrl } = require("./client");
  const rawBase = getApiBaseUrl() as string;
  const wsBase = rawBase.replace(/^http/, "ws").replace(/\/api\/v1\/?$/, "");
  const wsUrl = `${wsBase}/ws/seller-dashboard?token=${encodeURIComponent(token)}`;

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
            if (Array.isArray(data.pending_new_orders) && data.pending_new_orders.length > 0) {
              callbacks.onPendingOrders?.(data.pending_new_orders as SellerNewOrderPayload[]);
            }
          } else if (data.type === "NEW_ORDER") {
            callbacks.onNewOrder(data as SellerNewOrderPayload);
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
