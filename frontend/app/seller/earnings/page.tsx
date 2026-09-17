"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, Clock, CheckCircle, ArrowDownRight, Wallet, AlertCircle, RefreshCw } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { getSellerEarnings, getSellerProfile } from "@/lib/api/seller";
import { getErrorMessage } from "@/lib/api/client";

export default function SellerEarningsPage() {
  const profile = useQuery({ queryKey: ["seller-profile"], queryFn: getSellerProfile });
  const earnings = useQuery({ queryKey: ["seller-earnings"], queryFn: getSellerEarnings });

  const businessName = profile.data?.business_name || "Farm Fresh Solapur";
  const data = earnings.data;

  return (
    <DashboardShell
      role="seller"
      userName={businessName}
      userRole="Verified Seller"
      greeting="Earnings & Payouts"
      subtitle="Track your vegetable harvest settlements, gross sales, and net revenue"
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Header summary */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#9a3412" }}>
            Revenue & Settlements Overview
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#62746a" }}>
            Transparent accounting with automated daily settlement calculation (Solapur region).
          </p>
        </div>

        {earnings.isLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#62746a" }}>
            <RefreshCw size={28} style={{ animation: "spin 1.5s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ margin: 0, fontWeight: 700 }}>Loading earnings from PostgreSQL database...</p>
          </div>
        ) : earnings.isError ? (
          <div style={{ padding: "20px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "14px", color: "#991b1b" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={20} />
              <strong>Could not load earnings data</strong>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "13px" }}>{getErrorMessage(earnings.error)}</p>
          </div>
        ) : (
          <>
            {/* Stat Cards Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "28px" }}>
              <StatCard
                label="Gross Revenue"
                value={`₹${(data?.total_revenue ?? 0).toFixed(2)}`}
                icon={<DollarSign size={20} />}
                iconBg="#e9f6ee"
                iconColor="#16835b"
              />
              <StatCard
                label="Net Payout"
                value={`₹${(data?.net_earnings ?? 0).toFixed(2)}`}
                icon={<Wallet size={20} />}
                iconBg="#fff7ed"
                iconColor="#ea580c"
              />
              <StatCard
                label="Pending Orders Value"
                value={`₹${(data?.pending_amount ?? 0).toFixed(2)}`}
                icon={<Clock size={20} />}
                iconBg="#eff6ff"
                iconColor="#2563eb"
              />
              <StatCard
                label="Platform Fee (5%)"
                value={`₹${(data?.platform_fee ?? 0).toFixed(2)}`}
                icon={<ArrowDownRight size={20} />}
                iconBg="#faf5ff"
                iconColor="#9333ea"
              />
            </div>

            {/* Transactions / Delivered Orders Table */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e1e8e2",
                boxShadow: "0 2px 10px rgba(6, 60, 50, 0.04)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "18px 22px",
                  borderBottom: "1px solid #e1e8e2",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#222c1d" }}>
                    Completed Settlements & Delivered Orders
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
                    Delivered orders eligible for bank transfer
                  </p>
                </div>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    backgroundColor: "#e8f5ec",
                    color: "#16835b",
                    padding: "4px 10px",
                    borderRadius: "999px",
                  }}
                >
                  {data?.transactions.length ?? 0} Transactions
                </span>
              </div>

              {data?.transactions && data.transactions.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f9fafb", textAlign: "left", color: "#62746a", borderBottom: "1px solid #e5e7eb" }}>
                        <th style={{ padding: "12px 20px", fontWeight: 700 }}>Order #</th>
                        <th style={{ padding: "12px 20px", fontWeight: 700 }}>Delivered Date</th>
                        <th style={{ padding: "12px 20px", fontWeight: 700 }}>Customer</th>
                        <th style={{ padding: "12px 20px", fontWeight: 700 }}>Amount</th>
                        <th style={{ padding: "12px 20px", fontWeight: 700 }}>Payment</th>
                        <th style={{ padding: "12px 20px", fontWeight: 700 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.transactions.map((tx) => (
                        <tr key={tx.order_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "14px 20px", fontWeight: 800, color: "#063c32" }}>
                            #{tx.order_number}
                          </td>
                          <td style={{ padding: "14px 20px", color: "#62746a" }}>
                            {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td style={{ padding: "14px 20px", fontWeight: 600, color: "#222c1d" }}>
                            {tx.customer_name}
                          </td>
                          <td style={{ padding: "14px 20px", fontWeight: 800, color: "#16835b" }}>
                            ₹{tx.total_amount.toFixed(2)}
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 700,
                                backgroundColor: tx.payment_status === "PAID" || tx.payment_status === "COMPLETED" ? "#dcfce7" : "#fef3c7",
                                color: tx.payment_status === "PAID" || tx.payment_status === "COMPLETED" ? "#166534" : "#92400e",
                              }}
                            >
                              {tx.payment_method} · {tx.payment_status}
                            </span>
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            <StatusBadge status={tx.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "48px 20px" }}>
                  <DollarSign size={36} style={{ color: "#9ca3af", margin: "0 auto 10px" }} />
                  <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "14px", color: "#374151" }}>
                    No completed order settlements yet
                  </p>
                  <p style={{ margin: 0, fontSize: "12.5px", color: "#6b7280" }}>
                    When your active vegetable orders are delivered to customers, your revenue and settlement history will appear here.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
