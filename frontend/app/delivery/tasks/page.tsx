"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Truck,
  Phone,
  MapPin,
  CheckCircle,
  Clock,
  Compass,
  KeyRound,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Package,
  Bell,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  listDeliveryTasks,
  acceptDeliveryOrder,
  verifyPickupOtp,
  startDeliveryOrder,
  completeDelivery,
  getDeliveryProfile,
  subscribeToDeliveryDashboard,
  type DeliveryPackedPayload,
  DeliveryTask,
} from "@/lib/api/delivery";
import { getErrorMessage } from "@/lib/api/client";
import { getStoredUserName, getStoredToken } from "@/lib/api/auth";
import { playNotificationSound, playNotificationSoundOnce } from "@/lib/audio/chime";

export default function DeliveryTasksPage() {
  const queryClient = useQueryClient();
  const userName = getStoredUserName();

  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [pickupOtpInput, setPickupOtpInput] = useState<{ [orderId: number]: string }>({});
  const [deliveryOtpInput, setDeliveryOtpInput] = useState<{ [taskId: number]: string }>({});
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [assignedAlert, setAssignedAlert] = useState<DeliveryPackedPayload | null>(null);

  const profile = useQuery({ queryKey: ["delivery-profile"], queryFn: getDeliveryProfile });
  const tasks = useQuery({
    queryKey: ["delivery-tasks"],
    queryFn: () => listDeliveryTasks(),
    refetchInterval: 10000,
  });

  // Real-time WebSocket connection to receive DELIVERY_ASSIGNED / ORDER_PACKED
  useEffect(() => {
    const token = getStoredToken() || "";
    if (!token) return;

    const cleanup = subscribeToDeliveryDashboard(token, {
      onOrderPacked: async (notification) => {
        queryClient.invalidateQueries({ queryKey: ["delivery-tasks"] });
        setAssignedAlert(notification);
        try {
          await playNotificationSoundOnce(
            notification.event_id || `task-${notification.order_id}-${notification.status}`
          );
        } catch {
          // ignore audio restriction
        }
      },
      onPendingOrders: (orders) => {
        queryClient.invalidateQueries({ queryKey: ["delivery-tasks"] });
        if (orders && orders.length > 0) {
          setAssignedAlert(orders[0]);
        }
      },
    });

    return () => cleanup();
  }, [queryClient]);

  const allTasks = tasks.data ?? [];
  const filteredTasks = filterStatus === "ALL"
    ? allTasks
    : allTasks.filter((t) => {
        const s = t.order_status || t.status;
        if (filterStatus === "READY_FOR_PICKUP") {
          return s === "READY_FOR_PICKUP" || s === "READY" || t.status === "ASSIGNED";
        }
        return t.status === filterStatus || t.order_status === filterStatus;
      });

  // Mutations
  const acceptMutation = useMutation({
    mutationFn: (orderId: number) => acceptDeliveryOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-tasks"] });
      setFeedback({ type: "success", text: "Order accepted for delivery!" });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err) => {
      setFeedback({ type: "error", text: getErrorMessage(err) });
      setTimeout(() => setFeedback(null), 3500);
    },
  });

  const verifyPickupMutation = useMutation({
    mutationFn: ({ orderId, otp }: { orderId: number; otp: string }) => verifyPickupOtp(orderId, otp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-tasks"] });
      setFeedback({ type: "success", text: "✓ Pickup OTP verified! Produce picked up from shop." });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err) => {
      setFeedback({ type: "error", text: getErrorMessage(err) });
      setTimeout(() => setFeedback(null), 3500);
    },
  });

  const startDeliveryMutation = useMutation({
    mutationFn: (orderId: number) => startDeliveryOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-tasks"] });
      setFeedback({ type: "success", text: "Order is now OUT FOR DELIVERY! Live GPS streaming active." });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err) => {
      setFeedback({ type: "error", text: getErrorMessage(err) });
      setTimeout(() => setFeedback(null), 3500);
    },
  });

  const completeDeliveryMutation = useMutation({
    mutationFn: ({ taskId, otp }: { taskId: number; otp: string }) => completeDelivery(taskId, otp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-tasks"] });
      setFeedback({ type: "success", text: "✓ Delivery completed successfully! Delivered to customer." });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err) => {
      setFeedback({ type: "error", text: getErrorMessage(err) });
      setTimeout(() => setFeedback(null), 3500);
    },
  });

  const partnerName = profile.data?.name || userName || "Delivery Partner";

  return (
    <DashboardShell
      role="delivery"
      userName={partnerName}
      userRole="Delivery Fleet Partner"
      greeting="My Assigned Deliveries"
      subtitle="Fulfill assigned vegetable harvest deliveries across Solapur"
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* Toast Feedback */}
        {feedback && (
          <div
            style={{
              marginBottom: "18px",
              padding: "12px 18px",
              borderRadius: "12px",
              backgroundColor: feedback.type === "success" ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${feedback.type === "success" ? "#bbf7d0" : "#fecaca"}`,
              color: feedback.type === "success" ? "#166534" : "#991b1b",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "13.5px",
              fontWeight: 700,
            }}
          >
            {feedback.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          </div>
        )}

        {/* Real-time Order Assignment Alert */}
        {assignedAlert && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 20px",
              borderRadius: "14px",
              marginBottom: "18px",
              backgroundColor: "#ecfdf5",
              border: "2px solid #10b981",
              color: "#065f46",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.15)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "22px" }}>🔔</span>
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: "14.5px", color: "#064e3b" }}>
                  NEW DELIVERY ASSIGNED: Order #{assignedAlert.order_number}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#047857" }}>
                  Pickup from: <strong>{assignedAlert.shop_name || "Vegito Fresh Farm"}</strong> · Amount: <strong>₹{assignedAlert.total_amount}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={() => setAssignedAlert(null)}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                backgroundColor: "#059669",
                color: "#ffffff",
                border: "none",
                fontWeight: 700,
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", overflowX: "auto", paddingBottom: "4px" }}>
          {[
            { label: "All Tasks", val: "ALL" },
            { label: "Ready for Pickup", val: "READY_FOR_PICKUP" },
            { label: "Picked Up", val: "PICKED_UP" },
            { label: "Out for Delivery", val: "OUT_FOR_DELIVERY" },
            { label: "Delivered", val: "DELIVERED" },
          ].map((tab) => (
            <button
              key={tab.val}
              onClick={() => setFilterStatus(tab.val)}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                border: "none",
                fontSize: "12.5px",
                fontWeight: filterStatus === tab.val ? 700 : 500,
                backgroundColor: filterStatus === tab.val ? "#063c32" : "#ffffff",
                color: filterStatus === tab.val ? "#ffffff" : "#4b5563",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {tasks.isLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#62746a" }}>
            <RefreshCw size={28} style={{ animation: "spin 1.5s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ margin: 0, fontWeight: 700 }}>Fetching assigned deliveries...</p>
          </div>
        ) : tasks.isError ? (
          <div style={{ padding: "20px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "14px", color: "#991b1b" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={20} />
              <strong>Could not load deliveries</strong>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "13px" }}>{getErrorMessage(tasks.error)}</p>
          </div>
        ) : filteredTasks.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {filteredTasks.map((t) => {
              const currentStatus = t.order_status || t.status;
              const isReadyForPickup = currentStatus === "READY_FOR_PICKUP" || currentStatus === "READY";
              const isPickedUp = currentStatus === "PICKED_UP";
              const isOutForDelivery = currentStatus === "OUT_FOR_DELIVERY";
              const isDelivered = currentStatus === "DELIVERED";

              return (
                <div
                  key={t.id}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #e1e8e2",
                    boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
                    padding: "20px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
                          Order #{t.order_number || t.order_id}
                        </span>
                        <StatusBadge status={currentStatus} />
                      </div>
                      <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "#62746a" }}>
                        Task ID: #{t.id}
                      </p>
                    </div>

                    <Link
                      href="/delivery/live-map"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        backgroundColor: "#e8f5ec",
                        color: "#16835b",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      <Compass size={14} /> Open Live Map
                    </Link>
                  </div>

                  {/* Customer & Shop Details */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px", marginBottom: "16px" }}>
                    {/* Shop */}
                    <div style={{ backgroundColor: "#f9fafb", padding: "12px 14px", borderRadius: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#9a3412", fontWeight: 700, fontSize: "12px", marginBottom: "4px" }}>
                        <Package size={14} /> Pickup Origin
                      </div>
                      <strong style={{ fontSize: "13.5px", color: "#111827", display: "block" }}>
                        {t.shop_name || "Vegito Organic Hub"}
                      </strong>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6b7280" }}>
                        {t.shop_address || "Solapur Agricultural Market"}
                      </p>
                    </div>

                    {/* Customer */}
                    <div style={{ backgroundColor: "#f9fafb", padding: "12px 14px", borderRadius: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#16835b", fontWeight: 700, fontSize: "12px", marginBottom: "4px" }}>
                        <MapPin size={14} /> Delivery Destination
                      </div>
                      <strong style={{ fontSize: "13.5px", color: "#111827", display: "block" }}>
                        {t.customer_name || "Customer"}
                      </strong>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6b7280" }}>
                        {t.delivery_address?.address_line1 || "Doorstep Address"}, {t.delivery_address?.city || "Solapur"} {t.delivery_address?.pincode || ""}
                      </p>
                      {t.customer_phone && (
                        <a
                          href={`tel:${t.customer_phone}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            marginTop: "6px",
                            color: "#0284c7",
                            fontSize: "12px",
                            fontWeight: 700,
                            textDecoration: "none",
                          }}
                        >
                          <Phone size={12} /> Call {t.customer_phone}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "14px" }}>
                    {isReadyForPickup && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "12.5px", color: "#475569" }}>
                            Assigned Pickup Verification Code:
                          </span>
                          <span
                            style={{
                              padding: "4px 10px",
                              backgroundColor: "#ffedd5",
                              border: "1px dashed #ea580c",
                              borderRadius: "6px",
                              fontWeight: 800,
                              fontSize: "13.5px",
                              color: "#9a3412",
                              letterSpacing: "1px",
                              fontFamily: "monospace",
                            }}
                          >
                            {t.pickup_otp || "------"}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#9a3412" }}>
                            Verify Code from Seller:
                          </span>
                          <input
                            type="text"
                            placeholder="Enter 6-digit code"
                            maxLength={10}
                            value={pickupOtpInput[t.order_id] !== undefined ? pickupOtpInput[t.order_id] : (t.pickup_otp || "")}
                            onChange={(e) => setPickupOtpInput({ ...pickupOtpInput, [t.order_id]: e.target.value })}
                            style={{
                              padding: "7px 12px",
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "13px",
                              width: "200px",
                              fontWeight: 700,
                              letterSpacing: "1px",
                            }}
                          />
                          <button
                            onClick={() => verifyPickupMutation.mutate({ orderId: t.order_id, otp: pickupOtpInput[t.order_id] ?? t.pickup_otp ?? "" })}
                            disabled={verifyPickupMutation.isPending || !(pickupOtpInput[t.order_id] || t.pickup_otp)}
                            style={{
                              padding: "8px 16px",
                              borderRadius: "8px",
                              border: "none",
                              backgroundColor: "#ea580c",
                              color: "#ffffff",
                              fontSize: "12.5px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            {verifyPickupMutation.isPending ? "Verifying..." : "Verify & Pickup"}
                          </button>
                        </div>
                      </div>
                    )}

                    {isPickedUp && (
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "12.5px", color: "#166534", fontWeight: 700 }}>
                          ✓ Order is with you. Ready to head to customer doorstep?
                        </span>
                        <button
                          onClick={() => startDeliveryMutation.mutate(t.order_id)}
                          disabled={startDeliveryMutation.isPending}
                          style={{
                            padding: "8px 18px",
                            borderRadius: "8px",
                            border: "none",
                            backgroundColor: "#16835b",
                            color: "#ffffff",
                            fontSize: "13px",
                            fontWeight: 800,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <Truck size={16} /> Start Delivery to Customer
                        </button>
                      </div>
                    )}

                    {isOutForDelivery && (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#16835b" }}>
                          Customer Doorstep OTP:
                        </span>
                        <input
                          type="text"
                          placeholder="Customer 6-digit OTP"
                          maxLength={6}
                          value={deliveryOtpInput[t.id] || ""}
                          onChange={(e) => setDeliveryOtpInput({ ...deliveryOtpInput, [t.id]: e.target.value })}
                          style={{
                            padding: "7px 12px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            fontSize: "13px",
                            width: "180px",
                            fontWeight: 700,
                            letterSpacing: "1px",
                          }}
                        />
                        <button
                          onClick={() => completeDeliveryMutation.mutate({ taskId: t.id, otp: deliveryOtpInput[t.id] || "" })}
                          disabled={completeDeliveryMutation.isPending || !deliveryOtpInput[t.id]}
                          style={{
                            padding: "8px 18px",
                            borderRadius: "8px",
                            border: "none",
                            backgroundColor: "#15803d",
                            color: "#ffffff",
                            fontSize: "13px",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          Complete Delivery
                        </button>
                      </div>
                    )}

                    {isDelivered && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#15803d", fontSize: "13px", fontWeight: 700 }}>
                        <CheckCircle size={16} /> Delivered successfully
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
            <Truck size={38} style={{ color: "#9ca3af", margin: "0 auto 10px" }} />
            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "15px", color: "#374151" }}>
              No deliveries assigned yet
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
              When a seller packs an order and marks it ready, new delivery tasks will appear here in real time.
            </p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
