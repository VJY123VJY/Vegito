"use client";

/**
 * Customer Live Delivery Tracking Page
 *
 * Customer opens this page after placing an order to see the delivery
 * partner's live GPS location on a MapLibre map.
 *
 * Real-time updates via WebSocket → subscribeToLocation().
 * No fake coordinates. If GPS is not yet available, shows a "waiting" state.
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { getLastLocation, subscribeToLocation, type LocationData } from "@/lib/api/location";
import { listDeliveryTasks } from "@/lib/api/delivery";
import { useQuery } from "@tanstack/react-query";
import { Phone, MapPin, Clock, RefreshCw, ChevronLeft } from "lucide-react";
import Link from "next/link";

// SSR-safe MapLibre
const LiveDeliveryMap = dynamic(
  () => import("@/components/map/live-delivery-map").then((m) => ({ default: m.LiveDeliveryMap })),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: "100%", background: "linear-gradient(145deg, #e8f4ec, #c8e6d4)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px" }}>
        <div style={{ fontSize: "36px" }}>🗺️</div>
        <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>Loading map…</p>
      </div>
    ),
  }
);

function formatLastUpdated(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 10) return "Just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return new Date(ts).toLocaleTimeString();
}

export default function TrackDeliveryPage() {
  const params = useParams();
  const taskId = (params?.taskId as string) || "";
  const id = Number(taskId);

  const [location, setLocation] = useState<LocationData | null>(null);
  const [wsStatus, setWsStatus] = useState<"connecting" | "live" | "error">("connecting");

  // Fetch task info (customer name, address)
  const tasks = useQuery({ queryKey: ["delivery-tasks-track", id], queryFn: () => listDeliveryTasks(), staleTime: 30_000 });
  const task = (tasks.data ?? []).find((t) => t.id === id);

  // Load last known location + subscribe to live updates
  useEffect(() => {
    let stopSubscription: (() => void) | null = null;

    // First: try to load last known position
    getLastLocation(id).then((loc) => {
      if (loc) setLocation(loc);
    });

    // Then: connect WebSocket for live updates
    stopSubscription = subscribeToLocation(
      id,
      (data) => {
        setLocation(data);
        setWsStatus("live");
      },
      () => setWsStatus("error"),
    );

    return () => stopSubscription?.();
  }, [id]);

  const phone = task?.customer_phone;
  const addr = task?.delivery_address;
  const isDelivered = task?.status === "DELIVERED";
  const isActive = task?.status === "STARTED";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f6f8fa",
      fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #f0f1f3",
        padding: "14px 20px", display: "flex", alignItems: "center", gap: "12px",
        position: "sticky", top: 0, zIndex: 40,
      }}>
        <Link href="/customer" style={{ display: "flex", alignItems: "center", color: "#374151", textDecoration: "none" }}>
          <ChevronLeft size={20} />
        </Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#111827" }}>
            {isDelivered ? "Order Delivered ✅" : isActive ? "Delivery In Progress" : "Track Delivery"}
          </h1>
          <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>
            Order {task?.order_number ?? `#${id}`}
          </p>
        </div>
        {wsStatus === "live" && (
          <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 10px", background: "#dcfce7", borderRadius: "999px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#16a34a", animation: "blink 1s ease infinite" }} />
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#16a34a" }}>Live</span>
          </div>
        )}
      </div>

      {/* Map — takes most of the screen */}
      <div style={{ padding: "16px", height: "calc(100vh - 64px - 220px)", minHeight: "280px" }}>
        {isDelivered ? (
          <div style={{ height: "100%", background: "linear-gradient(135deg, #dcfce7, #bbf7d0)", borderRadius: "16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
            <div style={{ fontSize: "64px" }}>✅</div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#15803d" }}>Order Delivered!</h2>
            <p style={{ margin: 0, fontSize: "14px", color: "#166534" }}>Your vegetables have arrived fresh.</p>
          </div>
        ) : location ? (
          <LiveDeliveryMap
            deliveryPosition={{ lat: location.lat, lng: location.lng }}
            customerPosition={null}
            mode="customer"
            height="100%"
          />
        ) : (
          <div style={{
            height: "100%", background: "linear-gradient(145deg, #e8f4ec, #c8e6d4)",
            borderRadius: "16px", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "14px",
          }}>
            <RefreshCw size={28} color="#2d6a45" style={{ animation: "spin 2s linear infinite" }} />
            <p style={{ margin: 0, fontSize: "14px", color: "#2d6a45", fontWeight: "600" }}>Waiting for partner location…</p>
            <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>Your delivery partner's GPS will appear here once they start.</p>
          </div>
        )}
      </div>

      {/* Info panel */}
      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #f0f1f3", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          {/* Status banner */}
          <div style={{
            padding: "14px 18px",
            background: isDelivered ? "#dcfce7" : isActive ? "#1a3d2b" : "#f9fafb",
            display: "flex", alignItems: "center", gap: "10px",
          }}>
            <div style={{ fontSize: "24px" }}>{isDelivered ? "✅" : isActive ? "🚴" : "📦"}</div>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: "14px", fontWeight: "800", color: isDelivered ? "#15803d" : isActive ? "#6fcf3a" : "#374151" }}>
                {isDelivered ? "Order Delivered" : isActive ? "Your vegetables are on the way!" : "Preparing your order"}
              </p>
              {location && (
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <Clock size={11} color={isActive ? "rgba(255,255,255,0.6)" : "#9ca3af"} />
                  <p style={{ margin: 0, fontSize: "11px", color: isActive ? "rgba(255,255,255,0.6)" : "#9ca3af" }}>
                    Location updated {formatLastUpdated(location.ts)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Delivery partner info */}
          <div style={{ padding: "16px 18px" }}>
            {location?.partner_name && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px", paddingBottom: "14px", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ width: "44px", height: "44px", background: "#1a3d2b", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🚴</div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 2px", fontSize: "14px", fontWeight: "700", color: "#111827" }}>{location.partner_name}</p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>Delivery Partner · Vegito</p>
                </div>
              </div>
            )}

            {/* Delivery address */}
            {addr && (
              <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                <MapPin size={16} color="#1a6b3a" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: "12px", color: "#9ca3af", fontWeight: "600" }}>DELIVERING TO</p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#374151" }}>{addr.address_line1}, {addr.city} {addr.pincode}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px" }}>
              {phone && (
                <a href={`tel:${phone}`} style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  padding: "13px", background: "#f0fdf4", border: "1.5px solid #d1fae5",
                  borderRadius: "10px", color: "#1a6b3a", fontWeight: "700", fontSize: "14px",
                  textDecoration: "none",
                }}>
                  <Phone size={16} /> Call Partner
                </a>
              )}
              <Link href="/customer/orders" style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                padding: "13px", background: "#f3f4f6",
                borderRadius: "10px", color: "#374151", fontWeight: "700", fontSize: "14px",
                textDecoration: "none",
              }}>
                View Orders
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
