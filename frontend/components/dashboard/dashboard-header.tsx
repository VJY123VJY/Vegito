"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, Menu, X, PanelLeftClose, PanelLeft, MapPin, LogOut, User, Settings, Home, RotateCcw } from "lucide-react";
import { clearSession } from "@/lib/api/auth";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { useTranslation } from "@/context/i18n-context";
import { LocationModal, getStoredLocation } from "@/components/location/location-modal";

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
  const router = useRouter();
  const { t, language, setLanguage } = useTranslation();
  const initial = userName.trim().charAt(0).toUpperCase() || "V";
  const badge = role ? ROLE_BADGES[role] : null;

  const [locModalOpen, setLocModalOpen] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState("Choose delivery location");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearSession();
    router.replace("/auth/login");
  };

  useEffect(() => {
    const saved = getStoredLocation();
    if (saved?.address) setSelectedLoc(saved.address);

    const handler = (e: any) => {
      if (e.detail?.address) setSelectedLoc(e.detail.address);
    };
    window.addEventListener("vegito:location_changed", handler);
    return () => window.removeEventListener("vegito:location_changed", handler);
  }, []);

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
        backgroundColor: "var(--vegito-card, #ffffff)",
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
              background: "var(--vegito-surface-muted, #f0f4f1)",
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
              background: "var(--vegito-surface-muted, #f0f4f1)",
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
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
            {role === "customer" && (
              <button
                type="button"
                onClick={() => setLocModalOpen(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  backgroundColor: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  color: "#065f46",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  maxWidth: "160px",
                }}
              >
                <MapPin size={11} color="#059669" />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedLoc.split("·")[0].trim()}
                </span>
                <span style={{ fontSize: "8px" }}>▼</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {(role === "seller" || role === "delivery") && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "var(--vegito-surface-tint, #f0fdf4)",
                padding: "3px",
                borderRadius: "10px",
                border: "1.5px solid #86efac",
              }}
            >
              <button
                type="button"
                onClick={() => router.push("/seller")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "7px",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: "pointer",
                  background: role === "seller" ? "#166534" : "transparent",
                  color: role === "seller" ? "#ffffff" : "#166534",
                  boxShadow: role === "seller" ? "0 2px 6px rgba(22,101,52,0.25)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                🏪 Seller
              </button>
              <button
                type="button"
                onClick={() => router.push("/seller/deliveries")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "7px",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: "pointer",
                  background: role === "delivery" ? "#166534" : "transparent",
                  color: role === "delivery" ? "#ffffff" : "#166534",
                  boxShadow: role === "delivery" ? "0 2px 6px rgba(22,101,52,0.25)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                🚴 Delivery
              </button>
            </div>
          )}

          <select
            aria-label="Language"
            value={language}
            onChange={(event) => setLanguage(event.target.value as "en" | "mr" | "hi")}
            style={{
              height: "40px",
              padding: "0 8px",
              borderRadius: "10px",
              border: "1px solid var(--vegito-border)",
              background: "var(--vegito-surface, #fff)",
              color: "var(--vegito-text-main, #17352d)",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            <option value="en">EN</option>
            <option value="mr">मराठी</option>
            <option value="hi">हिन्दी</option>
          </select>
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
              background: "var(--vegito-card, #fff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--vegito-text-muted, #6b7280)",
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
                border: "1.5px solid var(--vegito-card, #fff)",
              }}
            />
          </button>

          {/* Avatar & User Dropdown */}
          <div ref={userMenuRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              aria-label="User profile and settings"
              style={{
                width: "40px",
                height: "40px",
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
                border: "none",
                cursor: "pointer",
              }}
            >
              {initial}
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: "240px",
                  backgroundColor: "var(--vegito-card, #ffffff)",
                  borderRadius: "16px",
                  boxShadow: "0 10px 30px rgba(6, 60, 50, 0.15)",
                  border: "1px solid var(--vegito-border, #e1ebe3)",
                  padding: "12px",
                  zIndex: 1000,
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                {/* Header */}
                <div style={{ padding: "6px 8px", borderBottom: "1px solid var(--vegito-border, #f0f4f1)", marginBottom: "4px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--vegito-primary, #063c32)" }}>
                    {userName}
                  </div>
                  {badge && (
                    <div
                      style={{
                        marginTop: "4px",
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                      }}
                    >
                      {badge.label}
                    </div>
                  )}
                </div>

                {/* Consumer store link */}
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    router.push("/");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 10px",
                    borderRadius: "10px",
                    backgroundColor: "transparent",
                    border: "none",
                    color: "var(--vegito-text-main, #374151)",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  <Home size={15} color="#059669" />
                  <span>Public Storefront</span>
                </button>

                {/* Settings link */}
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    router.push(`/${role ?? "customer"}/settings`);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 10px",
                    borderRadius: "10px",
                    backgroundColor: "transparent",
                    border: "none",
                    color: "var(--vegito-text-main, #374151)",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  <Settings size={15} color="#6b7280" />
                  <span>Account Settings</span>
                </button>

                <div style={{ height: "1px", backgroundColor: "var(--vegito-border, #f0f4f1)", margin: "4px 0" }} />

                {/* Log Out */}
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 10px",
                    borderRadius: "10px",
                    backgroundColor: "rgba(220, 38, 38, 0.12)",
                    border: "1px solid rgba(220, 38, 38, 0.2)",
                    color: "#dc2626",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  <LogOut size={15} />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          backgroundColor: "var(--vegito-surface-muted, #f1f5f2)",
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

      {/* Location Modal */}
      <LocationModal
        isOpen={locModalOpen}
        onClose={() => setLocModalOpen(false)}
        onSelect={(l) => setSelectedLoc(l.address)}
      />
    </header>
  );
}
