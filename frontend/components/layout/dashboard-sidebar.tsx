"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBasket,
  ClipboardList,
  Wallet,
  User,
  Settings,
  LogOut,
  Truck,
  DollarSign,
  Package,
} from "lucide-react";
import { clearSession } from "@/lib/api/auth";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

type DashboardSidebarProps = {
  role: "customer" | "seller" | "delivery";
};

const CUSTOMER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/customer", icon: <LayoutDashboard size={18} /> },
  { label: "Browse Vegetables", href: "/categories", icon: <ShoppingBasket size={18} /> },
  { label: "My Orders", href: "/customer/orders", icon: <ClipboardList size={18} /> },
  { label: "Wallet", href: "/customer/wallet", icon: <Wallet size={18} /> },
  { label: "Profile", href: "/customer/profile", icon: <User size={18} /> },
  { label: "Settings", href: "/customer/settings", icon: <Settings size={18} /> },
];

const SELLER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/seller", icon: <LayoutDashboard size={18} /> },
  { label: "Products", href: "/seller/products", icon: <Package size={18} /> },
  { label: "Orders", href: "/seller/orders", icon: <ClipboardList size={18} /> },
  { label: "Inventory", href: "/seller/inventory", icon: <ShoppingBasket size={18} /> },
  { label: "Earnings", href: "/seller/earnings", icon: <DollarSign size={18} /> },
  { label: "Profile", href: "/seller/profile", icon: <User size={18} /> },
  { label: "Settings", href: "/seller/settings", icon: <Settings size={18} /> },
];

const DELIVERY_NAV: NavItem[] = [
  { label: "Dashboard", href: "/delivery", icon: <LayoutDashboard size={18} /> },
  { label: "My Deliveries", href: "/delivery/tasks", icon: <Truck size={18} /> },
  { label: "Earnings", href: "/delivery/earnings", icon: <DollarSign size={18} /> },
  { label: "Profile", href: "/delivery/profile", icon: <User size={18} /> },
  { label: "Settings", href: "/delivery/settings", icon: <Settings size={18} /> },
];

const NAV_MAP = {
  customer: CUSTOMER_NAV,
  seller: SELLER_NAV,
  delivery: DELIVERY_NAV,
};

export function DashboardSidebar({ role }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = NAV_MAP[role];

  function handleLogout() {
    clearSession();
    router.push("/auth/customer");
  }

  return (
    <aside style={{
      width: "220px",
      minHeight: "100vh",
      background: "#1a3d2b",
      display: "flex",
      flexDirection: "column",
      padding: "0",
      flexShrink: 0,
      position: "sticky",
      top: 0,
      height: "100vh",
      overflowY: "auto",
    }}>
      {/* Logo */}
      <div style={{
        padding: "24px 20px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "32px", height: "32px",
            background: "#6fcf3a",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
          }}>🌿</div>
          <span style={{
            color: "#ffffff",
            fontSize: "20px",
            fontWeight: "700",
            letterSpacing: "-0.5px",
          }}>Vegito</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "16px 12px" }}>
        {nav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "10px",
                marginBottom: "2px",
                color: isActive ? "#1a3d2b" : "rgba(255,255,255,0.72)",
                background: isActive ? "#6fcf3a" : "transparent",
                fontWeight: isActive ? "600" : "400",
                fontSize: "14px",
                transition: "all 160ms ease",
                textDecoration: "none",
              }}
            >
              <span style={{ opacity: isActive ? 1 : 0.8 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: "12px" }}>
        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            width: "100%",
            padding: "10px 12px",
            borderRadius: "10px",
            color: "rgba(255,255,255,0.55)",
            background: "transparent",
            border: "none",
            fontSize: "14px",
            cursor: "pointer",
            transition: "color 160ms ease",
            textAlign: "left",
          }}
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
