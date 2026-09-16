"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBasket,
  ClipboardList,
  Heart,
  ShoppingCart,
  Wallet,
  MapPin,
  User,
  Bell,
  Settings,
  LogOut,
  Package,
  Layers,
  DollarSign,
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  Truck,
  Users,
  Store,
  Tag,
  CreditCard,
  Compass,
  History,
  ShieldAlert,
} from "lucide-react";
import { clearSession } from "@/lib/api/auth";

type RoleType = "customer" | "seller" | "delivery" | "admin";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
}

const CUSTOMER_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/customer", icon: <LayoutDashboard size={18} /> },
  { label: "Browse Vegetables", href: "/categories", icon: <ShoppingBasket size={18} /> },
  { label: "My Orders", href: "/customer/orders", icon: <ClipboardList size={18} /> },
  { label: "Favorites", href: "/customer/favorites", icon: <Heart size={18} /> },
  { label: "Cart", href: "/customer/cart", icon: <ShoppingCart size={18} /> },
  { label: "Addresses", href: "/customer/addresses", icon: <MapPin size={18} /> },
  { label: "Profile", href: "/customer/profile", icon: <User size={18} /> },
  { label: "Notifications", href: "/customer/notifications", icon: <Bell size={18} /> },
  { label: "Settings", href: "/customer/settings", icon: <Settings size={18} /> },
];

const SELLER_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/seller", icon: <LayoutDashboard size={18} /> },
  { label: "Products", href: "/seller/products", icon: <Package size={18} /> },
  { label: "Orders", href: "/seller/orders", icon: <ClipboardList size={18} /> },
  { label: "Inventory", href: "/seller/inventory", icon: <Layers size={18} /> },
  { label: "Earnings", href: "/seller/earnings", icon: <DollarSign size={18} /> },
  { label: "Analytics", href: "/seller/analytics", icon: <TrendingUp size={18} /> },
  { label: "Reviews", href: "/seller/reviews", icon: <MessageSquare size={18} /> },
  { label: "Complaints", href: "/seller/complaints", icon: <AlertTriangle size={18} /> },
  { label: "Profile", href: "/seller/profile", icon: <User size={18} /> },
  { label: "Settings", href: "/seller/settings", icon: <Settings size={18} /> },
];

const DELIVERY_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/delivery", icon: <LayoutDashboard size={18} /> },
  { label: "My Deliveries", href: "/delivery/tasks", icon: <ClipboardList size={18} /> },
  { label: "Live Map", href: "/delivery/map", icon: <Compass size={18} /> },
  { label: "History", href: "/delivery/history", icon: <History size={18} /> },
  { label: "Profile", href: "/delivery/profile", icon: <User size={18} /> },
  { label: "Settings", href: "/delivery/settings", icon: <Settings size={18} /> },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: <LayoutDashboard size={18} /> },
  { label: "Orders", href: "/admin/orders", icon: <ClipboardList size={18} /> },
  { label: "Customers", href: "/admin/customers", icon: <Users size={18} /> },
  { label: "Sellers", href: "/admin/sellers", icon: <Store size={18} /> },
  { label: "Delivery Partners", href: "/admin/delivery", icon: <Truck size={18} /> },
  { label: "Products", href: "/admin/products", icon: <Package size={18} /> },
  { label: "Categories", href: "/admin/categories", icon: <Layers size={18} /> },
  { label: "Inventory", href: "/admin/inventory", icon: <ShoppingBasket size={18} /> },
  { label: "Delivery Zones", href: "/admin/zones", icon: <MapPin size={18} /> },
  { label: "Coupons", href: "/admin/coupons", icon: <Tag size={18} /> },
  { label: "Complaints", href: "/admin/complaints", icon: <ShieldAlert size={18} /> },
  { label: "Payments", href: "/admin/payments", icon: <CreditCard size={18} /> },
  { label: "Analytics", href: "/admin/analytics", icon: <TrendingUp size={18} /> },
  { label: "Settings", href: "/admin/settings", icon: <Settings size={18} /> },
];

const ROLE_CONFIG: Record<RoleType, { title: string; items: NavItem[]; authRoute: string }> = {
  customer: { title: "Customer Portal", items: CUSTOMER_ITEMS, authRoute: "/auth/login" },
  seller: { title: "Seller Central", items: SELLER_ITEMS, authRoute: "/auth/login" },
  delivery: { title: "Delivery Fleet", items: DELIVERY_ITEMS, authRoute: "/auth/login" },
  admin: { title: "Operations Admin", items: ADMIN_ITEMS, authRoute: "/auth/login" },
};

interface DashboardSidebarProps {
  role: RoleType;
  isOpen?: boolean;
  onClose?: () => void;
}

export function DashboardSidebar({ role, isOpen = true, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.customer;

  function handleLogout() {
    clearSession();
    router.push("/auth/login");
  }

  return (
    <aside
      className={`dashboard-sidebar-container ${isOpen ? "mobile-open" : ""}`}
      style={{
        width: "240px",
        backgroundColor: "#063c32",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        overflowY: "auto",
        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
        flexShrink: 0,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: "24px 20px 18px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <Link
          href={config.items[0].href}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              backgroundColor: "#16835b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              boxShadow: "0 2px 8px rgba(22, 131, 91, 0.4)",
            }}
          >
            🥬
          </div>
          <div>
            <span
              style={{
                fontSize: "20px",
                fontWeight: 800,
                letterSpacing: "-0.5px",
                color: "#ffffff",
              }}
            >
              Vegito
            </span>
            <span
              style={{
                display: "block",
                fontSize: "10.5px",
                color: "rgba(255, 255, 255, 0.55)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {config.title}
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation List */}
      <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: "3px" }}>
        {config.items.map((item) => {
          const isActive = pathname === item.href || (item.href !== `/${role}` && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "9px 14px",
                borderRadius: "10px",
                color: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.72)",
                backgroundColor: isActive ? "rgba(22, 131, 91, 0.35)" : "transparent",
                borderLeft: isActive ? "3px solid #16835b" : "3px solid transparent",
                fontWeight: isActive ? 700 : 500,
                fontSize: "13.5px",
                textDecoration: "none",
                transition: "all 140ms ease",
              }}
            >
              <span style={{ color: isActive ? "#6ee7b7" : "rgba(255, 255, 255, 0.65)" }}>
                {item.icon}
              </span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge !== undefined && (
                <span
                  style={{
                    backgroundColor: "#16835b",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: "999px",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Botanical watermark decoration at bottom of sidebar */}
      <div
        style={{
          padding: "10px 18px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          opacity: 0.35,
          userSelect: "none",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#34d399" }}>
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
        </svg>
        <span style={{ fontSize: "10.5px", letterSpacing: "1.2px", color: "#a7f3d0", fontWeight: 700, textTransform: "uppercase" }}>
          Solapur Organic
        </span>
      </div>

      {/* Logout Footer */}
      <div
        style={{
          padding: "16px 12px",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            width: "100%",
            padding: "10px 14px",
            borderRadius: "10px",
            color: "rgba(255, 255, 255, 0.6)",
            backgroundColor: "transparent",
            border: "none",
            fontSize: "13.5px",
            fontWeight: 600,
            cursor: "pointer",
            textAlign: "left",
            transition: "color 140ms ease, background-color 140ms ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)")}
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
