"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Edit2,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building2,
  Calendar,
  Layers,
  Scale,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { RoleGuard } from "@/components/role/role-guard";
import {
  listMarketIntelligence,
  upsertMarketIntelligence,
  MarketIntelligence,
  MarketIntelligenceCreate,
} from "@/lib/api/market-intelligence";
import { getErrorMessage } from "@/lib/api/client";

export default function AdminMarketPricesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [trendFilter, setTrendFilter] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MarketIntelligence | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Form State
  const [productId, setProductId] = useState<number>(1);
  const [productName, setProductName] = useState<string>("");
  const [referencePrice, setReferencePrice] = useState<string>("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [unit, setUnit] = useState<string>("kg");
  const [trend, setTrend] = useState<string>("STABLE");
  const [demandSignal, setDemandSignal] = useState<string>("HIGH");
  const [supplySignal, setSupplySignal] = useState<string>("STEADY");
  const [market, setMarket] = useState<string>("Solapur APMC Yard");
  const [district, setDistrict] = useState<string>("Solapur");
  const [state, setState] = useState<string>("Maharashtra");
  const [source, setSource] = useState<string>("MSAMB / Solapur APMC");
  const [marketDate, setMarketDate] = useState<string>(new Date().toISOString().split("T")[0]);

  const { data: marketData = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-market-intelligence"],
    queryFn: listMarketIntelligence,
  });

  const upsertMutation = useMutation({
    mutationFn: (payload: MarketIntelligenceCreate) => upsertMarketIntelligence(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-market-intelligence"] });
      setFeedback({ type: "success", msg: "APMC market benchmark rate updated successfully!" });
      setIsModalOpen(false);
      setEditingItem(null);
    },
    onError: (err) => {
      setFeedback({ type: "error", msg: getErrorMessage(err) || "Failed to update market rate" });
    },
  });

  const openEditModal = (item: MarketIntelligence) => {
    setEditingItem(item);
    setProductId(item.product_id);
    setProductName(item.product_name || `Produce #${item.product_id}`);
    setReferencePrice(item.reference_price.toString());
    setMinPrice(item.suggested_range_min.toString());
    setMaxPrice(item.suggested_range_max.toString());
    setUnit(item.unit || "kg");
    setTrend(item.trend || "STABLE");
    setDemandSignal(item.demand_signal || "HIGH");
    setSupplySignal(item.supply_signal || "STEADY");
    setMarket(item.market || "Solapur APMC Yard");
    setDistrict(item.district || "Solapur");
    setState(item.state || "Maharashtra");
    setSource(item.source || "MSAMB / Solapur APMC");
    setMarketDate(item.market_date || new Date().toISOString().split("T")[0]);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const refNum = parseFloat(referencePrice);
    const minNum = parseFloat(minPrice);
    const maxNum = parseFloat(maxPrice);

    if (isNaN(refNum) || isNaN(minNum) || isNaN(maxNum)) {
      setFeedback({ type: "error", msg: "Please enter valid numeric price values." });
      return;
    }

    upsertMutation.mutate({
      product_id: productId,
      market,
      district,
      state,
      reference_price: refNum,
      previous_price: editingItem ? editingItem.reference_price : undefined,
      suggested_range_min: minNum,
      suggested_range_max: maxNum,
      unit,
      trend,
      demand_signal: demandSignal,
      supply_signal: supplySignal,
      source,
      confidence: 95,
      market_date: marketDate,
    });
  };

  const filteredItems = marketData.filter((item) => {
    const matchesSearch =
      item.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.market.toLowerCase().includes(search.toLowerCase());
    const matchesTrend = trendFilter === "ALL" || item.trend === trendFilter;
    return matchesSearch && matchesTrend;
  });

  return (
    <RoleGuard allow={["ADMIN"]}>
      <DashboardShell
        role="admin"
        greeting="Operations Admin"
        subtitle="Manage APMC Mandi rates and wholesale price benchmarks"
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px 0" }}>
          {/* Header */}
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
                APMC Mandi Intelligence & Rates
              </h1>
              <p style={{ color: "#6b7280", margin: "4px 0 0 0", fontSize: "14px" }}>
                Wholesale benchmarks used by customers and sellers across Solapur district.
              </p>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 16px",
                backgroundColor: "#ffffff",
                color: "#063c32",
                border: "1px solid #d1d5db",
                borderRadius: "10px",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
              Sync Benchmark Data
            </button>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 16px",
                borderRadius: "12px",
                marginBottom: "20px",
                backgroundColor: feedback.type === "success" ? "#ecfdf5" : "#fef2f2",
                color: feedback.type === "success" ? "#065f46" : "#991b1b",
                border: `1px solid ${feedback.type === "success" ? "#a7f3d0" : "#fecaca"}`,
              }}
            >
              {feedback.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span style={{ fontSize: "14px", fontWeight: 600 }}>{feedback.msg}</span>
              <button
                onClick={() => setFeedback(null)}
                style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit" }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Overview Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                padding: "16px",
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "#ecfdf5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#059669",
                }}
              >
                <Layers size={22} />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>Tracked Commodities</div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#111827" }}>
                  {marketData.length} items
                </div>
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                padding: "16px",
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "#eff6ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#2563eb",
                }}
              >
                <Building2 size={22} />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>Primary Mandi Yard</div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827" }}>
                  Solapur APMC
                </div>
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                padding: "16px",
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "#fff7ed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ea580c",
                }}
              >
                <Scale size={22} />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>Avg Benchmark Modal</div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#111827" }}>
                  ₹
                  {marketData.length > 0
                    ? (
                        marketData.reduce((acc, m) => acc + Number(m.reference_price), 0) /
                        marketData.length
                      ).toFixed(1)
                    : "0.0"}
                  /kg
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter */}
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
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}
              />
              <input
                type="text"
                placeholder="Search commodity or mandi yard..."
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

          {/* Table */}
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
                Loading market data...
              </div>
            ) : filteredItems.length === 0 ? (
              <div style={{ padding: "48px", textAlign: "center", color: "#6b7280" }}>
                No records matching your search.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "#4b5563" }}>
                        COMMODITY / PRODUCE
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "#4b5563" }}>
                        MODAL RATE
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "#4b5563" }}>
                        SUGGESTED RANGE (MIN - MAX)
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "#4b5563" }}>
                        TREND & SIGNALS
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "#4b5563" }}>
                        OFFICIAL SOURCE
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "#4b5563" }}>
                        DATE
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "#4b5563", textAlign: "right" }}>
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: "1px solid #f3f4f6",
                          transition: "background 0.15s",
                        }}
                      >
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: 700, color: "#111827", fontSize: "14px" }}>
                            {item.product_name || `Produce #${item.product_id}`}
                          </div>
                          <div style={{ fontSize: "11px", color: "#6b7280" }}>
                            ID #{item.product_id}
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
                            ₹{Number(item.reference_price).toFixed(2)}
                          </span>
                          <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "4px" }}>
                            / {item.unit}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: "13px", color: "#374151" }}>
                          ₹{Number(item.suggested_range_min).toFixed(2)} – ₹{Number(item.suggested_range_max).toFixed(2)}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 700,
                                backgroundColor:
                                  item.trend === "UPWARD"
                                    ? "#fef2f2"
                                    : item.trend === "DOWNWARD"
                                    ? "#ecfdf5"
                                    : "#f3f4f6",
                                color:
                                  item.trend === "UPWARD"
                                    ? "#991b1b"
                                    : item.trend === "DOWNWARD"
                                    ? "#065f46"
                                    : "#4b5563",
                              }}
                            >
                              {item.trend === "UPWARD" ? (
                                <TrendingUp size={12} />
                              ) : item.trend === "DOWNWARD" ? (
                                <TrendingDown size={12} />
                              ) : (
                                <Minus size={12} />
                              )}
                              {item.trend}
                            </span>
                            <span
                              style={{
                                fontSize: "11px",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                backgroundColor: "#f0fdf4",
                                color: "#166534",
                                fontWeight: 600,
                              }}
                            >
                              Demand: {item.demand_signal}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: "13px", color: "#4b5563" }}>
                          <div>{item.source}</div>
                          <div style={{ fontSize: "11px", color: "#9ca3af" }}>{item.market}</div>
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: "12px", color: "#6b7280" }}>
                          {item.market_date || new Date(item.timestamp).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "right" }}>
                          <button
                            onClick={() => openEditModal(item)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "6px 10px",
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              background: "#ffffff",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                              color: "#063c32",
                            }}
                          >
                            <Edit2 size={13} />
                            Edit Rate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal: Edit Rate */}
        {isModalOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "16px",
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "20px",
                padding: "24px",
                width: "100%",
                maxWidth: "520px",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#111827", margin: 0 }}>
                  Update APMC Rate — {productName}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#6b7280" }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Modal Price */}
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    Modal APMC Rate (₹ per {unit}) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={referencePrice}
                    onChange={(e) => setReferencePrice(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      fontWeight: 700,
                      color: "#063c32",
                    }}
                  />
                </div>

                {/* Min & Max Range */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                      Min Auction Price (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      required
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                      Max Auction Price (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      required
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                {/* Trend & Signals */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                      Price Trend
                    </label>
                    <select
                      value={trend}
                      onChange={(e) => setTrend(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="STABLE">STABLE</option>
                      <option value="UPWARD">UPWARD</option>
                      <option value="DOWNWARD">DOWNWARD</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                      Supply Signal
                    </label>
                    <select
                      value={supplySignal}
                      onChange={(e) => setSupplySignal(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="STEADY">STEADY</option>
                      <option value="HIGH">HIGH</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>
                </div>

                {/* Date & Market Yard */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                      Market Yard
                    </label>
                    <input
                      type="text"
                      value={market}
                      onChange={(e) => setMarket(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                      Market Date
                    </label>
                    <input
                      type="date"
                      value={marketDate}
                      onChange={(e) => setMarketDate(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "10px",
                      border: "1px solid #d1d5db",
                      background: "#ffffff",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={upsertMutation.isPending}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "10px",
                      border: "none",
                      backgroundColor: "#059669",
                      color: "#ffffff",
                      fontWeight: 700,
                      cursor: "pointer",
                      opacity: upsertMutation.isPending ? 0.7 : 1,
                    }}
                  >
                    {upsertMutation.isPending ? "Saving..." : "Save Rate"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </DashboardShell>
    </RoleGuard>
  );
}
