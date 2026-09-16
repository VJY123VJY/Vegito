"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search, Menu, ShoppingCart, LogOut } from "lucide-react";
import { clearSession } from "@/lib/api/auth";

interface DashboardHeaderProps {
  role?: "customer" | "seller" | "delivery" | "admin";
  greeting?: string;
  subtitle?: string;
  userName?: string;
  userRole?: string;
  searchPlaceholder?: string;
  cartItemCount?: number;
  onSearchChange?: (val: string) => void;
  onMenuToggle?: () => void;
}

const ROLE_BADGES: Record<string, { label: string; bg: string; border: string; color: string }> = {
  customer: {
    label: "👤 Customer",
    bg: "#ecfdf5",
    border: "#a7f3d0",
    color: "#065f46",
  },
  seller: {
    label: "🏪 Seller",
    bg: "#fff7ed",
    border: "#fed7aa",
    color: "#c2410c",
  },
  delivery: {
    label: "🚚 Delivery",
    bg: "#eff6ff",
    border: "#bfdbfe",
    color: "#1d4ed8",
  },
  admin: {
    label: "🛡️ Admin",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    color: "#6d28d9",
  },
};

export function DashboardHeader({
  role,
  greeting,
  subtitle,
  userName = "User",
  userRole = "Member",
  searchPlaceholder = "Search vegetables, orders, inventory...",
  cartItemCount,
  onSearchChange,
  onMenuToggle,
}: DashboardHeaderProps) {
  const router = useRouter();
  const initial = userName.trim().charAt(0).toUpperCase() || "V";
  const badge = role ? ROLE_BADGES[role] : null;

  const handleLogout = () => {
    clearSession();
    router.push("/auth/login");
  };

  return (
    <header
      className="dashboard-header"
      style={{
        height: "70px",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e1e8e2",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px",
        position: "sticky",
        top: 0,
        zIndex: 40,
        gap: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            aria-label="Toggle Navigation Menu"
            style={{
              background: "transparent",
              border: "none",
              padding: "6px",
              cursor: "pointer",
              color: "#063c32",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Menu size={22} />
          </button>
        )}

        {/* Role Badge Pill from Mockup */}
        {badge && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 13px",
              borderRadius: "999px",
              backgroundColor: badge.bg,
              border: `1.5px solid ${badge.border}`,
              color: badge.color,
              fontSize: "12.5px",
              fontWeight: 800,
              letterSpacing: "0.2px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              flexShrink: 0,
            }}
          >
            {badge.label}
          </span>
        )}

        {greeting && (
          <div className="hidden sm:block">
            <h1
              style={{
                margin: 0,
                fontSize: "15px",
                fontWeight: 800,
                color: "#063c32",
                lineHeight: 1.2,
              }}
            >
              {greeting}
            </h1>
            {subtitle && (
              <p style={{ margin: 0, fontSize: "11px", color: "#62746a" }}>
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Center search bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flex: 1,
          maxWidth: "460px",
          backgroundColor: "#f4f7f3",
          border: "1px solid #e1e8e2",
          borderRadius: "12px",
          padding: "8px 14px",
        }}
      >
        <Search size={16} color="#62746a" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          onChange={(e) => onSearchChange?.(e.target.value)}
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: "13px",
            color: "#13221b",
            width: "100%",
          }}
        />
      </div>

      {/* Right controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Cart Icon (if customer) */}
        {cartItemCount !== undefined && (
          <Link
            href="/customer/cart"
            aria-label="Shopping Cart"
            style={{
              position: "relative",
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              border: "1px solid #e1e8e2",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#063c32",
              textDecoration: "none",
            }}
          >
            <ShoppingCart size={18} />
            {cartItemCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-4px",
                  right: "-4px",
                  minWidth: "18px",
                  height: "18px",
                  borderRadius: "9px",
                  backgroundColor: "#16835b",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
                  border: "2px solid #ffffff",
                }}
              >
                {cartItemCount}
              </span>
            )}
          </Link>
        )}

        {/* Notification Bell */}
        <button
          aria-label="Notifications"
          style={{
            position: "relative",
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            border: "1px solid #e1e8e2",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Bell size={18} color="#063c32" />
          <span
            style={{
              position: "absolute",
              top: "7px",
              right: "7px",
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: "#16835b",
              border: "1.5px solid #ffffff",
            }}
          />
        </button>

        {/* Profile */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "12px",
              backgroundColor: "#063c32",
              color: "#e9f6ee",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "15px",
            }}
          >
            {initial}
          </div>
          <div className="hidden md:block" style={{ lineHeight: 1.25 }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#13221b" }}>
              {userName}
            </p>
            <p style={{ margin: 0, fontSize: "11px", color: "#62746a", fontWeight: 500 }}>
              {userRole}
            </p>
          </div>

          <button
            onClick={handleLogout}
            title="Log Out"
            aria-label="Log Out"
            style={{
              padding: "7px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#64748b",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginLeft: "4px",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#dc2626";
              e.currentTarget.style.borderColor = "#fca5a5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#64748b";
              e.currentTarget.style.borderColor = "#e2e8f0";
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
