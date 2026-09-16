"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  MAPBOX_TOKEN,
  DEFAULT_SOLAPUR_COORDS,
  getMapStyle,
  getDirectionsRoute,
} from "@/lib/api/map";
import {
  createDeliveryMarkerElement,
  createCustomerMarkerElement,
} from "./partner-location-marker";

export interface LatLng {
  lat: number;
  lng: number;
}

interface DeliveryMapProps {
  deliveryPosition?: LatLng | null;
  customerPosition?: LatLng | null;
  partnerName?: string;
  customerName?: string;
  height?: string;
  etaMinutes?: number;
  mode?: "delivery" | "customer" | "admin";
}

export function DeliveryMap({
  deliveryPosition,
  customerPosition,
  partnerName = "Delivery Partner",
  customerName = "Customer Delivery",
  height = "380px",
  etaMinutes,
  mode = "customer",
}: DeliveryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const deliveryMarkerRef = useRef<any>(null);
  const customerMarkerRef = useRef<any>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: string; etaMin: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let mapboxgl: any;
    let isCancelled = false;

    import("mapbox-gl").then((module) => {
      if (isCancelled || !containerRef.current) return;
      mapboxgl = module.default || module;
      if (MAPBOX_TOKEN) {
        mapboxgl.accessToken = MAPBOX_TOKEN;
      }

      const center = deliveryPosition
        ? [deliveryPosition.lng, deliveryPosition.lat]
        : customerPosition
        ? [customerPosition.lng, customerPosition.lat]
        : DEFAULT_SOLAPUR_COORDS;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: getMapStyle(),
        center,
        zoom: 13.5,
        attributionControl: false,
      });

      mapRef.current = map;

      map.on("load", async () => {
        if (isCancelled) return;

        // Add Delivery Marker
        if (deliveryPosition) {
          const el = createDeliveryMarkerElement(partnerName);
          deliveryMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
            .setLngLat([deliveryPosition.lng, deliveryPosition.lat])
            .addTo(map);
        }

        // Add Customer Marker
        if (customerPosition) {
          const el = createCustomerMarkerElement(customerName);
          customerMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
            .setLngLat([customerPosition.lng, customerPosition.lat])
            .addTo(map);
        }

        // Add Route Line if both positions present
        if (deliveryPosition && customerPosition) {
          const route = await getDirectionsRoute(
            [deliveryPosition.lng, deliveryPosition.lat],
            [customerPosition.lng, customerPosition.lat]
          );

          setRouteInfo({
            distanceKm: (route.distanceMeters / 1000).toFixed(1),
            etaMin: Math.round(route.durationSeconds / 60),
          });

          if (map.getSource("route")) {
            map.getSource("route").setData({
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: route.coordinates },
            });
          } else {
            map.addSource("route", {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: route.coordinates },
              },
            });

            map.addLayer({
              id: "route-line",
              type: "line",
              source: "route",
              layout: { "line-join": "round", "line-cap": "round" },
              paint: {
                "line-color": "#16835b",
                "line-width": 4.5,
                "line-opacity": 0.85,
              },
            });
          }

          // Fit bounds
          const bounds = new mapboxgl.LngLatBounds(
            [deliveryPosition.lng, deliveryPosition.lat],
            [customerPosition.lng, customerPosition.lat]
          );
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

  // Reactive updates to delivery marker
  useEffect(() => {
    if (!mapRef.current || !deliveryPosition) return;
    const lngLat = [deliveryPosition.lng, deliveryPosition.lat];

    if (deliveryMarkerRef.current) {
      deliveryMarkerRef.current.setLngLat(lngLat);
    }

    if (mode === "customer") {
      mapRef.current.easeTo({ center: lngLat, duration: 1000 });
    }
  }, [deliveryPosition, mode]);

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

      {/* Floating Status / ETA Card */}
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
          display: "flex",
          alignItems: "center",
          gap: "10px",
          zIndex: 10,
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: "#16835b",
            display: "inline-block",
            animation: "vegito-marker-pulse 1.8s infinite",
          }}
        />
        <div>
          <p style={{ margin: 0, fontSize: "12px", fontWeight: 800, color: "#063c32" }}>
            Live GPS Tracking
          </p>
          <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#62746a" }}>
            {routeInfo
              ? `Distance: ${routeInfo.distanceKm} km · ETA ~${etaMinutes ?? routeInfo.etaMin} mins`
              : "Locating delivery partner..."}
          </p>
        </div>
      </div>
    </div>
  );
}
