"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Star,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Package,
  Heart,
  Calendar,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { RoleGuard } from "@/components/role/role-guard";
import { getDeliveryPartnerReviews } from "@/lib/api/reviews";
import { getStoredUserName } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";

export default function DeliveryReviewsPage() {
  const [partnerName, setPartnerName] = useState("Delivery Partner");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setPartnerName(getStoredUserName() || "Delivery Partner");
  }, []);

  const reviewsQuery = useQuery({
    queryKey: ["delivery-partner-reviews"],
    queryFn: getDeliveryPartnerReviews,
  });

  const data = reviewsQuery.data;
  const avgRating = data?.average_rating ?? 5.0;
  const totalReviews = data?.total_reviews ?? 0;
  const reviews = data?.reviews ?? [];

  return (
    <RoleGuard allow={["DELIVERY_PARTNER", "ADMIN", "SUPER_ADMIN"]}>
      <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--vegito-bg, #f4f7f3)" }}>
        {/* Sidebar */}
        <DashboardSidebar
          role="delivery"
          isOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />

        {/* Main Area */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <DashboardHeader
            role="delivery"
            userName={partnerName}
            userRole="Delivery Partner"
            greeting={`Reviews & Ratings 🌟`}
            subtitle="Customer feedback for your doorstep deliveries"
            searchPlaceholder="Search reviews..."
            onMenuToggle={() => setMobileOpen(!mobileOpen)}
          />

          <main style={{ flex: 1, padding: "24px 28px 48px", overflowY: "auto" }}>
            <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
              {/* Header Title & Rating Overview */}
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
                  <h2 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 800, color: "#1e3a8a" }}>
                    Your Delivery Performance & Reviews
                  </h2>
                  <p style={{ margin: 0, fontSize: "13.5px", color: "#62746a" }}>
                    Verified customer feedback from completed Vegito deliveries (Read-only).
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    backgroundColor: "#ffffff",
                    border: "1.5px solid #fef3c7",
                    borderRadius: "16px",
                    padding: "12px 20px",
                    boxShadow: "0 4px 12px rgba(245, 158, 11, 0.1)",
                  }}
                >
                  <div style={{ display: "flex", color: "#f59e0b" }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={20}
                        fill={s <= Math.round(avgRating) ? "#f59e0b" : "none"}
                      />
                    ))}
                  </div>
                  <div>
                    <span style={{ fontSize: "20px", fontWeight: 900, color: "#92400e" }}>
                      {avgRating.toFixed(1)}
                    </span>
                    <span style={{ fontSize: "12.5px", color: "#78716c", marginLeft: "6px" }}>
                      ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
                    </span>
                  </div>
                </div>
              </div>

              {/* Service Highlights Cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "14px",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "#ffffff",
                    borderRadius: "14px",
                    border: "1px solid #bbf7d0",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      backgroundColor: "#f0fdf4",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                    }}
                  >
                    ⚡
                  </div>
                  <div>
                    <strong style={{ fontSize: "13.5px", color: "#166534", display: "block" }}>
                      On-Time Delivery
                    </strong>
                    <small style={{ color: "#64748b", fontSize: "11.5px" }}>Prompt doorstep arrivals</small>
                  </div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "#ffffff",
                    borderRadius: "14px",
                    border: "1px solid #bfdbfe",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      backgroundColor: "#eff6ff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                    }}
                  >
                    🤝
                  </div>
                  <div>
                    <strong style={{ fontSize: "13.5px", color: "#1e40af", display: "block" }}>
                      Polite Behavior
                    </strong>
                    <small style={{ color: "#64748b", fontSize: "11.5px" }}>Courteous customer service</small>
                  </div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "#ffffff",
                    borderRadius: "14px",
                    border: "1px solid #e9d5ff",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      backgroundColor: "#faf5ff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                    }}
                  >
                    📦
                  </div>
                  <div>
                    <strong style={{ fontSize: "13.5px", color: "#6b21a8", display: "block" }}>
                      Package Condition
                    </strong>
                    <small style={{ color: "#64748b", fontSize: "11.5px" }}>Sealed fresh vegetable bags</small>
                  </div>
                </div>
              </div>

              {/* Reviews List */}
              {reviewsQuery.isLoading ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#62746a" }}>
                  <RefreshCw size={28} style={{ animation: "spin 1.5s linear infinite", margin: "0 auto 12px" }} />
                  <p style={{ margin: 0, fontWeight: 700 }}>Loading customer reviews...</p>
                </div>
              ) : reviewsQuery.isError ? (
                <div
                  style={{
                    padding: "20px",
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "14px",
                    color: "#991b1b",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <AlertCircle size={20} />
                    <strong>Could not load reviews</strong>
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: "13px" }}>
                    {getErrorMessage(reviewsQuery.error)}
                  </p>
                </div>
              ) : reviews.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      style={{
                        backgroundColor: "#ffffff",
                        padding: "20px",
                        borderRadius: "16px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "10px",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              backgroundColor: "#dbeafe",
                              color: "#1d4ed8",
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
                            <strong style={{ fontSize: "14px", color: "#1e293b" }}>
                              {rev.customer_name || "Verified Customer"}
                            </strong>
                            <p style={{ margin: "1px 0 0", fontSize: "12px", color: "#64748b" }}>
                              Delivered Order #{rev.order_id}
                            </p>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", color: "#f59e0b", gap: "2px" }}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={15}
                                fill={s <= (rev.delivery_rating ?? 5) ? "#f59e0b" : "none"}
                              />
                            ))}
                          </div>
                          {rev.created_at && (
                            <span style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px", display: "block" }}>
                              {new Date(rev.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <p style={{ margin: 0, fontSize: "13.5px", color: "#334155", lineHeight: 1.5 }}>
                        "{rev.comment || "Prompt and polite delivery partner!"}"
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "16px",
                    border: "1px dashed #cbd5e1",
                    padding: "48px 24px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "16px",
                      backgroundColor: "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 16px",
                      color: "#64748b",
                    }}
                  >
                    <MessageSquare size={24} />
                  </div>
                  <h3 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 800, color: "#1e293b" }}>
                    No customer reviews yet
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "#64748b", maxWidth: "380px", marginInline: "auto" }}>
                    Once customers receive their orders and rate their delivery experience, ratings and comments will appear here.
                  </p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
