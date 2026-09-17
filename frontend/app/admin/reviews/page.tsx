"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MessageSquare,
  Star,
  Search,
  Filter,
  User,
  Package,
  Store,
  Truck,
  Calendar,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { RoleGuard } from "@/components/role/role-guard";
import { getAdminReviews } from "@/lib/api/reviews";
import { getErrorMessage } from "@/lib/api/client";

export default function AdminReviewsPage() {
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined);
  const [targetFilter, setTargetFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const reviewsQuery = useQuery({
    queryKey: ["admin-reviews", ratingFilter, targetFilter, page],
    queryFn: () =>
      getAdminReviews({
        rating: ratingFilter,
        target_type: targetFilter,
        page,
        page_size: pageSize,
      }),
  });

  const reviewList = reviewsQuery.data?.data ?? [];
  const total = reviewsQuery.data?.total ?? 0;
  const totalPages = reviewsQuery.data?.total_pages ?? 1;

  const getTargetBadge = (r: typeof reviewList[0]) => {
    if (r.product_rating !== null && r.product_rating !== undefined) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "3px 8px",
            borderRadius: "6px",
            backgroundColor: "#ecfdf5",
            color: "#065f46",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          <Package size={13} /> {r.product_name ? `Product: ${r.product_name}` : "Produce"}
        </span>
      );
    }
    if (r.seller_rating !== null && r.seller_rating !== undefined) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "3px 8px",
            borderRadius: "6px",
            backgroundColor: "#fff7ed",
            color: "#c2410c",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          <Store size={13} /> Seller / Shop
        </span>
      );
    }
    if (r.delivery_rating !== null && r.delivery_rating !== undefined) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "3px 8px",
            borderRadius: "6px",
            backgroundColor: "#eff6ff",
            color: "#1d4ed8",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          <Truck size={13} /> Delivery Partner
        </span>
      );
    }
    return (
      <span
        style={{
          padding: "3px 8px",
          borderRadius: "6px",
          backgroundColor: "#f1f5f9",
          color: "#475569",
          fontSize: "12px",
          fontWeight: 700,
        }}
      >
        General
      </span>
    );
  };

  const getRatingValue = (r: typeof reviewList[0]) => {
    return r.product_rating ?? r.seller_rating ?? r.delivery_rating ?? 5;
  };

  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>
      <DashboardShell
        role="admin"
        userName="Operations Admin"
        userRole="Platform Operations"
        greeting="Customer Reviews & Ratings"
        subtitle="Monitor, inspect, and moderate reviews across Produce, Sellers, and Delivery Partners"
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Header & Filter Controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#063c32" }}>
                All Platform Reviews ({total})
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#62746a" }}>
                Inspect verified ratings submitted by customers after successful delivery.
              </p>
            </div>

            {/* Target Filter Pills */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {[
                { label: "All Targets", val: undefined },
                { label: "🥦 Produce", val: "PRODUCT" },
                { label: "🏪 Seller", val: "SELLER" },
                { label: "🚴 Delivery", val: "DELIVERY_PARTNER" },
              ].map((f) => (
                <button
                  key={f.label}
                  onClick={() => {
                    setTargetFilter(f.val);
                    setPage(1);
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: `1.5px solid ${targetFilter === f.val ? "#063c32" : "#e1e8e2"}`,
                    backgroundColor: targetFilter === f.val ? "#e9f6ee" : "#ffffff",
                    color: targetFilter === f.val ? "#063c32" : "#4a5568",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rating Filter Pills */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#62746a", marginRight: "4px" }}>
              Filter by Star:
            </span>
            <button
              onClick={() => {
                setRatingFilter(undefined);
                setPage(1);
              }}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: `1px solid ${ratingFilter === undefined ? "#063c32" : "#e1e8e2"}`,
                backgroundColor: ratingFilter === undefined ? "#063c32" : "#ffffff",
                color: ratingFilter === undefined ? "#ffffff" : "#4a5568",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Any Rating
            </button>
            {[5, 4, 3, 2, 1].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setRatingFilter(s);
                  setPage(1);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: `1px solid ${ratingFilter === s ? "#f59e0b" : "#e1e8e2"}`,
                  backgroundColor: ratingFilter === s ? "#fffbeb" : "#ffffff",
                  color: ratingFilter === s ? "#b45309" : "#4a5568",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Star size={12} fill="#f59e0b" color="#f59e0b" />
                {s} {s === 1 ? "Star" : "Stars"}
              </button>
            ))}
          </div>

          {/* Table Container */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e1e8e2",
              boxShadow: "0 2px 10px rgba(6, 60, 50, 0.04)",
              overflow: "hidden",
            }}
          >
            {reviewsQuery.isLoading ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#62746a" }}>
                <RefreshCw size={28} style={{ animation: "spin 1.5s linear infinite", margin: "0 auto 12px" }} />
                <p style={{ margin: 0, fontWeight: 700 }}>Loading customer reviews...</p>
              </div>
            ) : reviewsQuery.isError ? (
              <div
                style={{
                  padding: "24px",
                  backgroundColor: "#fef2f2",
                  color: "#991b1b",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <AlertCircle size={20} />
                <span>{getErrorMessage(reviewsQuery.error)}</span>
              </div>
            ) : reviewList.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8faf9", borderBottom: "1px solid #e1e8e2" }}>
                      <th style={{ padding: "12px 16px", fontWeight: 700, color: "#62746a" }}>ID / Order</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700, color: "#62746a" }}>Customer</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700, color: "#62746a" }}>Target Entity</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700, color: "#62746a" }}>Rating</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700, color: "#62746a" }}>Customer Feedback</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700, color: "#62746a" }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewList.map((rev) => {
                      const ratingVal = getRatingValue(rev);
                      return (
                        <tr
                          key={rev.id}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            transition: "background 0.15s",
                          }}
                        >
                          <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                            <strong style={{ color: "#063c32" }}>#{rev.id}</strong>
                            <span style={{ display: "block", fontSize: "11px", color: "#64748b" }}>
                              Order #{rev.order_id}
                            </span>
                          </td>

                          <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                            <strong style={{ color: "#1e293b" }}>{rev.customer_name || "Customer"}</strong>
                          </td>

                          <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                            {getTargetBadge(rev)}
                          </td>

                          <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "2px", color: "#f59e0b" }}>
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  size={13}
                                  fill={s <= ratingVal ? "#f59e0b" : "none"}
                                />
                              ))}
                              <span style={{ fontSize: "12px", fontWeight: 800, color: "#92400e", marginLeft: "4px" }}>
                                {ratingVal}
                              </span>
                            </div>
                          </td>

                          <td style={{ padding: "14px 16px", minWidth: "220px", maxWidth: "380px" }}>
                            <p style={{ margin: 0, color: rev.comment ? "#334155" : "#94a3b8", fontStyle: rev.comment ? "normal" : "italic", lineHeight: 1.4 }}>
                              {rev.comment ? `"${rev.comment}"` : "No written comment"}
                            </p>
                          </td>

                          <td style={{ padding: "14px 16px", whiteSpace: "nowrap", color: "#64748b", fontSize: "12px" }}>
                            {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: "60px 20px", textAlign: "center" }}>
                <MessageSquare size={36} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
                <h3 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 800, color: "#1e293b" }}>
                  No reviews match the selected filters
                </h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                  Try changing your star rating or target entity filter.
                </p>
              </div>
            )}

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 20px",
                  borderTop: "1px solid #e1e8e2",
                  backgroundColor: "#fafcf9",
                }}
              >
                <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                  Page <b>{page}</b> of <b>{totalPages}</b> ({total} total reviews)
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1px solid #e1e8e2",
                      backgroundColor: page <= 1 ? "#f1f5f9" : "#ffffff",
                      color: page <= 1 ? "#94a3b8" : "#063c32",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: page <= 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1px solid #e1e8e2",
                      backgroundColor: page >= totalPages ? "#f1f5f9" : "#ffffff",
                      color: page >= totalPages ? "#94a3b8" : "#063c32",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: page >= totalPages ? "not-allowed" : "pointer",
                    }}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
