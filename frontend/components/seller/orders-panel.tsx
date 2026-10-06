"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { listSellerOrders, updateSellerOrder } from "@/lib/api/seller";
import { getErrorMessage } from "@/lib/api/client";
import type { Order } from "@/lib/api/orders";
import { useTranslation } from "@/context/i18n-context";
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  Flame,
  MapPin,
  Check,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  NEW: { bg: "#fef3c7", color: "#92400e", label: "New Order" },
  ACCEPTED: { bg: "#dbeafe", color: "#1e40af", label: "Accepted" },
  PACKING: { bg: "#ede9fe", color: "#6d28d9", label: "Packing" },
  READY: { bg: "#d1fae5", color: "#065f46", label: "Ready to Deliver" },
  READY_FOR_PICKUP: { bg: "#d1fae5", color: "#065f46", label: "Ready to Deliver" },
  OUT_FOR_DELIVERY: { bg: "#cffafe", color: "#0e7490", label: "Out for Delivery" },
  DELIVERED: { bg: "#dcfce7", color: "#15803d", label: "Delivered" },
  REJECTED: { bg: "#fee2e2", color: "#991b1b", label: "Rejected" },
  CANCELLED: { bg: "#f3f4f6", color: "#6b7280", label: "Cancelled" },
};

function OrderCard({ order }: { order: Order }) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [checkedItems, setCheckedItems] = useState<number[]>([]);

  const update = useMutation({
    mutationFn: (s: "ACCEPTED" | "PACKING" | "READY" | "REJECTED") =>
      updateSellerOrder(order.id, s),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["seller-orders"] });
      client.invalidateQueries({ queryKey: ["seller-dashboard-summary"] });
      client.invalidateQueries({ queryKey: ["delivery-tasks"] });
      client.invalidateQueries({ queryKey: ["delivery-batches"] });
    },
  });

  const toggleItemCheck = (itemId: number) => {
    if (checkedItems.includes(itemId)) {
      setCheckedItems(checkedItems.filter((id) => id !== itemId));
    } else {
      setCheckedItems([...checkedItems, itemId]);
    }
  };

  const statusStyle = STATUS_CONFIG[order.status] ?? {
    bg: "#f3f4f6",
    color: "#374151",
    label: order.status,
  };

  const isPackingOrAccepted = order.status === "ACCEPTED" || order.status === "PACKING";
  const items = order.items || [];

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "14px",
        border: order.is_urgent ? "2px solid #f87171" : "1px solid #e5e7eb",
        padding: "18px 20px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        transition: "all 0.2s ease",
      }}
    >
      {/* Top Header: Order Number, Urgent, Placed Time, Status */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
          marginBottom: "12px",
          borderBottom: "1px solid #f3f4f6",
          paddingBottom: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "15px", fontWeight: 800, color: "#111827" }}>
            #{order.display_number ? `${order.display_number} (${order.order_number})` : order.order_number}
          </span>
          {order.is_urgent && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 8px",
                borderRadius: "999px",
                background: "#fee2e2",
                color: "#dc2626",
                fontSize: "11px",
                fontWeight: 800,
              }}
            >
              <Flame size={12} /> {t("seller.urgentOrder", "URGENT")}
            </span>
          )}
          <span style={{ fontSize: "12px", color: "#6b7280" }}>
            {new Date(order.placed_at || order.created_at).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "999px",
              fontSize: "11.5px",
              fontWeight: 800,
              background: statusStyle.bg,
              color: statusStyle.color,
            }}
          >
            {statusStyle.label}
          </span>
          <span style={{ fontSize: "15px", fontWeight: 800, color: "#111827" }}>
            ₹{Number(order.total_amount).toFixed(0)}
          </span>
        </div>
      </div>

      {/* Customer Info & Area */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#1f2937" }}>
            👤 {order.customer_name || "Customer"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#4b5563", fontSize: "12.5px" }}>
          <MapPin size={14} color="#16a34a" />
          <span>{order.delivery_area || "Local Area"}</span>
        </div>
        <span style={{ fontSize: "12px", color: "#6b7280" }}>
          Payment: <b>{order.payment_method === "COD" ? "Cash On Delivery" : "Online Prepaid"}</b>
        </span>
      </div>

      {/* Items Breakdown / Packing Checklist */}
      <div
        style={{
          background: "#f9fafb",
          borderRadius: "10px",
          padding: "12px 14px",
          marginBottom: "16px",
          border: "1px solid #f3f4f6",
        }}
      >
        <p style={{ margin: "0 0 8px", fontSize: "11.5px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>
          {isPackingOrAccepted
            ? "Packing Checklist (tap item once packed in bag):"
            : "Ordered Items:"}
        </p>

        {items.length === 0 ? (
          <p style={{ margin: 0, fontSize: "13px", color: "#4b5563" }}>
            {order.items_count || 1} produce items (₹{Number(order.total_amount).toFixed(0)})
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {items.map((item) => {
              const isChecked = checkedItems.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => isPackingOrAccepted && toggleItemCheck(item.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    background: isChecked ? "#dcfce7" : "transparent",
                    cursor: isPackingOrAccepted ? "pointer" : "default",
                    userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {isPackingOrAccepted && (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ width: "16px", height: "16px", accentColor: "#16a34a" }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: isChecked ? "#166534" : "#111827",
                        textDecoration: isChecked ? "line-through" : "none",
                      }}
                    >
                      🥬 {item.product_name}
                    </span>
                  </div>

                  <span style={{ fontSize: "12.5px", fontWeight: 700, color: isChecked ? "#166534" : "#4b5563" }}>
                    {item.quantity} {item.unit}
                    {item.subtotal ? ` · ₹${Number(item.subtotal).toFixed(0)}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" }}>
        {order.status === "NEW" && (
          <>
            <button
              onClick={() => update.mutate("REJECTED")}
              disabled={update.isPending}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                background: "#fee2e2",
                color: "#991b1b",
                border: "none",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Reject
            </button>
            <button
              onClick={() => update.mutate("ACCEPTED")}
              disabled={update.isPending}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                background: "#1a3d2b",
                color: "#ffffff",
                border: "none",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {update.isPending ? "Accepting..." : "Accept Order ✓"}
            </button>
          </>
        )}

        {order.status === "ACCEPTED" && (
          <button
            onClick={() => update.mutate("PACKING")}
            disabled={update.isPending}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Start Packing 📦
          </button>
        )}

        {order.status === "PACKING" && (
          <button
            onClick={() => update.mutate("READY")}
            disabled={update.isPending}
            style={{
              padding: "9px 22px",
              borderRadius: "8px",
              background: "#16a34a",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(22, 163, 74, 0.3)",
            }}
          >
            {update.isPending ? "Marking Ready..." : "Mark Order Ready ✓"}
          </button>
        )}

        {(order.status === "READY" || order.status === "READY_FOR_PICKUP") && (
          <Link
            href="/seller/deliveries"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 18px",
              borderRadius: "8px",
              background: "#1a3d2b",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            <Truck size={15} /> Add to Delivery Route 🚴
          </Link>
        )}

        {order.status === "OUT_FOR_DELIVERY" && (
          <Link
            href="/seller/deliveries"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 18px",
              borderRadius: "8px",
              background: "#0e7490",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            <Truck size={15} /> View Live Route 🚴
          </Link>
        )}

        {order.status === "DELIVERED" && (
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#15803d" }}>
            Delivered Successfully ✓
          </span>
        )}
      </div>

      {update.isError && (
        <p style={{ margin: "8px 0 0", color: "#dc2626", fontSize: "12px", textAlign: "right" }}>
          {getErrorMessage(update.error)}
        </p>
      )}
    </div>
  );
}

export function OrdersPanel() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const orders = useQuery({
    queryKey: ["seller-orders", statusFilter],
    queryFn: () => listSellerOrders(statusFilter === "ALL" ? undefined : statusFilter),
    refetchInterval: 6000,
  });

  const rawItems = orders.data?.items ?? [];
  const items = rawItems.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(s) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(s)) ||
      (o.delivery_area && o.delivery_area.toLowerCase().includes(s))
    );
  });

  return (
    <div style={{ paddingBottom: "60px" }}>
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 800, color: "#111827" }}>
          {t("seller.orders", "Orders & Packing Pipeline")}
        </h1>
        <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
          Review incoming orders, pack produce using item checklists, and queue for delivery dispatch.
        </p>
      </div>

      {/* Filters & Search */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "18px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 14px",
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            flex: 1,
            maxWidth: "320px",
          }}
        >
          <Search size={15} color="#9ca3af" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, customer, area..."
            style={{
              border: "none",
              outline: "none",
              fontSize: "13px",
              color: "#374151",
              background: "transparent",
              width: "100%",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[
            { key: "ALL", label: "All" },
            { key: "NEW", label: "New" },
            { key: "ACCEPTED", label: "Accepted" },
            { key: "PACKING", label: "Packing" },
            { key: "READY", label: "Ready to Deliver" },
            { key: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
            { key: "DELIVERED", label: "Delivered" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
                background: statusFilter === f.key ? "#1a3d2b" : "#ffffff",
                color: statusFilter === f.key ? "#ffffff" : "#4b5563",
                border: statusFilter === f.key ? "none" : "1px solid #e5e7eb",
                transition: "all 0.15s",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {orders.isLoading ? (
        <div style={{ padding: "48px", textAlign: "center", color: "#9ca3af" }}>
          Loading orders...
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "64px 20px",
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📋</div>
          <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 800, color: "#111827" }}>
            No Orders Found
          </h3>
          <p style={{ margin: 0, fontSize: "13.5px", color: "#6b7280" }}>
            {statusFilter === "ALL"
              ? "New customer orders will appear here in real-time."
              : `No orders currently in ${statusFilter.replace(/_/g, " ").toLowerCase()} status.`}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {items.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
