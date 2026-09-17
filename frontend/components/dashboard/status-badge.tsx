"use client";

import React from "react";

type StatusType =
  | "NEW"
  | "ACCEPTED"
  | "PACKING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "REJECTED"
  | "ONLINE"
  | "OFFLINE"
  | "BUSY"
  | "AVAILABLE"
  | "ASSIGNED"
  | "STARTED"
  | "COMPLETED"
  | "FAILED"
  | string;

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; border: string; dot: string; label: string }
> = {
  NEW: {
    bg: "#eff6ff",
    text: "#1d4ed8",
    border: "#bfdbfe",
    dot: "#3b82f6",
    label: "New",
  },
  ACCEPTED: {
    bg: "#f0fdf4",
    text: "#15803d",
    border: "#bbf7d0",
    dot: "#22c55e",
    label: "Accepted",
  },
  PACKING: {
    bg: "#fefce8",
    text: "#a16207",
    border: "#fef08a",
    dot: "#eab308",
    label: "Packing",
  },
  READY: {
    bg: "#ecfdf5",
    text: "#047857",
    border: "#a7f3d0",
    dot: "#10b981",
    label: "Ready for Pickup",
  },
  READY_FOR_PICKUP: {
    bg: "#ecfdf5",
    text: "#047857",
    border: "#a7f3d0",
    dot: "#10b981",
    label: "Ready for Pickup",
  },
  PICKED_UP: {
    bg: "#eff6ff",
    text: "#1d4ed8",
    border: "#bfdbfe",
    dot: "#3b82f6",
    label: "Picked Up",
  },
  SELLER_ACCEPTED: {
    bg: "#f0fdf4",
    text: "#15803d",
    border: "#bbf7d0",
    dot: "#22c55e",
    label: "Accepted",
  },
  PREPARING: {
    bg: "#fefce8",
    text: "#a16207",
    border: "#fef08a",
    dot: "#eab308",
    label: "Preparing",
  },
  OUT_FOR_DELIVERY: {
    bg: "#f0f9ff",
    text: "#0369a1",
    border: "#bae6fd",
    dot: "#0ea5e9",
    label: "Out for Delivery",
  },
  DELIVERED: {
    bg: "#e9f6ee",
    text: "#16835b",
    border: "#c3ebd4",
    dot: "#16835b",
    label: "Delivered",
  },
  COMPLETED: {
    bg: "#e9f6ee",
    text: "#16835b",
    border: "#c3ebd4",
    dot: "#16835b",
    label: "Completed",
  },
  CANCELLED: {
    bg: "#fef2f2",
    text: "#b91c1c",
    border: "#fecaca",
    dot: "#ef4444",
    label: "Cancelled",
  },
  REJECTED: {
    bg: "#fff1f2",
    text: "#be123c",
    border: "#fecdd3",
    dot: "#f43f5e",
    label: "Rejected",
  },
  FAILED: {
    bg: "#fff1f2",
    text: "#be123c",
    border: "#fecdd3",
    dot: "#f43f5e",
    label: "Failed",
  },
  ASSIGNED: {
    bg: "#f8fafc",
    text: "#475569",
    border: "#cbd5e1",
    dot: "#64748b",
    label: "Assigned",
  },
  STARTED: {
    bg: "#f0f9ff",
    text: "#0369a1",
    border: "#bae6fd",
    dot: "#0ea5e9",
    label: "On the Way",
  },
  ONLINE: {
    bg: "#ecfdf5",
    text: "#065f46",
    border: "#a7f3d0",
    dot: "#10b981",
    label: "Online",
  },
  OFFLINE: {
    bg: "#f3f4f6",
    text: "#4b5563",
    border: "#e5e7eb",
    dot: "#9ca3af",
    label: "Offline",
  },
  AVAILABLE: {
    bg: "#e9f6ee",
    text: "#16835b",
    border: "#c3ebd4",
    dot: "#16835b",
    label: "Available",
  },
  BUSY: {
    bg: "#fffbeb",
    text: "#b45309",
    border: "#fde68a",
    dot: "#f59e0b",
    label: "On Delivery",
  },
};

export function StatusBadge({ status, label, className = "" }: StatusBadgeProps) {
  const norm = (status || "").toUpperCase();
  const config = STATUS_CONFIG[norm] || {
    bg: "#f3f4f6",
    text: "#374151",
    border: "#e5e7eb",
    dot: "#9ca3af",
    label: status,
  };

  return (
    <span
      className={`status-badge ${className}`}
      style={{
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        borderRadius: "9999px",
        fontSize: "11.5px",
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: config.dot,
        }}
      />
      {label || config.label}
    </span>
  );
}
