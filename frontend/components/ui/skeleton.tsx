"use client";

import React from "react";

export function Skeleton({
  width = "100%",
  height = "20px",
  borderRadius = "8px",
  style = {},
}: {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: "#eef2ef",
        animation: "vegito-pulse 1.6s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "22px",
        border: "1px solid #e8eee9",
        overflow: "hidden",
        padding: "0",
      }}
    >
      <Skeleton height="150px" borderRadius="0" />
      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <Skeleton width="70%" height="16px" borderRadius="6px" />
        <Skeleton width="45%" height="12px" borderRadius="4px" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
          <Skeleton width="35%" height="20px" borderRadius="6px" />
          <Skeleton width="55px" height="32px" borderRadius="10px" />
        </div>
      </div>
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "20px",
        border: "1px solid #e8eee9",
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Skeleton width="40%" height="18px" borderRadius="6px" />
        <Skeleton width="25%" height="18px" borderRadius="12px" />
      </div>
      <Skeleton width="100%" height="38px" borderRadius="12px" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Skeleton width="30%" height="14px" borderRadius="4px" />
        <Skeleton width="20%" height="28px" borderRadius="8px" />
      </div>
    </div>
  );
}
