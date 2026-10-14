"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingBasket,
  Search,
  RefreshCw,
  AlertTriangle,
  Store,
  Phone,
  CheckCircle2,
  Package,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { RoleGuard } from "@/components/role/role-guard";
import { getAdminInventoryAlerts } from "@/lib/api/admin";

export default function AdminInventoryPage() {
  const [search, setSearch] = useState("");

  const {
    data: alerts = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["admin-inventory-monitoring"],
    queryFn: getAdminInventoryAlerts,
    refetchInterval: 30000,
  });

  const filtered = alerts.filter((item: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.product_name?.toLowerCase().includes(q) ||
      item.business_name?.toLowerCase().includes(q) ||
      item.seller_phone?.includes(q)
    );
  });

  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>
      <DashboardShell
        role="admin"
        userName="Admin"
        userRole="Platform Operations"
        greeting="Inventory Oversight & Depletion Monitoring"
        subtitle="Live inventory balances, depletion alerts, and seller stock thresholds across Solapur marketplace"
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
          {/* Header Controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "10px",
                  backgroundColor: alerts.length > 0 ? "#fef2f2" : "#ecfdf5",
                  border: `1px solid ${alerts.length > 0 ? "#fecaca" : "#a7f3d0"}`,
                  color: alerts.length > 0 ? "#dc2626" : "#059669",
                  fontSize: "13px",
                  fontWeight: 800,
                }}
              >
                <AlertTriangle size={15} />
                <span>{alerts.length} Low-Stock Alert{alerts.length === 1 ? "" : "s"}</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ position: "relative", width: "300px" }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#62746a",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search item, seller, or phone…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    height: "38px",
                    paddingLeft: "36px",
                    paddingRight: "12px",
                    borderRadius: "10px",
                    border: "1px solid #d1dbd4",
                    backgroundColor: "#ffffff",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
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
          </div>

          {/* Inventory Table */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "18px",
              border: "1px solid #e1e8e2",
              boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
              overflow: "hidden",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8faf8", borderBottom: "1px solid #e1e8e2" }}>
                    <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                      Product
                    </th>
                    <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                      Seller Store
                    </th>
                    <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                      Stock Quantity
                    </th>
                    <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                      Threshold
                    </th>
                    <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                      Status
                    </th>
                    <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                      Contact
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "40px 18px", textAlign: "center", color: "#62746a" }}>
                        Loading inventory alerts from database…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "40px 18px", textAlign: "center", color: "#16a34a", fontWeight: 700 }}>
                        {alerts.length === 0
                          ? "✓ All seller inventory levels are healthy and above threshold limits."
                          : "No inventory items match your search filter."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item: any, idx: number) => (
                      <tr
                        key={item.inventory_id || idx}
                        style={{
                          borderBottom: "1px solid #edf2ee",
                        }}
                      >
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "8px",
                                backgroundColor: "#fef2f2",
                                color: "#dc2626",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "18px",
                              }}
                            >
                              🥬
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: "#063c32", fontSize: "14px" }}>
                                {item.product_name}
                              </div>
                              <div style={{ fontSize: "12px", color: "#62746a" }}>
                                Seller SKU #{item.seller_product_id}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "13.5px" }}>
                            {item.business_name || "Vendor"}
                          </div>
                          {item.seller_id && (
                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                              Seller ID #{item.seller_id}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: "14px 18px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: "8px",
                              backgroundColor: "#fee2e2",
                              color: "#b91c1c",
                              fontWeight: 900,
                              fontSize: "13px",
                            }}
                          >
                            {item.quantity} {item.unit}
                          </span>
                        </td>

                        <td style={{ padding: "14px 18px", fontSize: "13px", color: "#64748b" }}>
                          {item.low_stock_threshold} {item.unit}
                        </td>

                        <td style={{ padding: "14px 18px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "3px 8px",
                              borderRadius: "100px",
                              fontSize: "12px",
                              fontWeight: 700,
                              backgroundColor: "#fee2e2",
                              color: "#b91c1c",
                            }}
                          >
                            Low Stock
                          </span>
                        </td>

                        <td style={{ padding: "14px 18px" }}>
                          {item.seller_phone ? (
                            <a
                              href={`tel:${item.seller_phone}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                color: "#16835b",
                                fontWeight: 700,
                                textDecoration: "none",
                                fontSize: "13px",
                              }}
                            >
                              <Phone size={13} />
                              <span>{item.seller_phone}</span>
                            </a>
                          ) : (
                            <span style={{ color: "#9ca3af", fontSize: "13px" }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
