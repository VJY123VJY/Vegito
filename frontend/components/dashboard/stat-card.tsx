"use client";

import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  isLoading?: boolean;
  onClick?: () => void;
  active?: boolean;
}

export function StatCard({
  label,
  value,
  icon,
  iconBg = "#e9f6ee",
  iconColor = "#16835b",
  trend,
  isLoading = false,
  onClick,
  active = false,
}: StatCardProps) {
  if (isLoading) {
    return (
      <div
        className="stat-card"
        style={{
          background: "#ffffff",
          border: "1px solid #e1e8e2",
          borderRadius: "16px",
          padding: "20px 22px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "50px",
            height: "50px",
            borderRadius: "14px",
            background: "#f0f2f1",
            animation: "pulse 1.5s infinite",
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              width: "60%",
              height: "14px",
              background: "#f0f2f1",
              borderRadius: "4px",
              marginBottom: "8px",
            }}
          />
          <div
            style={{
              width: "80%",
              height: "22px",
              background: "#f0f2f1",
              borderRadius: "6px",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`stat-card ${active ? "stat-card-active" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={{
        background: active ? "#f0fdf4" : "#ffffff",
        border: active ? "2px solid #16835b" : "1px solid #e1e8e2",
        borderRadius: "18px",
        padding: "18px 20px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        boxShadow: active
          ? "0 8px 24px rgba(22, 131, 91, 0.15)"
          : "0 2px 8px rgba(6, 60, 50, 0.04)",
        cursor: onClick ? "pointer" : "default",
        transform: active ? "translateY(-2px)" : "none",
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        className="stat-card-icon"
        style={{
          width: "50px",
          height: "50px",
          borderRadius: "14px",
          backgroundColor: iconBg,
          color: iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p
          style={{
            margin: "0 0 4px",
            fontSize: "12.5px",
            color: "#62746a",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.03em",
          }}
        >
          {label}
        </p>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
          <p
            style={{
              margin: 0,
              fontSize: "24px",
              fontWeight: 800,
              color: "#13221b",
              lineHeight: 1.2,
            }}
          >
            {value}
          </p>
          {trend && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: trend.isPositive ? "#16835b" : "#dc2626",
              }}
            >
              {trend.isPositive ? "↑" : "↓"} {trend.value}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
