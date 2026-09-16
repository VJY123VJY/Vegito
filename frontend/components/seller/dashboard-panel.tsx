"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { listSellerOrders, updateSellerOrder } from "@/lib/api/seller";
import { listInventory } from "@/lib/api/inventory";
import { listDeliveryTasks } from "@/lib/api/delivery";
import { StatCard } from "@/components/layout/dashboard-header";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/api/client";
import {
  ShoppingCart,
  Clock,
  DollarSign,
  Truck,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ChevronRight,
  Package,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useMemo } from "react";
import type { Order } from "@/lib/api/orders";

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  NEW:             { bg: "#fef3c7", color: "#92400e", label: "New" },
  ACCEPTED:        { bg: "#dbeafe", color: "#1e40af", label: "Accepted" },
  PACKING:         { bg: "#ede9fe", color: "#6d28d9", label: "Packing" },
  READY:           { bg: "#d1fae5", color: "#065f46", label: "Ready" },
  OUT_FOR_DELIVERY:{ bg: "#cffafe", color: "#0e7490", label: "Out for Delivery" },
  DELIVERED:       { bg: "#dcfce7", color: "#15803d", label: "Delivered" },
  REJECTED:        { bg: "#fee2e2", color: "#991b1b", label: "Rejected" },
  CANCELLED:       { bg: "#f3f4f6", color: "#6b7280", label: "Cancelled" },
};

function Badge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? { bg: "#f3f4f6", color: "#6b7280", label: status };
  return (
    <span style={{ padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "700", background: c.bg, color: c.color, whiteSpace: "nowrap" }}>
      {c.label}
    </span>
  );
}

function OrderActionBtn({ order }: { order: Order }) {
  const client = useQueryClient();
  const update = useMutation({
    mutationFn: (s: "ACCEPTED" | "PACKING" | "READY" | "REJECTED") => updateSellerOrder(order.id, s),
    onSuccess: () => client.invalidateQueries({ queryKey: ["seller-orders"] }),
  });
  if (order.status === "NEW") return (
    <div style={{ display: "flex", gap: "6px" }}>
      <button onClick={() => update.mutate("ACCEPTED")} disabled={update.isPending}
        style={{ padding: "5px 12px", background: "#1a3d2b", color: "#fff", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
        Accept
      </button>
      <button onClick={() => update.mutate("REJECTED")} disabled={update.isPending}
        style={{ padding: "5px 12px", background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
        Reject
      </button>
    </div>
  );
  if (order.status === "ACCEPTED") return (
    <button onClick={() => update.mutate("PACKING")} disabled={update.isPending}
      style={{ padding: "5px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
      Start Packing
    </button>
  );
  if (order.status === "PACKING") return (
    <button onClick={() => update.mutate("READY")} disabled={update.isPending}
      style={{ padding: "5px 12px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
      Mark Ready ✓
    </button>
  );
  return null;
}

// Derive chart data from orders (group by day)
function buildChartData(orders: Order[]) {
  const dayMap: Record<string, number> = {};
  orders.forEach((o) => {
    const day = new Date(o.placed_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    dayMap[day] = (dayMap[day] ?? 0) + Number(o.total_amount ?? 0);
  });
  return Object.entries(dayMap)
    .slice(-7)
    .map(([day, revenue]) => ({ day, revenue: Math.round(revenue) }));
}

export function DashboardPanel({ userName }: { userName: string }) {
  const orders = useQuery({ queryKey: ["seller-orders"], queryFn: () => listSellerOrders() });
  const inventory = useQuery({ queryKey: ["inventory"], queryFn: () => listInventory() });
  const tasks = useQuery({ queryKey: ["delivery-tasks"], queryFn: () => listDeliveryTasks(), refetchInterval: 15000 });

  const orderList = orders.data?.items ?? [];
  const taskList = tasks.data ?? [];
  const invItems = inventory.data?.items ?? [];

  const totalRevenue = orderList
    .filter((o) => o.status === "DELIVERED" || o.status === "OUT_FOR_DELIVERY")
    .reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);
  const pendingOrders = orderList.filter((o) => ["NEW", "ACCEPTED", "PACKING"].includes(o.status)).length;
  const todayDeliveries = taskList.length;
  const completedDeliveries = taskList.filter((t) => t.status === "DELIVERED").length;
  const earnings = completedDeliveries * 35; // ₹35 per delivery placeholder
  const lowStockItems = invItems.filter((i) => i.quantity <= i.low_stock_threshold);

  const chartData = useMemo(() => buildChartData(orderList), [orderList]);

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: "800", color: "#111827" }}>
          Welcome, {userName}! 👋
        </h1>
        <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>
          Manage your Vegito store and deliveries
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "flex", gap: "14px", marginBottom: "24px", flexWrap: "wrap" }}>
        <StatCard label="Today's Orders" value={orderList.filter((o) => isToday(o.placed_at)).length} icon={<ShoppingCart size={19} />} iconBg="#dbeafe" iconColor="#2563eb" />
        <StatCard label="Pending" value={pendingOrders} icon={<Clock size={19} />} iconBg="#fef3c7" iconColor="#d97706" />
        <StatCard label="Revenue" value={`₹${totalRevenue.toFixed(0)}`} icon={<DollarSign size={19} />} iconBg="#dcfce7" iconColor="#16a34a" />
        <StatCard label="Deliveries" value={todayDeliveries} icon={<Truck size={19} />} iconBg="#ede9fe" iconColor="#7c3aed" />
        <StatCard label="Completed" value={completedDeliveries} icon={<CheckCircle2 size={19} />} iconBg="#d1fae5" iconColor="#059669" />
        <StatCard label="Earnings" value={`₹${earnings}`} icon={<TrendingUp size={19} />} iconBg="#fef3c7" iconColor="#d97706" />
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", alignItems: "start" }}>
        {/* Left */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Sales Chart */}
          <div style={{ background: "#fff", borderRadius: "16px", padding: "20px 24px", border: "1px solid #f0f1f3", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#111827" }}>Sales Overview</h3>
              <span style={{ fontSize: "12px", color: "#6b7280" }}>Last 7 days</span>
            </div>
            {chartData.length === 0 ? (
              <div style={{ height: "140px", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "14px" }}>
                No sales data yet. Start accepting orders!
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
                  <Tooltip formatter={(v: any) => [`₹${v}`, "Revenue"]} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                  <Line type="monotone" dataKey="revenue" stroke="#1a6b3a" strokeWidth={2.5} dot={{ r: 4, fill: "#1a6b3a" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recent Orders */}
          <div style={{ background: "#fff", borderRadius: "16px", padding: "20px 24px", border: "1px solid #f0f1f3", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#111827" }}>Recent Orders</h3>
              <Link href="/seller/orders" style={{ fontSize: "13px", color: "#1a6b3a", fontWeight: "600", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
                View All <ChevronRight size={14} />
              </Link>
            </div>
            {orders.isLoading ? <Skeleton rows={4} /> : orderList.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: "14px", textAlign: "center", padding: "20px 0" }}>No orders yet. Products need to be listed first.</p>
            ) : orderList.slice(0, 5).map((order, i) => (
              <div key={order.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 0", borderBottom: i < 4 ? "1px solid #f3f4f6" : "none" }}>
                <div style={{ width: "36px", height: "36px", background: "#f0fdf4", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", flexShrink: 0 }}>🥦</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: "600", color: "#111827" }}>Order {order.order_number}</p>
                  <p style={{ margin: 0, fontSize: "11px", color: "#9ca3af" }}>₹{Number(order.total_amount).toFixed(0)} · {fmtDate(order.placed_at)}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "5px" }}>
                  <Badge status={order.status} />
                  <OrderActionBtn order={order} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Low Stock Alert */}
          {lowStockItems.length > 0 && (
            <div style={{ background: "#fff", borderRadius: "16px", padding: "18px 22px", border: "1.5px solid #fde68a", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <AlertTriangle size={17} color="#d97706" />
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#92400e" }}>Low Stock Alert</h3>
                <span style={{ marginLeft: "auto", padding: "2px 8px", background: "#fef3c7", borderRadius: "999px", fontSize: "11px", fontWeight: "700", color: "#92400e" }}>{lowStockItems.length}</span>
              </div>
              {lowStockItems.slice(0, 4).map((item, i) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < Math.min(3, lowStockItems.length - 1) ? "1px solid #fef3c7" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Package size={14} color="#92400e" />
                    <span style={{ fontSize: "13px", color: "#374151" }}>{item.product_name ?? `Product #${item.seller_product_id}`}</span>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#dc2626" }}>{item.quantity} left</span>
                </div>
              ))}
              <Link href="/seller/inventory" style={{ display: "block", marginTop: "10px", fontSize: "12px", color: "#d97706", fontWeight: "600", textDecoration: "none" }}>
                Manage Inventory →
              </Link>
            </div>
          )}

          {/* Active Delivery */}
          {taskList.some((t) => t.status === "STARTED") && (
            <div style={{ background: "linear-gradient(135deg, #1a3d2b, #2d6a45)", borderRadius: "16px", padding: "20px", color: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "14px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#6fcf3a", animation: "blink 1s infinite" }} />
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#6fcf3a", letterSpacing: "0.5px" }}>ACTIVE DELIVERY</span>
              </div>
              {taskList.filter((t) => t.status === "STARTED").slice(0, 1).map((task) => (
                <div key={task.id}>
                  <p style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: "700" }}>{task.customer_name ?? "Customer"}</p>
                  <p style={{ margin: "0 0 12px", fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
                    {task.delivery_address?.city ?? "Solapur"}
                  </p>
                  <Link href="/seller/deliveries/active" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "#6fcf3a", color: "#1a3d2b", borderRadius: "8px", fontSize: "12px", fontWeight: "700", textDecoration: "none" }}>
                    <Truck size={14} /> Open Active Delivery
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Quick Links */}
          <div style={{ background: "#fff", borderRadius: "16px", padding: "18px 22px", border: "1px solid #f0f1f3" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "14px", fontWeight: "700", color: "#111827" }}>Quick Actions</h3>
            {[
              { label: "Add Product", href: "/seller/products", emoji: "➕", color: "#dbeafe" },
              { label: "View Orders", href: "/seller/orders", emoji: "📋", color: "#dcfce7" },
              { label: "Check Inventory", href: "/seller/inventory", emoji: "📦", color: "#fef3c7" },
              { label: "Start Delivery", href: "/seller/deliveries", emoji: "🚴", color: "#ede9fe" },
            ].map((item) => (
              <Link key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", textDecoration: "none", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ width: "34px", height: "34px", background: item.color, borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px" }}>
                  {item.emoji}
                </div>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>{item.label}</span>
                <ChevronRight size={14} color="#9ca3af" style={{ marginLeft: "auto" }} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Skeleton({ rows }: { rows: number }) {
  return <>{Array.from({ length: rows }).map((_, i) => <div key={i} style={{ height: "52px", background: "#f3f4f6", borderRadius: "8px", marginBottom: "8px", animation: "pulse 1.5s ease infinite" }} />)}</>;
}

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
