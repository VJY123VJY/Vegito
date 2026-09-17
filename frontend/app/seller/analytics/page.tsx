"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, DollarSign, Package, ShoppingBag, Calendar, BarChart3, RefreshCw, AlertCircle } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { TopProducts } from "@/components/dashboard/top-products";
import {
  getSellerRevenueAnalytics,
  getSellerOrderAnalytics,
  getSellerProductAnalytics,
  getSellerProfile,
  listSellerOrders,
} from "@/lib/api/seller";
import { getErrorMessage } from "@/lib/api/client";

export default function SellerAnalyticsPage() {
  const [range, setRange] = useState("30d");

  const profile = useQuery({ queryKey: ["seller-profile"], queryFn: getSellerProfile });
  const revenueData = useQuery({
    queryKey: ["seller-revenue-analytics", range],
    queryFn: () => getSellerRevenueAnalytics(range),
  });
  const orderData = useQuery({
    queryKey: ["seller-order-analytics", range],
    queryFn: () => getSellerOrderAnalytics(range),
  });
  const topProducts = useQuery({
    queryKey: ["seller-top-products"],
    queryFn: () => getSellerProductAnalytics(6),
  });
  const orders = useQuery({
    queryKey: ["seller-orders"],
    queryFn: () => listSellerOrders(),
  });

  const businessName = profile.data?.business_name || "Farm Fresh Solapur";
  const orderList = orders.data?.items ?? [];
  const deliveredList = orderList.filter((o) => o.status === "DELIVERED" || o.status === "COMPLETED");
  const totalRevenue = deliveredList.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const avgOrderValue = deliveredList.length > 0 ? (totalRevenue / deliveredList.length).toFixed(2) : "0.00";

  return (
    <DashboardShell
      role="seller"
      userName={businessName}
      userRole="Verified Seller"
      greeting="Store Analytics"
      subtitle="Data-driven performance metrics for your Solapur produce catalog"
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Controls Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#9a3412" }}>
              Sales & Order Analytics
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#62746a" }}>
              Computed directly from your PostgreSQL orders and inventory transactions.
            </p>
          </div>

          <div style={{ display: "flex", gap: "6px", backgroundColor: "#f3f4f6", padding: "4px", borderRadius: "10px" }}>
            {[
              { label: "7 Days", val: "7d" },
              { label: "30 Days", val: "30d" },
              { label: "90 Days", val: "90d" },
              { label: "1 Year", val: "1y" },
            ].map((tab) => (
              <button
                key={tab.val}
                onClick={() => setRange(tab.val)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "7px",
                  border: "none",
                  fontSize: "12.5px",
                  fontWeight: range === tab.val ? 700 : 500,
                  backgroundColor: range === tab.val ? "#ffffff" : "transparent",
                  color: range === tab.val ? "#9a3412" : "#62746a",
                  boxShadow: range === tab.val ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  cursor: "pointer",
                  transition: "all 120ms ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* High-level KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "28px" }}>
          <StatCard
            label="Delivered Orders"
            value={deliveredList.length}
            icon={<ShoppingBag size={20} />}
            iconBg="#e9f6ee"
            iconColor="#16835b"
          />
          <StatCard
            label="Total Revenue"
            value={`₹${totalRevenue.toFixed(2)}`}
            icon={<DollarSign size={20} />}
            iconBg="#fff7ed"
            iconColor="#ea580c"
          />
          <StatCard
            label="Average Order Value"
            value={`₹${avgOrderValue}`}
            icon={<TrendingUp size={20} />}
            iconBg="#eff6ff"
            iconColor="#2563eb"
          />
          <StatCard
            label="Catalog Items"
            value={(topProducts.data ?? []).length}
            icon={<Package size={20} />}
            iconBg="#faf5ff"
            iconColor="#9333ea"
          />
        </div>

        {/* Revenue Trends Chart */}
        <div style={{ marginBottom: "28px" }}>
          <RevenueChart data={revenueData.data ?? []} />
        </div>

        {/* Top Products Section */}
        <div>
          <TopProducts
            products={(topProducts.data ?? []).map((p: any) => ({
              product_id: p.product_id || p.id || 0,
              product_name: p.product_name || p.name || "Vegetable",
              total_quantity_sold: p.total_quantity_sold || p.total_sold || p.orders_count || 0,
              total_revenue: p.total_revenue || 0,
              in_stock: p.in_stock || p.stock_quantity || 0,
            }))}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
