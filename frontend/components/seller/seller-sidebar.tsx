"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession } from "@/lib/api/auth";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Boxes,
  TrendingUp,
  Truck,
  MapPin,
  History,
  User,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";

type NavSection = {
  label?: string;
  items: { label: string; href: string; icon: React.ReactNode }[];
};

const NAV: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/seller", icon: <LayoutDashboard size={17} /> },
    ],
  },
  {
    label: "SELLER",
    items: [
      { label: "Products", href: "/seller/products", icon: <Package size={17} /> },
      { label: "Orders", href: "/seller/orders", icon: <ClipboardList size={17} /> },
      { label: "Inventory", href: "/seller/inventory", icon: <Boxes size={17} /> },
      { label: "Earnings", href: "/seller/earnings", icon: <TrendingUp size={17} /> },
    ],
  },
  {
    label: "DELIVERY",
    items: [
      { label: "Today's Deliveries", href: "/seller/deliveries", icon: <Truck size={17} /> },
      { label: "Active Delivery", href: "/seller/deliveries/active", icon: <MapPin size={17} /> },
      { label: "Delivery History", href: "/seller/deliveries/history", icon: <History size={17} /> },
    ],
  },
  {
    items: [
      { label: "Profile", href: "/seller/profile", icon: <User size={17} /> },
      { label: "Settings", href: "/seller/settings", icon: <Settings size={17} /> },
    ],
  },
];

export function SellerSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearSession();
    router.push("/auth/seller");
  }

  return (
    <aside style={{
      width: "230px",
      minHeight: "100vh",
      background: "#1a3d2b",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      position: "sticky",
      top: 0,
      height: "100vh",
      overflowY: "auto",
    }}>
      {/* Logo */}
      <div style={{ padding: "22px 18px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
          <div style={{
            width: "32px", height: "32px", background: "#6fcf3a",
            borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "17px",
          }}>🌿</div>
          <span style={{ color: "#fff", fontSize: "19px", fontWeight: "800", letterSpacing: "-0.5px" }}>Vegito</span>
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "5px",
          padding: "3px 10px", borderRadius: "999px",
          background: "rgba(111,207,58,0.18)", border: "1px solid rgba(111,207,58,0.35)",
        }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#6fcf3a" }} />
          <span style={{ fontSize: "11px", color: "#6fcf3a", fontWeight: "700" }}>Seller & Delivery</span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "12px 10px" }}>
        {NAV.map((section, si) => (
          <div key={si} style={{ marginBottom: "4px" }}>
            {section.label && (
              <p style={{
                fontSize: "9px", fontWeight: "800", letterSpacing: "1.5px",
                color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
                padding: "12px 10px 4px",
              }}>{section.label}</p>
            )}
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex", alignItems: "center", gap: "9px",
                    padding: "9px 11px",
                    borderRadius: "9px", marginBottom: "1px",
                    color: isActive ? "#1a3d2b" : "rgba(255,255,255,0.68)",
                    background: isActive ? "#6fcf3a" : "transparent",
                    fontWeight: isActive ? "700" : "400",
                    fontSize: "13.5px", transition: "all 160ms ease",
                    textDecoration: "none",
                  }}
                >
                  <span style={{ opacity: isActive ? 1 : 0.75, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {isActive && <ChevronRight size={14} />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: "10px" }}>
        <button
          onClick={handleLogout}
          style={{
            display: "flex", alignItems: "center", gap: "9px",
            width: "100%", padding: "9px 11px",
            borderRadius: "9px", background: "transparent", border: "none",
            color: "rgba(255,255,255,0.45)", fontSize: "13.5px", cursor: "pointer",
          }}
        >
          <LogOut size={17} /> Logout
        </button>
      </div>
    </aside>
  );
}
