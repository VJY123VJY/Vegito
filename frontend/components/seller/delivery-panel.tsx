"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listDeliveryTasks, updateDeliveryTask, completeDelivery } from "@/lib/api/delivery";
import { watchDeliveryBoyGps } from "@/lib/api/location";
import { getStoredToken } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import dynamic from "next/dynamic";
import { Phone, MapPin, Navigation, CheckCircle2, AlertTriangle, Truck } from "lucide-react";
import type { DeliveryTask } from "@/lib/api/delivery";

// SSR-safe MapLibre import
const LiveDeliveryMap = dynamic(
  () => import("@/components/map/live-delivery-map").then((m) => ({ default: m.LiveDeliveryMap })),
  { ssr: false, loading: () => <div style={{ height: "260px", background: "#e8f4ec", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: "14px" }}>Loading map...</div> }
);

function TaskStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    ASSIGNED:  { bg: "#fef3c7", color: "#92400e" },
    STARTED:   { bg: "#dbeafe", color: "#1e40af" },
    DELIVERED: { bg: "#dcfce7", color: "#15803d" },
    FAILED:    { bg: "#fee2e2", color: "#991b1b" },
    CANCELLED: { bg: "#f3f4f6", color: "#6b7280" },
  };
  const c = cfg[status] ?? { bg: "#f3f4f6", color: "#374151" };
  return <span style={{ padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "700", background: c.bg, color: c.color }}>{status.replace(/_/g, " ")}</span>;
}

function ActiveDeliveryCard({ task }: { task: DeliveryTask }) {
  const client = useQueryClient();
  const [otp, setOtp] = useState("");
  const [gpsPos, setGpsPos] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState("");
  const [gpsActive, setGpsActive] = useState(false);

  const complete = useMutation({
    mutationFn: () => completeDelivery(task.id, otp),
    onSuccess: () => client.invalidateQueries({ queryKey: ["delivery-tasks"] }),
  });

  // Auto-start GPS when delivery starts
  useEffect(() => {
    if (task.status !== "STARTED") return;
    setGpsActive(true);
    const token = getStoredToken();
    if (!token) {
      setGpsError("Sign in again to share live location.");
      return;
    }
    const stop = watchDeliveryBoyGps(
      task.order_id,
      token,
      (coords) => setGpsPos({ lat: coords.lat, lng: coords.lng }),
      () => setGpsError("GPS unavailable — check location permissions"),
    );
    return stop;
  }, [task.id, task.status]);

  const addr = task.delivery_address;
  const phone = task.customer_phone;

  return (
    <div style={{ background: "#fff", borderRadius: "16px", border: "2px solid #1a3d2b", boxShadow: "0 4px 20px rgba(26,61,43,0.12)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "#1a3d2b", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {task.status === "STARTED" && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#6fcf3a", animation: "blink 1s ease infinite" }} />}
          <span style={{ color: "#6fcf3a", fontSize: "12px", fontWeight: "800", letterSpacing: "0.5px" }}>
            {task.status === "STARTED" ? "🚴 ACTIVE DELIVERY" : "📦 DELIVERY TASK"}
          </span>
        </div>
        <TaskStatusBadge status={task.status} />
      </div>

      <div style={{ padding: "20px" }}>
        {/* Customer info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#9ca3af", fontWeight: "600", textTransform: "uppercase" }}>Customer</p>
            <p style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#111827" }}>{task.customer_name ?? "Customer"}</p>
          </div>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#9ca3af", fontWeight: "600", textTransform: "uppercase" }}>Order</p>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#111827" }}>{task.order_number ?? `#${task.order_id}`}</p>
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#9ca3af", fontWeight: "600", textTransform: "uppercase" }}>Delivery Address</p>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
              <MapPin size={15} color="#1a6b3a" style={{ flexShrink: 0, marginTop: "2px" }} />
              <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: "1.5" }}>
                {addr ? `${addr.address_line1}, ${addr.city} ${addr.pincode}` : "Address unavailable"}
              </p>
            </div>
          </div>
        </div>

        {/* GPS status */}
        {task.status === "STARTED" && (
          <div style={{
            padding: "10px 14px", borderRadius: "9px", marginBottom: "14px",
            background: gpsError ? "#fff5f5" : gpsActive ? "#f0fdf4" : "#f9fafb",
            border: `1px solid ${gpsError ? "#fecaca" : gpsActive ? "#d1fae5" : "#f0f1f3"}`,
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: gpsError ? "#ef4444" : gpsPos ? "#22c55e" : "#9ca3af", flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: gpsError ? "#dc2626" : "#374151", fontWeight: "600" }}>
              {gpsError || (gpsPos ? `GPS active · ${gpsPos.lat.toFixed(4)}°N ${gpsPos.lng.toFixed(4)}°E` : "Acquiring GPS signal...")}
            </span>
          </div>
        )}

        {/* Map (only during active delivery) */}
        {task.status === "STARTED" && (
          <div style={{ marginBottom: "16px" }}>
            <LiveDeliveryMap
              deliveryPosition={gpsPos}
              customerPosition={null}
              mode="delivery"
              height="220px"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Phone */}
          {phone && (
            <a href={`tel:${phone}`} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              padding: "13px", background: "#f0fdf4", border: "1.5px solid #d1fae5",
              borderRadius: "10px", color: "#1a6b3a", fontWeight: "700", fontSize: "14px",
              textDecoration: "none",
            }}>
              <Phone size={17} /> Call Customer ({phone})
            </a>
          )}

          {/* Start Delivery */}
          {task.status === "ASSIGNED" && (
            <StartDeliveryBtn taskId={task.id} />
          )}

          {/* OTP + Complete (during started) */}
          {task.status === "STARTED" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 6-digit customer OTP"
                  maxLength={6}
                  inputMode="numeric"
                  style={{
                    flex: 1, padding: "13px 16px", border: "2px solid #d1fae5",
                    borderRadius: "10px", fontSize: "18px", fontWeight: "700",
                    letterSpacing: "6px", textAlign: "center", outline: "none",
                  }}
                />
              </div>
              <button
                onClick={() => complete.mutate()}
                disabled={otp.length < 4 || complete.isPending}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  padding: "14px", background: otp.length >= 4 ? "#16a34a" : "#d1d5db",
                  color: "#fff", border: "none", borderRadius: "10px",
                  fontWeight: "800", fontSize: "15px", cursor: otp.length >= 4 ? "pointer" : "not-allowed",
                  transition: "background 200ms",
                }}>
                <CheckCircle2 size={18} />
                {complete.isPending ? "Completing..." : "Verify OTP & Complete Delivery"}
              </button>
              {complete.isError && <p style={{ color: "#dc2626", fontSize: "13px", margin: 0 }}>{getErrorMessage(complete.error)}</p>}
            </div>
          )}

          {task.status === "DELIVERED" && (
            <div style={{ padding: "14px", background: "#dcfce7", borderRadius: "10px", textAlign: "center" }}>
              <CheckCircle2 size={20} color="#15803d" style={{ marginBottom: "6px" }} />
              <p style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#15803d" }}>Delivery Completed! ✅</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StartDeliveryBtn({ taskId }: { taskId: number }) {
  const client = useQueryClient();
  const start = useMutation({
    mutationFn: () => updateDeliveryTask(taskId, "STARTED"),
    onSuccess: () => client.invalidateQueries({ queryKey: ["delivery-tasks"] }),
  });
  return (
    <button onClick={() => start.mutate()} disabled={start.isPending}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "14px", background: "#1a3d2b", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "800", fontSize: "15px", cursor: "pointer" }}>
      <Navigation size={18} />
      {start.isPending ? "Starting..." : "Start Delivery 🚴"}
    </button>
  );
}

export function DeliveryPanel() {
  const tasks = useQuery({ queryKey: ["delivery-tasks"], queryFn: () => listDeliveryTasks(), refetchInterval: 15000 });
  const taskList = tasks.data ?? [];
  const activeTask = taskList.find((t) => t.status === "STARTED");
  const assignedTasks = taskList.filter((t) => t.status === "ASSIGNED");
  const completedTasks = taskList.filter((t) => t.status === "DELIVERED");

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: "800", color: "#111827" }}>Deliveries</h2>
        <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
          {activeTask ? "🚴 Active delivery in progress" : `${taskList.length} task${taskList.length !== 1 ? "s" : ""} today`}
        </p>
      </div>

      {tasks.isLoading && <div style={{ padding: "48px", textAlign: "center", color: "#9ca3af" }}>Loading deliveries...</div>}

      {/* Active delivery first */}
      {activeTask && (
        <div style={{ marginBottom: "20px" }}>
          <ActiveDeliveryCard task={activeTask} />
        </div>
      )}

      {/* Assigned (ready to start) */}
      {assignedTasks.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#374151", marginBottom: "12px" }}>
            <Truck size={15} style={{ verticalAlign: "middle", marginRight: "6px" }} />
            Ready to Deliver ({assignedTasks.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {assignedTasks.map((task) => <ActiveDeliveryCard key={task.id} task={task} />)}
          </div>
        </div>
      )}

      {/* Completed */}
      {completedTasks.length > 0 && (
        <div>
          <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#374151", marginBottom: "12px" }}>
            <CheckCircle2 size={15} color="#16a34a" style={{ verticalAlign: "middle", marginRight: "6px" }} />
            Completed Today ({completedTasks.length})
          </h3>
          <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #f0f1f3", overflow: "hidden" }}>
            {completedTasks.map((task, i) => (
              <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 18px", borderBottom: i < completedTasks.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                <CheckCircle2 size={18} color="#16a34a" />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: "600", color: "#111827" }}>{task.customer_name ?? "Customer"} — {task.order_number ?? `Order #${task.order_id}`}</p>
                  <p style={{ margin: 0, fontSize: "11px", color: "#9ca3af" }}>{task.delivery_address?.city ?? "Solapur"}</p>
                </div>
                <span style={{ padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "700", background: "#dcfce7", color: "#15803d" }}>Delivered</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!tasks.isLoading && taskList.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 24px" }}>
          <div style={{ fontSize: "60px", marginBottom: "16px" }}>🚴</div>
          <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: "700", color: "#111827" }}>No deliveries assigned</h3>
          <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>When customers place orders and you mark them Ready, they will appear here.</p>
        </div>
      )}
    </div>
  );
}
