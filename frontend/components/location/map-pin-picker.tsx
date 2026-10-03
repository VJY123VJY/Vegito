"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  MapPin,
  Navigation,
  Loader2,
  CheckCircle2,
  X,
  Crosshair,
  AlertCircle,
} from "lucide-react";
import {
  MAPBOX_TOKEN,
  getMapStyle,
  reverseGeocode,
} from "@/lib/api/map";
import type { SelectedLocationData } from "./location-modal";

interface MapPinPickerProps {
  initialLat?: number;
  initialLng?: number;
  onConfirm: (loc: SelectedLocationData) => void;
  onCancel?: () => void;
}

export function MapPinPicker({
  initialLat,
  initialLng,
  onConfirm,
  onCancel,
}: MapPinPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  const hasInitialCoordinates = initialLat != null && initialLng != null &&
    Number.isFinite(initialLat) && Number.isFinite(initialLng) &&
    initialLat >= -90 && initialLat <= 90 && initialLng >= -180 && initialLng <= 180;
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(
    hasInitialCoordinates ? { lat: initialLat!, lng: initialLng! } : null
  );
  const [addressData, setAddressData] = useState<SelectedLocationData | null>(null);

  const [isLocating, setIsLocating] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Debounce address lookup when map movement ends
  const reverseGeocodeTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchAddress = async (lat: number, lng: number) => {
    setIsResolvingAddress(true);
    setMapError(null);
    try {
      const res = await reverseGeocode(lat, lng);
      if (res && res.place_name) {
        setAddressData({
          address: res.place_name,
          city: res.city,
          pincode: res.pincode,
          latitude: lat,
          longitude: lng,
        });
      } else {
        setAddressData(null);
        setMapError("We couldn’t resolve this pin to an address. Return to search and choose a nearby address.");
      }
    } catch {
      setAddressData(null);
      setMapError("Address lookup failed. Return to address search and try again.");
    } finally {
      setIsResolvingAddress(false);
    }
  };

  useEffect(() => {
    if (!currentCoords) return;
    const startLat = currentCoords.lat;
    const startLng = currentCoords.lng;
    void fetchAddress(startLat, startLng);

    if (!containerRef.current || mapRef.current) return;

    let isCancelled = false;

    import("mapbox-gl")
      .then((module) => {
        if (isCancelled || !containerRef.current) return;
        const mapboxgl = module.default || module;

        if (MAPBOX_TOKEN && !MAPBOX_TOKEN.includes("example")) {
          mapboxgl.accessToken = MAPBOX_TOKEN;
        }

        try {
          const map = new mapboxgl.Map({
            container: containerRef.current,
            style: getMapStyle(),
            center: [startLng, startLat],
            zoom: 14.5,
            attributionControl: false,
          });

          mapRef.current = map;

          map.on("load", () => {
            if (isCancelled) return;
            setMapLoaded(true);
          });

          map.on("move", () => {
            const center = map.getCenter();
            setCurrentCoords({ lat: center.lat, lng: center.lng });
          });

          map.on("moveend", () => {
            const center = map.getCenter();
            setCurrentCoords({ lat: center.lat, lng: center.lng });

            if (reverseGeocodeTimer.current) {
              clearTimeout(reverseGeocodeTimer.current);
            }
            reverseGeocodeTimer.current = setTimeout(() => {
              fetchAddress(center.lat, center.lng);
            }, 300);
          });

          map.on("error", (e: any) => {
            console.warn("Mapbox error:", e);
          });
        } catch (err: any) {
          console.warn("Mapbox initialization error:", err);
          setMapError("Interactive map could not load. You can confirm coordinates directly.");
        }
      })
      .catch((err) => {
        console.warn("Failed to load mapbox-gl:", err);
        setMapError("Map library could not load. You can confirm coordinates directly.");
      });

    return () => {
      isCancelled = true;
      if (reverseGeocodeTimer.current) clearTimeout(reverseGeocodeTimer.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [Boolean(currentCoords)]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        setCurrentCoords({ lat: latitude, lng: longitude });

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [longitude, latitude],
            zoom: 16,
            essential: true,
          });
        } else {
          fetchAddress(latitude, longitude);
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn("GPS Locate Me error:", err);
        alert("Could not access your location. Please check browser permissions.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleConfirm = () => {
    if (addressData) onConfirm(addressData);
  };

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: "420px",
        maxHeight: "580px",
        borderRadius: "20px",
        overflow: "hidden",
        backgroundColor: "#f8faf7",
      }}
    >
      {/* Map Canvas Container */}
      <div style={{ position: "relative", flex: 1, minHeight: "280px" }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

        {/* Center Target Pin with drop shadow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -100%)",
            pointerEvents: "none",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              padding: "4px 8px",
              backgroundColor: "#063c32",
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: 800,
              borderRadius: "8px",
              marginBottom: "4px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              whiteSpace: "nowrap",
            }}
          >
            Delivery Here
          </div>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50% 50% 50% 0",
              backgroundColor: "#16835b",
              transform: "rotate(-45deg)",
              border: "3px solid #ffffff",
              boxShadow: "0 6px 16px rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "12px",
                height: "12px",
                backgroundColor: "#ffffff",
                borderRadius: "50%",
              }}
            />
          </div>
          {/* Ground shadow beneath pin */}
          <div
            style={{
              width: "14px",
              height: "6px",
              backgroundColor: "rgba(0,0,0,0.25)",
              borderRadius: "50%",
              marginTop: "-3px",
              filter: "blur(1px)",
            }}
          />
        </div>

        {/* Top Control Bar */}
        <div
          style={{
            position: "absolute",
            top: "12px",
            left: "12px",
            right: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(6px)",
              padding: "6px 12px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: 700,
              color: "#063c32",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              pointerEvents: "auto",
            }}
          >
            Move map to adjust pin
          </div>

          <div style={{ display: "flex", gap: "8px", pointerEvents: "auto" }}>
            <button
              onClick={handleLocateMe}
              disabled={isLocating}
              aria-label="Use device GPS"
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                border: "none",
                backgroundColor: "#ffffff",
                color: "#16835b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 3px 10px rgba(0,0,0,0.15)",
                transition: "transform 0.15s",
              }}
            >
              {isLocating ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Crosshair size={18} />
              )}
            </button>

            {onCancel && (
              <button
                onClick={onCancel}
                aria-label="Close map"
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "12px",
                  border: "none",
                  backgroundColor: "#ffffff",
                  color: "#62746a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 3px 10px rgba(0,0,0,0.15)",
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {mapError && (
          <div
            style={{
              position: "absolute",
              top: "60px",
              left: "12px",
              right: "12px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              padding: "10px 14px",
              borderRadius: "12px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              zIndex: 20,
            }}
          >
            <AlertCircle size={16} />
            <span>{mapError}</span>
          </div>
        )}
      </div>

      {/* Selected Address Preview & Confirmation Sheet */}
      <div
        style={{
          padding: "16px 20px",
          backgroundColor: "#ffffff",
          borderTop: "1px solid #e8eee9",
          boxShadow: "0 -4px 16px rgba(6, 60, 50, 0.05)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              backgroundColor: "#ecfdf5",
              color: "#16835b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: "2px",
            }}
          >
            {isResolvingAddress ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <MapPin size={16} />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: "#16835b",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "2px",
              }}
            >
              Selected Location
            </div>
            <div
              style={{
                fontSize: "13.5px",
                fontWeight: 700,
                color: "#063c32",
                lineHeight: 1.35,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {addressData?.address || "No verified address selected"}
            </div>
            <div
              style={{
                fontSize: "11.5px",
                color: "#62746a",
                marginTop: "2px",
              }}
            >
              {addressData?.city || ""}{addressData?.pincode ? ` · Pincode: ${addressData.pincode}` : ""}
            </div>
          </div>
        </div>

        <button
          onClick={handleConfirm}
          disabled={isResolvingAddress || !addressData}
          style={{
            width: "100%",
            padding: "13px 18px",
            backgroundColor: addressData ? "#16835b" : "#94a3b8",
            color: "#ffffff",
            border: "none",
            borderRadius: "14px",
            fontSize: "14px",
            fontWeight: 800,
            cursor: isResolvingAddress ? "wait" : addressData ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: "0 4px 14px rgba(22, 131, 91, 0.25)",
            transition: "all 0.15s ease",
          }}
        >
          <CheckCircle2 size={17} />
          <span>Confirm &amp; Use Location</span>
        </button>
      </div>
    </div>
  );
}
