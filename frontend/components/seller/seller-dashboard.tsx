"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  ClipboardList,
  DollarSign,
  Clock,
  TrendingUp,
  AlertTriangle,
  ShoppingBag,
  CheckCircle,
  Plus,
  Sparkles,
  Bell,
  Volume2,
  Power,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { AddProductModal } from "./add-product-modal";
import { getSellerProfile, setSellerAvailability } from "@/lib/api/seller-products";
import { listSellerOrders, updateSellerOrder, getSellerRevenueAnalytics, getSellerProductAnalytics } from "@/lib/api/seller";
import { listInventory } from "@/lib/api/inventory";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { TopProducts } from "@/components/dashboard/top-products";
import { InventoryAlert } from "@/components/dashboard/inventory-alert";
import { getErrorMessage } from "@/lib/api/client";
import { getStoredToken } from "@/lib/api/auth";
import { subscribeToSellerDashboard, type SellerNewOrderPayload } from "@/lib/api/seller-socket";
import { playNotificationSoundOnce, isAudioMuted, resumeAudioContext, playNotificationSound } from "@/lib/audio/chime";

export function SellerDashboard() {
  const queryClient = useQueryClient();
  const [revenueRange, setRevenueRange] = useState("30d");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState<SellerNewOrderPayload | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const seenOrderIds = React.useRef(new Set<number>());

  // Seller profile (scoped to current seller)
  const profile = useQuery({
    queryKey: ["seller-profile"],
    queryFn: getSellerProfile,
  });

  const isOnline = profile.data?.is_available !== false;

  const toggleAvailabilityMutation = useMutation({
    mutationFn: (newAvailable: boolean) => setSellerAvailability(newAvailable),
    onSuccess: (data) => {
      queryClient.setQueryData(["seller-profile"], data);
      queryClient.invalidateQueries({ queryKey: ["seller-profile"] });
    },
  });

  React.useEffect(() => {
    const token = getStoredToken() || "";
    if (!token) return;

    const cleanup = subscribeToSellerDashboard(token, {
      onNewOrder: async (notification) => {
        if (seenOrderIds.current.has(notification.order_id)) return;
        seenOrderIds.current.add(notification.order_id);

        queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
        queryClient.invalidateQueries({ queryKey: ["seller-profile"] });
        setNewOrderAlert(notification);

        const played = await playNotificationSoundOnce(
          notification.event_id || `order-${notification.order_id}-NEW`
        );
        if (!played && !isAudioMuted()) {
          setAudioBlocked(true);
        } else {
          setAudioBlocked(false);
        }
      },
      onPendingOrders: () => {
        queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      },
    });

    return () => {
      cleanup();
    };
  }, [queryClient]);

  const handleEnableAudio = async () => {
    const resumed = await resumeAudioContext();
    if (resumed) {
      setAudioBlocked(false);
      await playNotificationSound();
    }
  };

  // Seller orders (scoped to current seller)
  const orders = useQuery({
    queryKey: ["seller-orders"],
    queryFn: () => listSellerOrders(),
  });

  // Seller inventory
  const inventory = useQuery({
    queryKey: ["seller-inventory"],
    queryFn: () => listInventory(),
  });

  // Seller revenue analytics (Recharts data)
  const revenueAnalytics = useQuery({
    queryKey: ["seller-revenue-analytics", revenueRange],
    queryFn: () => getSellerRevenueAnalytics(revenueRange),
  });

  // Seller top products
  const topProducts = useQuery({
    queryKey: ["seller-top-products"],
    queryFn: () => getSellerProductAnalytics(5),
  });

  // Status transition mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: "ACCEPTED" | "PACKING" | "READY" | "REJECTED" }) =>
      updateSellerOrder(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["seller-revenue-analytics"] });
    },
  });

  const businessName = profile.data?.business_name || "Farm Fresh Solapur";
  const orderItems = orders.data?.items ?? [];
  const totalOrders = (profile.data as any)?.total_orders ?? orderItems.length;
  const totalRevenue = orderItems
    .filter((o) => o.status !== "CANCELLED" && o.status !== "REJECTED")
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const totalSalesVal = totalRevenue;

  const inventoryItems = inventory.data?.items ?? [];
  const productsCount = inventoryItems.length;
  const pendingOrders = orderItems.filter((o) =>
    ["NEW", "ACCEPTED", "SELLER_ACCEPTED", "PACKING", "PREPARING"].includes(o.status)
  ).length;

  const acceptedCount = orderItems.filter((o) => ["ACCEPTED", "SELLER_ACCEPTED"].includes(o.status)).length;
  const packingCount = orderItems.filter((o) => ["PACKING", "PREPARING"].includes(o.status)).length;
  const readyCount = orderItems.filter((o) => ["READY", "READY_FOR_PICKUP", "PICKED_UP"].includes(o.status)).length;
  const deliveredCount = orderItems.filter((o) => ["DELIVERED", "COMPLETED"].includes(o.status)).length;

  const orderStatusData = [
    { name: "Accepted", value: acceptedCount, color: "#f97316" },
    { name: "Packing", value: packingCount, color: "#3b82f6" },
    { name: "Ready", value: readyCount, color: "#10b981" },
    { name: "Delivered", value: deliveredCount, color: "#8b5cf6" },
  ];

  const lowStockAlerts = inventoryItems
    .filter((inv) => Number(inv.quantity) <= Number(inv.low_stock_threshold))
    .map((inv) => ({
      inventory_id: inv.id,
      seller_product_id: inv.seller_product_id,
      product_name: inv.product_name || "Vegetable",
      unit: inv.product_unit || "kg",
      quantity: Number(inv.quantity),
      low_stock_threshold: Number(inv.low_stock_threshold),
    }));

  return (
    <DashboardShell
      role="seller"
      userName={businessName}
      userRole="Verified Seller"
      greeting={`Welcome back, ${businessName}`}
      subtitle="Manage your fresh vegetable catalog, orders, and daily harvest"
      searchPlaceholder="Search products, orders..."
    >
      {/* Top Quick Actions Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#9a3412" }}>
            Store Overview & Operations
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#62746a" }}>
            Monitor real-time vegetable sales, fulfillments, and stock levels
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "#c2410c",
            color: "#ffffff",
            padding: "10px 20px",
            borderRadius: "12px",
            border: "none",
            fontSize: "13.5px",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(194, 65, 12, 0.25)",
            transition: "background 0.2s",
          }}
        >
          <Plus size={18} /> Add Vegetable Product
        </button>
      </div>

      {/* Seller Availability Control Card */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          border: isOnline ? "1.5px solid #bbf7d0" : "1.5px solid #fecaca",
          padding: "16px 20px",
          marginBottom: "20px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              backgroundColor: isOnline ? "#16a34a" : "#dc2626",
              boxShadow: isOnline ? "0 0 0 4px rgba(22, 163, 74, 0.2)" : "0 0 0 4px rgba(220, 38, 38, 0.2)",
            }}
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#62746a" }}>
                Seller Availability
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  padding: "2px 10px",
                  borderRadius: "999px",
                  backgroundColor: isOnline ? "#f0fdf4" : "#fef2f2",
                  color: isOnline ? "#15803d" : "#b91c1c",
                  border: isOnline ? "1px solid #bbf7d0" : "1px solid #fecaca",
                }}
              >
                {isOnline ? "🟢 ONLINE" : "🔴 OFFLINE"}
              </span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#475569" }}>
              {isOnline
                ? "Your shop is open and accepting new customer orders in Solapur (within 15 KM)."
                : "Your shop is offline. Customers cannot place new orders and will see you are unavailable."}
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={toggleAvailabilityMutation.isPending}
          onClick={() => toggleAvailabilityMutation.mutate(!isOnline)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "12px",
            fontSize: "13.5px",
            fontWeight: 800,
            cursor: "pointer",
            border: isOnline ? "1px solid #fca5a5" : "none",
            backgroundColor: isOnline ? "#fff1f2" : "#15803d",
            color: isOnline ? "#b91c1c" : "#ffffff",
            boxShadow: isOnline ? "none" : "0 2px 8px rgba(21, 128, 61, 0.25)",
            transition: "all 0.2s",
          }}
        >
          <Power size={16} />
          {toggleAvailabilityMutation.isPending
            ? "Updating..."
            : isOnline
            ? "🔴 Switch to OFFLINE"
            : "🟢 Switch to ONLINE"}
        </button>
      </div>

      {/* New Order Realtime Notification Banner (~3s chime played) */}
      {newOrderAlert && (
        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "2px solid #22c55e",
            borderRadius: "16px",
            padding: "16px 20px",
            marginBottom: "20px",
            boxShadow: "0 4px 12px rgba(34, 197, 94, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Bell size={24} color="#15803d" />
            <div>
              <strong style={{ fontSize: "15px", color: "#14532d" }}>
                🔔 New Order Received! #{newOrderAlert.order_number}
              </strong>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#166534" }}>
                Customer: <b>{newOrderAlert.customer_name}</b> • Total: ₹{Number(newOrderAlert.total_amount).toFixed(2)} • Area: {newOrderAlert.delivery_area}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => setNewOrderAlert(null)}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #86efac",
                color: "#15803d",
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {audioBlocked && (
        <div
          style={{
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "12px",
            padding: "10px 16px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <span style={{ fontSize: "13px", color: "#92400e" }}>
            🔊 Browser blocked order alert ringtone. Click below to enable audio.
          </span>
          <button
            onClick={handleEnableAudio}
            style={{
              backgroundColor: "#d97706",
              color: "#ffffff",
              border: "none",
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Enable Audio Chime
          </button>
        </div>
      )}

      {/* KPI Cards (Matching Seller Dashboard Mockup Screen 2) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <StatCard
          label="Total Orders"
          value={totalOrders}
          icon={<ClipboardList size={22} />}
          iconBg="#ffedd5"
          iconColor="#c2410c"
        />
        <StatCard
          label="Total Sales"
          value={`₹${totalSalesVal.toLocaleString("en-IN")}`}
          icon={<DollarSign size={22} />}
          iconBg="#fef3c7"
          iconColor="#d97706"
        />
        <StatCard
          label="Products"
          value={productsCount}
          icon={<Package size={22} />}
          iconBg="#ecfdf5"
          iconColor="#059669"
        />
        <StatCard
          label="Pending Orders"
          value={pendingOrders}
          icon={<Clock size={22} />}
          iconBg="#fee2e2"
          iconColor="#dc2626"
        />
      </div>

      {/* Inventory Alert Banner */}
      {lowStockAlerts.length > 0 && <InventoryAlert alerts={lowStockAlerts} />}

      {/* Main Grid: Revenue Overview + Recent Orders & Top Products */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: "24px",
          alignItems: "start",
          marginBottom: "28px",
        }}
        className="seller-dashboard-grid"
      >
        {/* Left: Recharts Sales Overview */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <RevenueChart
            data={revenueAnalytics.data ?? []}
            title="Sales & Revenue Overview"
            subtitle="Real-time revenue performance from your vegetable orders"
            selectedRange={revenueRange}
            onRangeChange={(r) => setRevenueRange(r)}
            isLoading={revenueAnalytics.isLoading}
          />

          {/* Orders Management Table */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e1e8e2",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
                  Active Orders Fulfillment
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
                  Accept, pack, and mark vegetables READY for delivery pickup
                </p>
              </div>
            </div>

            {orders.isLoading ? (
              <p style={{ fontSize: "13px", color: "#62746a" }}>Loading orders...</p>
            ) : orderItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 16px", color: "#62746a" }}>
                <ShoppingBag size={36} color="#16835b" style={{ margin: "0 auto 8px" }} />
                <p style={{ margin: 0, fontWeight: 700 }}>No orders received yet</p>
                <p style={{ margin: "4px 0 0", fontSize: "12px" }}>
                  Customer vegetable orders will appear here for fulfillment.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {orderItems.slice(0, 6).map((order) => (
                  <div
                    key={order.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "14px 16px",
                      borderRadius: "12px",
                      backgroundColor: "#fafcf9",
                      border: "1px solid #edf2ee",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontWeight: 800, color: "#063c32", fontSize: "14px" }}>
                          #{order.order_number}
                        </span>
                        <StatusBadge status={order.status} />
                      </div>
                      <p style={{ margin: 0, fontSize: "12px", color: "#62746a" }}>
                        Placed: {new Date(order.placed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Total: <b>₹{Number(order.total_amount).toFixed(0)}</b>
                      </p>
                    </div>

                    {/* Status Action Buttons */}
                    <div style={{ display: "flex", gap: "8px" }}>
                      {order.status === "NEW" && (
                        <>
                          <button
                            onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "ACCEPTED" })}
                            disabled={updateStatusMutation.isPending}
                            style={{
                              padding: "6px 14px",
                              borderRadius: "8px",
                              backgroundColor: "#063c32",
                              color: "#ffffff",
                              fontSize: "12px",
                              fontWeight: 700,
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            Accept Order
                          </button>
                          <button
                            onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "REJECTED" })}
                            disabled={updateStatusMutation.isPending}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "8px",
                              backgroundColor: "#fee2e2",
                              color: "#dc2626",
                              fontSize: "12px",
                              fontWeight: 700,
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {order.status === "ACCEPTED" && (
                        <button
                          onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "PACKING" })}
                          disabled={updateStatusMutation.isPending}
                          style={{
                            padding: "6px 14px",
                            borderRadius: "8px",
                            backgroundColor: "#16835b",
                            color: "#ffffff",
                            fontSize: "12px",
                            fontWeight: 700,
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          Start Packing
                        </button>
                      )}

                      {order.status === "PACKING" && (
                        <button
                          onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "READY" })}
                          disabled={updateStatusMutation.isPending}
                          style={{
                            padding: "6px 14px",
                            borderRadius: "8px",
                            backgroundColor: "#059669",
                            color: "#ffffff",
                            fontSize: "12px",
                            fontWeight: 700,
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <CheckCircle size={14} /> Mark READY
                        </button>
                      )}

                      {["READY", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status) && (
                        <span style={{ fontSize: "12px", color: "#16835b", fontWeight: 700 }}>
                          ✓ Order Packed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order Status Donut Chart & Top Products & Catalog Summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Order Status Donut Chart (Mockup Screen 2) */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #fed7aa",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(194, 65, 12, 0.05)",
            }}
          >
            <div style={{ marginBottom: "8px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#9a3412" }}>
                Order Status
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#78716c" }}>
                Live fulfillment status distribution
              </p>
            </div>

            <div style={{ position: "relative", height: "180px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    innerRadius={52}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
              {/* Central Counter */}
              <div
                style={{
                  position: "absolute",
                  textAlign: "center",
                  pointerEvents: "none",
                }}
              >
                <div style={{ fontSize: "24px", fontWeight: 900, color: "#9a3412", lineHeight: 1 }}>
                  {orderItems.length}
                </div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#78716c", textTransform: "uppercase" }}>
                  Orders
                </div>
              </div>
            </div>

            {/* Slices Legend */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginTop: "10px", fontSize: "11.5px" }}>
              {orderStatusData.map((s) => (
                <div key={s.name} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: s.color, flexShrink: 0 }} />
                  <span style={{ color: "#78716c" }}>{s.name}:</span>
                  <strong style={{ color: "#222c1d" }}>{s.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <TopProducts
            products={topProducts.data ?? []}
            viewAllHref="/seller/products"
            isLoading={topProducts.isLoading}
          />

          {/* Quick Stats Widget */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e1e8e2",
              borderRadius: "16px",
              padding: "22px 24px",
              boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
            }}
          >
            <h3 style={{ margin: "0 0 14px", fontSize: "15px", fontWeight: 800, color: "#063c32" }}>
              Harvest & Store Status
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#62746a" }}>In-Stock Vegetables:</span>
                <strong style={{ color: "#16835b" }}>
                  {inventoryItems.filter((i) => Number(i.quantity) > 0).length}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#62746a" }}>Low-Stock Warnings:</span>
                <strong style={{ color: lowStockAlerts.length > 0 ? "#dc2626" : "#16835b" }}>
                  {lowStockAlerts.length}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#62746a" }}>Average Seller Rating:</span>
                <strong style={{ color: "#063c32" }}>★ {Number((profile.data as any)?.rating || 4.8).toFixed(1)}</strong>
              </div>
            </div>
          </div>

          {/* Grow Your Business Card (matching Mockup Screen 4) */}
          <div
            style={{
              background: "linear-gradient(135deg, #063c32 0%, #16835b 100%)",
              borderRadius: "16px",
              padding: "22px 24px",
              color: "#ffffff",
              boxShadow: "0 4px 16px rgba(6, 60, 50, 0.12)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles size={18} color="#a7f3d0" />
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#ffffff" }}>
                Grow Your Business
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: "12.5px", color: "#e2f2e8", lineHeight: 1.5 }}>
              Add more fresh vegetable varieties, reach thousands of Solapur households, and expand your daily earnings.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              style={{
                marginTop: "6px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "9px 16px",
                borderRadius: "10px",
                backgroundColor: "#ffffff",
                color: "#063c32",
                fontWeight: 800,
                fontSize: "13px",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Plus size={16} /> Add Product
            </button>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <style>{`
        @media (max-width: 1024px) {
          .seller-dashboard-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DashboardShell>
  );
}
