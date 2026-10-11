"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  Search,
  RefreshCw,
  AlertTriangle,
  Store,
  Layers,
  CheckCircle2,
  XCircle,
  Tag,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { RoleGuard } from "@/components/role/role-guard";
import { getProducts, type ApiProduct } from "@/lib/api/products";
import { getAdminInventoryAlerts } from "@/lib/api/admin";

export default function AdminProductsPage() {
  const [search, setSearch] = useState("");
  const [viewTab, setViewTab] = useState<"catalog" | "alerts">("catalog");

  const productsQuery = useQuery({
    queryKey: ["admin-products-catalog", search],
    queryFn: () => getProducts({ search: search.trim() || undefined, pageSize: 50 }),
  });

  const alertsQuery = useQuery({
    queryKey: ["admin-inventory-alerts"],
    queryFn: getAdminInventoryAlerts,
  });

  const products = productsQuery.data?.items || [];
  const alerts = alertsQuery.data || [];

  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>
      <DashboardShell
        role="admin"
        userName="Admin"
        userRole="Platform Operations"
        greeting="Product Catalog & Inventory Oversight"
        subtitle="Marketplace vegetable catalogue, vendor listings, stock quantities, and depletion alerts"
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
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setViewTab("catalog")}
                style={{
                  padding: "8px 18px",
                  borderRadius: "10px",
                  border: `1.5px solid ${viewTab === "catalog" ? "#063c32" : "#e1e8e2"}`,
                  backgroundColor: viewTab === "catalog" ? "#e9f6ee" : "#ffffff",
                  color: viewTab === "catalog" ? "#063c32" : "#62746a",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                All Products ({products.length})
              </button>
              <button
                onClick={() => setViewTab("alerts")}
                style={{
                  padding: "8px 18px",
                  borderRadius: "10px",
                  border: `1.5px solid ${viewTab === "alerts" ? "#dc2626" : "#e1e8e2"}`,
                  backgroundColor: viewTab === "alerts" ? "#fef2f2" : "#ffffff",
                  color: viewTab === "alerts" ? "#dc2626" : "#62746a",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <AlertTriangle size={14} color="#dc2626" />
                <span>Low Stock Alerts ({alerts.length})</span>
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {viewTab === "catalog" && (
                <div style={{ position: "relative", width: "280px" }}>
                  <Search
                    size={16}
                    style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#62746a" }}
                  />
                  <input
                    type="text"
                    placeholder="Search product…"
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
              )}

              <button
                onClick={() => {
                  productsQuery.refetch();
                  alertsQuery.refetch();
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
                <RefreshCw size={14} className={productsQuery.isFetching || alertsQuery.isFetching ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          {viewTab === "catalog" ? (
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
                        Category
                      </th>
                      <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                        Unit
                      </th>
                      <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                        Min Price
                      </th>
                      <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                        Stock Status
                      </th>
                      <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                        Sellers Offering
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsQuery.isLoading ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "40px 18px", textAlign: "center", color: "#62746a" }}>
                          Loading marketplace products…
                        </td>
                      </tr>
                    ) : products.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "40px 18px", textAlign: "center", color: "#62746a" }}>
                          No products found.
                        </td>
                      </tr>
                    ) : (
                      products.map((p: ApiProduct) => (
                        <tr
                          key={p.id}
                          style={{
                            borderBottom: "1px solid #edf2ee",
                          }}
                        >
                          <td style={{ padding: "14px 18px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              {p.images && p.images[0] ? (
                                <img
                                  src={p.images[0].image_url}
                                  alt={p.name}
                                  style={{ width: "36px", height: "36px", borderRadius: "8px", objectFit: "cover" }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: "36px",
                                    height: "36px",
                                    borderRadius: "8px",
                                    backgroundColor: "#ecfdf5",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "18px",
                                  }}
                                >
                                  🥬
                                </div>
                              )}
                              <div>
                                <div style={{ fontWeight: 800, color: "#063c32", fontSize: "14px" }}>
                                  {p.name}
                                </div>
                                <div style={{ fontSize: "12px", color: "#62746a" }}>
                                  ID: #{p.id}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: "14px 18px" }}>
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
                              {p.category?.name || "Vegetable"}
                            </span>
                          </td>

                          <td style={{ padding: "14px 18px", fontSize: "13px", fontWeight: 700, color: "#063c32" }}>
                            {p.unit}
                          </td>

                          <td style={{ padding: "14px 18px", fontSize: "14px", fontWeight: 800, color: "#063c32" }}>
                            {p.min_price ? `₹${p.min_price}` : "—"}
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
                                backgroundColor: p.is_in_stock ? "#ecfdf5" : "#fef2f2",
                                color: p.is_in_stock ? "#065f46" : "#991b1b",
                              }}
                            >
                              {p.is_in_stock ? "Available" : "Out of Stock"}
                            </span>
                          </td>

                          <td style={{ padding: "14px 18px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 700, color: "#62746a" }}>
                              {p.seller_products ? p.seller_products.length : 0} sellers
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Low Stock Alerts View */
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
                    <tr style={{ backgroundColor: "#fef2f2", borderBottom: "1px solid #fecaca" }}>
                      <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#991b1b", textTransform: "uppercase" }}>
                        Product Name
                      </th>
                      <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#991b1b", textTransform: "uppercase" }}>
                        Seller
                      </th>
                      <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#991b1b", textTransform: "uppercase" }}>
                        Current Stock
                      </th>
                      <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#991b1b", textTransform: "uppercase" }}>
                        Threshold
                      </th>
                      <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#991b1b", textTransform: "uppercase" }}>
                        Seller Phone
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {alertsQuery.isLoading ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "40px 18px", textAlign: "center", color: "#62746a" }}>
                          Loading inventory alerts…
                        </td>
                      </tr>
                    ) : alerts.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "40px 18px", textAlign: "center", color: "#16a34a", fontWeight: 700 }}>
                          ✓ All inventory items are adequately stocked above threshold limits.
                        </td>
                      </tr>
                    ) : (
                      alerts.map((a: any, idx: number) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: "1px solid #edf2ee",
                          }}
                        >
                          <td style={{ padding: "14px 18px" }}>
                            <div style={{ fontWeight: 800, color: "#991b1b", fontSize: "14px" }}>
                              {a.product_name}
                            </div>
                            <div style={{ fontSize: "12px", color: "#62746a" }}>
                              Unit: {a.unit}
                            </div>
                          </td>

                          <td style={{ padding: "14px 18px" }}>
                            <div style={{ fontWeight: 800, color: "#063c32", fontSize: "13.5px" }}>
                              {a.business_name}
                            </div>
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
                              {a.quantity} {a.unit}
                            </span>
                          </td>

                          <td style={{ padding: "14px 18px", fontSize: "13px", color: "#62746a" }}>
                            {a.low_stock_threshold} {a.unit}
                          </td>

                          <td style={{ padding: "14px 18px" }}>
                            <a
                              href={`tel:${a.seller_phone}`}
                              style={{ color: "#16835b", fontWeight: 700, textDecoration: "none", fontSize: "13px" }}
                            >
                              {a.seller_phone || "—"}
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
