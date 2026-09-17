"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  MAPBOX_TOKEN,
  DEFAULT_SOLAPUR_COORDS,
  getMapStyle,
  getDirectionsRoute,
  type RouteGeometry,
} from "@/lib/api/map";
import {
  createDeliveryMarkerElement,
  createCustomerMarkerElement,
  createShopMarkerElement,
} from "./partner-location-marker";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapboxTrackingMapProps {
  shopPosition?: LatLng | null;
  customerPosition?: LatLng | null;
  deliveryPosition?: LatLng | null;
  shopName?: string;
  customerName?: string;
  partnerName?: string;
  orderStatus?: string;
  height?: string;
  className?: string;
  showStatusCard?: boolean;
  interactive?: boolean;
}

export function MapboxTrackingMap({
  shopPosition,
  customerPosition,
  deliveryPosition,
  shopName = "Vegito Fresh Farm",
  customerName = "Customer Destination",
  partnerName = "Delivery Partner",
  orderStatus = "OUT_FOR_DELIVERY",
  height = "420px",
  className = "",
  showStatusCard = true,
  interactive = true,
}: MapboxTrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const shopMarkerRef = useRef<any>(null);
  const customerMarkerRef = useRef<any>(null);
  const deliveryMarkerRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: string; etaMin: number } | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Determine center coordinates
  const getInitialCenter = (): [number, number] => {
    if (deliveryPosition) return [deliveryPosition.lng, deliveryPosition.lat];
    if (shopPosition) return [shopPosition.lng, shopPosition.lat];
    if (customerPosition) return [customerPosition.lng, customerPosition.lat];
    return DEFAULT_SOLAPUR_COORDS;
  };

  // Initialize Mapbox map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let mapboxgl: any;
    let isCancelled = false;

    import("mapbox-gl")
      .then((module) => {
        if (isCancelled || !containerRef.current) return;
        mapboxgl = module.default || module;

        if (MAPBOX_TOKEN && !MAPBOX_TOKEN.includes("example")) {
          mapboxgl.accessToken = MAPBOX_TOKEN;
        }

        const center = getInitialCenter();

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: getMapStyle(),
          center,
          zoom: 13.5,
          attributionControl: false,
          interactive,
        });

        mapRef.current = map;

        // Add navigation controls (zoom & rotate)
        if (interactive) {
          map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "top-right");
        }

        map.on("load", () => {
          if (isCancelled) return;
          setMapLoaded(true);

          // 1. Add Shop Marker
          if (shopPosition) {
            const shopEl = createShopMarkerElement(shopName);
            shopMarkerRef.current = new mapboxgl.Marker({ element: shopEl, anchor: "bottom" })
              .setLngLat([shopPosition.lng, shopPosition.lat])
              .addTo(map);
          }

          // 2. Add Customer Marker
          if (customerPosition) {
            const custEl = createCustomerMarkerElement(customerName);
            customerMarkerRef.current = new mapboxgl.Marker({ element: custEl, anchor: "bottom" })
              .setLngLat([customerPosition.lng, customerPosition.lat])
              .addTo(map);
          }

          // 3. Add Delivery Partner Marker
          if (deliveryPosition) {
            const delEl = createDeliveryMarkerElement(partnerName);
            deliveryMarkerRef.current = new mapboxgl.Marker({ element: delEl, anchor: "bottom" })
              .setLngLat([deliveryPosition.lng, deliveryPosition.lat])
              .addTo(map);
          }

          // Resize map when window or container dimensions change
          map.resize();
        });

        map.on("error", (e: any) => {
          console.warn("Mapbox GL error:", e);
        });
      })
      .catch((err) => {
        console.error("Failed to load mapbox-gl:", err);
        setMapError("Could not load interactive map");
      });

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reactive updates to markers & positions
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    // Update or create delivery marker
    if (deliveryPosition) {
      const lngLat: [number, number] = [deliveryPosition.lng, deliveryPosition.lat];
      if (deliveryMarkerRef.current) {
        deliveryMarkerRef.current.setLngLat(lngLat);
      } else {
        import("mapbox-gl").then((m) => {
          const mb = m.default || m;
          const el = createDeliveryMarkerElement(partnerName);
          deliveryMarkerRef.current = new mb.Marker({ element: el, anchor: "bottom" })
            .setLngLat(lngLat)
            .addTo(map);
        });
      }
    }

    // Update or create shop marker
    if (shopPosition) {
      const lngLat: [number, number] = [shopPosition.lng, shopPosition.lat];
      if (shopMarkerRef.current) {
        shopMarkerRef.current.setLngLat(lngLat);
      } else {
        import("mapbox-gl").then((m) => {
          const mb = m.default || m;
          const el = createShopMarkerElement(shopName);
          shopMarkerRef.current = new mb.Marker({ element: el, anchor: "bottom" })
            .setLngLat(lngLat)
            .addTo(map);
        });
      }
    }

    // Update or create customer marker
    if (customerPosition) {
      const lngLat: [number, number] = [customerPosition.lng, customerPosition.lat];
      if (customerMarkerRef.current) {
        customerMarkerRef.current.setLngLat(lngLat);
      } else {
        import("mapbox-gl").then((m) => {
          const mb = m.default || m;
          const el = createCustomerMarkerElement(customerName);
          customerMarkerRef.current = new mb.Marker({ element: el, anchor: "bottom" })
            .setLngLat(lngLat)
            .addTo(map);
        });
      }
    }
  }, [deliveryPosition, shopPosition, customerPosition, partnerName, shopName, customerName, mapLoaded]);

  // Route calculation & bounds fitting
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    // Determine route start and end based on order status:
    // READY_FOR_PICKUP: Delivery Partner -> Shop
    // PICKED_UP: Shop -> Customer
    // OUT_FOR_DELIVERY: Delivery Partner -> Customer
    let startCoords: [number, number] | null = null;
    let endCoords: [number, number] | null = null;

    if (orderStatus === "READY_FOR_PICKUP" || orderStatus === "READY") {
      if (deliveryPosition && shopPosition) {
        startCoords = [deliveryPosition.lng, deliveryPosition.lat];
        endCoords = [shopPosition.lng, shopPosition.lat];
      } else if (shopPosition && customerPosition) {
        startCoords = [shopPosition.lng, shopPosition.lat];
        endCoords = [customerPosition.lng, customerPosition.lat];
      }
    } else if (orderStatus === "PICKED_UP") {
      if (shopPosition && customerPosition) {
        startCoords = [shopPosition.lng, shopPosition.lat];
        endCoords = [customerPosition.lng, customerPosition.lat];
      }
    } else {
      // OUT_FOR_DELIVERY or general active tracking
      if (deliveryPosition && customerPosition) {
        startCoords = [deliveryPosition.lng, deliveryPosition.lat];
        endCoords = [customerPosition.lng, customerPosition.lat];
      } else if (shopPosition && customerPosition) {
        startCoords = [shopPosition.lng, shopPosition.lat];
        endCoords = [customerPosition.lng, customerPosition.lat];
      }
    }

    if (!startCoords || !endCoords) return;

    let isCancelled = false;

    getDirectionsRoute(startCoords, endCoords, "driving-traffic").then((route: RouteGeometry) => {
      if (isCancelled || !mapRef.current) return;

      setRouteInfo({
        distanceKm: (route.distanceMeters / 1000).toFixed(1),
        etaMin: Math.max(1, Math.round(route.durationSeconds / 60)),
      });

      const geojsonSourceData = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: route.coordinates,
        },
      };

      if (map.getSource("tracking-route")) {
        map.getSource("tracking-route").setData(geojsonSourceData);
      } else {
        map.addSource("tracking-route", {
          type: "geojson",
          data: geojsonSourceData,
        });

        // Route casing / glow
        map.addLayer({
          id: "tracking-route-casing",
          type: "line",
          source: "tracking-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#ffffff",
            "line-width": 7,
            "line-opacity": 0.8,
          },
        });

        // Primary route line in Vegito green
        map.addLayer({
          id: "tracking-route-line",
          type: "line",
          source: "tracking-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#16835b",
            "line-width": 4.5,
            "line-opacity": 0.95,
          },
        });
      }

      // Auto-fit bounds
      import("mapbox-gl").then((m) => {
        const mb = m.default || m;
        const bounds = new mb.LngLatBounds();
        if (deliveryPosition) bounds.extend([deliveryPosition.lng, deliveryPosition.lat]);
        if (shopPosition) bounds.extend([shopPosition.lng, shopPosition.lat]);
        if (customerPosition) bounds.extend([customerPosition.lng, customerPosition.lat]);

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: { top: 60, bottom: 60, left: 60, right: 60 }, maxZoom: 15 });
        }
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [deliveryPosition, shopPosition, customerPosition, orderStatus, mapLoaded]);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height,
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid #e1e8e2",
        boxShadow: "0 2px 10px rgba(6, 60, 50, 0.05)",
        backgroundColor: "#e9f6ee",
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Floating Status & ETA Badge */}
      {showStatusCard && (
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
            maxWidth: "calc(100% - 28px)",
          }}
        >
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: orderStatus === "DELIVERED" ? "#15803d" : "#16835b",
              display: "inline-block",
              animation: "vegito-marker-pulse 1.8s infinite",
              flexShrink: 0,
            }}
          />
          <div>
            <p style={{ margin: 0, fontSize: "12px", fontWeight: 800, color: "#063c32" }}>
              {orderStatus === "DELIVERED"
                ? "Order Delivered ✅"
                : orderStatus === "READY_FOR_PICKUP"
                ? "Ready for Pickup · Route to Shop"
                : orderStatus === "PICKED_UP"
                ? "Picked Up from Shop · Route to Doorstep"
                : "Live Delivery Tracking"}
            </p>
            <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#62746a" }}>
              {routeInfo
                ? `Distance: ${routeInfo.distanceKm} km · ETA ~${routeInfo.etaMin} mins`
                : "Connecting to live GPS..."}
            </p>
          </div>
        </div>
      )}

      {/* Fallback error indicator */}
      {mapError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            textAlign: "center",
            zIndex: 20,
          }}
        >
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>🗺️</div>
          <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 700, color: "#991b1b" }}>
            {mapError}
          </p>
          <p style={{ margin: 0, fontSize: "11.5px", color: "#62746a" }}>
            Please check your internet connection or Mapbox token in .env.local
          </p>
        </div>
      )}
    </div>
  );
}

export default MapboxTrackingMap;
