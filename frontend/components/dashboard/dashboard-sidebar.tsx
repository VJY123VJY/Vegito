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
  ChevronLeft,
  ChevronRight,
  Wheat,
  HandshakeIcon,
  BarChart3,
} from "lucide-react";
import { clearSession } from "@/lib/api/auth";

type RoleType = "customer" | "seller" | "delivery" | "admin" | "farmer";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
}

const CUSTOMER_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/customer", icon: <LayoutDashboard size={18} /> },
  { label: "Browse Vegetables", href: "/products", icon: <ShoppingBasket size={18} /> },
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
  { label: "Reviews & Ratings", href: "/delivery/reviews", icon: <MessageSquare size={18} /> },
  { label: "Live Map", href: "/delivery/live-map", icon: <Compass size={18} /> },
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
  { label: "Reviews", href: "/admin/reviews", icon: <MessageSquare size={18} /> },
  { label: "Delivery Zones", href: "/admin/zones", icon: <MapPin size={18} /> },
  { label: "Coupons", href: "/admin/coupons", icon: <Tag size={18} /> },
  { label: "Complaints", href: "/admin/complaints", icon: <ShieldAlert size={18} /> },
  { label: "Payments", href: "/admin/payments", icon: <CreditCard size={18} /> },
  { label: "Analytics", href: "/admin/analytics", icon: <TrendingUp size={18} /> },
  { label: "Settings", href: "/admin/settings", icon: <Settings size={18} /> },
];

const FARMER_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/farmer", icon: <LayoutDashboard size={18} /> },
  { label: "Products", href: "/farmer/products", icon: <Wheat size={18} /> },
  { label: "Requests", href: "/farmer/requests", icon: <HandshakeIcon size={18} /> },
  { label: "Deals", href: "/farmer/deals", icon: <Tag size={18} /> },
  { label: "Inventory", href: "/farmer/inventory", icon: <Layers size={18} /> },
  { label: "Analytics", href: "/farmer/analytics", icon: <BarChart3 size={18} /> },
  { label: "Profile", href: "/farmer/profile", icon: <User size={18} /> },
];

const ROLE_CONFIG: Record<RoleType, { title: string; items: NavItem[]; authRoute: string }> = {
  customer: { title: "Customer Portal", items: CUSTOMER_ITEMS, authRoute: "/auth/login" },
  seller: { title: "Seller Central", items: SELLER_ITEMS, authRoute: "/auth/login" },
  delivery: { title: "Delivery Fleet", items: DELIVERY_ITEMS, authRoute: "/auth/login" },
  admin: { title: "Operations Admin", items: ADMIN_ITEMS, authRoute: "/auth/login" },
  farmer: { title: "Farmer Market", items: FARMER_ITEMS, authRoute: "/auth/login" },
};

interface DashboardSidebarProps {
  role: RoleType;
  /** Mobile: whether the drawer is open */
  isOpen?: boolean;
  /** Desktop: whether the sidebar is collapsed to icon-only */
  collapsed?: boolean;
  /** Called when a nav link is clicked (closes mobile drawer) */
  onClose?: () => void;
  /** Called when the desktop collapse toggle is clicked */
  onCollapseToggle?: () => void;
}

export function DashboardSidebar({
  role,
  isOpen = false,
  collapsed = false,
  onClose,
  onCollapseToggle,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.customer;

  function handleLogout() {
    clearSession();
    router.push("/auth/login");
  }

  // Build className for the aside element
  const asideClass = [
    "dashboard-sidebar-container",
    isOpen ? "mobile-open" : "",
    collapsed ? "desktop-collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside className={asideClass} role="navigation" aria-label={`${config.title} navigation`}>
      {/* ── Brand Header ── */}
      <div
        style={{
          padding: collapsed ? "20px 0" : "20px 16px 16px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          transition: "padding 250ms ease",
        }}
      >
        <Link
          href={config.items[0]?.href ?? "/"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
            justifyContent: collapsed ? "center" : "flex-start",
            transition: "justify-content 250ms ease",
          }}
          className="sidebar-logo-row"
          onClick={onClose}
        >
          {/* Icon — always visible */}
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
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(22, 131, 91, 0.4)",
            }}
          >
            🥬
          </div>

          {/* Brand name + subtitle — hidden when collapsed */}
          <div className="sidebar-label">
            <span
              style={{
                fontSize: "19px",
                fontWeight: 800,
                letterSpacing: "-0.5px",
                color: "#ffffff",
                display: "block",
                lineHeight: 1.1,
              }}
            >
              Vegito
            </span>
            <span
              className="sidebar-brand-subtitle"
              style={{
                display: "block",
                fontSize: "10px",
                color: "rgba(255, 255, 255, 0.55)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                lineHeight: 1.2,
              }}
            >
              {config.title}
            </span>
          </div>
        </Link>
      </div>

      {/* ── Navigation List ── */}
      <nav
        style={{
          flex: 1,
          padding: collapsed ? "12px 8px" : "12px 10px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          transition: "padding 250ms ease",
        }}
      >
        {config.items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== `/${role}` && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              aria-current={isActive ? "page" : undefined}
              className="sidebar-nav-item"
              style={{
                display: "flex",
                alignItems: "center",
                gap: collapsed ? "0" : "11px",
                padding: collapsed ? "10px 0" : "9px 12px",
                borderRadius: "10px",
                justifyContent: collapsed ? "center" : "flex-start",
                color: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.72)",
                backgroundColor: isActive ? "rgba(22, 131, 91, 0.38)" : "transparent",
                borderLeft: collapsed
                  ? "none"
                  : isActive
                  ? "3px solid #16835b"
                  : "3px solid transparent",
                fontWeight: isActive ? 700 : 500,
                fontSize: "13.5px",
                textDecoration: "none",
                transition: "all 160ms ease",
                minHeight: "44px",
              }}
            >
              <span
                style={{
                  color: isActive ? "#6ee7b7" : "rgba(255, 255, 255, 0.65)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {item.icon}
              </span>
              <span className="sidebar-label" style={{ flex: 1 }}>
                {item.label}
              </span>
              {!collapsed && item.badge !== undefined && (
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

      {/* ── Botanical watermark ── */}
      {!collapsed && (
        <div
          style={{
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            opacity: 0.3,
            userSelect: "none",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "#34d399" }}
          >
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
          </svg>
          <span
            style={{
              fontSize: "10px",
              letterSpacing: "1.2px",
              color: "#a7f3d0",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            Solapur Organic
          </span>
        </div>
      )}

      {/* ── Desktop Collapse Toggle ── */}
      {onCollapseToggle && (
        <div
          style={{
            padding: collapsed ? "12px 0" : "12px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: collapsed ? "center" : "flex-end",
          }}
        >
          <button
            onClick={onCollapseToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "8px",
              minWidth: "44px",
              minHeight: "44px",
              borderRadius: "10px",
              color: "rgba(255, 255, 255, 0.55)",
              backgroundColor: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 160ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.55)";
            }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!collapsed && (
              <span className="sidebar-label" style={{ fontSize: "12px" }}>
                Collapse
              </span>
            )}
          </button>
        </div>
      )}

      {/* ── Logout Footer ── */}
      <div
        style={{
          padding: collapsed ? "12px 0" : "12px",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <button
          onClick={handleLogout}
          title="Logout"
          aria-label="Logout"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: collapsed ? "0" : "11px",
            width: collapsed ? "44px" : "100%",
            minHeight: "44px",
            padding: collapsed ? "10px" : "10px 12px",
            borderRadius: "10px",
            color: "rgba(255, 255, 255, 0.55)",
            backgroundColor: "transparent",
            border: "none",
            fontSize: "13.5px",
            fontWeight: 600,
            cursor: "pointer",
            textAlign: "left",
            transition: "color 160ms ease, background-color 160ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#f87171";
            e.currentTarget.style.backgroundColor = "rgba(248, 113, 113, 0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(255, 255, 255, 0.55)";
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <LogOut size={18} style={{ flexShrink: 0 }} />
          <span className="sidebar-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}
