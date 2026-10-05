"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Building2,
  Calendar,
  CheckCircle,
  HelpCircle,
  BarChart2,
  Scale,
  RefreshCw,
  ExternalLink,
  Zap,
  Check,
  AlertCircle,
  Sliders,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { RoleGuard } from "@/components/role/role-guard";
import { listMarketIntelligence, MarketIntelligence } from "@/lib/api/market-intelligence";
import {
  listSellerProducts,
  updateSellerProduct,
  addSellerProduct,
  type SellerProduct,
} from "@/lib/api/seller-products";

export default function SellerMarketIntelligencePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [trendFilter, setTrendFilter] = useState<string>("ALL");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pricing Formula Parameters
  const [marginPercent, setMarginPercent] = useState<number>(20); // 20% business margin
  const [operationalCost, setOperationalCost] = useState<number>(4); // ₹4/kg handling & packing
  const [discountAmount, setDiscountAmount] = useState<number>(0); // ₹0 promo discount

  const { data: marketData = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["seller-market-intelligence"],
    queryFn: listMarketIntelligence,
  });

  const { data: sellerProducts = [] } = useQuery({
    queryKey: ["seller-products"],
    queryFn: listSellerProducts,
  });

  // Price update mutation
  const updateProductMutation = useMutation({
    mutationFn: ({ id, price }: { id: number; price: number }) =>
      updateSellerProduct(id, { price }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setSuccessMessage(`Store price updated to ₹${vars.price}!`);
      setTimeout(() => setSuccessMessage(null), 3500);
    },
  });

  // Add produce mutation
  const addProductMutation = useMutation({
    mutationFn: ({ productId, price }: { productId: number; price: number }) =>
      addSellerProduct({
        product_id: productId,
        price,
        stock_quantity: 50,
        is_available: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setSuccessMessage("Product successfully added to your store!");
      setTimeout(() => setSuccessMessage(null), 3500);
    },
  });

  // Calculate recommended Vegito price:
  // Market reference price + business margin + operational cost - discount
  const computeVegitoPrice = (mandiRate: number) => {
    const margin = (mandiRate * marginPercent) / 100;
    const price = mandiRate + margin + operationalCost - discountAmount;
    return Math.max(1, Math.round(price));
  };

  // Find matching seller product
  const findSellerProduct = (item: MarketIntelligence): SellerProduct | undefined => {
    return sellerProducts.find(
      (sp) =>
        sp.product_id === item.product_id ||
        (sp.product?.name &&
          item.product_name &&
          sp.product.name.trim().toLowerCase() === item.product_name.trim().toLowerCase())
    );
  };

  const filteredItems = marketData.filter((item) => {
    const matchesSearch =
      item.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.market.toLowerCase().includes(search.toLowerCase());
    const matchesTrend = trendFilter === "ALL" || item.trend === trendFilter;
    return matchesSearch && matchesTrend;
  });

  // Batch update all matching listed produce
  const handleApplyAllRecommended = async () => {
    let count = 0;
    for (const item of marketData) {
      const sp = findSellerProduct(item);
      if (sp) {
        const rec = computeVegitoPrice(Number(item.reference_price));
        if (Number(sp.price) !== rec) {
          await updateSellerProduct(sp.id, { price: rec });
          count++;
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ["seller-products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    setSuccessMessage(`Updated ${count} products with verified APMC formula prices!`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  return (
    <RoleGuard allow={["SELLER"]}>
      <DashboardShell
        role="seller"
        greeting="Daily APMC Market Price Review"
        subtitle="Solapur Mandi Benchmarks · Automated Pricing Formula · 1-Click Store Sync"
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px 0" }}>
          {/* Top Banner */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <div>
              <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#063c32", margin: 0 }}>
                Solapur APMC Mandi Rates & Pricing
              </h1>
              <p style={{ color: "#6b7280", margin: "4px 0 0 0", fontSize: "14px" }}>
                Daily wholesale benchmarks from Solapur APMC Yard. Apply fair pricing to your store in one click.
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  backgroundColor: "#ffffff",
                  color: "#063c32",
                  border: "1px solid #d1d5db",
                  borderRadius: "10px",
                  fontWeight: 600,
                  fontSize: "13.5px",
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
                Refresh APMC Rates
              </button>
              <button
                onClick={handleApplyAllRecommended}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  backgroundColor: "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: 800,
                  fontSize: "13.5px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(22,163,74,0.3)",
                }}
              >
                <Zap size={16} />
                Apply Recommended Prices to All Listed Products
              </button>
            </div>
          </div>

          {/* Feedback Toast */}
          {successMessage && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "14px 18px",
                borderRadius: "12px",
                background: "#dcfce7",
                border: "1.5px solid #86efac",
                color: "#166534",
                marginBottom: "20px",
                fontWeight: 700,
                fontSize: "14px",
              }}
            >
              <CheckCircle size={18} />
              {successMessage}
            </div>
          )}

          {/* Pricing Formula Explainer & Controls */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1.5px solid #bbf7d0",
              padding: "20px 24px",
              marginBottom: "24px",
              boxShadow: "0 4px 20px rgba(6, 60, 50, 0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <Scale size={22} color="#16a34a" />
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#063c32", margin: 0 }}>
                Vegito Pricing Formula:
              </h3>
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: "999px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  color: "#166534",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                Mandi Benchmark + Business Margin + Handling Cost - Discount = Vegito Price
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
                alignItems: "end",
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                  Business Margin (%):
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={marginPercent}
                    onChange={(e) => setMarginPercent(Number(e.target.value) || 0)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      fontWeight: 700,
                    }}
                  />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#6b7280" }}>%</span>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                  Packaging & Operational Cost:
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#6b7280" }}>₹</span>
                  <input
                    type="number"
                    min={0}
                    value={operationalCost}
                    onChange={(e) => setOperationalCost(Number(e.target.value) || 0)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      fontWeight: 700,
                    }}
                  />
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>/kg</span>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                  Customer Discount:
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#6b7280" }}>₹</span>
                  <input
                    type="number"
                    min={0}
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      fontWeight: 700,
                    }}
                  />
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>/kg</span>
                </div>
              </div>

              <div
                style={{
                  background: "#f0fdf4",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid #86efac",
                }}
              >
                <span style={{ fontSize: "11px", color: "#166534", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                  Formula Example (₹30 Mandi):
                </span>
                <span style={{ fontSize: "14px", fontWeight: 800, color: "#166534" }}>
                  ₹30 + ₹{((30 * marginPercent) / 100).toFixed(0)} + ₹{operationalCost} - ₹{discountAmount} ={" "}
                  <strong style={{ textDecoration: "underline" }}>₹{computeVegitoPrice(30)}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div style={{ position: "relative", minWidth: "280px", flex: "1 1 300px" }}>
              <Search
                size={18}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9ca3af",
                }}
              />
              <input
                type="text"
                placeholder="Search produce (e.g. Tomato, Onion, Spinach)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 38px",
                  borderRadius: "10px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              {(["ALL", "STABLE", "UPWARD", "DOWNWARD"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTrendFilter(t)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: trendFilter === t ? "1px solid #059669" : "1px solid #e5e7eb",
                    backgroundColor: trendFilter === t ? "#ecfdf5" : "#ffffff",
                    color: trendFilter === t ? "#065f46" : "#4b5563",
                    fontWeight: 700,
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  {t === "ALL" ? "All Trends" : t}
                </button>
              ))}
            </div>
          </div>

          {/* Benchmark Table with 1-Click Price Approval */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e5e7eb",
              overflow: "hidden",
            }}
          >
            {isLoading ? (
              <div style={{ padding: "48px", textAlign: "center", color: "#6b7280" }}>
                Loading APMC benchmark rates...
              </div>
            ) : filteredItems.length === 0 ? (
              <div style={{ padding: "48px", textAlign: "center", color: "#6b7280" }}>
                No market data found matching your search.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ padding: "12px 16px", fontSize: "11px", fontWeight: 700, color: "#4b5563" }}>
                        PRODUCE / COMMODITY
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "11px", fontWeight: 700, color: "#4b5563" }}>
                        APMC MODAL RATE
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "11px", fontWeight: 700, color: "#4b5563" }}>
                        FORMULA CALCULATION
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "11px", fontWeight: 700, color: "#4b5563" }}>
                        RECOMMENDED VEGITO PRICE
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "11px", fontWeight: 700, color: "#4b5563" }}>
                        YOUR CURRENT STORE PRICE
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "11px", fontWeight: 700, color: "#4b5563", textAlign: "right" }}>
                        ACTION
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const mandiPrice = Number(item.reference_price);
                      const marginAmt = (mandiPrice * marginPercent) / 100;
                      const recPrice = computeVegitoPrice(mandiPrice);
                      const sp = findSellerProduct(item);
                      const currentStorePrice = sp ? Number(sp.price) : null;
                      const isPriceAligned = currentStorePrice === recPrice;

                      return (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: "1px solid #f3f4f6",
                            transition: "background 0.15s",
                            backgroundColor: isPriceAligned ? "#fafafa" : "#ffffff",
                          }}
                        >
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontWeight: 800, color: "#111827", fontSize: "14px" }}>
                              {item.product_name || `Produce #${item.product_id}`}
                            </div>
                            <div style={{ fontSize: "11px", color: "#6b7280" }}>
                              {item.market} · {item.source}
                            </div>
                          </td>

                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontSize: "15px", fontWeight: 800, color: "#063c32" }}>
                              ₹{mandiPrice.toFixed(0)}{" "}
                              <span style={{ fontSize: "11.5px", fontWeight: 500, color: "#6b7280" }}>
                                / {item.unit}
                              </span>
                            </div>
                            <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                              Range: ₹{Number(item.suggested_range_min).toFixed(0)} - ₹{Number(item.suggested_range_max).toFixed(0)}
                            </div>
                          </td>

                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ fontSize: "12px", color: "#4b5563" }}>
                              ₹{mandiPrice.toFixed(0)} + ₹{marginAmt.toFixed(0)} + ₹{operationalCost}
                              {discountAmount > 0 ? ` - ₹${discountAmount}` : ""}
                            </span>
                          </td>

                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontSize: "16px", fontWeight: 900, color: "#15803d" }}>
                              ₹{recPrice}{" "}
                              <span style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>
                                / {item.unit}
                              </span>
                            </div>
                          </td>

                          <td style={{ padding: "14px 16px" }}>
                            {currentStorePrice !== null ? (
                              <div>
                                <span
                                  style={{
                                    fontSize: "14px",
                                    fontWeight: 800,
                                    color: isPriceAligned ? "#15803d" : "#ea580c",
                                  }}
                                >
                                  ₹{currentStorePrice.toFixed(0)}
                                </span>
                                {isPriceAligned ? (
                                  <span style={{ marginLeft: "6px", fontSize: "11px", color: "#15803d", fontWeight: 700 }}>
                                    ✓ Aligned
                                  </span>
                                ) : (
                                  <span style={{ marginLeft: "6px", fontSize: "11px", color: "#ea580c", fontWeight: 700 }}>
                                    (Diff: {currentStorePrice > recPrice ? `+₹${currentStorePrice - recPrice}` : `-₹${recPrice - currentStorePrice}`})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: "12px", color: "#9ca3af", fontStyle: "italic" }}>
                                Not in your store
                              </span>
                            )}
                          </td>

                          <td style={{ padding: "14px 16px", textAlign: "right" }}>
                            {sp ? (
                              <button
                                onClick={() => updateProductMutation.mutate({ id: sp.id, price: recPrice })}
                                disabled={isPriceAligned || updateProductMutation.isPending}
                                style={{
                                  padding: "7px 14px",
                                  borderRadius: "8px",
                                  border: isPriceAligned ? "1px solid #d1d5db" : "none",
                                  background: isPriceAligned ? "#f9fafb" : "#16a34a",
                                  color: isPriceAligned ? "#9ca3af" : "#ffffff",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  cursor: isPriceAligned ? "default" : "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                }}
                              >
                                {isPriceAligned ? (
                                  <>
                                    <Check size={13} /> Approved
                                  </>
                                ) : (
                                  <>
                                    <Zap size={13} /> Update to ₹{recPrice}
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => addProductMutation.mutate({ productId: item.product_id, price: recPrice })}
                                disabled={addProductMutation.isPending}
                                style={{
                                  padding: "7px 14px",
                                  borderRadius: "8px",
                                  border: "1.5px solid #16a34a",
                                  background: "#f0fdf4",
                                  color: "#166534",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                + List at ₹{recPrice}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
