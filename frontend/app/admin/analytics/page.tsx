"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  CheckCircle2,
  XCircle,
  RefreshCw,
  BarChart3,
  Building,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { RoleGuard } from "@/components/role/role-guard";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  getAdminGeographicAnalytics,
  getAdminAnalyticsRevenue,
  getAdminAnalyticsOrders,
  getAdminAnalyticsCustomers,
  getAdminAnalyticsSellers,
  type GeographicSummaryItem,
} from "@/lib/api/admin";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { OrderChart } from "@/components/charts/order-chart";
import { CustomerGrowthChart } from "@/components/charts/customer-growth-chart";
import { SellerPerformanceChart } from "@/components/charts/seller-performance-chart";

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState("30d");

  const geoQuery = useQuery({
    queryKey: ["admin-geo-analytics", range],
    queryFn: () => getAdminGeographicAnalytics(range),
  });

  const revQuery = useQuery({
    queryKey: ["admin-revenue-analytics", range],
    queryFn: () => getAdminAnalyticsRevenue(range),
  });

  const orderQuery = useQuery({
    queryKey: ["admin-orders-analytics", range],
    queryFn: () => getAdminAnalyticsOrders(range),
  });

  const customerQuery = useQuery({
    queryKey: ["admin-customer-analytics", range],
    queryFn: () => getAdminAnalyticsCustomers(range),
  });

  const sellerQuery = useQuery({
    queryKey: ["admin-seller-analytics"],
    queryFn: () => getAdminAnalyticsSellers(10),
  });

  const geoData: GeographicSummaryItem[] = geoQuery.data || [];
  const totalGeoOrders = geoData.reduce((acc, curr) => acc + (curr.order_count || 0), 0);
  const totalGeoRevenue = geoData.reduce((acc, curr) => acc + Number(curr.total_revenue || 0), 0);
  const totalGeoDelivered = geoData.reduce((acc, curr) => acc + (curr.completed_count || 0), 0);

  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>
      <DashboardShell
        role="admin"
        userName="Admin"
        userRole="Platform Operations"
        greeting="Business & Geographic Analytics"
        subtitle="Geographic demand distribution, pin code heatmaps, revenue drivers, and customer trends"
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
          {/* Range Picker Strip */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", gap: "8px" }}>
              {[
                { label: "Last 7 Days", val: "7d" },
                { label: "Last 30 Days", val: "30d" },
                { label: "Last 90 Days", val: "90d" },
                { label: "Past Year", val: "1y" },
              ].map((r) => (
                <button
                  key={r.val}
                  onClick={() => setRange(r.val)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    border: `1.5px solid ${range === r.val ? "#063c32" : "#e1e8e2"}`,
                    backgroundColor: range === r.val ? "#e9f6ee" : "#ffffff",
                    color: range === r.val ? "#063c32" : "#62746a",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                geoQuery.refetch();
                revQuery.refetch();
                orderQuery.refetch();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "10px",
                border: "1px solid #d1dbd4",
                backgroundColor: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                color: "#063c32",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={15} className={geoQuery.isFetching ? "animate-spin" : ""} />
              <span>Refresh Metrics</span>
            </button>
          </div>

          {/* KPI Cards Strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
              marginBottom: "28px",
            }}
          >
            <StatCard
              label="Tracked Localities"
              value={geoData.length}
              icon={<MapPin size={22} />}
              iconBg="#eff6ff"
              iconColor="#2563eb"
            />
            <StatCard
              label="Territory Orders"
              value={totalGeoOrders}
              icon={<ShoppingBag size={22} />}
              iconBg="#f5f3ff"
              iconColor="#7c3aed"
            />
            <StatCard
              label="Territory Revenue"
              value={`₹${totalGeoRevenue.toLocaleString("en-IN")}`}
              icon={<DollarSign size={22} />}
              iconBg="#ecfdf5"
              iconColor="#059669"
            />
            <StatCard
              label="Successful Deliveries"
              value={totalGeoDelivered}
              icon={<CheckCircle2 size={22} />}
              iconBg="#f0fdf4"
              iconColor="#16a34a"
            />
          </div>

          {/* Section: Geographic Business Intelligence (Solapur Zones & PIN codes) */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "18px",
              border: "1px solid #e1e8e2",
              boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
              padding: "24px",
              marginBottom: "32px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#063c32", display: "flex", alignItems: "center", gap: "8px" }}>
                  <MapPin size={20} color="#16835b" />
                  <span>Geographic Distribution (Solapur Zones &amp; PIN Codes)</span>
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "#62746a" }}>
                  Breakdown of customer orders, revenue, fulfillment rate, and active accounts by locality.
                </p>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8faf8", borderBottom: "1px solid #e1e8e2" }}>
                    <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                      Locality / Area
                    </th>
                    <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                      PIN Code
                    </th>
                    <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                      Orders Placed
                    </th>
                    <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                      Delivered
                    </th>
                    <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                      Cancelled
                    </th>
                    <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                      Total Revenue
                    </th>
                    <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                      Unique Customers
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {geoQuery.isLoading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "36px 16px", textAlign: "center", color: "#62746a" }}>
                        Loading territory metrics…
                      </td>
                    </tr>
                  ) : geoData.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "36px 16px", textAlign: "center", color: "#62746a" }}>
                        No orders recorded across localities in this timeframe.
                      </td>
                    </tr>
                  ) : (
                    geoData.map((g, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: "1px solid #edf2ee",
                        }}
                      >
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: 800, color: "#063c32", fontSize: "14px" }}>
                            {g.area}
                          </div>
                          <div style={{ fontSize: "11px", color: "#62746a" }}>
                            {g.city}
                          </div>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              backgroundColor: "#f1f5f9",
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "#334155",
                            }}
                          >
                            {g.pincode || "413001"}
                          </span>
                        </td>

                        <td style={{ padding: "14px 16px", fontWeight: 800, color: "#063c32" }}>
                          {g.order_count}
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ color: "#16a34a", fontWeight: 800 }}>
                            {g.completed_count}
                          </span>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ color: g.cancelled_count > 0 ? "#dc2626" : "#64748b", fontWeight: 800 }}>
                            {g.cancelled_count}
                          </span>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <strong style={{ color: "#063c32", fontSize: "14px" }}>
                            ₹{Number(g.total_revenue || 0).toLocaleString("en-IN")}
                          </strong>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ color: "#2563eb", fontWeight: 700 }}>
                            {g.unique_customers}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Analytics Visual Charts Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
              marginBottom: "28px",
            }}
            className="analytics-charts-grid"
          >
            <RevenueChart
              data={revQuery.data || []}
              title="Revenue Trajectory"
              subtitle="Daily Gross Order Value (GOV)"
              color="purple"
              selectedRange={range}
              onRangeChange={(r) => setRange(r)}
              isLoading={revQuery.isLoading}
            />
            <OrderChart
              data={orderQuery.data || []}
              title="Order Volume Trends"
              subtitle="Completed and queued platform orders"
              isLoading={orderQuery.isLoading}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
              marginBottom: "28px",
            }}
            className="analytics-charts-grid"
          >
            <CustomerGrowthChart
              data={customerQuery.data || []}
              title="Customer Signups"
              subtitle="New account registration rate"
              isLoading={customerQuery.isLoading}
            />
            <SellerPerformanceChart
              data={sellerQuery.data || []}
              title="Top Seller Billing"
              subtitle="Revenue generated by marketplace vendors"
              isLoading={sellerQuery.isLoading}
            />
          </div>
        </div>

        <style>{`
          @media (max-width: 1024px) {
            .analytics-charts-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </DashboardShell>
    </RoleGuard>
  );
}
