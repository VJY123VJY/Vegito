"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSellerProfile, type SellerProfile } from "@/lib/api/seller-products";
import { getFreshDeviceCoordinates, reverseGeocode } from "@/lib/api/location-helper";
import { MapPin, Check, AlertCircle, Loader2, Crosshair, X, Store, CheckCircle2 } from "lucide-react";
import { getErrorMessage } from "@/lib/api/client";

interface SellerShopLocationModalProps {
  seller: SellerProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  requireSetup?: boolean;
}

export function SellerShopLocationModal({
  seller,
  isOpen,
  onClose,
  onSuccess,
  requireSetup = false,
}: SellerShopLocationModalProps) {
  const queryClient = useQueryClient();
  const [detectedCoords, setDetectedCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [detectedAddress, setDetectedAddress] = useState<string>("");
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(!seller?.latitude || !seller?.longitude || requireSetup);

  const saveMutation = useMutation({
    mutationFn: (payload: { address: string; latitude: number; longitude: number }) =>
      updateSellerProfile(payload),
    onSuccess: () => {
      setSaveSuccess(true);
      setError("");
      queryClient.invalidateQueries({ queryKey: ["seller-profile"] });
      queryClient.invalidateQueries({ queryKey: ["public-seller-availability"] });
      queryClient.invalidateQueries({ queryKey: ["seller-dashboard-summary"] });
      setTimeout(() => {
        setIsEditing(false);
        setSaveSuccess(false);
        onSuccess?.();
        onClose();
      }, 1000);
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      if (status === 401) {
        setError("Your session expired. Please log in again.");
      } else if (status === 403) {
        setError("You don't have permission to update the shop location.");
      } else if (status === 422) {
        setError("Please check the location details and try again.");
      } else if (status === 409) {
        setError("Shop location could not be updated because the location changed. Please refresh and try again.");
      } else if (status && status >= 500) {
        setError("We couldn't save the shop location right now. Please try again.");
      } else if (err?.code === "ERR_NETWORK" || err?.message?.includes("Network Error")) {
        setError("Network connection lost. Check your internet and try again.");
      } else {
        const msg = getErrorMessage(err);
        setError(
          msg.toLowerCase().includes("unexpected error")
            ? "We couldn't save the shop location right now. Please try again."
            : msg
        );
      }
    },
  });

  if (!isOpen) return null;

  const hasExistingLocation = Boolean(seller?.latitude && seller?.longitude);

  async function handleDetectLocation() {
    setIsDetecting(true);
    setError("");
    try {
      const coords = await getFreshDeviceCoordinates();
      setDetectedCoords(coords);
      try {
        const geo = await reverseGeocode(coords.latitude, coords.longitude);
        const addr = geo?.address_line1 || geo?.place_name || `Shop at ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
        setDetectedAddress(addr);
      } catch (geoErr) {
        // Reverse geocode failure does NOT block valid GPS capture
        console.warn("Reverse geocode lookup failed, using coordinate fallback:", geoErr);
        setDetectedAddress(`Shop at ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
      }
    } catch (err: any) {
      setError(err?.message || "Could not detect device GPS. Please check browser location permissions.");
    } finally {
      setIsDetecting(false);
    }
  }

  function handleConfirmSave() {
    if (!detectedCoords) return;
    saveMutation.mutate({
      address: detectedAddress.trim() || seller?.address || `Shop Location (${detectedCoords.latitude.toFixed(4)}, ${detectedCoords.longitude.toFixed(4)})`,
      latitude: detectedCoords.latitude,
      longitude: detectedCoords.longitude,
    });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          maxWidth: "520px",
          width: "100%",
          padding: "26px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                backgroundColor: "#e9f6ee",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Store size={22} color="#16835b" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#063c32" }}>
                🏪 Shop Pickup Location
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
                Source of truth for 20 KM customer delivery calculations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}
          >
            <X size={20} />
          </button>
        </div>

        {saveSuccess && (
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "#f0fdf4",
              border: "1.5px solid #86efac",
              borderRadius: "10px",
              color: "#166534",
              fontSize: "13px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <CheckCircle2 size={16} color="#16a34a" />
            <span>✓ Shop location saved successfully</span>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "#fef2f2",
              border: "1.5px solid #fecaca",
              borderRadius: "10px",
              color: "#b91c1c",
              fontSize: "12.5px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Existing Registered Shop Location (DO NOT OVERWRITE UNLESS EXPLICITLY REQUESTED) */}
        {hasExistingLocation && !isEditing ? (
          <div
            style={{
              padding: "16px",
              borderRadius: "14px",
              backgroundColor: "#f0fdf4",
              border: "1.5px solid #86efac",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 size={16} color="#16a34a" />
                <strong style={{ fontSize: "13.5px", color: "#166534" }}>Registered Shop Location Active</strong>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  backgroundColor: "#dcfce7",
                  color: "#15803d",
                }}
              >
                🟢 Ready
              </span>
            </div>

            <div>
              <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 700, color: "#111827" }}>
                {seller?.business_name}
              </p>
              <p style={{ margin: 0, fontSize: "12.5px", color: "#4b5563" }}>
                {seller?.address || "Solapur Market Area, Maharashtra"}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "11.5px", color: "#6b7280" }}>
                GPS: {Number(seller?.latitude).toFixed(6)}, {Number(seller?.longitude).toFixed(6)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsEditing(true)}
              style={{
                alignSelf: "flex-start",
                marginTop: "6px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                backgroundColor: "#ffffff",
                color: "#166534",
                border: "1.5px solid #86efac",
                borderRadius: "8px",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Crosshair size={14} /> Update Shop Location
            </button>
          </div>
        ) : null}

        {/* Edit or Setup Location Screen */}
        {isEditing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: 1.5 }}>
              Vegito uses your real device GPS to pinpoint your vegetable shop or depot. All customer 20 KM delivery ranges are measured from this point.
            </p>

            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={isDetecting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "12px 18px",
                backgroundColor: "#e9f6ee",
                color: "#063c32",
                border: "1.5px solid #16835b",
                borderRadius: "12px",
                fontSize: "13.5px",
                fontWeight: 700,
                cursor: isDetecting ? "not-allowed" : "pointer",
              }}
            >
              {isDetecting ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} color="#16835b" />}
              {isDetecting ? "Detecting GPS location..." : "📍 Get Current Device GPS"}
            </button>

            {detectedCoords ? (
              <div
                style={{
                  padding: "14px",
                  borderRadius: "12px",
                  backgroundColor: "#f0fdf4",
                  border: "1.5px solid #86efac",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <strong style={{ fontSize: "13px", color: "#166534" }}>✓ Fresh GPS Captured</strong>
                </div>
                <p style={{ margin: 0, fontSize: "12.5px", color: "#111827", fontWeight: 600 }}>
                  {detectedAddress}
                </p>
                <span style={{ fontSize: "11px", color: "#6b7280" }}>
                  Coordinates: {detectedCoords.latitude.toFixed(6)}, {detectedCoords.longitude.toFixed(6)}
                </span>

                <div style={{ marginTop: "6px" }}>
                  <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#374151" }}>
                    Shop Address Description:
                    <input
                      type="text"
                      value={detectedAddress}
                      onChange={(e) => setDetectedAddress(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        marginTop: "4px",
                        fontSize: "12.5px",
                      }}
                    />
                  </label>
                </div>
              </div>
            ) : null}

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
              {hasExistingLocation && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "10px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #d1d5db",
                    color: "#374151",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              )}

              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={!detectedCoords || saveMutation.isPending}
                style={{
                  padding: "9px 18px",
                  borderRadius: "10px",
                  backgroundColor: detectedCoords ? "#063c32" : "#94a3b8",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: detectedCoords ? "pointer" : "not-allowed",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {saveMutation.isPending ? "Saving shop location..." : "Confirm & Save Shop Location"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
