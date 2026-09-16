"use client";

/**
 * LiveDeliveryMap — MapLibre GL JS based real-time delivery tracking map.
 *
 * Uses OpenStreetMap tiles — free, no API key required for V1.
 * Map provider can be swapped by changing TILE_URL without touching
 * DeliveryMarker / CustomerMarker logic (scalable architecture).
 *
 * SSR-safe: Dynamic imports handled by parent via next/dynamic { ssr: false }.
 * Do NOT import this file directly in a server component.
 */

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap, Marker as MapLibreMarker, LngLatLike } from "maplibre-gl";

// OpenStreetMap-compatible tile URL — no API key needed for V1
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = "© OpenStreetMap contributors";

// Solapur, Maharashtra — default center for Vegito V1
const DEFAULT_CENTER: [number, number] = [75.9064, 17.6805];
const DEFAULT_ZOOM = 13;

export type MarkerPosition = {
  lat: number;
  lng: number;
};

type Props = {
  deliveryPosition?: MarkerPosition | null;
  customerPosition?: MarkerPosition | null;
  /** "delivery" = partner is using this map (shows their own position) */
  /** "customer" = customer watching the delivery */
  mode: "delivery" | "customer";
  height?: string;
};

export function LiveDeliveryMap({
  deliveryPosition,
  customerPosition,
  mode,
  height = "100%",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const deliveryMarkerRef = useRef<MapLibreMarker | null>(null);
  const customerMarkerRef = useRef<MapLibreMarker | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: MapLibreMap;

    // Dynamic import to avoid SSR issues with maplibre-gl
    import("maplibre-gl").then((maplibre) => {
      const initialCenter: LngLatLike =
        deliveryPosition
          ? [deliveryPosition.lng, deliveryPosition.lat]
          : customerPosition
            ? [customerPosition.lng, customerPosition.lat]
            : DEFAULT_CENTER;

      map = new maplibre.Map({
        container: containerRef.current!,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: [TILE_URL],
              tileSize: 256,
              attribution: TILE_ATTRIBUTION,
              maxzoom: 19,
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
        center: initialCenter,
        zoom: DEFAULT_ZOOM,
        attributionControl: false,
      });

      mapRef.current = map;

      map.on("load", () => {
        // Place delivery marker (green scooter)
        if (deliveryPosition) {
          const el = createDeliveryMarkerEl();
          const marker = new maplibre.Marker({ element: el })
            .setLngLat([deliveryPosition.lng, deliveryPosition.lat])
            .addTo(map);
          deliveryMarkerRef.current = marker;
        }

        // Place customer marker (red pin)
        if (customerPosition) {
          const el = createCustomerMarkerEl();
          const marker = new maplibre.Marker({ element: el })
            .setLngLat([customerPosition.lng, customerPosition.lat])
            .addTo(map);
          customerMarkerRef.current = marker;
        }

        // Fit bounds to show both markers
        if (deliveryPosition && customerPosition) {
          import("maplibre-gl").then(({ LngLatBounds }) => {
            const bounds = new LngLatBounds(
              [deliveryPosition.lng, deliveryPosition.lat],
              [customerPosition.lng, customerPosition.lat],
            );
            map.fitBounds(bounds, { padding: 80, maxZoom: 16 });
          });
        }
      });
    });

    return () => {
      map?.remove();
      mapRef.current = null;
      deliveryMarkerRef.current = null;
      customerMarkerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update delivery marker position reactively
  useEffect(() => {
    if (!mapRef.current || !deliveryPosition) return;

    import("maplibre-gl").then((maplibre) => {
      const lnglat: LngLatLike = [deliveryPosition.lng, deliveryPosition.lat];

      if (deliveryMarkerRef.current) {
        // Smoothly move existing marker
        deliveryMarkerRef.current.setLngLat(lnglat);
      } else if (mapRef.current) {
        const el = createDeliveryMarkerEl();
        const marker = new maplibre.Marker({ element: el })
          .setLngLat(lnglat)
          .addTo(mapRef.current);
        deliveryMarkerRef.current = marker;
      }

      // Pan map to follow delivery partner in "customer" mode
      if (mode === "customer") {
        mapRef.current?.flyTo({ center: lnglat, speed: 0.8 });
      }
    });
  }, [deliveryPosition, mode]);

  // Update customer marker position reactively
  useEffect(() => {
    if (!mapRef.current || !customerPosition) return;

    import("maplibre-gl").then((maplibre) => {
      const lnglat: LngLatLike = [customerPosition.lng, customerPosition.lat];
      if (customerMarkerRef.current) {
        customerMarkerRef.current.setLngLat(lnglat);
      } else if (mapRef.current) {
        const el = createCustomerMarkerEl();
        const marker = new maplibre.Marker({ element: el })
          .setLngLat(lnglat)
          .addTo(mapRef.current);
        customerMarkerRef.current = marker;
      }
    });
  }, [customerPosition]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height,
        borderRadius: "14px",
        overflow: "hidden",
        background: "#e8f4ec",
        position: "relative",
      }}
    />
  );
}

// --- Marker DOM element factories ---

function createDeliveryMarkerEl(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    width: 44px; height: 44px;
    background: #1a3d2b;
    border: 3px solid #6fcf3a;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.35);
    cursor: pointer;
    position: relative;
  `;
  const inner = document.createElement("div");
  inner.style.cssText = "transform: rotate(45deg); font-size: 20px; margin-top: -4px;";
  inner.textContent = "🛵";
  el.appendChild(inner);

  // Pulse animation
  const pulse = document.createElement("div");
  pulse.style.cssText = `
    position: absolute; inset: -8px;
    border: 2px solid rgba(111, 207, 58, 0.6);
    border-radius: 50%;
    animation: pulse 2s infinite;
  `;
  el.appendChild(pulse);

  // Inject pulse keyframes if not present
  if (!document.getElementById("vegito-pulse-style")) {
    const style = document.createElement("style");
    style.id = "vegito-pulse-style";
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        100% { transform: scale(1.8); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  return el;
}

function createCustomerMarkerEl(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    width: 36px; height: 36px;
    background: #dc2626;
    border: 3px solid #fff;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    cursor: pointer;
  `;
  const inner = document.createElement("div");
  inner.style.cssText = "transform: rotate(45deg); font-size: 16px;";
  inner.textContent = "🏠";
  el.appendChild(inner);
  return el;
}
