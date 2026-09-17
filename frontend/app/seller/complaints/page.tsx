"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Clock, ShieldAlert, RefreshCw, AlertCircle } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getSellerComplaints, getSellerProfile } from "@/lib/api/seller";
import { getErrorMessage } from "@/lib/api/client";

export default function SellerComplaintsPage() {
  const profile = useQuery({ queryKey: ["seller-profile"], queryFn: getSellerProfile });
  const complaints = useQuery({ queryKey: ["seller-complaints"], queryFn: getSellerComplaints });

  const businessName = profile.data?.business_name || "Farm Fresh Solapur";
  const complaintList = complaints.data ?? [];

  const openCount = complaintList.filter((c) => c.status === "OPEN" || c.status === "PENDING").length;

  return (
    <DashboardShell
      role="seller"
      userName={businessName}
      userRole="Verified Seller"
      greeting="Order Complaints & Grievances"
      subtitle="Issues reported on orders fulfilled by your store in Solapur"
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
              Customer Complaints
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#62746a" }}>
              Complaints submitted on orders containing items from your farm or inventory.
            </p>
          </div>

          <div
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              backgroundColor: openCount > 0 ? "#fef2f2" : "#f0fdf4",
              border: `1px solid ${openCount > 0 ? "#fecaca" : "#bbf7d0"}`,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {openCount > 0 ? (
              <AlertTriangle size={18} color="#dc2626" />
            ) : (
              <CheckCircle size={18} color="#16a34a" />
            )}
            <span style={{ fontSize: "13px", fontWeight: 700, color: openCount > 0 ? "#991b1b" : "#166534" }}>
              {openCount} Open Issue{openCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {complaints.isLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#62746a" }}>
            <RefreshCw size={28} style={{ animation: "spin 1.5s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ margin: 0, fontWeight: 700 }}>Loading complaints...</p>
          </div>
        ) : complaints.isError ? (
          <div style={{ padding: "20px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "14px", color: "#991b1b" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={20} />
              <strong>Could not load complaints</strong>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "13px" }}>{getErrorMessage(complaints.error)}</p>
          </div>
        ) : complaintList.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {complaintList.map((c) => (
              <div
                key={c.id}
                style={{
                  backgroundColor: "#ffffff",
                  padding: "20px",
                  borderRadius: "14px",
                  border: "1px solid #e1e8e2",
                  boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontWeight: 800, fontSize: "15px", color: "#063c32" }}>
                        Order #{c.order_number}
                      </span>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          backgroundColor: "#fef3c7",
                          color: "#92400e",
                          textTransform: "uppercase",
                        }}
                      >
                        {c.complaint_type.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#62746a" }}>
                      Customer: <b>{c.customer_name}</b> {c.created_at ? `· Filed on ${new Date(c.created_at).toLocaleDateString()}` : ""}
                    </p>
                  </div>

                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "11.5px",
                      fontWeight: 800,
                      backgroundColor: c.status === "RESOLVED" ? "#dcfce7" : "#fee2e2",
                      color: c.status === "RESOLVED" ? "#15803d" : "#b91c1c",
                    }}
                  >
                    {c.status}
                  </span>
                </div>

                <div style={{ backgroundColor: "#f9fafb", padding: "12px 14px", borderRadius: "8px", marginBottom: c.resolution ? "10px" : "0" }}>
                  <p style={{ margin: 0, fontSize: "13px", color: "#374151" }}>
                    <b>Issue:</b> {c.description}
                  </p>
                </div>

                {c.resolution && (
                  <div style={{ backgroundColor: "#f0fdf4", padding: "12px 14px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                    <p style={{ margin: 0, fontSize: "12.5px", color: "#166534" }}>
                      <b>Resolution:</b> {c.resolution}
                    </p>
                  </div>
                )}
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
            <ShieldAlert size={36} style={{ color: "#16a34a", margin: "0 auto 10px" }} />
            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "15px", color: "#166534" }}>
              Clean Record — No Active Complaints!
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
              None of your orders currently have any open customer complaints.
            </p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
