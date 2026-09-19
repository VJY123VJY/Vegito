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
  Settings
} from "lucide-react";
import { getStoredRole, AuthRole } from "@/lib/api/auth";

interface NavItem {
  icon: any;
  label: string;
  href: string;
}

const ROLE_NAV: Record<string, NavItem[]> = {
  CUSTOMER: [
    { icon: House, label: "Home", href: "/customer" },
    { icon: Search, label: "Explore", href: "/search" },
    { icon: ShoppingBasket, label: "Basket", href: "/customer/cart" },
    { icon: Package, label: "Orders", href: "/customer/orders" },
    { icon: UserRound, label: "Profile", href: "/customer/profile" },
  ],
  SELLER: [
    { icon: LayoutDashboard, label: "Home", href: "/seller" },
    { icon: Package, label: "Inventory", href: "/seller/inventory" },
    { icon: ClipboardList, label: "Orders", href: "/seller/orders" },
    { icon: Truck, label: "Deliver", href: "/seller/deliveries" },
    { icon: Menu, label: "Menu", href: "#more" },
  ],
  DELIVERY_PARTNER: [
    { icon: LayoutDashboard, label: "Fleet", href: "/delivery" },
    { icon: ClipboardList, label: "Tasks", href: "/delivery/tasks" },
    { icon: Truck, label: "Live", href: "/delivery/live-map" },
    { icon: UserRound, label: "Profile", href: "/delivery/profile" },
    { icon: Menu, label: "Menu", href: "#more" },
  ],
  ADMIN: [
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
  const [role, setRole] = useState<AuthRole | "GUEST">("CUSTOMER");

  useEffect(() => {
    const stored = getStoredRole();
    if (stored) setRole(stored);
  }, []);

  const items = ROLE_NAV[role] || ROLE_NAV.CUSTOMER;

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
        const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));

        const content = (
          <>
            <span
              className="nav-icon"
              style={{
                color: isActive ? "var(--vegito-primary)" : "#8ea096",
                transition: "color 0.2s ease, transform 0.2s ease",
                transform: isActive ? "translateY(-2px) scale(1.1)" : "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative"
              }}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              {label === "Basket" && basketCount > 0 && (
                <em style={{
                  position: "absolute",
                  top: "-4px",
                  right: "-10px",
                  background: "var(--vegito-accent)",
                  color: "white",
                  fontSize: "10px",
                  fontWeight: 800,
                  fontStyle: "normal",
                  padding: "2px 6px",
                  borderRadius: "10px",
                  border: "2px solid #fff"
                }}>{basketCount}</em>
              )}
            </span>
            <small style={{
              fontSize: "11px",
              fontWeight: isActive ? 700 : 500,
              marginTop: "4px",
              color: isActive ? "var(--vegito-primary)" : "#8ea096",
              letterSpacing: "0.01em"
            }}>{label}</small>
          </>
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
