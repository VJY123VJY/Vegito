"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { History, CheckCircle, Clock, Truck, MapPin, RefreshCw, AlertCircle } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { listDeliveryTasks, getDeliveryProfile } from "@/lib/api/delivery";
import { getStoredUserName } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";

export default function DeliveryHistoryPage() {
  const userName = getStoredUserName();
  const profile = useQuery({ queryKey: ["delivery-profile"], queryFn: getDeliveryProfile });
  const tasks = useQuery({ queryKey: ["delivery-tasks"], queryFn: () => listDeliveryTasks() });

  const partnerName = profile.data?.name || userName || "Delivery Partner";
  const allTasks = tasks.data ?? [];

  // Filter completed or finished deliveries
  const historyTasks = allTasks.filter(
    (t) => t.status === "DELIVERED" || t.order_status === "DELIVERED" || t.status === "COMPLETED" || t.status === "FAILED"
  );

  return (
    <DashboardShell
      role="delivery"
      userName={partnerName}
      userRole="Delivery Fleet Partner"
      greeting="Delivery History"
      subtitle="Log of completed vegetable drop-offs and past routes in Solapur"
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#063c32" }}>
            Completed Delivery Log
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#62746a" }}>
            Verified customer deliveries fulfilled by your vehicle.
          </p>
        </div>

        {tasks.isLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#62746a" }}>
            <RefreshCw size={28} style={{ animation: "spin 1.5s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ margin: 0, fontWeight: 700 }}>Loading completed tasks...</p>
          </div>
        ) : tasks.isError ? (
          <div style={{ padding: "20px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "14px", color: "#991b1b" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={20} />
              <strong>Could not load history</strong>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "13px" }}>{getErrorMessage(tasks.error)}</p>
          </div>
        ) : historyTasks.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {historyTasks.map((t) => (
              <div
                key={t.id}
                style={{
                  backgroundColor: "#ffffff",
                  padding: "18px 22px",
                  borderRadius: "14px",
                  border: "1px solid #e1e8e2",
                  boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "14px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontWeight: 800, fontSize: "15px", color: "#063c32" }}>
                      Order #{t.order_number || t.order_id}
                    </span>
                    <StatusBadge status={t.status || "DELIVERED"} />
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#4b5563" }}>
                    Delivered to: <b>{t.customer_name || "Customer"}</b> · {t.delivery_address?.address_line1 || "Doorstep"}, {t.delivery_address?.city || "Solapur"}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#9ca3af" }}>
                    Origin: {t.shop_name || "Vegito Shop"} · Task #{t.id}
                  </p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#16a34a", fontSize: "13px", fontWeight: 700 }}>
                    <CheckCircle size={16} /> Verified Delivery
                  </div>
                  {t.pickup_otp_verified_at && (
                    <span style={{ display: "block", fontSize: "11px", color: "#62746a", marginTop: "2px" }}>
                      OTP Verified: {new Date(t.pickup_otp_verified_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "60px 20px",
              borderRadius: "16px",
              border: "1px solid #e1e8e2",
              textAlign: "center",
            }}
          >
            <History size={36} style={{ color: "#9ca3af", margin: "0 auto 10px" }} />
            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "15px", color: "#374151" }}>
              No completed deliveries yet
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
              When you accept orders, verify customer OTPs, and deliver to doorsteps, your completed deliveries will be logged here.
            </p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
