"use client";

import React, { useEffect, useRef } from "react";
import {
  MAPBOX_TOKEN,
  DEFAULT_SOLAPUR_COORDS,
  getMapStyle,
} from "@/lib/api/map";

export interface RouteStop {
  id: number | string;
  orderNumber?: string;
  displayNumber?: string;
  label: string;
  customerName?: string;
  address?: string;
  phone?: string;
  items?: string[];
  lat: number;
  lng: number;
  isCompleted?: boolean;
}

interface DeliveryRouteMapProps {
  partnerPosition?: { lat: number; lng: number } | null;
  stops: RouteStop[];
  height?: string;
}

export function DeliveryRouteMap({
  partnerPosition,
  stops,
  height = "380px",
}: DeliveryRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let mapboxgl: any;
    let isCancelled = false;

    import("mapbox-gl").then((module) => {
      if (isCancelled || !containerRef.current) return;
      mapboxgl = module.default || module;
      if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN;

      const initialCenter = partnerPosition
        ? [partnerPosition.lng, partnerPosition.lat]
        : stops.length > 0
        ? [stops[0].lng, stops[0].lat]
        : DEFAULT_SOLAPUR_COORDS;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: getMapStyle(),
        center: initialCenter,
        zoom: 13,
        attributionControl: false,
      });

      mapRef.current = map;

      map.on("load", () => {
        if (isCancelled) return;

        const bounds = new mapboxgl.LngLatBounds();

        // Partner marker (current driver GPS position)
        if (partnerPosition) {
          const el = document.createElement("div");
          el.style.cssText = `
            width: 40px; height: 40px;
            background: #063c32; border: 3px solid #16835b;
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-size: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          `;
          el.textContent = "🚴";
          new mapboxgl.Marker({ element: el })
            .setLngLat([partnerPosition.lng, partnerPosition.lat])
            .addTo(map);
          bounds.extend([partnerPosition.lng, partnerPosition.lat]);
        }

        // Stops markers with 2-digit numbers
        stops.forEach((stop, index) => {
          const el = document.createElement("div");
          const dispNum = stop.displayNumber || String(index + 1).padStart(2, "0");
          el.style.cssText = `
            width: 36px; height: 36px;
            background: ${stop.isCompleted ? "#16835b" : "#dc2626"};
            border: 3px solid #ffffff;
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            color: #ffffff; font-weight: 800; font-size: 13px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: transform 0.15s ease;
          `;
          el.textContent = stop.isCompleted ? "✓" : dispNum;

          // Interactive popup card with authorized address & navigation
          const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`;
          const itemsHtml = stop.items && stop.items.length > 0
            ? `<div style="font-size: 11px; color: #166534; background: #f0fdf4; padding: 4px 6px; border-radius: 4px; margin-bottom: 6px;">📦 ${stop.items.slice(0, 3).join(", ")}${stop.items.length > 3 ? "..." : ""}</div>`
            : "";
          const popupContent = `
            <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; min-width: 190px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-size: 15px; font-weight: 900; color: #15803d; background: #dcfce7; padding: 2px 6px; border-radius: 6px;">
                  ${dispNum}
                </span>
                <span style="font-size: 11px; font-weight: 700; color: ${stop.isCompleted ? "#16835b" : "#ea580c"};">
                  ${stop.isCompleted ? "Delivered ✓" : "Stop #" + (index + 1)}
                </span>
              </div>
              <div style="font-size: 13.5px; font-weight: 700; color: #111827; margin-bottom: 3px;">
                👤 ${stop.customerName || stop.label}
              </div>
              ${stop.address ? `<div style="font-size: 11.5px; color: #4b5563; margin-bottom: 6px; line-height: 1.3;">📍 ${stop.address}</div>` : ""}
              ${itemsHtml}
              <a href="${navUrl}" target="_blank" rel="noopener noreferrer" style="display: block; text-align: center; background: #16835b; color: #ffffff; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; text-decoration: none; margin-top: 4px;">
                🧭 Open Google Maps
              </a>
            </div>
          `;

          const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(popupContent);

          new mapboxgl.Marker({ element: el })
            .setLngLat([stop.lng, stop.lat])
            .setPopup(popup)
            .addTo(map);
          bounds.extend([stop.lng, stop.lat]);
        });

        // Route polyline connecting stops
        const allPoints: [number, number][] = [];
        if (partnerPosition) allPoints.push([partnerPosition.lng, partnerPosition.lat]);
        stops.forEach((s) => allPoints.push([s.lng, s.lat]));

        if (allPoints.length >= 2) {
          map.addSource("batch-route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: allPoints },
            },
          });

          map.addLayer({
            id: "batch-route-line",
            type: "line",
            source: "batch-route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
              "line-color": "#063c32",
              "line-width": 4,
              "line-dasharray": [2, 1.5],
            },
          });

          map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
        }
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

  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid #e1e8e2",
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%", backgroundColor: "#e9f6ee" }} />
    </div>
  );
}
