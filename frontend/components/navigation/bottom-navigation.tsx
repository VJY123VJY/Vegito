"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  Search,
  ShoppingBasket,
  Package,
  UserRound,
  LayoutDashboard,
  ClipboardList,
  Truck,
  Menu,
  Settings,
  Tag
} from "lucide-react";
import { getStoredRole, AuthRole } from "@/lib/api/auth";

interface NavItem {
  icon: any;
  label: string;
  href: string;
}

const ROLE_NAV: Record<string, NavItem[]> = {
  ADMIN: [
    { icon: LayoutDashboard, label: "Admin", href: "/admin" },
    { icon: ClipboardList, label: "Orders", href: "/admin/orders" },
    { icon: Package, label: "Catalog", href: "/admin/products" },
    { icon: Settings, label: "Settings", href: "/admin/settings" },
    { icon: Menu, label: "Menu", href: "#more" },
  ],
  SUPER_ADMIN: [
    { icon: LayoutDashboard, label: "Admin", href: "/admin" },
    { icon: ClipboardList, label: "Orders", href: "/admin/orders" },
    { icon: Package, label: "Catalog", href: "/admin/products" },
    { icon: Settings, label: "Settings", href: "/admin/settings" },
    { icon: Menu, label: "Menu", href: "#more" },
  ],
};

export function BottomNavigation({
  basketCount = 0,
  onMoreClick
}: {
  basketCount?: number;
  onMoreClick?: () => void;
}) {
  const pathname = usePathname();
  const [role, setRole] = useState<AuthRole | "GUEST">("ADMIN");

  useEffect(() => {
    const stored = getStoredRole();
    if (stored) setRole(stored);
  }, []);

  const items = ROLE_NAV[role] || ROLE_NAV.ADMIN;

  return (
    <nav
      className="bottom-nav"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        borderTop: "1px solid #eef2ed",
        background: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(20px)",
        paddingBottom: "env(safe-area-inset-bottom, 12px)",
        height: "calc(74px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {items.map(({ icon: Icon, label, href }) => {
        const isHome = (pathname === "/" || pathname === "/customer") && (href === "/" || href === "/customer");
        const isActive = isHome || (href !== "/" && href !== "/customer" && pathname?.startsWith(href));

        const content = (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px 14px",
              borderRadius: "16px",
              backgroundColor: isActive ? "#e9f6ee" : "transparent",
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <span
              className="nav-icon"
              style={{
                color: isActive ? "#063c32" : "#8ea096",
                transition: "color 0.2s ease, transform 0.2s ease",
                transform: isActive ? "scale(1.08)" : "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative",
              }}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              {label === "Basket" && basketCount > 0 && (
                <em
                  style={{
                    position: "absolute",
                    top: "-5px",
                    right: "-12px",
                    background: "#16835b",
                    color: "white",
                    fontSize: "10px",
                    fontWeight: 800,
                    fontStyle: "normal",
                    padding: "2px 6px",
                    borderRadius: "10px",
                    border: "2px solid #fff",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                  }}
                >
                  {basketCount}
                </em>
              )}
            </span>
            <small
              style={{
                fontSize: "11px",
                fontWeight: isActive ? 800 : 600,
                marginTop: "3px",
                color: isActive ? "#063c32" : "#8ea096",
                letterSpacing: "0.01em",
              }}
            >
              {label}
            </small>
          </div>
        );

        if (href === "#more") {
          return (
            <button
              key={label}
              onClick={onMoreClick}
              style={{
                background: "transparent",
                border: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flex: 1,
                cursor: "pointer",
                padding: "8px 0"
              }}
            >
              {content}
            </button>
          );
        }

        return (
          <Link
            href={href}
            key={label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textDecoration: "none",
              flex: 1,
              padding: "8px 0"
            }}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
