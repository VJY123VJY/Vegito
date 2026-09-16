"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listSellerOrders, updateSellerOrder } from "@/lib/api/seller";
import { getErrorMessage } from "@/lib/api/client";
import type { Order } from "@/lib/api/orders";
import { Search, Filter } from "lucide-react";

const ALL_STATUSES = ["ALL", "NEW", "ACCEPTED", "PACKING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REJECTED"];

const STATUS_CONFIG: Record<string, { bg: string; color: string }> = {
  NEW:              { bg: "#fef3c7", color: "#92400e" },
  ACCEPTED:         { bg: "#dbeafe", color: "#1e40af" },
  PACKING:          { bg: "#ede9fe", color: "#6d28d9" },
  READY:            { bg: "#d1fae5", color: "#065f46" },
  OUT_FOR_DELIVERY: { bg: "#cffafe", color: "#0e7490" },
  DELIVERED:        { bg: "#dcfce7", color: "#15803d" },
  REJECTED:         { bg: "#fee2e2", color: "#991b1b" },
  CANCELLED:        { bg: "#f3f4f6", color: "#6b7280" },
};

function Badge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "700", background: c.bg, color: c.color, whiteSpace: "nowrap" }}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function OrderRow({ order }: { order: Order }) {
  const client = useQueryClient();
  const update = useMutation({
    mutationFn: (s: "ACCEPTED" | "PACKING" | "READY" | "REJECTED") => updateSellerOrder(order.id, s),
    onSuccess: () => client.invalidateQueries({ queryKey: ["seller-orders"] }),
  });

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "auto 1fr auto auto auto",
      alignItems: "center",
      gap: "16px",
      padding: "14px 20px",
      borderBottom: "1px solid #f3f4f6",
      background: "#fff",
    }}>
      <div style={{ width: "36px", height: "36px", background: "#f0fdf4", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🥦</div>
      <div>
        <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: "700", color: "#111827" }}>
          {order.order_number}
        </p>
        <p style={{ margin: 0, fontSize: "11px", color: "#9ca3af" }}>
          {new Date(order.placed_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      <span style={{ fontSize: "14px", fontWeight: "700", color: "#111827" }}>₹{Number(order.total_amount).toFixed(0)}</span>
      <Badge status={order.status} />
      <div style={{ display: "flex", gap: "6px" }}>
        {order.status === "NEW" && (
          <>
            <button onClick={() => update.mutate("ACCEPTED")} disabled={update.isPending}
              style={{ padding: "6px 12px", background: "#1a3d2b", color: "#fff", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
              Accept
            </button>
            <button onClick={() => update.mutate("REJECTED")} disabled={update.isPending}
              style={{ padding: "6px 12px", background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
              Reject
            </button>
          </>
        )}
        {order.status === "ACCEPTED" && (
          <button onClick={() => update.mutate("PACKING")} disabled={update.isPending}
            style={{ padding: "6px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
            Start Packing
          </button>
        )}
        {order.status === "PACKING" && (
          <button onClick={() => update.mutate("READY")} disabled={update.isPending}
            style={{ padding: "6px 14px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
            Mark Ready ✓
          </button>
        )}
      </div>
    </div>
  );
}

export function OrdersPanel() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const orders = useQuery({
    queryKey: ["seller-orders", statusFilter],
    queryFn: () => listSellerOrders(statusFilter === "ALL" ? undefined : statusFilter),
    refetchInterval: 20000,
  });

  const items = (orders.data?.items ?? []).filter((o) =>
    !search || o.order_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: "800", color: "#111827" }}>Orders</h2>
        <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>Accept, pack, and manage customer orders</p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 14px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", flex: 1, maxWidth: "300px" }}>
          <Search size={15} color="#9ca3af" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order number..."
            style={{ border: "none", outline: "none", fontSize: "13px", color: "#374151", background: "transparent", width: "100%" }} />
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {["ALL", "NEW", "ACCEPTED", "PACKING", "READY", "DELIVERED"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{
                padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer",
                background: statusFilter === s ? "#1a3d2b" : "#fff",
                color: statusFilter === s ? "#fff" : "#374151",
                border: statusFilter === s ? "none" : "1px solid #e5e7eb",
              }}>
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Orders table */}
      <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #f0f1f3", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", gap: "16px", padding: "10px 20px", background: "#f9fafb", borderBottom: "1px solid #f0f1f3" }}>
          {["", "Order", "Amount", "Status", "Action"].map((h, i) => (
            <span key={i} style={{ fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</span>
          ))}
        </div>

        {orders.isLoading
          ? Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ height: "64px", background: "#f9fafb", margin: "2px 0", borderBottom: "1px solid #f3f4f6" }} />)
          : items.length === 0
            ? <div style={{ padding: "48px", textAlign: "center", color: "#9ca3af" }}>
                <p style={{ fontSize: "40px", marginBottom: "12px" }}>📋</p>
                <p style={{ fontSize: "14px" }}>No orders yet. Start adding products and customers will place orders.</p>
              </div>
            : items.map((order) => <OrderRow key={order.id} order={order} />)
        }
      </div>
    </div>
  );
}
