"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Tag,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  Store,
  Sparkles,
  Percent,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { RoleGuard } from "@/components/role/role-guard";
import {
  listPromotions,
  updatePromotionStatus,
  deletePromotion,
  Promotion,
} from "@/lib/api/promotions";
import { getErrorMessage } from "@/lib/api/client";

export default function AdminPromotionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ["admin-promotions"],
    queryFn: () => listPromotions(),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updatePromotionStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
      setFeedback({ type: "success", msg: "Promotion status updated successfully." });
    },
    onError: (err) => {
      setFeedback({ type: "error", msg: getErrorMessage(err) || "Failed to update status" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePromotion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
      setFeedback({ type: "success", msg: "Promotion removed from platform." });
    },
    onError: (err) => {
      setFeedback({ type: "error", msg: getErrorMessage(err) || "Failed to delete promotion" });
    },
  });

  const filteredPromos = promotions.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const matchesType = filterType === "ALL" || p.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <RoleGuard allow={["ADMIN"]}>
      <DashboardShell
        role="admin"
        greeting="Operations Admin"
        subtitle="Manage platform-wide promotions, deals, and flash discounts"
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px 0" }}>
          {/* Header */}
          <div style={{ marginBottom: "24px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#063c32", margin: 0 }}>
              Marketplace Promotions & Deals
            </h1>
            <p style={{ color: "#6b7280", margin: "4px 0 0 0", fontSize: "14px" }}>
              Oversee and moderate all seller discounts, bundle offers, and clearance campaigns across Vegito.
            </p>
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

          {/* Metrics */}
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
                <Tag size={22} />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>Total Promotions</div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#111827" }}>
                  {promotions.length}
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
                <Sparkles size={22} />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>Active in Feed</div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#111827" }}>
                  {promotions.filter((p) => p.status === "ACTIVE").length}
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
                <Percent size={22} />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>Max Discount Available</div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#111827" }}>
                  {promotions.reduce((max, p) => Math.max(max, p.discount_percent || 0), 0)}%
                </div>
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
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}
              />
              <input
                type="text"
                placeholder="Search promotions by title or produce..."
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
              {(["ALL", "BUNDLE", "DISCOUNT", "CLEARANCE"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: filterType === t ? "1px solid #059669" : "1px solid #e5e7eb",
                    backgroundColor: filterType === t ? "#ecfdf5" : "#ffffff",
                    color: filterType === t ? "#065f46" : "#4b5563",
                    fontWeight: 700,
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  {t === "ALL" ? "All Promotions" : t}
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
                Loading promotions...
              </div>
            ) : filteredPromos.length === 0 ? (
              <div style={{ padding: "48px", textAlign: "center", color: "#6b7280" }}>
                No promotions found.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "#4b5563" }}>
                        OFFER / CAMPAIGN
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "#4b5563" }}>
                        SELLER ID
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "#4b5563" }}>
                        TYPE
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "#4b5563" }}>
                        REGULAR PRICE
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "#4b5563" }}>
                        OFFER PRICE
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "#4b5563" }}>
                        STATUS
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "#4b5563", textAlign: "right" }}>
                        MODERATION
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPromos.map((promo) => {
                      const isActive = promo.status === "ACTIVE";
                      return (
                        <tr
                          key={promo.id}
                          style={{
                            borderBottom: "1px solid #f3f4f6",
                            transition: "background 0.15s",
                          }}
                        >
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontWeight: 700, color: "#111827", fontSize: "14px" }}>
                              {promo.title}
                            </div>
                            <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                              {promo.product_name ? `Includes: ${promo.product_name}` : promo.description || "—"}
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px", fontSize: "13px", color: "#4b5563" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <Store size={14} color="#059669" />
                              <span>Seller #{promo.seller_id}</span>
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 700,
                                backgroundColor:
                                  promo.type === "BUNDLE"
                                    ? "#eff6ff"
                                    : promo.type === "CLEARANCE"
                                    ? "#fef2f2"
                                    : "#ecfdf5",
                                color:
                                  promo.type === "BUNDLE"
                                    ? "#1e40af"
                                    : promo.type === "CLEARANCE"
                                    ? "#991b1b"
                                    : "#065f46",
                              }}
                            >
                              {promo.type}
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px", fontSize: "13px", color: "#6b7280" }}>
                            {promo.original_price ? (
                              <span style={{ textDecoration: "line-through" }}>
                                ₹{Number(promo.original_price).toFixed(2)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ fontWeight: 800, color: "#059669", fontSize: "15px" }}>
                              ₹{Number(promo.price).toFixed(2)}
                            </span>
                            {promo.discount_percent && promo.discount_percent > 0 && (
                              <span
                                style={{
                                  marginLeft: "6px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  color: "#dc2626",
                                  backgroundColor: "#fee2e2",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                }}
                              >
                                {promo.discount_percent}% OFF
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 8px",
                                borderRadius: "8px",
                                fontSize: "12px",
                                fontWeight: 700,
                                backgroundColor: isActive ? "#ecfdf5" : "#f3f4f6",
                                color: isActive ? "#065f46" : "#6b7280",
                              }}
                            >
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  backgroundColor: isActive ? "#10b981" : "#9ca3af",
                                }}
                              />
                              {promo.status}
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                              <button
                                onClick={() =>
                                  statusMutation.mutate({
                                    id: promo.id,
                                    status: isActive ? "PAUSED" : "ACTIVE",
                                  })
                                }
                                title={isActive ? "Pause offer" : "Resume offer"}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: "8px",
                                  border: "1px solid #e5e7eb",
                                  background: "#ffffff",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  color: isActive ? "#ea580c" : "#059669",
                                }}
                              >
                                {isActive ? <Pause size={14} /> : <Play size={14} />}
                                {isActive ? "Pause" : "Resume"}
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Remove promotion "${promo.title}" from platform?`)) {
                                    deleteMutation.mutate(promo.id);
                                  }
                                }}
                                title="Delete offer"
                                style={{
                                  padding: "6px 8px",
                                  borderRadius: "8px",
                                  border: "1px solid #fee2e2",
                                  background: "#fef2f2",
                                  color: "#dc2626",
                                  cursor: "pointer",
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
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
