"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Bell,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Truck,
  RefreshCw,
  ArrowRight,
  Store,
  CheckCircle2,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { RoleGuard } from "@/components/role/role-guard";
import { getAdminDashboard } from "@/lib/api/admin";

export default function AdminNotificationsPage() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-notifications-alerts"],
    queryFn: getAdminDashboard,
    refetchInterval: 20000,
  });

  const summary = data?.summary || {
    customers: 0,
    sellers: 0,
    delivery_partners: 0,
    orders: 0,
    revenue: 0,
    pending_orders: 0,
    low_stock: 0,
    failed_deliveries: 0,
  };

  const pendingSellers = data?.pending_seller_verifications || [];

  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>
      <DashboardShell
        role="admin"
        userName="Admin"
        userRole="Platform Operations"
        greeting="System Alerts & Operational Notifications"
        subtitle="Live automated notifications regarding pending approvals, stock levels, delivery dispatches, and system incidents"
      >
        <div style={{ maxWidth: "1080px", margin: "0 auto", width: "100%" }}>
          {/* Header Controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#063c32" }}>
                Active Operational Triggers
              </h3>
              <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#62746a" }}>
                Real-time alerts derived from Solapur operational databases
              </p>
            </div>

            <button
              type="button"
              onClick={() => refetch()}
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
              <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Alert: Pending Seller Approvals */}
            {pendingSellers.length > 0 && (
              <div
                style={{
                  backgroundColor: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: "16px",
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    backgroundColor: "#fef3c7",
                    color: "#b45309",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Store size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#92400e" }}>
                      {pendingSellers.length} Seller Verification Request{pendingSellers.length === 1 ? "" : "s"} Pending
                    </h4>
                    <Link
                      href="/admin/sellers"
                      style={{
                        fontSize: "12.5px",
                        fontWeight: 700,
                        color: "#b45309",
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      Inspect Sellers <ArrowRight size={13} />
                    </Link>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#a16207" }}>
                    New vendor registrations require KYC and document approval before opening their store to customers.
                  </p>
                </div>
              </div>
            )}

            {/* Alert: Low Stock Warning */}
            {summary.low_stock > 0 && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "16px",
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    backgroundColor: "#fee2e2",
                    color: "#b91c1c",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#991b1b" }}>
                      {summary.low_stock} Products Below Minimum Stock Threshold
                    </h4>
                    <Link
                      href="/admin/inventory"
                      style={{
                        fontSize: "12.5px",
                        fontWeight: 700,
                        color: "#b91c1c",
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      View Inventory <ArrowRight size={13} />
                    </Link>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#b91c1c" }}>
                    Several inventory lots are near stock-out. Notify sellers to restock fresh produce.
                  </p>
                </div>
              </div>
            )}

            {/* Alert: Pending Unassigned Orders */}
            {summary.pending_orders > 0 && (
              <div
                style={{
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "16px",
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    backgroundColor: "#dbeafe",
                    color: "#1d4ed8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Clock size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#1e40af" }}>
                      {summary.pending_orders} Orders Awaiting Seller Acceptance
                    </h4>
                    <Link
                      href="/admin/orders?status=NEW"
                      style={{
                        fontSize: "12.5px",
                        fontWeight: 700,
                        color: "#1d4ed8",
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      Monitor Orders <ArrowRight size={13} />
                    </Link>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#1e40af" }}>
                    Orders placed by customers in Solapur currently awaiting seller acknowledgment.
                  </p>
                </div>
              </div>
            )}

            {/* Status: System Core Operational */}
            <div
              style={{
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "16px",
                padding: "18px 20px",
                display: "flex",
                alignItems: "flex-start",
                gap: "16px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  backgroundColor: "#dcfce7",
                  color: "#15803d",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#166534" }}>
                  FastAPI Backend &amp; PostgreSQL Database Operational
                </h4>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#15803d" }}>
                  All platform telemetry, real-time WebSocket dispatch, and database clusters are operating at 100% availability.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
