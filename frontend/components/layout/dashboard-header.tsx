"use client";

import Link from "next/link";
import { Bell, Search } from "lucide-react";

type DashboardHeaderProps = {
  greeting: string;
  subtitle: string;
  userName: string;
  userRole: string;
  avatarInitial?: string;
  searchPlaceholder?: string;
};

export function DashboardHeader({
  greeting,
  subtitle,
  userName,
  userRole,
  avatarInitial,
  searchPlaceholder = "Search...",
}: DashboardHeaderProps) {
  const initial = avatarInitial ?? userName.charAt(0).toUpperCase();

  return (
    <header style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 28px",
      background: "#ffffff",
      borderBottom: "1px solid #eff0f0",
      gap: "16px",
      position: "sticky",
      top: 0,
      zIndex: 10,
    }}>
      {/* Search */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flex: 1,
        maxWidth: "400px",
        padding: "8px 14px",
        background: "#f8f9fa",
        borderRadius: "10px",
        border: "1px solid #eeeff1",
      }}>
        <Search size={16} color="#a0a6b1" />
        <input
          placeholder={searchPlaceholder}
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: "13px",
            color: "#374151",
            width: "100%",
          }}
        />
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Bell */}
        <button style={{
          position: "relative",
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          border: "1px solid #eeeff1",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}>
          <Bell size={17} color="#6b7280" />
          <span style={{
            position: "absolute",
            top: "6px",
            right: "6px",
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: "#ef4444",
            border: "1.5px solid #fff",
          }} />
        </button>

        {/* User */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "#1a3d2b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: "700",
            fontSize: "14px",
          }}>
            {initial}
          </div>
          <div style={{ lineHeight: 1.3 }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: "#111827" }}>{userName}</p>
            <p style={{ margin: 0, fontSize: "11px", color: "#9ca3af" }}>{userRole}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

/** Stat card used in all dashboard views */
export function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #f0f1f3",
      borderRadius: "14px",
      padding: "18px 20px",
      display: "flex",
      alignItems: "center",
      gap: "14px",
      flex: 1,
      minWidth: 0,
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    }}>
      <div style={{
        width: "44px",
        height: "44px",
        borderRadius: "12px",
        background: iconBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: iconColor,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ margin: "0 0 3px", fontSize: "12px", color: "#9ca3af", fontWeight: "500" }}>{label}</p>
        <p style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#111827" }}>{value}</p>
      </div>
    </div>
  );
}
