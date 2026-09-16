"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  MAPBOX_TOKEN,
  DEFAULT_SOLAPUR_COORDS,
  getMapStyle,
} from "@/lib/api/map";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Truck, Phone, Navigation, Clock, User } from "lucide-react";

export interface LivePartnerMapItem {
  partner_id: number;
  partner_name: string;
  phone?: string;
  vehicle_type?: string;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  recorded_at?: string | null;
  active_order_number?: string | null;
  customer_name?: string | null;
  delivery_address?: string | null;
  customer_latitude?: number | null;
  customer_longitude?: number | null;
}

interface AdminLiveDeliveryMapProps {
  partners: LivePartnerMapItem[];
  height?: string;
  onSelectPartner?: (partner: LivePartnerMapItem) => void;
}

export function AdminLiveDeliveryMap({
  partners,
  height = "480px",
  onSelectPartner,
}: AdminLiveDeliveryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<LivePartnerMapItem | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let mapboxgl: any;
    let isCancelled = false;

    import("mapbox-gl").then((module) => {
      if (isCancelled || !containerRef.current) return;
      mapboxgl = module.default || module;
      if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: getMapStyle(),
        center: DEFAULT_SOLAPUR_COORDS,
        zoom: 12.8,
        attributionControl: false,
      });

      mapRef.current = map;

      map.on("load", () => {
        if (isCancelled) return;
        renderPartnerMarkers(mapboxgl, map);
      });
    });

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-render markers when partners change
  useEffect(() => {
    if (!mapRef.current) return;
    import("mapbox-gl").then((module) => {
      const mapboxgl = module.default || module;
      renderPartnerMarkers(mapboxgl, mapRef.current);
    });
  }, [partners]); // eslint-disable-line react-hooks/exhaustive-deps

  function renderPartnerMarkers(mapboxgl: any, map: any) {
    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const validPartners = partners.filter((p) => p.latitude && p.longitude);
    if (validPartners.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();

    validPartners.forEach((p) => {
      const el = document.createElement("div");
      const isBusy = p.status === "BUSY" || p.status === "STARTED";
      const isOnline = p.status === "ONLINE" || p.status === "AVAILABLE";

      el.style.cssText = `
        width: 36px;
        height: 36px;
        background: ${isBusy ? "#0284c7" : isOnline ? "#16835b" : "#64748b"};
        border: 2.5px solid #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.25);
        cursor: pointer;
        transition: transform 160ms ease;
      `;
      el.textContent = "🚴";

      el.addEventListener("click", () => {
        setSelectedPartner(p);
        onSelectPartner?.(p);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([p.longitude!, p.latitude!])
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([p.longitude!, p.latitude!]);

      // If customer destination exists for active task, show house pin too
      if (p.customer_latitude && p.customer_longitude) {
        const custEl = document.createElement("div");
        custEl.style.cssText = `
          width: 28px;
          height: 28px;
          background: #dc2626;
          border: 2px solid #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        custEl.textContent = "🏠";
        const custMarker = new mapboxgl.Marker({ element: custEl })
          .setLngLat([p.customer_longitude, p.customer_latitude])
          .addTo(map);
        markersRef.current.push(custMarker);
        bounds.extend([p.customer_longitude, p.customer_latitude]);
      }
    });

    if (validPartners.length > 1) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
    }
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height,
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid #e1e8e2",
        boxShadow: "0 2px 10px rgba(6, 60, 50, 0.05)",
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%", backgroundColor: "#e9f6ee" }} />

      {/* Map Legend Overlay */}
      <div
        style={{
          position: "absolute",
          top: "14px",
          left: "14px",
          backgroundColor: "#ffffff",
          padding: "10px 14px",
          borderRadius: "12px",
          border: "1px solid #e1e8e2",
          boxShadow: "0 4px 12px rgba(6, 60, 50, 0.08)",
          zIndex: 10,
        }}
      >
        <p style={{ margin: "0 0 6px", fontSize: "12px", fontWeight: 800, color: "#063c32" }}>
          Live Fleet Monitor
        </p>
        <div style={{ display: "flex", gap: "10px", fontSize: "11px", color: "#62746a" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#16835b" }} />
            Available ({partners.filter((p) => p.status === "ONLINE" || p.status === "AVAILABLE").length})
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0284c7" }} />
            On Delivery ({partners.filter((p) => p.status === "BUSY" || p.status === "STARTED").length})
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#64748b" }} />
            Offline ({partners.filter((p) => p.status === "OFFLINE").length})
          </span>
        </div>
      </div>

      {/* Selected Partner Flyout Panel */}
      {selectedPartner && (
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            right: "16px",
            width: "300px",
            backgroundColor: "#ffffff",
            padding: "16px",
            borderRadius: "14px",
            border: "1px solid #e1e8e2",
            boxShadow: "0 8px 24px rgba(6, 60, 50, 0.15)",
            zIndex: 20,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
            <div>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#063c32" }}>
                {selectedPartner.partner_name}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#62746a" }}>
                {selectedPartner.vehicle_type || "Bicycle"} · {selectedPartner.phone || ""}
              </p>
            </div>
            <button
              onClick={() => setSelectedPartner(null)}
              style={{ background: "none", border: "none", fontSize: "16px", cursor: "pointer", color: "#9ca3af" }}
            >
              ✕
            </button>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <StatusBadge status={selectedPartner.status} />
          </div>

          {selectedPartner.active_order_number ? (
            <div style={{ backgroundColor: "#f9fbf8", padding: "10px", borderRadius: "10px", fontSize: "12px" }}>
              <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#063c32" }}>
                Order #{selectedPartner.active_order_number}
              </p>
              {selectedPartner.customer_name && (
                <p style={{ margin: "0 0 2px", color: "#475569" }}>
                  Customer: {selectedPartner.customer_name}
                </p>
              )}
              {selectedPartner.delivery_address && (
                <p style={{ margin: 0, color: "#64748b", fontSize: "11px" }}>
                  {selectedPartner.delivery_address}
                </p>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: "12px", color: "#62746a" }}>
              No active deliveries assigned currently.
            </p>
          )}

          {selectedPartner.recorded_at && (
            <p style={{ margin: "10px 0 0", fontSize: "11px", color: "#9ca3af" }}>
              Last GPS update: {new Date(selectedPartner.recorded_at).toLocaleTimeString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
