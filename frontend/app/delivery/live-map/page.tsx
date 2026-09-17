"use client";

import React, { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Compass, MapPin, Navigation, AlertTriangle, RefreshCw, CheckCircle2, Phone } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { MapboxTrackingMap, type LatLng } from "@/components/map/mapbox-tracking-map";
import { listDeliveryTasks, getDeliveryProfile, postPartnerGpsLocation } from "@/lib/api/delivery";
import { watchDeliveryBoyGps } from "@/lib/api/location";
import { getStoredToken, getStoredUserName } from "@/lib/api/auth";
import { DEFAULT_SOLAPUR_COORDS } from "@/lib/api/map";

export default function DeliveryLiveMapPage() {
  const userName = getStoredUserName();
  const token = getStoredToken() || "";

  const [currentCoords, setCurrentCoords] = useState<LatLng>({
    lat: DEFAULT_SOLAPUR_COORDS[1],
    lng: DEFAULT_SOLAPUR_COORDS[0],
  });
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [lastStreamTime, setLastStreamTime] = useState<string | null>(null);

  const profile = useQuery({ queryKey: ["delivery-profile"], queryFn: getDeliveryProfile });
  const tasks = useQuery({ queryKey: ["delivery-tasks"], queryFn: () => listDeliveryTasks() });

  const partnerName = profile.data?.name || userName || "Delivery Partner";
  const activeTask = (tasks.data ?? []).find(
    (t) => t.status === "OUT_FOR_DELIVERY" || t.order_status === "OUT_FOR_DELIVERY" || t.status === "PICKED_UP" || t.status === "READY_FOR_PICKUP"
  );

  // Watch GPS Geolocation
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }

    let isSubscribed = true;
    let cleanupWsTracker: (() => void) | null = null;

    // If an active order is being delivered, use real-time WebSocket live GPS streaming
    if (activeTask && token) {
      cleanupWsTracker = watchDeliveryBoyGps(
        activeTask.order_id,
        token,
        (coords) => {
          if (!isSubscribed) return;
          setCurrentCoords({ lat: coords.lat, lng: coords.lng });
          setIsGpsActive(true);
          setGpsError(null);
          setLastStreamTime(new Date().toLocaleTimeString());
        },
        (err) => {
          if (!isSubscribed) return;
          if (err?.code === 1) {
            setGpsError("Location permission was denied. Please enable GPS location permission in your browser.");
          } else if (err?.code === 2) {
            setGpsError("Location position is unavailable. Please check device GPS.");
          } else {
            setGpsError("GPS tracking error. Retrying...");
          }
        }
      );
    } else {
      // General GPS position tracking when no active order
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!isSubscribed) return;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCurrentCoords({ lat, lng });
          setIsGpsActive(true);
          setGpsError(null);
          setLastStreamTime(new Date().toLocaleTimeString());

          // Post partner location to backend every 10s
          postPartnerGpsLocation({
            latitude: lat,
            longitude: lng,
            accuracy_meters: pos.coords.accuracy ?? undefined,
            heading: pos.coords.heading ?? undefined,
            speed_kmh: pos.coords.speed ? pos.coords.speed * 3.6 : undefined,
          }).catch(() => {});
        },
        (err) => {
          if (!isSubscribed) return;
          if (err.code === err.PERMISSION_DENIED) {
            setGpsError("Location permission is required for live delivery tracking. Please enable location access.");
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            setGpsError("GPS signal unavailable. Ensure location services are turned on.");
          } else if (err.code === err.TIMEOUT) {
            setGpsError("Location request timed out. Retrying GPS connection...");
          } else {
            setGpsError("Unable to acquire GPS coordinates.");
          }
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );

      return () => {
        isSubscribed = false;
        navigator.geolocation.clearWatch(watchId);
      };
    }

    return () => {
      isSubscribed = false;
      cleanupWsTracker?.();
    };
  }, [activeTask?.order_id, token]);

  const shopCoords: LatLng | null = activeTask?.shop_latitude && activeTask?.shop_longitude
    ? { lat: Number(activeTask.shop_latitude), lng: Number(activeTask.shop_longitude) }
    : null;

  const customerCoords: LatLng | null = activeTask?.customer_latitude && activeTask?.customer_longitude
    ? { lat: Number(activeTask.customer_latitude), lng: Number(activeTask.customer_longitude) }
    : null;

  return (
    <DashboardShell
      role="delivery"
      userName={partnerName}
      userRole="Delivery Fleet Partner"
      greeting="Live Delivery Map"
      subtitle="Interactive Mapbox navigation and live GPS streaming across Solapur"
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* GPS Alert Error if permission denied */}
        {gpsError && (
          <div
            style={{
              marginBottom: "16px",
              padding: "14px 18px",
              borderRadius: "12px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "13.5px",
              fontWeight: 600,
            }}
          >
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>GPS Alert: </strong> {gpsError}
            </div>
          </div>
        )}

        {/* Status indicator pill */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: isGpsActive ? "#16a34a" : "#eab308",
                display: "inline-block",
                boxShadow: isGpsActive ? "0 0 8px rgba(22, 163, 74, 0.6)" : "none",
              }}
            />
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#063c32" }}>
              {isGpsActive ? "Live GPS Connected" : "Acquiring GPS Signal..."}
            </span>
            {lastStreamTime && (
              <span style={{ fontSize: "12px", color: "#62746a" }}>
                · Last streamed {lastStreamTime}
              </span>
            )}
          </div>

          {activeTask && (
            <div
              style={{
                backgroundColor: "#e8f5ec",
                color: "#16835b",
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 800,
              }}
            >
              Active Delivery: Order #{activeTask.order_number || activeTask.order_id}
            </div>
          )}
        </div>

        {/* Mapbox Interactive Map */}
        <div style={{ marginBottom: "20px" }}>
          <MapboxTrackingMap
            deliveryPosition={currentCoords}
            shopPosition={shopCoords}
            customerPosition={customerCoords}
            shopName={activeTask?.shop_name || "Vegito Shop"}
            customerName={activeTask?.customer_name || "Customer Doorstep"}
            partnerName={partnerName}
            orderStatus={activeTask?.order_status || activeTask?.status || "OUT_FOR_DELIVERY"}
            height="500px"
          />
        </div>

        {/* Active Delivery Information Panel */}
        {activeTask ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "20px",
              borderRadius: "16px",
              border: "1px solid #e1e8e2",
              boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
            }}
          >
            <h3 style={{ margin: "0 0 12px", fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
              Active Task Details: Order #{activeTask.order_number || activeTask.order_id}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
              <div>
                <span style={{ fontSize: "12px", color: "#62746a", fontWeight: 600 }}>Customer Name</span>
                <strong style={{ display: "block", fontSize: "14px", color: "#111827" }}>
                  {activeTask.customer_name || "Customer"}
                </strong>
                {activeTask.customer_phone && (
                  <a
                    href={`tel:${activeTask.customer_phone}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      marginTop: "4px",
                      color: "#0284c7",
                      fontSize: "12px",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    <Phone size={12} /> {activeTask.customer_phone}
                  </a>
                )}
              </div>

              <div>
                <span style={{ fontSize: "12px", color: "#62746a", fontWeight: 600 }}>Destination Address</span>
                <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#374151" }}>
                  {activeTask.delivery_address?.address_line1 || "Customer Address"}, {activeTask.delivery_address?.city || "Solapur"} {activeTask.delivery_address?.pincode || ""}
                </p>
              </div>

              <div>
                <span style={{ fontSize: "12px", color: "#62746a", fontWeight: 600 }}>Status</span>
                <p style={{ margin: "2px 0 0", fontSize: "13px", fontWeight: 800, color: "#16835b" }}>
                  {(activeTask.order_status || activeTask.status).replace(/_/g, " ")}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "24px",
              borderRadius: "16px",
              border: "1px solid #e1e8e2",
              textAlign: "center",
              color: "#62746a",
            }}
          >
            <p style={{ margin: 0, fontSize: "13.5px" }}>
              No active out-for-delivery task currently assigned. Your live GPS position is mapped above in Solapur.
            </p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
