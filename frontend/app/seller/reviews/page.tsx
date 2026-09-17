"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Star, User, Calendar, Package, RefreshCw, AlertCircle } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getSellerReviews, getSellerProfile } from "@/lib/api/seller";
import { getErrorMessage } from "@/lib/api/client";

export default function SellerReviewsPage() {
  const profile = useQuery({ queryKey: ["seller-profile"], queryFn: getSellerProfile });
  const reviews = useQuery({ queryKey: ["seller-reviews"], queryFn: getSellerReviews });

  const businessName = profile.data?.business_name || "Farm Fresh Solapur";
  const reviewList = reviews.data ?? [];

  const avgRating = reviewList.length > 0
    ? (reviewList.reduce((sum, r) => sum + r.rating, 0) / reviewList.length).toFixed(1)
    : "5.0";

  return (
    <DashboardShell
      role="seller"
      userName={businessName}
      userRole="Verified Seller"
      greeting="Customer Reviews"
      subtitle="Customer feedback and ratings for your produce and seller performance"
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* Header Summary */}
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
              Product & Store Feedback
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#62746a" }}>
              Ratings submitted by verified customers who completed orders with your shop.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              backgroundColor: "#fff7ed",
              border: "1px solid #ffedd5",
              padding: "10px 16px",
              borderRadius: "12px",
            }}
          >
            <div style={{ display: "flex", color: "#f59e0b" }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={18} fill={s <= Math.round(Number(avgRating)) ? "#f59e0b" : "none"} />
              ))}
            </div>
            <div>
              <span style={{ fontSize: "16px", fontWeight: 800, color: "#9a3412" }}>{avgRating}</span>
              <span style={{ fontSize: "12px", color: "#78716c", marginLeft: "4px" }}>({reviewList.length} reviews)</span>
            </div>
          </div>
        </div>

        {reviews.isLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#62746a" }}>
            <RefreshCw size={28} style={{ animation: "spin 1.5s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ margin: 0, fontWeight: 700 }}>Loading customer reviews...</p>
          </div>
        ) : reviews.isError ? (
          <div style={{ padding: "20px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "14px", color: "#991b1b" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={20} />
              <strong>Could not load reviews</strong>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "13px" }}>{getErrorMessage(reviews.error)}</p>
          </div>
        ) : reviewList.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {reviewList.map((rev) => (
              <div
                key={rev.id}
                style={{
                  backgroundColor: "#ffffff",
                  padding: "20px",
                  borderRadius: "14px",
                  border: "1px solid #e1e8e2",
                  boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        backgroundColor: "#fed7aa",
                        color: "#9a3412",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "14px",
                      }}
                    >
                      {rev.customer_name ? rev.customer_name[0].toUpperCase() : "C"}
                    </div>
                    <div>
                      <strong style={{ fontSize: "14px", color: "#222c1d" }}>{rev.customer_name}</strong>
                      {rev.product_name && (
                        <p style={{ margin: "1px 0 0", fontSize: "12px", color: "#62746a" }}>
                          Ordered: <b>{rev.product_name}</b>
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", color: "#f59e0b", gap: "2px" }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={15} fill={s <= rev.rating ? "#f59e0b" : "none"} />
                      ))}
                    </div>
                    {rev.created_at && (
                      <span style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px", display: "block" }}>
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: "13.5px", color: "#374151", lineHeight: 1.5 }}>
                  "{rev.comment || "Great quality produce!"}"
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "50px 20px",
              borderRadius: "16px",
              border: "1px solid #e1e8e2",
              textAlign: "center",
            }}
          >
            <MessageSquare size={36} style={{ color: "#9ca3af", margin: "0 auto 10px" }} />
            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "15px", color: "#374151" }}>
              No customer reviews yet
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
              When customers complete orders and leave ratings for your vegetables, they will be listed here.
            </p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
