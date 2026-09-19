"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, Menu, X, PanelLeftClose, PanelLeft } from "lucide-react";
import { clearSession } from "@/lib/api/auth";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { useTranslation } from "@/context/i18n-context";

interface DashboardHeaderProps {
  role?: "customer" | "seller" | "delivery" | "admin" | "farmer";
  greeting?: string;
  subtitle?: string;
  userName?: string;
  userRole?: string;
  searchPlaceholder?: string;
  cartItemCount?: number;
  onSearchChange?: (val: string) => void;
  /** Mobile: toggle the drawer open/closed */
  onMenuToggle?: () => void;
  /** Whether the mobile menu is currently open (for aria-label) */
  mobileMenuOpen?: boolean;
  /** Desktop: toggle sidebar collapsed/expanded */
  onCollapseToggle?: () => void;
  /** Whether the desktop sidebar is currently collapsed */
  sidebarCollapsed?: boolean;
}

const ROLE_BADGES: Record<string, { label: string; bg: string; border: string; color: string }> = {
  customer: { label: "👤 Customer", bg: "#ecfdf5", border: "#a7f3d0", color: "#065f46" },
  seller:   { label: "🏪 Seller",   bg: "#fff7ed", border: "#fed7aa", color: "#c2410c" },
  delivery: { label: "🚚 Delivery", bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
  admin:    { label: "🛡️ Admin",    bg: "#f5f3ff", border: "#ddd6fe", color: "#6d28d9" },
  farmer:   { label: "🌾 Farmer",   bg: "#fefce8", border: "#fde68a", color: "#92400e" },
};

export function DashboardHeader({
  role,
  greeting,
  subtitle,
  userName = "User",
  userRole = "Member",
  searchPlaceholder,
  cartItemCount,
  onSearchChange,
  onMenuToggle,
  mobileMenuOpen = false,
  onCollapseToggle,
  sidebarCollapsed = false,
}: DashboardHeaderProps) {
  const { t } = useTranslation();
  const initial = userName.trim().charAt(0).toUpperCase() || "V";
  const badge = role ? ROLE_BADGES[role] : null;

  const defaultSearchPlaceholder =
    searchPlaceholder ||
    (role === "customer"
      ? t("customer.searchVeg", "Search vegetables, fruits...")
      : t("common.search", "Search") + "...");

  return (
    <header
      className="dashboard-header"
      style={{
        height: "auto",
        minHeight: "64px",
        backgroundColor: "rgba(255, 255, 255, 0.97)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--vegito-border)",
        display: "flex",
        flexDirection: "column",
        padding: "calc(var(--safe-top, 0px) + 10px) 16px 10px",
        position: "sticky",
        top: 0,
        zIndex: 90,
        gap: "10px",
      }}
    >
      {/* ── Top Row: Toggle + Title + Actions ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>

        {/* Desktop: Collapse/Expand toggle */}
        {onCollapseToggle && (
          <button
            onClick={onCollapseToggle}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="dashboard-desktop-toggle"
            style={{
              display: "none", /* shown via CSS media query below */
              alignItems: "center",
              justifyContent: "center",
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "#f0f4f1",
              border: "none",
              color: "var(--vegito-primary)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {sidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
          </button>
        )}

        {/* Mobile: Hamburger/Close toggle */}
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            className="dashboard-mobile-toggle"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "#f0f4f1",
              border: "none",
              color: "var(--vegito-primary)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}

        {/* Brand text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: "17px",
              fontWeight: 800,
              color: "var(--vegito-primary)",
              lineHeight: 1.1,
            }}
          >
            Vegito
          </h2>
          {badge && (
            <span style={{ fontSize: "11px", fontWeight: 600, color: badge.color, opacity: 0.8 }}>
              {badge.label.split(" ").slice(1).join(" ")}
            </span>
          )}
        </div>

        {/* Right Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <ThemeToggle />

          {/* Notification bell */}
          <button
            aria-label="Notifications"
            style={{
              position: "relative",
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              border: "1.5px solid var(--vegito-border)",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#6b7280",
            }}
          >
            <Bell size={18} />
            <span
              style={{
                position: "absolute",
                top: "9px",
                right: "9px",
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#ef4444",
                border: "1.5px solid #fff",
              }}
            />
          </button>

          {/* Avatar */}
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "12px",
              backgroundColor: "var(--vegito-primary)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "14px",
              flexShrink: 0,
              boxShadow: "0 4px 10px rgba(10, 77, 60, 0.2)",
            }}
          >
            {initial}
          </div>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          backgroundColor: "#f1f5f2",
          borderRadius: "14px",
          padding: "10px 16px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <Search size={16} color="#62746a" style={{ flexShrink: 0 }} />
        <input
          type="text"
          placeholder={defaultSearchPlaceholder}
          onChange={(e) => onSearchChange?.(e.target.value)}
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: "14px",
            color: "var(--vegito-text-main)",
            width: "100%",
            fontWeight: 500,
          }}
        />
      </div>

      {/* Inline styles for responsive toggle visibility */}
      <style>{`
        @media (min-width: 1024px) {
          .dashboard-desktop-toggle { display: flex !important; }
          .dashboard-mobile-toggle  { display: none  !important; }
        }
        @media (max-width: 1023px) {
          .dashboard-desktop-toggle { display: none  !important; }
          .dashboard-mobile-toggle  { display: flex  !important; }
        }
      `}</style>
    </header>
  );
}
