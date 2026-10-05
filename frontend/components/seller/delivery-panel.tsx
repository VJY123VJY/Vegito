"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listDeliveryTasks,
  updateDeliveryTask,
  completeDelivery,
  createDeliveryBatch,
  listDeliveryBatches,
  startDeliveryBatch,
  completeDeliveryBatch,
  suggestBatchGrouping,
  type DeliveryTask,
  type DeliveryBatch,
  type SuggestedBatchGroup,
} from "@/lib/api/delivery";
import { listSellerOrders, updateSellerOrder } from "@/lib/api/seller";
import { watchDeliveryBoyGps } from "@/lib/api/location";
import { getStoredToken } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import { useTranslation } from "@/context/i18n-context";
import dynamic from "next/dynamic";
import {
  Phone,
  MapPin,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Package,
  Layers,
  Sparkles,
  Check,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Clock,
  ExternalLink,
} from "lucide-react";

// SSR-safe DeliveryRouteMap import
const DeliveryRouteMap = dynamic(
  () => import("@/components/map/delivery-route-map").then((m) => ({ default: m.DeliveryRouteMap })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: "260px",
          background: "#e8f4ec",
          borderRadius: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6b7280",
          fontSize: "14px",
        }}
      >
        Loading Delivery Route Map...
      </div>
    ),
  }
);

function TaskStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    ASSIGNED: { bg: "#fef3c7", color: "#92400e" },
    READY: { bg: "#dcfce7", color: "#166534" },
    STARTED: { bg: "#dbeafe", color: "#1e40af" },
    OUT_FOR_DELIVERY: { bg: "#dbeafe", color: "#1e40af" },
    DELIVERED: { bg: "#dcfce7", color: "#15803d" },
    FAILED: { bg: "#fee2e2", color: "#991b1b" },
    CANCELLED: { bg: "#f3f4f6", color: "#6b7280" },
  };
  const c = cfg[status] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: "700",
        background: c.bg,
        color: c.color,
      }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function DeliveryPanel() {
  const { t, language } = useTranslation();
  const queryClient = useQueryClient();

  // Queries
  const tasksQuery = useQuery({
    queryKey: ["delivery-tasks"],
    queryFn: () => listDeliveryTasks(),
    refetchInterval: 8000,
  });

  const batchesQuery = useQuery({
    queryKey: ["delivery-batches"],
    queryFn: () => listDeliveryBatches(),
    refetchInterval: 8000,
  });

  const readyOrdersQuery = useQuery({
    queryKey: ["seller-orders", "READY"],
    queryFn: () => listSellerOrders("READY"),
    refetchInterval: 8000,
  });

  // State
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [bagCheckedTaskIds, setBagCheckedTaskIds] = useState<number[]>([]);
  const [activeStopIndex, setActiveStopIndex] = useState<number>(0);
  const [otpInput, setOtpInput] = useState<string>("");
  const [gpsPos, setGpsPos] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState("");
  const [tab, setTab] = useState<"ACTIVE_ROUTE" | "PLAN_ROUTE" | "COMPLETED">("ACTIVE_ROUTE");

  const tasks = tasksQuery.data ?? [];
  const batches = batchesQuery.data ?? [];
  const readyOrders = readyOrdersQuery.data?.items ?? [];

  // Active in-progress batch
  const activeBatch = batches.find((b) => b.status === "IN_PROGRESS");
  // Planned batch ready to start
  const plannedBatch = batches.find((b) => b.status === "READY" || b.status === "PLANNED");

  // Automatically switch tab depending on status
  useEffect(() => {
    if (activeBatch) {
      setTab("ACTIVE_ROUTE");
    } else if (plannedBatch) {
      setTab("PLAN_ROUTE");
    }
  }, [activeBatch, plannedBatch]);

  // Auto-detect driver GPS location for nearest-first delivery routing
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          // Gracefully fallback to shop coordinates
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, []);

  // GPS tracking when on active route
  useEffect(() => {
    if (!activeBatch) return;
    const firstTask = activeBatch.tasks.find((t) => t.status === "STARTED");
    if (!firstTask) return;

    const token = getStoredToken();
    if (!token) {
      setGpsError("Sign in again for GPS sync.");
      return;
    }
    const stop = watchDeliveryBoyGps(
      firstTask.order_id,
      token,
      (coords) => setGpsPos({ lat: coords.lat, lng: coords.lng }),
      () => setGpsError("GPS unavailable — check location permissions")
    );
    return stop;
  }, [activeBatch]);

  // Suggest grouping query mutation (nearest-first from driver location)
  const suggestRouteMutation = useMutation({
    mutationFn: () => suggestBatchGrouping(gpsPos?.lat, gpsPos?.lng),
    onSuccess: (suggestions) => {
      if (suggestions && suggestions.length > 0) {
        // Select the first recommended cluster (up to 10)
        const firstGroup = suggestions[0];
        setSelectedTaskIds(firstGroup.task_ids.slice(0, 10));
      }
    },
  });

  // Create Batch Mutation (ordered nearest-first)
  const createBatchMutation = useMutation({
    mutationFn: (taskIds: number[]) =>
      createDeliveryBatch({
        task_ids: taskIds,
        latitude: gpsPos?.lat,
        longitude: gpsPos?.lng,
      }),
    onSuccess: () => {
      setSelectedTaskIds([]);
      queryClient.invalidateQueries({ queryKey: ["delivery-batches"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["seller-dashboard-summary"] });
    },
  });

  // Start Batch Mutation
  const startBatchMutation = useMutation({
    mutationFn: (batchId: number) => startDeliveryBatch(batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-batches"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["seller-dashboard-summary"] });
      setTab("ACTIVE_ROUTE");
    },
  });

  // Complete Delivery Task Mutation (doorstep OTP)
  const completeTaskMutation = useMutation({
    mutationFn: ({ taskId, otp }: { taskId: number; otp: string }) => completeDelivery(taskId, otp),
    onSuccess: () => {
      setOtpInput("");
      queryClient.invalidateQueries({ queryKey: ["delivery-batches"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["seller-dashboard-summary"] });
    },
  });

  // Complete Batch Mutation
  const completeBatchMutation = useMutation({
    mutationFn: (batchId: number) => completeDeliveryBatch(batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-batches"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["seller-dashboard-summary"] });
      setTab("COMPLETED");
    },
  });

  // Available tasks that are ready for delivery (not delivered and not cancelled)
  const readyTasks = useMemo(() => {
    return tasks.filter(
      (t) =>
        t.status === "ASSIGNED" ||
        t.status === "READY" ||
        t.order_status === "READY" ||
        t.order_status === "READY_FOR_PICKUP"
    );
  }, [tasks]);

  const activeStops = useMemo(() => {
    if (!activeBatch) return [];
    return activeBatch.tasks || [];
  }, [activeBatch]);

  // Find current active stop (first undelivered stop)
  const currentStop = useMemo(() => {
    return activeStops.find((s) => s.status !== "DELIVERED") || activeStops[activeStops.length - 1];
  }, [activeStops]);

  const allActiveStopsDelivered = useMemo(() => {
    if (!activeBatch || activeStops.length === 0) return false;
    return activeStops.every((s) => s.status === "DELIVERED");
  }, [activeBatch, activeStops]);

  // Toggle selection for route creation (max 10)
  const toggleTaskSelection = (id: number) => {
    if (selectedTaskIds.includes(id)) {
      setSelectedTaskIds(selectedTaskIds.filter((x) => x !== id));
    } else {
      if (selectedTaskIds.length >= 10) {
        alert("Maximum 10 orders can be grouped into one delivery route batch.");
        return;
      }
      setSelectedTaskIds([...selectedTaskIds, id]);
    }
  };

  // Toggle bag checklist for planned batch
  const toggleBagCheck = (id: number) => {
    if (bagCheckedTaskIds.includes(id)) {
      setBagCheckedTaskIds(bagCheckedTaskIds.filter((x) => x !== id));
    } else {
      setBagCheckedTaskIds([...bagCheckedTaskIds, id]);
    }
  };

  const allBagItemsChecked = useMemo(() => {
    if (!plannedBatch) return false;
    const taskIds = plannedBatch.tasks.map((t) => t.id);
    return taskIds.length > 0 && taskIds.every((id) => bagCheckedTaskIds.includes(id));
  }, [plannedBatch, bagCheckedTaskIds]);

  return (
    <div style={{ paddingBottom: "60px" }}>
      {/* ═══════════════════════════════════════════════════════
          HEADER: TITLE & QUICK STATUS
          ═══════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#1a3d2b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6fcf3a",
              }}
            >
              <Truck size={20} />
            </div>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#111827" }}>
              {t("seller.deliveryRouteAction", "Delivery Routes & Stops")}
            </h1>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6b7280" }}>
            {t(
              "seller.maxBatchNotice",
              "1 Seller + Delivery Partner unified workflow · Up to 10 orders per delivery round"
            )}
          </p>
        </div>

        {/* Tab switchers */}
        <div style={{ display: "flex", gap: "8px", background: "#f3f4f6", padding: "4px", borderRadius: "10px" }}>
          <button
            onClick={() => setTab("ACTIVE_ROUTE")}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              fontSize: "12.5px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: tab === "ACTIVE_ROUTE" ? "#1a3d2b" : "transparent",
              color: tab === "ACTIVE_ROUTE" ? "#ffffff" : "#4b5563",
              transition: "all 0.15s ease",
            }}
          >
            🚴 {t("seller.outForDelivery", "Active Route")} {activeBatch ? `(#${activeBatch.id})` : ""}
          </button>
          <button
            onClick={() => setTab("PLAN_ROUTE")}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              fontSize: "12.5px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: tab === "PLAN_ROUTE" ? "#1a3d2b" : "transparent",
              color: tab === "PLAN_ROUTE" ? "#ffffff" : "#4b5563",
              transition: "all 0.15s ease",
            }}
          >
            📋 {t("seller.createRoute", "Plan Route & Bag")} ({readyTasks.length})
          </button>
          <button
            onClick={() => setTab("COMPLETED")}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              fontSize: "12.5px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: tab === "COMPLETED" ? "#1a3d2b" : "transparent",
              color: tab === "COMPLETED" ? "#ffffff" : "#4b5563",
              transition: "all 0.15s ease",
            }}
          >
            ✅ {t("seller.deliveredToday", "Delivered Today")}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          TAB 1: ACTIVE ROUTE (IN_PROGRESS)
          ═══════════════════════════════════════════════════════ */}
      {tab === "ACTIVE_ROUTE" && (
        <div>
          {activeBatch ? (
            <div>
              {/* Batch Banner */}
              <div
                style={{
                  background: "linear-gradient(135deg, #1a3d2b 0%, #2e6949 100%)",
                  borderRadius: "16px",
                  padding: "18px 24px",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "14px",
                  marginBottom: "20px",
                  boxShadow: "0 6px 20px rgba(26,61,43,0.18)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "999px",
                        background: "#6fcf3a",
                        color: "#1a3d2b",
                        fontSize: "11px",
                        fontWeight: 800,
                      }}
                    >
                      LIVE ROUND #{activeBatch.id}
                    </span>
                    <span style={{ fontSize: "13px", opacity: 0.9 }}>
                      {activeBatch.total_orders} Stops Planned
                    </span>
                  </div>
                  <h2 style={{ margin: "6px 0 2px", fontSize: "18px", fontWeight: 800 }}>
                    {allActiveStopsDelivered
                      ? "🎉 All orders in this route delivered!"
                      : `Delivering Stop: ${currentStop?.customer_name || "Customer"}`}
                  </h2>
                  <p style={{ margin: 0, fontSize: "12.5px", opacity: 0.85 }}>
                    Solapur Local Delivery Telemetry Active · Safety OTP required at each doorstep
                  </p>
                </div>

                {allActiveStopsDelivered ? (
                  <button
                    onClick={() => completeBatchMutation.mutate(activeBatch.id)}
                    disabled={completeBatchMutation.isPending}
                    style={{
                      padding: "12px 24px",
                      borderRadius: "12px",
                      background: "#6fcf3a",
                      color: "#1a3d2b",
                      border: "none",
                      fontSize: "14px",
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(111,207,58,0.4)",
                    }}
                  >
                    <CheckCircle2 size={16} style={{ display: "inline", marginRight: "6px" }} />
                    {completeBatchMutation.isPending ? "Completing..." : "Complete Round & Return to Shop"}
                  </button>
                ) : (
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "24px", fontWeight: 900, color: "#6fcf3a" }}>
                      {activeStops.filter((s) => s.status === "DELIVERED").length} / {activeStops.length}
                    </span>
                    <p style={{ margin: 0, fontSize: "11px", opacity: 0.75 }}>Completed</p>
                  </div>
                )}
              </div>

              {/* Interactive Route Map with 2-Digit Stop Markers */}
              <div style={{ marginBottom: "20px" }}>
                <DeliveryRouteMap
                  partnerPosition={gpsPos}
                  stops={activeStops
                    .filter((s) => s.customer_latitude && s.customer_longitude)
                    .map((s, idx) => ({
                      id: s.id,
                      orderNumber: s.order_number || String(s.order_id),
                      displayNumber: s.display_number || String(idx + 1).padStart(2, "0"),
                      label: s.customer_name || `Stop ${idx + 1}`,
                      customerName: s.customer_name || "Customer",
                      address: s.delivery_address?.address_line1 || s.delivery_area || "Solapur",
                      lat: Number(s.customer_latitude),
                      lng: Number(s.customer_longitude),
                      isCompleted: s.status === "DELIVERED",
                      items: s.items?.map((it) => `${it.product_name} (${it.quantity} ${it.unit})`),
                    }))}
                  height="280px"
                />
              </div>

              {/* Current Next-Stop Card */}
              {currentStop && currentStop.status !== "DELIVERED" && (
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    border: "2px solid #1a3d2b",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                    overflow: "hidden",
                    marginBottom: "24px",
                  }}
                >
                  <div
                    style={{
                      background: "#1a3d2b",
                      padding: "14px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      color: "#ffffff",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: "#6fcf3a",
                          animation: "pulse 1.5s infinite",
                        }}
                      />
                      <span style={{ fontSize: "13px", fontWeight: 800, color: "#6fcf3a" }}>
                        CURRENT TARGET STOP
                      </span>
                    </div>
                    <span style={{ fontSize: "12px", opacity: 0.85 }}>
                      Order #{currentStop.order_number}
                    </span>
                  </div>

                  <div style={{ padding: "20px" }}>
                    {/* Customer Info & Actions */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                        gap: "16px",
                        marginBottom: "18px",
                      }}
                    >
                      <div>
                        <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>
                          Customer Name
                        </p>
                        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#111827" }}>
                          {currentStop.customer_name || "Customer"}
                        </h3>
                        <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#6b7280" }}>
                          {currentStop.delivery_area ? `📍 ${currentStop.delivery_area}` : "Solapur"}
                          {currentStop.distance_km ? ` · ~${currentStop.distance_km} km from shop` : ""}
                        </p>
                      </div>

                      <div>
                        <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>
                          Payment to Collect
                        </p>
                        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#15803d" }}>
                          ₹{Number(currentStop.total_amount || 0).toFixed(0)}{" "}
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>
                            ({currentStop.payment_method === "COD" ? "Cash On Delivery (Collect Cash)" : "Prepaid Online ✓"})
                          </span>
                        </h3>
                      </div>
                    </div>

                    {/* Address Box */}
                    <div
                      style={{
                        padding: "14px",
                        background: "#f9fafb",
                        borderRadius: "12px",
                        border: "1px solid #e5e7eb",
                        marginBottom: "18px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <MapPin size={18} color="#1a6b3a" style={{ marginTop: "2px", flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: "13.5px", fontWeight: 600, color: "#1f2937", lineHeight: 1.4 }}>
                            {currentStop.delivery_address
                              ? `${currentStop.delivery_address.address_line1}, ${currentStop.delivery_address.landmark ? currentStop.delivery_address.landmark + ", " : ""}${currentStop.delivery_address.city} ${currentStop.delivery_address.pincode}`
                              : currentStop.delivery_area || "Customer Address in Solapur"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Items inside this order bag */}
                    {currentStop.items && currentStop.items.length > 0 && (
                      <div style={{ marginBottom: "20px" }}>
                        <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>
                          Bag Contents ({currentStop.items.length} items):
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          {currentStop.items.map((it, idx) => (
                            <span
                              key={idx}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "8px",
                                background: "#f0fdf4",
                                border: "1px solid #bbf7d0",
                                color: "#166534",
                                fontSize: "12.5px",
                                fontWeight: 600,
                              }}
                            >
                              🥬 {it.product_name} — {it.quantity} {it.unit}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Communication & Navigation Buttons */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px",
                        marginBottom: "20px",
                      }}
                    >
                      {currentStop.customer_phone ? (
                        <a
                          href={`tel:${currentStop.customer_phone}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            padding: "12px",
                            borderRadius: "10px",
                            background: "#f0fdf4",
                            border: "1.5px solid #86efac",
                            color: "#166534",
                            fontWeight: 700,
                            fontSize: "13.5px",
                            textDecoration: "none",
                          }}
                        >
                          <Phone size={16} /> Call ({currentStop.customer_phone})
                        </a>
                      ) : (
                        <button
                          disabled
                          style={{
                            padding: "12px",
                            borderRadius: "10px",
                            background: "#f3f4f6",
                            border: "1px solid #e5e7eb",
                            color: "#9ca3af",
                            fontSize: "13px",
                            fontWeight: 600,
                          }}
                        >
                          Phone masked for privacy
                        </button>
                      )}

                      {/* Google Maps External Navigation */}
                      <a
                        href={
                          currentStop.delivery_address?.latitude && currentStop.delivery_address?.longitude
                            ? `https://www.google.com/maps/dir/?api=1&destination=${currentStop.delivery_address.latitude},${currentStop.delivery_address.longitude}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                currentStop.delivery_address?.address_line1 || currentStop.delivery_area || "Solapur"
                              )}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          padding: "12px",
                          borderRadius: "10px",
                          background: "#eff6ff",
                          border: "1.5px solid #93c5fd",
                          color: "#1e40af",
                          fontWeight: 700,
                          fontSize: "13.5px",
                          textDecoration: "none",
                        }}
                      >
                        <Navigation size={16} /> Open in Google Maps
                      </a>
                    </div>

                    {/* Doorstep OTP Verification Form */}
                    <div
                      style={{
                        padding: "16px 20px",
                        borderRadius: "14px",
                        background: "#fffbeb",
                        border: "1.5px solid #fde68a",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <ShieldCheck size={18} color="#d97706" />
                        <strong style={{ fontSize: "14px", color: "#92400e", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          DELIVERY VERIFICATION
                        </strong>
                      </div>
                      <p style={{ margin: "0 0 12px", fontSize: "12.5px", color: "#78350f" }}>
                        Ask customer for their <strong>4-digit delivery OTP</strong> shown on their screen or SMS to verify handoff.
                      </p>

                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="_ _ _ _"
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                          style={{
                            padding: "12px 16px",
                            borderRadius: "10px",
                            border: "2px solid #d97706",
                            fontSize: "22px",
                            fontWeight: 800,
                            letterSpacing: "8px",
                            textAlign: "center",
                            width: "150px",
                            background: "#ffffff",
                            outline: "none",
                          }}
                        />
                        <button
                          onClick={() =>
                            completeTaskMutation.mutate({ taskId: currentStop.id, otp: otpInput })
                          }
                          disabled={otpInput.length !== 4 || completeTaskMutation.isPending}
                          style={{
                            flex: 1,
                            minWidth: "160px",
                            padding: "12px 20px",
                            borderRadius: "10px",
                            background: otpInput.length === 4 ? "#16a34a" : "#d1d5db",
                            color: "#ffffff",
                            border: "none",
                            fontSize: "14px",
                            fontWeight: 800,
                            cursor: otpInput.length === 4 ? "pointer" : "not-allowed",
                            transition: "background 0.2s",
                          }}
                        >
                          {completeTaskMutation.isPending
                            ? "Verifying OTP..."
                            : "VERIFY OTP ✓"}
                        </button>
                      </div>

                      {completeTaskMutation.isError && (
                        <p style={{ color: "#dc2626", fontSize: "12.5px", margin: "8px 0 0", fontWeight: 600 }}>
                          {getErrorMessage(completeTaskMutation.error)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Stop Progression List */}
              <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e5e7eb", padding: "18px" }}>
                <h3 style={{ margin: "0 0 14px", fontSize: "15px", fontWeight: 800, color: "#111827" }}>
                  All Stops in this Delivery Round ({activeStops.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {activeStops.map((stop, idx) => {
                    const isDelivered = stop.status === "DELIVERED";
                    const isCurrent = stop.id === currentStop?.id && !isDelivered;
                    return (
                      <div
                        key={stop.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 16px",
                          borderRadius: "12px",
                          background: isCurrent ? "#f0fdf4" : isDelivered ? "#f9fafb" : "#ffffff",
                          border: `1.5px solid ${isCurrent ? "#86efac" : isDelivered ? "#e5e7eb" : "#f3f4f6"}`,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              background: isDelivered ? "#16a34a" : isCurrent ? "#1a3d2b" : "#e5e7eb",
                              color: isDelivered || isCurrent ? "#ffffff" : "#6b7280",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "12px",
                              fontWeight: 800,
                            }}
                          >
                            {isDelivered ? "✓" : idx + 1}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: "13.5px", fontWeight: 700, color: "#111827" }}>
                              {stop.customer_name || "Customer"} · #{stop.order_number}
                            </p>
                            <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#6b7280" }}>
                              {stop.delivery_area || "Solapur"} · ₹{Number(stop.total_amount || 0).toFixed(0)} ({stop.payment_method})
                            </p>
                          </div>
                        </div>

                        <div>
                          {isDelivered ? (
                            <span style={{ fontSize: "12px", color: "#15803d", fontWeight: 700 }}>
                              Delivered ✓
                            </span>
                          ) : isCurrent ? (
                            <span style={{ fontSize: "12px", color: "#166534", fontWeight: 800 }}>
                              Current Stop 🚴
                            </span>
                          ) : (
                            <span style={{ fontSize: "12px", color: "#9ca3af" }}>Upcoming</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "64px 20px",
                background: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>🛵</div>
              <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 800, color: "#111827" }}>
                No Active Delivery Route Running
              </h3>
              <p style={{ margin: "0 auto 20px", fontSize: "13.5px", color: "#6b7280", maxWidth: "420px" }}>
                When you pack orders and load your delivery bag, start the route here to see turn-by-turn customer stops and OTP verification.
              </p>
              <button
                onClick={() => setTab("PLAN_ROUTE")}
                style={{
                  padding: "10px 22px",
                  borderRadius: "10px",
                  background: "#1a3d2b",
                  color: "#ffffff",
                  fontSize: "13.5px",
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Plan Today&apos;s Delivery Route →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 2: PLAN ROUTE & DELIVERY BAG CHECKLIST
          ═══════════════════════════════════════════════════════ */}
      {tab === "PLAN_ROUTE" && (
        <div>
          {/* Planned Batch Stage (Bag Checklist) */}
          {plannedBatch ? (
            <div
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                border: "2px solid #1a3d2b",
                padding: "24px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                  marginBottom: "18px",
                  borderBottom: "1px solid #f3f4f6",
                  paddingBottom: "14px",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "#166534",
                      background: "#dcfce7",
                      padding: "2px 8px",
                      borderRadius: "999px",
                    }}
                  >
                    ROUTE READY FOR DISPATCH
                  </span>
                  <h2 style={{ margin: "6px 0 2px", fontSize: "19px", fontWeight: 800, color: "#111827" }}>
                    {t("seller.bagChecklist", "Delivery Bag Checklist")} · Route #{plannedBatch.id}
                  </h2>
                  <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                    Confirm each packed order is loaded into your delivery bag before leaving the shop.
                  </p>
                </div>

                <button
                  onClick={() => startBatchMutation.mutate(plannedBatch.id)}
                  disabled={!allBagItemsChecked || startBatchMutation.isPending}
                  style={{
                    padding: "12px 24px",
                    borderRadius: "12px",
                    background: allBagItemsChecked ? "#1a3d2b" : "#9ca3af",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 800,
                    border: "none",
                    cursor: allBagItemsChecked ? "pointer" : "not-allowed",
                    boxShadow: allBagItemsChecked ? "0 4px 14px rgba(26,61,43,0.3)" : "none",
                    transition: "all 0.2s",
                  }}
                >
                  <Truck size={17} style={{ display: "inline", marginRight: "6px" }} />
                  {startBatchMutation.isPending
                    ? "Starting Route..."
                    : t("seller.startDeliveryRoute", "Start Route (Go for Delivery) 🚴")}
                </button>
              </div>

              {/* Checklist items */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {plannedBatch.tasks.map((task, idx) => {
                  const isChecked = bagCheckedTaskIds.includes(task.id);
                  return (
                    <div
                      key={task.id}
                      onClick={() => toggleBagCheck(task.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        padding: "14px 18px",
                        borderRadius: "12px",
                        background: isChecked ? "#f0fdf4" : "#f9fafb",
                        border: `1.5px solid ${isChecked ? "#86efac" : "#e5e7eb"}`,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "6px",
                          border: `2px solid ${isChecked ? "#16a34a" : "#9ca3af"}`,
                          background: isChecked ? "#16a34a" : "#ffffff",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "13px",
                          fontWeight: 900,
                          flexShrink: 0,
                        }}
                      >
                        {isChecked && "✓"}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "14px", fontWeight: 800, color: "#111827" }}>
                            Stop {idx + 1}: {task.customer_name || "Customer"}
                          </span>
                          <span style={{ fontSize: "12px", color: "#6b7280" }}>
                            (#{task.order_number})
                          </span>
                        </div>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#4b5563" }}>
                          📍 {task.delivery_area || "Solapur"} · ₹{Number(task.total_amount || 0).toFixed(0)} ({task.payment_method})
                        </p>
                      </div>

                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: isChecked ? "#166534" : "#9ca3af",
                        }}
                      >
                        {isChecked ? "Loaded in Bag ✓" : "Tap when loaded"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Route Planning / Order Grouping Station */
            <div
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                padding: "24px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "14px",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 800, color: "#111827" }}>
                    {t("seller.readyToDeliver", "Ready Orders Available for Delivery")} ({readyTasks.length})
                  </h2>
                  <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                    Select up to 10 nearby orders to form an optimal delivery route.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => suggestRouteMutation.mutate()}
                    disabled={suggestRouteMutation.isPending || readyTasks.length === 0}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "10px 16px",
                      borderRadius: "10px",
                      background: "#eff6ff",
                      border: "1.5px solid #93c5fd",
                      color: "#1e40af",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Sparkles size={16} />
                    {suggestRouteMutation.isPending
                      ? "Calculating..."
                      : t("seller.suggestRoute", "Suggest Route (Max 10)")}
                  </button>

                  <button
                    onClick={() => createBatchMutation.mutate(selectedTaskIds)}
                    disabled={selectedTaskIds.length === 0 || createBatchMutation.isPending}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "10px 20px",
                      borderRadius: "10px",
                      background: selectedTaskIds.length > 0 ? "#1a3d2b" : "#d1d5db",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: 800,
                      border: "none",
                      cursor: selectedTaskIds.length > 0 ? "pointer" : "not-allowed",
                      transition: "all 0.15s",
                    }}
                  >
                    <Check size={16} />
                    {createBatchMutation.isPending
                      ? "Creating Route..."
                      : `${t("seller.createRoute", "Create Route Batch")} (${selectedTaskIds.length} Selected)`}
                  </button>
                </div>
              </div>

              {/* Ready orders list */}
              {readyTasks.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 20px", color: "#9ca3af" }}>
                  <p style={{ fontSize: "36px", margin: "0 0 10px" }}>📦</p>
                  <p style={{ fontSize: "14px", margin: 0 }}>
                    No packed orders ready for delivery yet. Go to Orders to accept and pack incoming orders.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {readyTasks.map((task) => {
                    const isSelected = selectedTaskIds.includes(task.id);
                    return (
                      <div
                        key={task.id}
                        onClick={() => toggleTaskSelection(task.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "14px 18px",
                          borderRadius: "12px",
                          background: isSelected ? "#f0fdf4" : "#ffffff",
                          border: `1.5px solid ${isSelected ? "#86efac" : "#e5e7eb"}`,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by parent onClick
                            style={{ width: "18px", height: "18px", accentColor: "#1a3d2b" }}
                          />
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <strong style={{ fontSize: "14px", color: "#111827" }}>
                                {task.customer_name || "Customer"}
                              </strong>
                              <span style={{ fontSize: "12px", color: "#6b7280" }}>
                                #{task.order_number}
                              </span>
                              {task.is_urgent && (
                                <span
                                  style={{
                                    fontSize: "10.5px",
                                    fontWeight: 800,
                                    padding: "2px 6px",
                                    borderRadius: "999px",
                                    background: "#fee2e2",
                                    color: "#dc2626",
                                  }}
                                >
                                  URGENT
                                </span>
                              )}
                            </div>
                            <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#4b5563" }}>
                              📍 {task.delivery_area || "Solapur"}
                              {task.distance_km ? ` · ~${task.distance_km} km from shop` : ""} · ₹
                              {Number(task.total_amount || 0).toFixed(0)} ({task.payment_method})
                            </p>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: isSelected ? "#15803d" : "#6b7280",
                            }}
                          >
                            {isSelected ? "Included in Route ✓" : "Click to Add"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 3: COMPLETED DELIVERIES TODAY
          ═══════════════════════════════════════════════════════ */}
      {tab === "COMPLETED" && (
        <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e5e7eb", padding: "24px" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 800, color: "#111827" }}>
            {t("seller.deliveredToday", "Deliveries Completed Today")}
          </h2>

          {tasks.filter((t) => t.status === "DELIVERED").length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "#9ca3af" }}>
              <p style={{ fontSize: "36px", margin: "0 0 10px" }}>🚴</p>
              <p style={{ fontSize: "14px", margin: 0 }}>No completed deliveries yet today.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {tasks
                .filter((t) => t.status === "DELIVERED")
                .map((task) => (
                  <div
                    key={task.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 18px",
                      borderRadius: "12px",
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <CheckCircle2 size={20} color="#16a34a" />
                      <div>
                        <strong style={{ fontSize: "14px", color: "#111827" }}>
                          {task.customer_name || "Customer"} · #{task.order_number}
                        </strong>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6b7280" }}>
                          {task.delivery_area || "Solapur"} · ₹{Number(task.total_amount || 0).toFixed(0)} ({task.payment_method})
                        </p>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "999px",
                        background: "#dcfce7",
                        color: "#166534",
                        fontSize: "11px",
                        fontWeight: 800,
                      }}
                    >
                      DELIVERED
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
