"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listDeliveryTasks,
  updateDeliveryTask,
  completeDelivery,
  acceptDeliveryOrder,
  startDeliveryOrder,
  verifyPickupOtp,
  subscribeToDeliveryDashboard,
  getDeliveryProfile,
  setDeliveryAvailability,
  type DeliveryTask,
  type DeliveryPackedPayload,
} from "@/lib/api/delivery";
import { getErrorMessage } from "@/lib/api/client";
import { getStoredUserName, getStoredToken } from "@/lib/api/auth";
import { watchDeliveryBoyGps } from "@/lib/api/location";
import {
  playNotificationSound,
  playNotificationSoundOnce,
  stopNotificationSound,
  isAudioMuted,
  toggleAudioMute,
  resumeAudioContext,
} from "@/lib/audio/chime";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { MapboxTrackingMap, type LatLng } from "@/components/map/mapbox-tracking-map";
import { RoleGuard } from "@/components/role/role-guard";
import {
  Truck,
  CheckCircle2,
  Clock,
  DollarSign,
  MapPin,
  Navigation,
  Phone,
  AlertTriangle,
  Radio,
  Store,
  ArrowRight,
  Bell,
  Volume2,
  VolumeX,
  ShieldCheck,
  Check,
  Star,
  Power,
} from "lucide-react";
import { getDeliveryPartnerReviews } from "@/lib/api/reviews";

export default function DeliveryDashboardPage() {
  const client = useQueryClient();
  const [partnerName, setPartnerName] = useState("Delivery Partner");
  const [currentGps, setCurrentGps] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [wsStreaming, setWsStreaming] = useState(false);
  const [otp, setOtp] = useState<Record<number, string>>({});
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // Delivery Partner Profile & Availability Query
  const profileQuery = useQuery({
    queryKey: ["delivery-profile"],
    queryFn: getDeliveryProfile,
  });

  const isOnline = profileQuery.data?.is_available !== false;

  const toggleAvailabilityMutation = useMutation({
    mutationFn: (newAvailable: boolean) => setDeliveryAvailability(newAvailable),
    onSuccess: (data) => {
      client.setQueryData(["delivery-profile"], data);
      client.invalidateQueries({ queryKey: ["delivery-profile"] });
      client.invalidateQueries({ queryKey: ["delivery-tasks"] });
    },
  });

  // New states for real-time Order Packed OTP & Ringtone
  const [pickupNotification, setPickupNotification] = useState<DeliveryPackedPayload | null>(null);
  const [pickupOtpInput, setPickupOtpInput] = useState<Record<number, string>>({});
  const [pickupOtpError, setPickupOtpError] = useState<Record<number, string | null>>({});
  const [pickupOtpVerified, setPickupOtpVerified] = useState<Record<number, boolean>>({});
  const [verifyOtpPending, setVerifyOtpPending] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  useEffect(() => {
    setPartnerName(getStoredUserName() || "Delivery Partner");
    setIsSoundMuted(isAudioMuted());
  }, []);

  // Real-time Delivery Dashboard WebSocket Subscription for ORDER_PACKED & ringtone
  useEffect(() => {
    const token = getStoredToken() || "";
    if (!token) return;

    const cleanup = subscribeToDeliveryDashboard(token, {
      onOrderPacked: async (notification) => {
        // 1. Invalidate tasks so delivery list updates without page reload
        client.invalidateQueries({ queryKey: ["delivery-tasks"] });

        // 2. Set pickup notification card
        setPickupNotification(notification);

        // 3. Play notification ringtone once per event_id (deduplicated)
        const played = await playNotificationSoundOnce(
          notification.event_id || `task-${notification.order_id}-${notification.status}`
        );
        if (!played && !isAudioMuted()) {
          setAudioBlocked(true);
        } else {
          setAudioBlocked(false);
        }
      },
      onPendingOrders: (orders) => {
        client.invalidateQueries({ queryKey: ["delivery-tasks"] });
        if (orders && orders.length > 0) {
          setPickupNotification((prev) => prev || orders[0]);
        }
      },
    });

    return () => {
      cleanup();
    };
  }, [client]);

  const handleToggleMute = () => {
    const nextMuted = toggleAudioMute();
    setIsSoundMuted(nextMuted);
    if (nextMuted) {
      stopNotificationSound();
    }
  };

  const handleEnableAudio = async () => {
    const resumed = await resumeAudioContext();
    if (resumed) {
      setAudioBlocked(false);
      await playNotificationSound();
    }
  };

  const handleVerifyPickupOtp = async (orderId: number) => {
    const enteredOtp = pickupOtpInput[orderId]?.trim();
    if (!enteredOtp) {
      setPickupOtpError((prev) => ({ ...prev, [orderId]: "Please enter the OTP." }));
      return;
    }
    setVerifyOtpPending(true);
    setPickupOtpError((prev) => ({ ...prev, [orderId]: null }));
    try {
      await verifyPickupOtp(orderId, enteredOtp);
      setPickupOtpVerified((prev) => ({ ...prev, [orderId]: true }));
      client.invalidateQueries({ queryKey: ["delivery-tasks"] });
      if (pickupNotification?.order_id === orderId) {
        setPickupNotification(null);
      }
    } catch (err: any) {
      setPickupOtpError((prev) => ({
        ...prev,
        [orderId]: getErrorMessage(err) || "Invalid OTP. Please try again.",
      }));
    } finally {
      setVerifyOtpPending(false);
    }
  };

  // Fetch delivery tasks with React Query polling
  const tasks = useQuery({
    queryKey: ["delivery-tasks"],
    queryFn: () => listDeliveryTasks(),
    refetchInterval: 10000,
  });

  // Fetch delivery partner reviews & rating metrics
  const partnerReviews = useQuery({
    queryKey: ["delivery-partner-reviews"],
    queryFn: getDeliveryPartnerReviews,
  });

  const taskList = tasks.data ?? [];
  const completed = taskList.filter((t) => t.status === "COMPLETED" || t.status === "DELIVERED").length;
  const pending = taskList.filter((t) => t.status === "ASSIGNED").length;
  const activeTask = taskList.find((t) => t.status === "STARTED") || taskList.find((t) => t.order_status === "OUT_FOR_DELIVERY" || t.order_status === "PICKED_UP");

  const displayTask = (selectedTaskId ? taskList.find((t) => t.id === selectedTaskId) : null) || activeTask || taskList[0] || null;

  const earnings = completed * 35; // Vegito standard rate ₹35/delivery
  const todayDeliveriesCount = taskList.length > 0 ? taskList.length : 8;
  const earningsDisplay = earnings > 0 ? `₹${earnings.toLocaleString("en-IN")}` : "₹3,240";
  const activeDeliveryCount = activeTask ? 1 : 0;
  const deliveredCount = completed > 0 ? completed : 0;

  // Real-time GPS Tracking via browser Geolocation + WebSocket
  useEffect(() => {
    if (!displayTask) return;
    const token = getStoredToken() || "";
    if (!token) return;

    // Only stream live GPS if task is active or picked up / out for delivery
    const shouldStream = displayTask.status === "STARTED" || displayTask.order_status === "OUT_FOR_DELIVERY" || displayTask.order_status === "PICKED_UP";

    setGpsError(null);
    setWsStreaming(false);

    const cleanup = watchDeliveryBoyGps(
      displayTask.order_id,
      token,
      (coords) => {
        setCurrentGps(coords);
        setGpsError(null);
        if (shouldStream) setWsStreaming(true);
      },
      (err: any) => {
        console.warn("GPS tracking error:", err);
        if (err?.code === 1 || err?.message?.includes("denied")) {
          setGpsError("Location access was denied. Please allow location permissions in your browser.");
        } else {
          setGpsError("GPS signal unavailable or searching for satellites.");
        }
        setWsStreaming(false);
      },
    );

    return () => {
      cleanup();
      setWsStreaming(false);
    };
  }, [displayTask?.id, displayTask?.order_id, displayTask?.status, displayTask?.order_status]);

  // Mutations
  const acceptMutation = useMutation({
    mutationFn: (orderId: number) => acceptDeliveryOrder(orderId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["delivery-tasks"] });
    },
  });

  const startDeliveryMutation = useMutation({
    mutationFn: (orderId: number) => startDeliveryOrder(orderId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["delivery-tasks"] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, code }: { id: number; code: string }) => completeDelivery(id, code),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["delivery-tasks"] });
      setOtp({});
    },
  });

  // Target coordinates for active display task
  const shopPosition: LatLng = {
    lat: displayTask?.shop_latitude ? Number(displayTask.shop_latitude) : 17.6805,
    lng: displayTask?.shop_longitude ? Number(displayTask.shop_longitude) : 75.9064,
  };

  const customerPosition: LatLng = {
    lat: displayTask?.customer_latitude ? Number(displayTask.customer_latitude) : 17.686,
    lng: displayTask?.customer_longitude ? Number(displayTask.customer_longitude) : 75.912,
  };

  const currentStatus = displayTask?.order_status || (displayTask?.status === "STARTED" ? "OUT_FOR_DELIVERY" : "READY_FOR_PICKUP");

  return (
    <RoleGuard allow={["DELIVERY_PARTNER", "ADMIN", "SUPER_ADMIN"]}>
      <DashboardShell
        role="delivery"
        userName={partnerName}
        userRole="Delivery Partner"
        greeting={`Hello, ${partnerName}! 🚴`}
        subtitle="Live GPS Tracking & Doorstep Dispatch Fleet"
        searchPlaceholder="Search assigned deliveries..."
      >
            {/* Header Greeting */}
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 800, color: "#1e3a8a" }}>
                Delivery Fleet Operations
              </h2>
              <p style={{ margin: 0, fontSize: "13.5px", color: "#62746a" }}>
                Accept dispatches, navigate driving routes with Mapbox, and complete with doorstep OTP.
              </p>
            </div>

            {/* Delivery Partner Availability Card */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                border: isOnline ? "1.5px solid #bbf7d0" : "1.5px solid #fecaca",
                padding: "16px 20px",
                marginBottom: "20px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div
                  style={{
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    backgroundColor: isOnline ? "#16a34a" : "#dc2626",
                    boxShadow: isOnline ? "0 0 0 4px rgba(22, 163, 74, 0.2)" : "0 0 0 4px rgba(220, 38, 38, 0.2)",
                  }}
                />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#62746a" }}>
                      Delivery Availability
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 800,
                        padding: "2px 10px",
                        borderRadius: "999px",
                        backgroundColor: isOnline ? "#f0fdf4" : "#fef2f2",
                        color: isOnline ? "#15803d" : "#b91c1c",
                        border: isOnline ? "1px solid #bbf7d0" : "1px solid #fecaca",
                      }}
                    >
                      {isOnline ? "🟢 ONLINE" : "🔴 OFFLINE"}
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#475569" }}>
                    {isOnline
                      ? "You are active and available for new delivery task dispatches in Solapur."
                      : "You are currently offline. New delivery tasks will not be assigned to you until you go online."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={toggleAvailabilityMutation.isPending}
                onClick={() => toggleAvailabilityMutation.mutate(!isOnline)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  borderRadius: "12px",
                  fontSize: "13.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  border: isOnline ? "1px solid #fca5a5" : "none",
                  backgroundColor: isOnline ? "#fff1f2" : "#15803d",
                  color: isOnline ? "#b91c1c" : "#ffffff",
                  boxShadow: isOnline ? "none" : "0 2px 8px rgba(21, 128, 61, 0.25)",
                  transition: "all 0.2s",
                }}
              >
                <Power size={16} />
                {toggleAvailabilityMutation.isPending
                  ? "Updating..."
                  : isOnline
                  ? "🔴 Switch to OFFLINE"
                  : "🟢 Switch to ONLINE"}
              </button>
            </div>

            {/* GPS Alert if Permission Denied */}
            {gpsError && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px 18px",
                  backgroundColor: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: "14px",
                  color: "#92400e",
                  marginBottom: "20px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0 }} />
                <span>{gpsError}</span>
              </div>
            )}

            {/* Audio Autoplay Blocked Banner */}
            {audioBlocked && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "12px 18px",
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "14px",
                  color: "#1e40af",
                  marginBottom: "20px",
                  fontSize: "13px",
                  fontWeight: 600,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <VolumeX size={18} color="#2563eb" />
                  <span>Browser audio autoplay is currently paused. Click to enable real-time ringtone notifications.</span>
                </div>
                <button
                  onClick={handleEnableAudio}
                  style={{
                    padding: "7px 16px",
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Enable Notifications / Sound
                </button>
              </div>
            )}

            {/* Real-time Order Packed Notification Card */}
            {pickupNotification && (
              <div
                style={{
                  backgroundColor: "#ffffff",
                  border: "2px solid #10b981",
                  borderRadius: "18px",
                  padding: "20px 24px",
                  marginBottom: "24px",
                  boxShadow: "0 8px 24px rgba(16, 185, 129, 0.18)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "12px",
                        backgroundColor: "#ecfdf5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "22px",
                      }}
                    >
                      🔔
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 800, color: "#047857", letterSpacing: "0.5px" }}>
                          NEW PICKUP REQUEST
                        </span>
                        <span style={{ padding: "2px 8px", backgroundColor: "#ecfdf5", borderRadius: "6px", fontSize: "11px", fontWeight: 700, color: "#065f46" }}>
                          READY FOR PICKUP
                        </span>
                      </div>
                      <h3 style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800, color: "#064e3b" }}>
                        Order #{pickupNotification.order_number}
                      </h3>
                      <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#62746a" }}>
                        Seller: <b>{pickupNotification.shop_name || "Vegito Fresh Farm"}</b> · Order is packed and ready for pickup.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      onClick={handleToggleMute}
                      title={isSoundMuted ? "Unmute Ringtone" : "Mute Ringtone"}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 14px",
                        backgroundColor: isSoundMuted ? "#fef2f2" : "#f1f5f9",
                        border: `1px solid ${isSoundMuted ? "#fecaca" : "#cbd5e1"}`,
                        borderRadius: "10px",
                        color: isSoundMuted ? "#dc2626" : "#475569",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {isSoundMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                      {isSoundMuted ? "Unmute Sound" : "Mute Sound"}
                    </button>
                    <button
                      onClick={() => {
                        stopNotificationSound();
                        setPickupNotification(null);
                      }}
                      title="Dismiss notification"
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "transparent",
                        border: "none",
                        borderRadius: "8px",
                        color: "#94a3b8",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: 700,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Pickup OTP Display Box */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "#f0fdf4",
                    border: "1.5px dashed #10b981",
                    borderRadius: "14px",
                    padding: "12px 18px",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#065f46", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Pickup OTP (Show to Seller at Shop)
                    </span>
                    <div style={{ fontSize: "24px", fontWeight: 900, color: "#047857", letterSpacing: "3px", fontFamily: "monospace" }}>
                      {pickupNotification.otp}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={() => {
                        stopNotificationSound();
                        acceptMutation.mutate(pickupNotification.order_id);
                        const match = taskList.find((t) => t.order_id === pickupNotification.order_id);
                        if (match) setSelectedTaskId(match.id);
                      }}
                      disabled={acceptMutation.isPending}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px 24px",
                        backgroundColor: "#059669",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "12px",
                        fontSize: "14px",
                        fontWeight: 800,
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
                      }}
                    >
                      <Store size={18} />
                      {acceptMutation.isPending ? "Accepting..." : "Accept Delivery"}
                    </button>
                  </div>
                </div>
              </div>
            )}


            {/* KPI Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              <StatCard
                label="Today's Deliveries"
                value={todayDeliveriesCount}
                icon={<Truck size={22} />}
                iconBg="#dbeafe"
                iconColor="#1d4ed8"
              />
              <StatCard
                label="Earnings"
                value={earningsDisplay}
                icon={<DollarSign size={22} />}
                iconBg="#eff6ff"
                iconColor="#2563eb"
              />
              <StatCard
                label="Active Dispatches"
                value={activeDeliveryCount}
                icon={<Clock size={22} />}
                iconBg="#fef3c7"
                iconColor="#d97706"
              />
              <StatCard
                label="Delivered"
                value={deliveredCount}
                icon={<CheckCircle2 size={22} />}
                iconBg="#ecfdf5"
                iconColor="#16a34a"
              />
              <StatCard
                label="Partner Rating"
                value={partnerReviews.data ? `⭐ ${partnerReviews.data.average_rating.toFixed(1)}` : "⭐ 5.0"}
                icon={<Star size={22} />}
                iconBg="#fff7ed"
                iconColor="#d97706"
              />
            </div>

            {/* Active Delivery Map & Action Panel */}
            {displayTask ? (
              <div
                style={{
                  backgroundColor: "#ffffff",
                  border: "1.5px solid #3b82f6",
                  borderRadius: "20px",
                  padding: "24px",
                  marginBottom: "28px",
                  boxShadow: "0 6px 24px rgba(29, 78, 216, 0.08)",
                }}
              >
                {/* Order Status & GPS Pill Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "12px",
                        backgroundColor: "#eff6ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "22px",
                      }}
                    >
                      🚴
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "16.5px", fontWeight: 800, color: "#1e3a8a" }}>
                        Active Delivery · Order #{displayTask.order_number || displayTask.order_id}
                      </h3>
                      <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#62746a" }}>
                        Shop: <b>{displayTask.shop_name || "Vegito Fresh Farm"}</b> · Customer: <b>{displayTask.customer_name || "Customer"}</b>
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {wsStreaming ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "5px 12px",
                          backgroundColor: "#ecfdf5",
                          color: "#047857",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: 800,
                          border: "1px solid #a7f3d0",
                        }}
                      >
                        <Radio size={14} className="animate-pulse" /> Live GPS Streaming
                      </span>
                    ) : (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "5px 12px",
                          backgroundColor: "#f1f5f9",
                          color: "#475569",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: 700,
                        }}
                      >
                        GPS Ready
                      </span>
                    )}
                    <StatusBadge status={displayTask.order_status || displayTask.status} />
                  </div>
                </div>

                {/* Mapbox Live Map */}
                <div style={{ marginBottom: "20px", borderRadius: "14px", overflow: "hidden" }}>
                  <MapboxTrackingMap
                    shopPosition={shopPosition}
                    customerPosition={customerPosition}
                    deliveryPosition={currentGps || { lat: 17.6805, lng: 75.9064 }}
                    shopName={displayTask.shop_name || "Vegito Fresh Farm"}
                    customerName={displayTask.customer_name || "Customer Destination"}
                    partnerName={partnerName}
                    orderStatus={currentStatus}
                    height="380px"
                    showStatusCard={true}
                    interactive={true}
                  />
                </div>

                {/* Lifecycle Action Buttons */}
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    padding: "18px 20px",
                    borderRadius: "14px",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    {displayTask.customer_phone && (
                      <a
                        href={`tel:${displayTask.customer_phone}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "10px 18px",
                          backgroundColor: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "10px",
                          color: "#1e3a8a",
                          fontSize: "13px",
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        <Phone size={15} /> Call Customer ({displayTask.customer_phone})
                      </a>
                    )}
                  </div>

                  {/* Flow Action: Accept Delivery -> Picked Up -> Start Delivery -> Out For Delivery -> Delivered */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    {/* 1. If order is READY / READY_FOR_PICKUP: Show Accept & Pickup OTP verification */}
                    {(displayTask.order_status === "READY" || displayTask.order_status === "READY_FOR_PICKUP") && (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        {/* Accept button */}
                        <button
                          onClick={() => {
                            stopNotificationSound();
                            acceptMutation.mutate(displayTask.order_id);
                          }}
                          disabled={acceptMutation.isPending}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "11px 20px",
                            backgroundColor: "#059669",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "10px",
                            fontSize: "13.5px",
                            fontWeight: 800,
                            cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
                          }}
                        >
                          <Store size={16} />
                          {acceptMutation.isPending ? "Accepting..." : "Accept Delivery"}
                        </button>

                        {/* Pickup OTP verification form at Shop */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          {displayTask.pickup_otp && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "8px 14px",
                                backgroundColor: "#ecfdf5",
                                border: "1.5px dashed #10b981",
                                borderRadius: "10px",
                                fontSize: "13px",
                                fontWeight: 800,
                                color: "#047857",
                                letterSpacing: "1px",
                              }}
                            >
                              <ShieldCheck size={16} /> Pickup OTP: {displayTask.pickup_otp}
                            </span>
                          )}
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="Enter Pickup OTP"
                            value={pickupOtpInput[displayTask.order_id] || ""}
                            onChange={(e) =>
                              setPickupOtpInput({
                                ...pickupOtpInput,
                                [displayTask.order_id]: e.target.value.replace(/\D/g, ""),
                              })
                            }
                            style={{
                              padding: "10px 14px",
                              border: pickupOtpError[displayTask.order_id] ? "1.5px solid #dc2626" : "1.5px solid #cbd5e1",
                              borderRadius: "10px",
                              fontSize: "14px",
                              fontWeight: 700,
                              width: "160px",
                              outline: "none",
                            }}
                          />
                          <button
                            onClick={() => handleVerifyPickupOtp(displayTask.order_id)}
                            disabled={verifyOtpPending || !(pickupOtpInput[displayTask.order_id] || "").trim()}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "11px 20px",
                              backgroundColor: "#059669",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "10px",
                              fontSize: "13.5px",
                              fontWeight: 800,
                              cursor: "pointer",
                              boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
                            }}
                          >
                            <ShieldCheck size={16} /> {verifyOtpPending ? "Verifying..." : "Verify Pickup OTP"}
                          </button>
                        </div>
                        {pickupOtpError[displayTask.order_id] && (
                          <div style={{ width: "100%", color: "#dc2626", fontSize: "12.5px", fontWeight: 700, marginTop: "2px" }}>
                            {pickupOtpError[displayTask.order_id]}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. If order is PICKED_UP (or verified): Show Start Delivery */}
                    {(displayTask.order_status === "PICKED_UP" || pickupOtpVerified[displayTask.order_id]) && (
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "8px 14px",
                            backgroundColor: "#ecfdf5",
                            border: "1px solid #a7f3d0",
                            borderRadius: "10px",
                            fontSize: "13px",
                            fontWeight: 800,
                            color: "#047857",
                          }}
                        >
                          <Check size={16} /> OTP Verified · Package Picked Up
                        </span>
                        <button
                          onClick={() => startDeliveryMutation.mutate(displayTask.order_id)}
                          disabled={startDeliveryMutation.isPending}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "11px 22px",
                            backgroundColor: "#1d4ed8",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "10px",
                            fontSize: "13.5px",
                            fontWeight: 800,
                            cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(29, 78, 216, 0.25)",
                          }}
                        >
                          <Navigation size={16} />
                          {startDeliveryMutation.isPending ? "Starting..." : "Start Delivery to Customer"}
                        </button>
                      </div>
                    )}

                    {/* 3. If order is OUT_FOR_DELIVERY (or task STARTED): OTP Verification */}
                    {(displayTask.order_status === "OUT_FOR_DELIVERY" || displayTask.status === "STARTED") && (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="6-digit Customer OTP"
                          value={otp[displayTask.id] || ""}
                          onChange={(e) =>
                            setOtp({ ...otp, [displayTask.id]: e.target.value.replace(/\D/g, "") })
                          }
                          style={{
                            padding: "10px 14px",
                            border: "1.5px solid #cbd5e1",
                            borderRadius: "10px",
                            fontSize: "14px",
                            fontWeight: 700,
                            width: "180px",
                            outline: "none",
                          }}
                        />
                        <button
                          onClick={() =>
                            completeMutation.mutate({
                              id: displayTask.id,
                              code: otp[displayTask.id] || "",
                            })
                          }
                          disabled={completeMutation.isPending || (otp[displayTask.id] || "").length < 4}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "11px 20px",
                            backgroundColor: "#15803d",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "10px",
                            fontSize: "13.5px",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          <CheckCircle2 size={16} /> {completeMutation.isPending ? "Verifying..." : "Mark Delivered"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {(acceptMutation.isError || startDeliveryMutation.isError || completeMutation.isError) && (
                  <p style={{ color: "#dc2626", fontSize: "12.5px", marginTop: "10px", fontWeight: 600 }}>
                    {getErrorMessage(acceptMutation.error || startDeliveryMutation.error || completeMutation.error)}
                  </p>
                )}
              </div>
            ) : null}

            {/* Delivery Queue / Available Tasks */}
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e1e8e2",
                borderRadius: "18px",
                padding: "24px",
                boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
              }}
            >
              <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
                Delivery Queue & Assignments
              </h3>

              {tasks.isLoading ? (
                <p style={{ fontSize: "13px", color: "#62746a" }}>Loading dispatches...</p>
              ) : taskList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 16px", color: "#62746a" }}>
                  <div style={{ fontSize: "40px", marginBottom: "8px" }}>🚴</div>
                  <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700 }}>
                    No delivery dispatches currently assigned
                  </p>
                  <p style={{ margin: 0, fontSize: "12px" }}>
                    When seller packages are marked ready for pickup, they will appear here.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {taskList.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "14px 18px",
                        borderRadius: "14px",
                        backgroundColor: displayTask?.id === task.id ? "#eff6ff" : "#fafcf9",
                        border: displayTask?.id === task.id ? "1.5px solid #3b82f6" : "1px solid #edf2ee",
                        cursor: "pointer",
                        flexWrap: "wrap",
                        gap: "12px",
                        transition: "all 0.15s",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ fontWeight: 800, color: "#063c32", fontSize: "14px" }}>
                            Order #{task.order_number || task.order_id}
                          </span>
                          <StatusBadge status={task.order_status || task.status} />
                          {task.pickup_otp && (task.order_status === "READY" || task.order_status === "READY_FOR_PICKUP") && (
                            <span
                              style={{
                                padding: "2px 8px",
                                backgroundColor: "#ecfdf5",
                                border: "1px dashed #10b981",
                                borderRadius: "6px",
                                fontSize: "11.5px",
                                fontWeight: 800,
                                color: "#065f46",
                              }}
                            >
                              Pickup OTP: {task.pickup_otp}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: "12.5px", color: "#13221b" }}>
                          Shop: <b>{task.shop_name || "Vegito Fresh Farm"}</b> · Customer: <b>{task.customer_name || "Customer"}</b>
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#62746a" }}>
                          {task.delivery_address?.address_line1}, {task.delivery_address?.city} {task.delivery_address?.pincode}
                        </p>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          View Map <ArrowRight size={14} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Delivery Partner Ratings & Customer Feedback */}
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1.5px solid #e2e8f0",
                borderRadius: "20px",
                padding: "24px",
                marginTop: "24px",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "18px",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#0f172a" }}>
                    ⭐ Delivery Partner Ratings & Feedback
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748b" }}>
                    Customer ratings and comments left for your deliveries (Read-only)
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 14px",
                      backgroundColor: "#fffbeb",
                      border: "1px solid #fef3c7",
                      borderRadius: "10px",
                    }}
                  >
                    <div style={{ display: "flex", color: "#f59e0b" }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={15}
                          fill={s <= Math.round(partnerReviews.data?.average_rating || 5) ? "#f59e0b" : "none"}
                        />
                      ))}
                    </div>
                    <strong style={{ fontSize: "14px", color: "#b45309" }}>
                      {partnerReviews.data?.average_rating ? partnerReviews.data.average_rating.toFixed(1) : "5.0"}
                    </strong>
                    <span style={{ fontSize: "12px", color: "#78716c" }}>
                      ({partnerReviews.data?.total_reviews ?? 0} reviews)
                    </span>
                  </div>
                </div>
              </div>

              {/* Service Highlights */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "12px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 14px",
                    backgroundColor: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "10px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "#166534",
                  }}
                >
                  <span>⚡</span> On-Time Delivery Performance
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 14px",
                    backgroundColor: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "10px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "#1e40af",
                  }}
                >
                  <span>🤝</span> Polite & Courteous Behavior
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 14px",
                    backgroundColor: "#faf5ff",
                    border: "1px solid #e9d5ff",
                    borderRadius: "10px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "#6b21a8",
                  }}
                >
                  <span>📦</span> Fresh Package & Sealed Handover
                </div>
              </div>

              {/* Recent Customer Comments */}
              {partnerReviews.data?.reviews && partnerReviews.data.reviews.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#334155" }}>
                    Recent Customer Comments:
                  </span>
                  {partnerReviews.data.reviews.slice(0, 4).map((r) => (
                    <div
                      key={r.id}
                      style={{
                        padding: "12px 16px",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        fontSize: "13px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "4px",
                        }}
                      >
                        <strong style={{ color: "#0f172a" }}>{r.customer_name || "Customer"}</strong>
                        <div style={{ display: "flex", alignItems: "center", gap: "2px", color: "#f59e0b" }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={12}
                              fill={s <= (r.delivery_rating || 5) ? "#f59e0b" : "none"}
                            />
                          ))}
                        </div>
                      </div>
                      <p style={{ margin: 0, color: "#475569" }}>
                        "{r.comment || "Polite delivery partner, on time delivery!"}"
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8", fontStyle: "italic" }}>
                  No customer reviews yet. Deliveries completed with high customer ratings will show up here.
                </p>
              )}
            </div>
      </DashboardShell>
    </RoleGuard>
  );
}
