"use client";

import React from "react";
import { DeliveryMap, LatLng } from "./delivery-map";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Phone, Clock, Navigation, CheckCircle2 } from "lucide-react";

interface CustomerLocationMapProps {
  orderId: number | string;
  orderNumber: string;
  partnerName?: string;
  partnerPhone?: string;
  partnerLocation?: LatLng | null;
  customerLocation?: LatLng | null;
  deliveryAddress?: string;
  orderStatus: string;
  etaMinutes?: number;
}

const TIMELINE_STEPS = [
  { id: "confirmed", label: "Order Confirmed" },
  { id: "packed", label: "Packed" },
  { id: "pickup", label: "Picked Up" },
  { id: "on_way", label: "On the Way" },
  { id: "delivered", label: "Delivered" },
];

export function CustomerLocationMap({
  orderNumber,
  partnerName = "Delivery Partner",
  partnerPhone,
  partnerLocation,
  customerLocation,
  deliveryAddress,
  orderStatus,
  etaMinutes = 15,
}: CustomerLocationMapProps) {
  function getActiveIndex() {
    switch (orderStatus) {
      case "NEW":
      case "ACCEPTED":
        return 0;
      case "PACKING":
        return 1;
      case "READY":
        return 2;
      case "OUT_FOR_DELIVERY":
        return 3;
      case "DELIVERED":
        return 4;
      default:
        return 3;
    }
  }

  const activeIndex = getActiveIndex();

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e1e8e2",
        borderRadius: "18px",
        overflow: "hidden",
        boxShadow: "0 4px 16px rgba(6, 60, 50, 0.06)",
        marginBottom: "28px",
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          padding: "18px 24px",
          backgroundColor: "#063c32",
          color: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "24px" }}>🚚</span>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#ffffff" }}>
              Your order is on the way!
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "rgba(255, 255, 255, 0.75)" }}>
              Order #{orderNumber} · ETA ~{etaMinutes} mins
            </p>
          </div>
        </div>

        <StatusBadge status={orderStatus} />
      </div>

      {/* Interactive Map */}
      <div style={{ padding: "16px" }}>
        <DeliveryMap
          deliveryPosition={partnerLocation}
          customerPosition={customerLocation}
          partnerName={partnerName}
          height="320px"
          etaMinutes={etaMinutes}
          mode="customer"
        />
      </div>

      {/* Progress Timeline */}
      <div style={{ padding: "8px 24px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", position: "relative", marginBottom: "20px" }}>
          {/* Track line */}
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "10px",
              right: "10px",
              height: "3px",
              backgroundColor: "#e1e8e2",
              zIndex: 1,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "10px",
              width: `${(activeIndex / (TIMELINE_STEPS.length - 1)) * 100}%`,
              height: "3px",
              backgroundColor: "#16835b",
              zIndex: 2,
              transition: "width 300ms ease",
            }}
          />

          {TIMELINE_STEPS.map((step, idx) => {
            const isCompleted = idx <= activeIndex;
            const isCurrent = idx === activeIndex;

            return (
              <div
                key={step.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  position: "relative",
                  zIndex: 3,
                }}
              >
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    backgroundColor: isCompleted ? "#16835b" : "#ffffff",
                    border: `2.5px solid ${isCompleted ? "#16835b" : "#cbd5e1"}`,
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {isCompleted ? "✓" : idx + 1}
                </div>
                <span
                  style={{
                    marginTop: "6px",
                    fontSize: "11px",
                    fontWeight: isCurrent ? 800 : 600,
                    color: isCurrent ? "#063c32" : isCompleted ? "#16835b" : "#94a3b8",
                    textAlign: "center",
                  }}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Partner Info and Contacts */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 18px",
            backgroundColor: "#f9fbf8",
            borderRadius: "14px",
            border: "1px solid #edf2ee",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                backgroundColor: "#e9f6ee",
                color: "#16835b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
              }}
            >
              🚴
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#13221b" }}>
                {partnerName}
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: "#62746a" }}>
                Vegito Express Partner · {deliveryAddress || "Solapur"}
              </p>
            </div>
          </div>

          {partnerPhone && (
            <a
              href={`tel:${partnerPhone}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                backgroundColor: "#16835b",
                color: "#ffffff",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "12.5px",
                textDecoration: "none",
              }}
            >
              <Phone size={14} /> Call Partner
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
