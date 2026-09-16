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
  label: string;
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

        // Partner marker
        if (partnerPosition) {
          const el = document.createElement("div");
          el.style.cssText = `
            width: 38px; height: 38px;
            background: #063c32; border: 3px solid #16835b;
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-size: 18px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          `;
          el.textContent = "🚴";
          new mapboxgl.Marker({ element: el })
            .setLngLat([partnerPosition.lng, partnerPosition.lat])
            .addTo(map);
          bounds.extend([partnerPosition.lng, partnerPosition.lat]);
        }

        // Stops markers
        stops.forEach((stop, index) => {
          const el = document.createElement("div");
          el.style.cssText = `
            width: 32px; height: 32px;
            background: ${stop.isCompleted ? "#16835b" : "#dc2626"};
            border: 2.5px solid #ffffff;
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            color: #ffffff; font-weight: 800; font-size: 12px;
            box-shadow: 0 3px 8px rgba(0,0,0,0.25);
          `;
          el.textContent = stop.isCompleted ? "✓" : `${index + 1}`;

          new mapboxgl.Marker({ element: el })
            .setLngLat([stop.lng, stop.lat])
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
