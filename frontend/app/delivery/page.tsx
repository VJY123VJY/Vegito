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
  getDeliveryEarnings,
  getDeliveryPerformance,
  failDeliveryTask,
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
import { searchAddressGeocode } from "@/lib/api/map";
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
  AlertCircle,
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
import { getDeliveryKyc, type DeliveryPartnerKycData } from "@/lib/api/kyc";
import { DeliveryKycWizard } from "@/components/delivery/delivery-kyc-wizard";

export default function DeliveryDashboardPage() {
  const client = useQueryClient();
  const [partnerName, setPartnerName] = useState("Delivery Partner");
  const [currentGps, setCurrentGps] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [wsStreaming, setWsStreaming] = useState(false);
  const [otp, setOtp] = useState<Record<number, string>>({});
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isKycWizardOpen, setIsKycWizardOpen] = useState(false);
  const [failModalOpen, setFailModalOpen] = useState(false);
  const [failReason, setFailReason] = useState("CUSTOMER_UNAVAILABLE");
  const [failNotes, setFailNotes] = useState("");
  const [failTaskId, setFailTaskId] = useState<number | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    setIsOffline(!navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Delivery Partner Profile & Availability Query
  const profileQuery = useQuery({
    queryKey: ["delivery-profile"],
    queryFn: getDeliveryProfile,
  });

  const kycQuery = useQuery({
    queryKey: ["delivery-kyc"],
    queryFn: getDeliveryKyc,
    retry: false,
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
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  // Dedicated states for Customer Delivery OTP (Completely separate from Seller OTP)
  const [customerDeliveryOtp, setCustomerDeliveryOtp] = useState<Record<number, string>>({});
  const [customerOtpError, setCustomerOtpError] = useState<Record<number, string | null>>({});
  const [customerOtpSuccess, setCustomerOtpSuccess] = useState<Record<number, boolean>>({});
  const [verifyCustomerOtpPending, setVerifyCustomerOtpPending] = useState(false);
  const [geocodedCustomerCoords, setGeocodedCustomerCoords] = useState<Record<number, LatLng>>({});

  useEffect(() => {
    setPartnerName(getStoredUserName() || "Delivery Partner");
    setIsSoundMuted(isAudioMuted());

    if (typeof navigator !== "undefined" && (navigator as any).getBattery) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener("levelchange", () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      }).catch(() => {});
    }
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
      // Immediately refetch delivery tasks from the backend to obtain the authorized customer location
      const freshTasks = await tasks.refetch();
      const updatedTask = freshTasks.data?.find((t) => t.order_id === orderId);
      if (updatedTask) {
        setSelectedTaskId(updatedTask.id);
      }
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

  const handleVerifyCustomerOtp = async (taskId: number) => {
    const enteredOtp = (customerDeliveryOtp[taskId] || "").trim();
    if (!enteredOtp || enteredOtp.length < 4) {
      setCustomerOtpError((prev) => ({
        ...prev,
        [taskId]: "Please enter the complete 4-digit OTP provided by the customer.",
      }));
      return;
    }

    setVerifyCustomerOtpPending(true);
    setCustomerOtpError((prev) => ({ ...prev, [taskId]: null }));

    try {
      await completeDelivery(taskId, enteredOtp);
      setCustomerOtpSuccess((prev) => ({ ...prev, [taskId]: true }));
      // Refresh task list and stats from backend
      await Promise.all([
        client.invalidateQueries({ queryKey: ["delivery-tasks"] }),
        client.invalidateQueries({ queryKey: ["delivery-earnings"] }),
        client.invalidateQueries({ queryKey: ["delivery-performance"] }),
      ]);
    } catch (err: any) {
      setCustomerOtpError((prev) => ({
        ...prev,
        [taskId]: getErrorMessage(err) || "Invalid delivery OTP. Please verify with customer.",
      }));
    } finally {
      setVerifyCustomerOtpPending(false);
    }
  };

  // Fetch delivery tasks with React Query polling
  const tasks = useQuery({
    queryKey: ["delivery-tasks"],
    queryFn: () => listDeliveryTasks(),
    refetchInterval: 10000,
  });

  const earningsQuery = useQuery({
    queryKey: ["delivery-earnings"],
    queryFn: () => getDeliveryEarnings(),
    refetchInterval: 15000,
  });

  const performanceQuery = useQuery({
    queryKey: ["delivery-performance"],
    queryFn: () => getDeliveryPerformance(),
    refetchInterval: 15000,
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
      client.invalidateQueries({ queryKey: ["delivery-earnings"] });
      client.invalidateQueries({ queryKey: ["delivery-performance"] });
      setOtp({});
    },
  });

  const failMutation = useMutation({
    mutationFn: ({ id, reason, notes }: { id: number; reason: string; notes?: string }) => failDeliveryTask(id, reason, notes),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["delivery-tasks"] });
      client.invalidateQueries({ queryKey: ["delivery-performance"] });
      setFailModalOpen(false);
      setFailNotes("");
    },
  });

  // Target coordinates for active display task
  const shopPosition: LatLng = {
    lat: displayTask?.shop_latitude ? Number(displayTask.shop_latitude) : 17.6805,
    lng: displayTask?.shop_longitude ? Number(displayTask.shop_longitude) : 75.9064,
  };

  const isDisplayTaskPickupVerified = Boolean(
    displayTask?.pickup_verified ||
    displayTask?.pickup_otp_verified_at ||
    (displayTask && pickupOtpVerified[displayTask.order_id]) ||
    displayTask?.status === "STARTED" ||
    displayTask?.order_status === "PICKED_UP" ||
    displayTask?.order_status === "OUT_FOR_DELIVERY" ||
    displayTask?.status === "DELIVERED" ||
    displayTask?.order_status === "DELIVERED"
  );

  // Dynamically resolve geocoded coordinates for customer destination if not explicitly stored in backend
  useEffect(() => {
    if (!displayTask || !isDisplayTaskPickupVerified) return;
    if (displayTask.customer_latitude && displayTask.customer_longitude) return;
    if (displayTask.delivery_address?.latitude && displayTask.delivery_address?.longitude) return;
    if (geocodedCustomerCoords[displayTask.id]) return;

    const addr = displayTask.delivery_address;
    if (!addr) return;

    const queryStr = [addr.address_line1, addr.city || "Solapur", addr.pincode].filter(Boolean).join(", ");
    if (!queryStr || queryStr.length < 3) return;

    let isMounted = true;
    searchAddressGeocode(queryStr)
      .then((results) => {
        if (!isMounted) return;
        if (results && results.length > 0) {
          setGeocodedCustomerCoords((prev) => ({
            ...prev,
            [displayTask.id]: { lat: results[0].latitude, lng: results[0].longitude },
          }));
        } else {
          // Solapur central delivery destination offset
          setGeocodedCustomerCoords((prev) => ({
            ...prev,
            [displayTask.id]: { lat: 17.6715, lng: 75.9100 },
          }));
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setGeocodedCustomerCoords((prev) => ({
          ...prev,
          [displayTask.id]: { lat: 17.6715, lng: 75.9100 },
        }));
      });

    return () => {
      isMounted = false;
    };
  }, [
    displayTask?.id,
    isDisplayTaskPickupVerified,
    displayTask?.customer_latitude,
    displayTask?.customer_longitude,
    displayTask?.delivery_address?.address_line1,
    displayTask?.delivery_address?.city,
    displayTask?.delivery_address?.pincode,
    geocodedCustomerCoords,
  ]);

  const resolvedCustomerLat =
    displayTask?.customer_latitude ||
    displayTask?.delivery_address?.latitude ||
    (displayTask ? geocodedCustomerCoords[displayTask.id]?.lat : null);

  const resolvedCustomerLng =
    displayTask?.customer_longitude ||
    displayTask?.delivery_address?.longitude ||
    (displayTask ? geocodedCustomerCoords[displayTask.id]?.lng : null);

  const customerPosition: LatLng | null =
    isDisplayTaskPickupVerified && resolvedCustomerLat && resolvedCustomerLng
      ? {
          lat: Number(resolvedCustomerLat),
          lng: Number(resolvedCustomerLng),
        }
      : null;

  const isDelivered = Boolean(
    displayTask?.status === "DELIVERED" ||
    displayTask?.order_status === "DELIVERED" ||
    (displayTask && customerOtpSuccess[displayTask.id])
  );

  const currentStatus = isDelivered
    ? "DELIVERED"
    : displayTask?.order_status || (displayTask?.status === "STARTED" ? "OUT_FOR_DELIVERY" : "READY_FOR_PICKUP");

  return (
    <RoleGuard allow={["DELIVERY_PARTNER", "ADMIN", "SUPER_ADMIN"]}>
      <DashboardShell
        role="delivery"
        userName={partnerName}
        userRole={profileQuery.data?.is_verified ? "✓ Verified Delivery Fleet Partner" : "Delivery Partner (Verification Pending)"}
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
                marginBottom: "16px",
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
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
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
                    {profileQuery.data?.is_verified ? (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: "999px",
                          backgroundColor: "#ecfdf5",
                          color: "#059669",
                          border: "1px solid #a7f3d0",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <ShieldCheck size={12} /> ✓ VEGITO VERIFIED
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: "999px",
                          backgroundColor: "#fffbeb",
                          color: "#d97706",
                          border: "1px solid #fde68a",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Clock size={12} /> KYC: {kycQuery.data?.status || "NOT SUBMITTED"}
                      </span>
                    )}
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

            {/* Delivery Partner KYC Banner */}
            {!profileQuery.data?.is_verified && (
              <div
                style={{
                  borderRadius: "16px",
                  padding: "16px 20px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "14px",
                  border:
                    kycQuery.data?.status === "UNDER_REVIEW" || kycQuery.data?.status === "SUBMITTED"
                      ? "1.5px solid #bfdbfe"
                      : kycQuery.data?.status === "REUPLOAD_REQUIRED"
                      ? "1.5px solid #fed7aa"
                      : kycQuery.data?.status === "REJECTED"
                      ? "1.5px solid #fecaca"
                      : "1.5px solid #fde68a",
                  backgroundColor:
                    kycQuery.data?.status === "UNDER_REVIEW" || kycQuery.data?.status === "SUBMITTED"
                      ? "#eff6ff"
                      : kycQuery.data?.status === "REUPLOAD_REQUIRED"
                      ? "#fff7ed"
                      : kycQuery.data?.status === "REJECTED"
                      ? "#fef2f2"
                      : "#fffbeb",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#ffffff",
                      color:
                        kycQuery.data?.status === "UNDER_REVIEW" || kycQuery.data?.status === "SUBMITTED"
                          ? "#2563eb"
                          : kycQuery.data?.status === "REUPLOAD_REQUIRED"
                          ? "#ea580c"
                          : kycQuery.data?.status === "REJECTED"
                          ? "#dc2626"
                          : "#d97706",
                    }}
                  >
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <strong
                      style={{
                        fontSize: "14.5px",
                        color:
                          kycQuery.data?.status === "UNDER_REVIEW" || kycQuery.data?.status === "SUBMITTED"
                            ? "#1e40af"
                            : kycQuery.data?.status === "REUPLOAD_REQUIRED"
                            ? "#9a3412"
                            : kycQuery.data?.status === "REJECTED"
                            ? "#991b1b"
                            : "#92400e",
                      }}
                    >
                      {kycQuery.data?.status === "UNDER_REVIEW" || kycQuery.data?.status === "SUBMITTED"
                        ? "Fleet KYC Verification Under Review"
                        : kycQuery.data?.status === "REUPLOAD_REQUIRED"
                        ? "Fleet Document Re-upload Requested"
                        : kycQuery.data?.status === "REJECTED"
                        ? "Fleet Verification Rejected"
                        : "Complete Delivery Partner Verification"}
                    </strong>
                    <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#64748b" }}>
                      {kycQuery.data?.status === "UNDER_REVIEW" || kycQuery.data?.status === "SUBMITTED"
                        ? "Our verification team is auditing your driving license and vehicle registration. You can still accept mock deliveries."
                        : kycQuery.data?.status === "REUPLOAD_REQUIRED"
                        ? `Admin note: ${kycQuery.data?.reupload_notes || "Please re-upload a clearer driving license photo."}`
                        : kycQuery.data?.status === "REJECTED"
                        ? `Reason: ${kycQuery.data?.rejection_reason || "Documents could not be verified."} Please update and re-submit.`
                        : "Upload ID proof, driving license, vehicle RC, live selfie, and bank details to unlock instant daily payouts."}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsKycWizardOpen(true)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: 800,
                    cursor: "pointer",
                    border: "none",
                    backgroundColor:
                      kycQuery.data?.status === "UNDER_REVIEW" || kycQuery.data?.status === "SUBMITTED"
                        ? "#2563eb"
                        : kycQuery.data?.status === "REUPLOAD_REQUIRED"
                        ? "#ea580c"
                        : kycQuery.data?.status === "REJECTED"
                        ? "#dc2626"
                        : "#d97706",
                    color: "#ffffff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  {kycQuery.data?.status === "UNDER_REVIEW" || kycQuery.data?.status === "SUBMITTED"
                    ? "View Details"
                    : kycQuery.data?.status === "REUPLOAD_REQUIRED"
                    ? "Re-upload Document"
                    : kycQuery.data?.status === "REJECTED"
                    ? "Resubmit"
                    : "Complete KYC"}
                </button>
              </div>
            )}

            {/* PWA Device Health Strip */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                flexWrap: "wrap",
                backgroundColor: "#f4f8f5",
                borderRadius: "14px",
                padding: "8px 16px",
                border: "1px solid #dce8df",
                marginBottom: "16px",
                fontSize: "12px",
                fontWeight: 700,
                color: "#063c32",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>GPS:</span>
                <span style={{ color: currentGps ? "#16835b" : "#d97706" }}>
                  {currentGps ? "🟢 High Accuracy Live" : "🟡 Acquiring satellites..."}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>Network:</span>
                <span style={{ color: isOffline ? "#dc2626" : "#16835b" }}>
                  {isOffline ? "🔴 Disconnected" : "🟢 4G/Wi-Fi Connected"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>Battery:</span>
                <span style={{ color: batteryLevel && batteryLevel < 20 ? "#dc2626" : "#16835b" }}>
                  🔋 {batteryLevel !== null ? `${batteryLevel}%` : "Normal"}
                </span>
              </div>
            </div>

            {/* Offline Alert */}
            {isOffline && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px 18px",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "14px",
                  color: "#991b1b",
                  marginBottom: "20px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
                <span>⚠️ Offline Mode — Actions will be synced when connected.</span>
              </div>
            )}

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
                      Shop Pickup Verification
                    </span>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "#047857", marginTop: "2px" }}>
                      Ask seller at shop for the verbal 6-digit pickup code
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
                label="Today's Earnings"
                value={`₹${(earningsQuery.data?.today ?? earnings).toLocaleString("en-IN")}`}
                icon={<DollarSign size={22} />}
                iconBg="#eff6ff"
                iconColor="#2563eb"
              />
              <StatCard
                label="On-Time Delivery"
                value={performanceQuery.data?.on_time_percentage ? `${performanceQuery.data.on_time_percentage}%` : "98%"}
                icon={<Clock size={22} />}
                iconBg="#fef3c7"
                iconColor="#d97706"
              />
              <StatCard
                label="Partner Rating"
                value={performanceQuery.data?.customer_rating ? `⭐ ${performanceQuery.data.customer_rating.toFixed(1)}` : (partnerReviews.data ? `⭐ ${partnerReviews.data.average_rating.toFixed(1)}` : "⭐ 5.0")}
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
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <h3 style={{ margin: 0, fontSize: "16.5px", fontWeight: 800, color: "#1e3a8a" }}>
                          Active Delivery · Order #{displayTask.order_number || displayTask.order_id}
                        </h3>
                        {displayTask.is_urgent && (
                          <span
                            style={{
                              padding: "2px 8px",
                              backgroundColor: "#fef2f2",
                              border: "1px solid #ef4444",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: 800,
                              color: "#dc2626",
                              animation: "pulse 2s infinite"
                            }}
                          >
                            🔥 URGENT
                          </span>
                        )}
                      </div>
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

                {/* Lifecycle Action Buttons & Customer Delivery Verification */}
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    padding: "20px 22px",
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  {/* Top Bar: Contact Customer & Status Information */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      {isDisplayTaskPickupVerified && displayTask.customer_phone ? (
                        <a
                          href={`tel:${displayTask.customer_phone}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "9px 16px",
                            backgroundColor: "#ffffff",
                            border: "1px solid #cbd5e1",
                            borderRadius: "10px",
                            color: "#1e3a8a",
                            fontSize: "13px",
                            fontWeight: 700,
                            textDecoration: "none",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                          }}
                        >
                          <Phone size={15} /> Call Customer ({displayTask.customer_phone})
                        </a>
                      ) : !isDisplayTaskPickupVerified ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 12px",
                            backgroundColor: "#f1f5f9",
                            color: "#64748b",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          🔒 Customer phone locked until seller pickup
                        </span>
                      ) : null}

                      {isDisplayTaskPickupVerified && displayTask.delivery_address && (
                        <div style={{ fontSize: "12.5px", color: "#334155", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span>📍 <b>Destination:</b> {displayTask.delivery_address.address_line1}, {displayTask.delivery_address.city} {displayTask.delivery_address.pincode}</span>
                          {customerPosition && (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${customerPosition.lat},${customerPosition.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 10px",
                                backgroundColor: "#0284c7",
                                color: "#ffffff",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 700,
                                textDecoration: "none",
                              }}
                            >
                              <Navigation size={12} /> Navigate to Customer ↗
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Report Issue / Fail Delivery Button */}
                    {!isDelivered && (
                      <button
                        onClick={() => {
                          setFailTaskId(displayTask.id);
                          setFailModalOpen(true);
                        }}
                        style={{
                          padding: "8px 14px",
                          backgroundColor: "#fef2f2",
                          border: "1px solid #fecaca",
                          borderRadius: "8px",
                          color: "#dc2626",
                          fontSize: "12.5px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Report Issue / Fail
                      </button>
                    )}
                  </div>

                  {/* MAIN WORKFLOW STAGES */}

                  {/* STAGE 4: ALREADY DELIVERED */}
                  {isDelivered ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        padding: "16px 20px",
                        backgroundColor: "#ecfdf5",
                        border: "1.5px solid #10b981",
                        borderRadius: "14px",
                        color: "#065f46",
                      }}
                    >
                      <CheckCircle2 size={28} color="#059669" style={{ flexShrink: 0 }} />
                      <div>
                        <strong style={{ fontSize: "15px", display: "block", color: "#064e3b" }}>
                          ✓ Order #{displayTask.order_number || displayTask.order_id} Delivered Successfully
                        </strong>
                        <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#047857" }}>
                          Customer doorstep OTP has been verified. The delivery has been recorded on the Vegito network.
                        </p>
                      </div>
                    </div>
                  ) : !isDisplayTaskPickupVerified ? (
                    /* STAGE 1: BEFORE PICKUP VERIFICATION (At Seller Shop) */
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
                      <div
                        style={{
                          backgroundColor: "#fffbeb",
                          border: "1.5px solid #fde68a",
                          borderRadius: "14px",
                          padding: "16px 18px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                          <Store size={18} color="#b45309" />
                          <strong style={{ fontSize: "14px", color: "#92400e" }}>
                            Step 1: Collect Harvest from Seller ({displayTask.shop_name || "Vegito Fresh Farm"})
                          </strong>
                        </div>
                        <p style={{ margin: "0 0 10px", fontSize: "12.5px", color: "#78350f" }}>
                          Reach the seller store, collect the packaged vegetables, and verify the seller's 6-digit pickup code.
                        </p>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${shopPosition.lat},${shopPosition.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "6px 12px",
                              backgroundColor: "#fef3c7",
                              border: "1px solid #f59e0b",
                              color: "#92400e",
                              borderRadius: "8px",
                              fontSize: "12px",
                              fontWeight: 700,
                              textDecoration: "none",
                            }}
                          >
                            <Navigation size={13} /> Navigate to Seller Shop ↗
                          </a>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          {/* If not accepted yet, show Accept button */}
                          {(displayTask.order_status === "READY" || displayTask.order_status === "READY_FOR_PICKUP") && (
                            <button
                              onClick={() => {
                                stopNotificationSound();
                                acceptMutation.mutate(displayTask.order_id);
                              }}
                              disabled={acceptMutation.isPending}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "10px 18px",
                                backgroundColor: "#059669",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "10px",
                                fontSize: "13px",
                                fontWeight: 800,
                                cursor: "pointer",
                                boxShadow: "0 2px 8px rgba(5, 150, 105, 0.2)",
                              }}
                            >
                              <Store size={15} />
                              {acceptMutation.isPending ? "Accepting..." : "Accept Delivery"}
                            </button>
                          )}

                          {/* Pickup verification code from seller */}
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="Seller 6-digit Code"
                              value={pickupOtpInput[displayTask.order_id] || ""}
                              onChange={(e) =>
                                setPickupOtpInput({
                                  ...pickupOtpInput,
                                  [displayTask.order_id]: e.target.value.replace(/\D/g, ""),
                                })
                              }
                              style={{
                                padding: "10px 14px",
                                border: pickupOtpError[displayTask.order_id] ? "2px solid #dc2626" : "1.5px solid #cbd5e1",
                                borderRadius: "10px",
                                fontSize: "14px",
                                fontWeight: 700,
                                width: "170px",
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
                                padding: "10px 18px",
                                backgroundColor: "#ea580c",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "10px",
                                fontSize: "13px",
                                fontWeight: 800,
                                cursor: "pointer",
                                boxShadow: "0 2px 8px rgba(234, 88, 12, 0.25)",
                              }}
                            >
                              <ShieldCheck size={16} />
                              {verifyOtpPending ? "Verifying..." : "Verify Pickup OTP"}
                            </button>
                          </div>
                        </div>

                        {pickupOtpError[displayTask.order_id] && (
                          <div style={{ color: "#dc2626", fontSize: "12.5px", fontWeight: 700, marginTop: "8px" }}>
                            ⚠️ {pickupOtpError[displayTask.order_id]}
                          </div>
                        )}

                        <div style={{ marginTop: "12px", padding: "8px 12px", backgroundColor: "#fef3c7", borderRadius: "8px", fontSize: "12px", color: "#92400e" }}>
                          🔒 <b>Customer privacy active:</b> Customer exact destination and delivery OTP verification are locked until you verify pickup at the seller store.
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* STAGE 2 & 3: AFTER PICKUP VERIFICATION (Navigating to Customer & Doorstep Delivery OTP) */
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%" }}>
                      {/* Pickup Confirmation & Start Navigation */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 18px",
                          backgroundColor: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          borderRadius: "12px",
                          flexWrap: "wrap",
                          gap: "10px",
                        }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 800, color: "#166534" }}>
                          <Check size={16} /> Pickup Verified · Package with Delivery Partner
                        </span>

                        {displayTask.order_status !== "OUT_FOR_DELIVERY" && displayTask.status !== "STARTED" && (
                          <button
                            onClick={() => startDeliveryMutation.mutate(displayTask.order_id)}
                            disabled={startDeliveryMutation.isPending}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "9px 18px",
                              backgroundColor: "#1d4ed8",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "10px",
                              fontSize: "13px",
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            <Navigation size={15} />
                            {startDeliveryMutation.isPending ? "Starting Navigation..." : "Start Delivery to Customer"}
                          </button>
                        )}
                      </div>

                      {/* DEDICATED CUSTOMER DELIVERY OTP VERIFICATION BOX */}
                      <div
                        style={{
                          backgroundColor: "#ffffff",
                          border: "2px solid #10b981",
                          borderRadius: "14px",
                          padding: "18px 20px",
                          boxShadow: "0 2px 10px rgba(16, 185, 129, 0.1)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                          <div>
                            <span style={{ fontSize: "14.5px", fontWeight: 800, color: "#065f46", display: "flex", alignItems: "center", gap: "6px" }}>
                              <ShieldCheck size={18} color="#059669" /> Customer Delivery Verification
                            </span>
                            <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#475569" }}>
                              Ask customer for their 4-digit doorstep delivery OTP from their order screen.
                            </p>
                          </div>
                          <span
                            style={{
                              fontSize: "11.5px",
                              fontWeight: 800,
                              padding: "3px 10px",
                              backgroundColor: "#ecfdf5",
                              color: "#047857",
                              borderRadius: "999px",
                              border: "1px solid #a7f3d0",
                            }}
                          >
                            📍 Doorstep Verification
                          </span>
                        </div>

                        {/* Segmented 4-Digit OTP Input Controls */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginTop: "10px" }}>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            {[0, 1, 2, 3].map((digitIdx) => {
                              const currentVal = customerDeliveryOtp[displayTask.id] || "";
                              const char = currentVal[digitIdx] || "";
                              return (
                                <input
                                  key={digitIdx}
                                  id={`customer-otp-${displayTask.id}-${digitIdx}`}
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  maxLength={1}
                                  value={char}
                                  disabled={verifyCustomerOtpPending || customerOtpSuccess[displayTask.id]}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, "");
                                    const prev = customerDeliveryOtp[displayTask.id] || "";
                                    const arr = prev.split("");
                                    if (val) {
                                      arr[digitIdx] = val;
                                      const nextVal = arr.join("").slice(0, 4);
                                      setCustomerDeliveryOtp({ ...customerDeliveryOtp, [displayTask.id]: nextVal });
                                      if (digitIdx < 3) {
                                        const nextInput = document.getElementById(`customer-otp-${displayTask.id}-${digitIdx + 1}`);
                                        nextInput?.focus();
                                      }
                                    } else {
                                      arr[digitIdx] = "";
                                      setCustomerDeliveryOtp({ ...customerDeliveryOtp, [displayTask.id]: arr.join("") });
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Backspace" && !char && digitIdx > 0) {
                                      const prevInput = document.getElementById(`customer-otp-${displayTask.id}-${digitIdx - 1}`);
                                      prevInput?.focus();
                                    }
                                  }}
                                  onPaste={(e) => {
                                    e.preventDefault();
                                    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
                                    if (pasted) {
                                      setCustomerDeliveryOtp({ ...customerDeliveryOtp, [displayTask.id]: pasted });
                                      const targetIdx = Math.min(pasted.length - 1, 3);
                                      const targetInput = document.getElementById(`customer-otp-${displayTask.id}-${targetIdx}`);
                                      targetInput?.focus();
                                    }
                                  }}
                                  style={{
                                    width: "46px",
                                    height: "50px",
                                    textAlign: "center",
                                    fontSize: "20px",
                                    fontWeight: 800,
                                    borderRadius: "10px",
                                    border: customerOtpError[displayTask.id]
                                      ? "2px solid #ef4444"
                                      : char
                                      ? "2px solid #10b981"
                                      : "1.5px solid #cbd5e1",
                                    backgroundColor: char ? "#f0fdf4" : "#ffffff",
                                    color: "#063c32",
                                    outline: "none",
                                    transition: "border-color 0.15s",
                                  }}
                                />
                              );
                            })}
                          </div>

                          <button
                            onClick={() => handleVerifyCustomerOtp(displayTask.id)}
                            disabled={verifyCustomerOtpPending || (customerDeliveryOtp[displayTask.id] || "").length < 4 || customerOtpSuccess[displayTask.id]}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "12px 22px",
                              backgroundColor: "#059669",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "10px",
                              fontSize: "13.5px",
                              fontWeight: 800,
                              cursor: "pointer",
                              boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
                              opacity: ((customerDeliveryOtp[displayTask.id] || "").length < 4 || verifyCustomerOtpPending) ? 0.65 : 1,
                            }}
                          >
                            <CheckCircle2 size={16} />
                            {verifyCustomerOtpPending ? "Verifying..." : "Verify Customer OTP"}
                          </button>

                          {(customerDeliveryOtp[displayTask.id] || "").length > 0 && !customerOtpSuccess[displayTask.id] && (
                            <button
                              onClick={() => {
                                setCustomerDeliveryOtp({ ...customerDeliveryOtp, [displayTask.id]: "" });
                                setCustomerOtpError({ ...customerOtpError, [displayTask.id]: null });
                                document.getElementById(`customer-otp-${displayTask.id}-0`)?.focus();
                              }}
                              type="button"
                              style={{
                                background: "none",
                                border: "none",
                                color: "#64748b",
                                fontSize: "12.5px",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        {/* Error Feedback */}
                        {customerOtpError[displayTask.id] && (
                          <div style={{ color: "#dc2626", fontSize: "12.5px", fontWeight: 700, marginTop: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <AlertCircle size={16} style={{ flexShrink: 0 }} />
                            <span>{customerOtpError[displayTask.id]}</span>
                          </div>
                        )}

                        {/* Success Feedback */}
                        {customerOtpSuccess[displayTask.id] && (
                          <div style={{ color: "#059669", fontSize: "13px", fontWeight: 800, marginTop: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                            <span>✓ Customer OTP verified! Delivery completed successfully.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {(acceptMutation.isError || startDeliveryMutation.isError) && (
                  <p style={{ color: "#dc2626", fontSize: "12.5px", marginTop: "10px", fontWeight: 600 }}>
                    {getErrorMessage(acceptMutation.error || startDeliveryMutation.error)}
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
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 800, color: "#063c32", fontSize: "14px" }}>
                            Order #{task.order_number || task.order_id}
                          </span>
                          <StatusBadge status={task.order_status || task.status} />
                          {task.is_urgent && (
                            <span
                              style={{
                                padding: "2px 6px",
                                backgroundColor: "#fef2f2",
                                border: "1px solid #ef4444",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: 800,
                                color: "#dc2626",
                                animation: "pulse 2s infinite"
                              }}
                            >
                              🔥 URGENT
                            </span>
                          )}
                          {Boolean(task.pickup_verified || task.pickup_otp_verified_at) ? (
                            <span
                              style={{
                                padding: "2px 8px",
                                backgroundColor: "#ecfdf5",
                                border: "1px solid #a7f3d0",
                                borderRadius: "6px",
                                fontSize: "11.5px",
                                fontWeight: 800,
                                color: "#065f46",
                              }}
                            >
                              ✓ Pickup Verified
                            </span>
                          ) : (
                            <span
                              style={{
                                padding: "2px 8px",
                                backgroundColor: "#f1f5f9",
                                border: "1px solid #cbd5e1",
                                borderRadius: "6px",
                                fontSize: "11.5px",
                                fontWeight: 700,
                                color: "#475569",
                              }}
                            >
                              🔒 Destination Locked
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: "12.5px", color: "#13221b" }}>
                          Shop: <b>{task.shop_name || "Vegito Fresh Farm"}</b> · Customer: <b>{task.customer_name || "Customer"}</b>
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#62746a" }}>
                          {Boolean(task.pickup_verified || task.pickup_otp_verified_at) && task.delivery_address
                            ? `${task.delivery_address.address_line1}, ${task.delivery_address.city} ${task.delivery_address.pincode}`
                            : "🔒 Customer address locked until seller pickup verification"}
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

            {/* Report Issue Modal */}
            {failModalOpen && failTaskId && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  backgroundColor: "rgba(15, 23, 42, 0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1000,
                  padding: "16px",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "20px",
                    padding: "24px",
                    width: "100%",
                    maxWidth: "420px",
                    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
                  }}
                >
                  <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                    Report Delivery Issue
                  </h3>
                  
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
                      Reason
                    </label>
                    <select
                      value={failReason}
                      onChange={(e) => setFailReason(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1px solid #cbd5e1",
                        fontSize: "14px",
                        outline: "none",
                        backgroundColor: "#ffffff",
                      }}
                    >
                      <option value="CUSTOMER_UNAVAILABLE">Customer Unavailable</option>
                      <option value="WRONG_ADDRESS">Wrong Address</option>
                      <option value="CUSTOMER_CANCELLED">Customer Cancelled</option>
                      <option value="UNABLE_TO_CONTACT">Unable to Contact</option>
                      <option value="ADDRESS_INACCESSIBLE">Address Inaccessible</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={failNotes}
                      onChange={(e) => setFailNotes(e.target.value)}
                      placeholder="Any additional details..."
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1px solid #cbd5e1",
                        fontSize: "14px",
                        outline: "none",
                        resize: "none",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                    <button
                      onClick={() => setFailModalOpen(false)}
                      style={{
                        padding: "10px 18px",
                        borderRadius: "10px",
                        backgroundColor: "#f1f5f9",
                        color: "#475569",
                        border: "none",
                        fontSize: "13.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => failMutation.mutate({ id: failTaskId, reason: failReason, notes: failNotes })}
                      disabled={failMutation.isPending}
                      style={{
                        padding: "10px 18px",
                        borderRadius: "10px",
                        backgroundColor: "#dc2626",
                        color: "#ffffff",
                        border: "none",
                        fontSize: "13.5px",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      {failMutation.isPending ? "Submitting..." : "Submit Issue"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Partner KYC Wizard Modal */}
            {isKycWizardOpen && (
              <DeliveryKycWizard
                onClose={() => setIsKycWizardOpen(false)}
                onSuccess={() => {
                  setIsKycWizardOpen(false);
                  client.invalidateQueries({ queryKey: ["delivery-kyc"] });
                  client.invalidateQueries({ queryKey: ["delivery-profile"] });
                }}
              />
            )}
      </DashboardShell>
    </RoleGuard>
  );
}
