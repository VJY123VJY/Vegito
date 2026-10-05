"use client";

import React from "react";
import { useLocation } from "@/context/location-context";
import { MapPin, AlertCircle, CheckCircle2, Crosshair, X } from "lucide-react";

export function LocationBar() {
  const {
    status,
    message,
    address,
    eligibility,
    showDeniedBanner,
    requestLocation,
    dismissDeniedBanner,
    isLocating,
  } = useLocation();

  if (showDeniedBanner && status === "PERMISSION_DENIED") {
    return (
      <div
        style={{
          backgroundColor: "#fef3c7",
          borderBottom: "1px solid #fde68a",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
          fontSize: "12.5px",
          color: "#92400e",
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <AlertCircle size={15} color="#b45309" />
          <span>
            <strong>Location access is turned off.</strong> Allow location for instant 20 KM delivery checking.
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => requestLocation(true)}
            disabled={isLocating}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              borderRadius: "6px",
              backgroundColor: "#b45309",
              color: "#ffffff",
              border: "none",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Crosshair size={12} /> Enable Location
          </button>
          <button
            onClick={dismissDeniedBanner}
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              backgroundColor: "#ffffff",
              color: "#92400e",
              border: "1px solid #d97706",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Enter Address Manually
          </button>
          <button
            onClick={dismissDeniedBanner}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#92400e" }}
            aria-label="Dismiss banner"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  if (status === "DELIVERY_AVAILABLE" && address && eligibility) {
    return (
      <div
        style={{
          backgroundColor: "#f0fdf4",
          borderBottom: "1px solid #bbf7d0",
          padding: "6px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "12px",
          color: "#166534",
          zIndex: 30,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <CheckCircle2 size={13} color="#16a34a" />
          <span>
            <strong>Delivering to:</strong> {address.area || address.street || address.city || "Solapur"}
            {eligibility.distance_km != null ? ` · ${eligibility.distance_km} KM from ${eligibility.seller_name || "seller"}` : ""}
          </span>
        </div>
        <span
          style={{
            fontSize: "10.5px",
            fontWeight: 800,
            padding: "1px 7px",
            borderRadius: "999px",
            backgroundColor: "#dcfce7",
            color: "#15803d",
            whiteSpace: "nowrap",
          }}
        >
          ✓ Within 20 KM
        </span>
      </div>
    );
  }

  if (status === "OUTSIDE_DELIVERY_AREA" && eligibility) {
    return (
      <div
        style={{
          backgroundColor: "#fef2f2",
          borderBottom: "1px solid #fecaca",
          padding: "6px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "12px",
          color: "#991b1b",
          zIndex: 30,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <AlertCircle size={13} color="#dc2626" />
          <span>
            <strong>Outside delivery area:</strong> {eligibility.distance_km} KM from {eligibility.seller_name || "seller"}. We deliver within 20 KM.
          </span>
        </div>
        <button
          onClick={() => requestLocation(true)}
          style={{
            padding: "2px 8px",
            borderRadius: "4px",
            backgroundColor: "#dc2626",
            color: "#ffffff",
            border: "none",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Change Location
        </button>
      </div>
    );
  }

  return null;
}
