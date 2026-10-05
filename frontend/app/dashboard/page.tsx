"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Store, Bike, ArrowRight, Loader2, LogOut } from "lucide-react";
import {
  getStoredRole,
  getStoredAuthorizedRoles,
  getStoredUserName,
  getAuthToken,
  getMe,
  switchWorkspace,
  clearSession,
  getRoleRedirectPath,
  type AuthRole,
} from "@/lib/api/auth";

export default function DashboardDispatcherPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [authorizedRoles, setAuthorizedRoles] = useState<AuthRole[]>([]);
  const [switching, setSwitching] = useState<AuthRole | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      clearSession();
      router.replace("/auth/login");
      return;
    }

    let isMounted = true;
    getMe()
      .then((user) => {
        if (!isMounted) return;
        if (!user) {
          clearSession();
          router.replace("/auth/login");
          return;
        }

        const roles: AuthRole[] = (user.authorized_roles && user.authorized_roles.length > 0)
          ? user.authorized_roles
          : [user.role_name as AuthRole];

        setUserName(user.name || "Partner");
        setAuthorizedRoles(roles);

        const hasSeller = roles.includes("SELLER");
        const hasDelivery = roles.includes("DELIVERY_PARTNER");

        // Single role routing
        if (hasSeller && !hasDelivery) {
          router.replace("/seller");
          return;
        }
        if (hasDelivery && !hasSeller) {
          router.replace("/delivery");
          return;
        }
        if (roles.includes("CUSTOMER") && !hasSeller && !hasDelivery) {
          router.replace("/customer");
          return;
        }

        // If multi-role (e.g. SELLER + DELIVERY_PARTNER), stop loading and display workspace selector
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        clearSession();
        router.replace("/auth/login");
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSelectWorkspace = async (targetRole: AuthRole) => {
    setSwitching(targetRole);
    try {
      await switchWorkspace(targetRole);
      router.push(getRoleRedirectPath(targetRole));
    } catch {
      router.push(getRoleRedirectPath(targetRole));
    }
  };

  const handleLogout = () => {
    clearSession();
    router.replace("/auth/login");
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8faf7",
          fontFamily: "'Inter', -apple-system, sans-serif",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "18px",
            backgroundColor: "#063c32",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
            boxShadow: "0 8px 24px rgba(6, 60, 50, 0.15)",
          }}
        >
          <span style={{ fontSize: "28px" }}>🥬</span>
        </div>
        <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#063c32" }}>
          Opening Vegito Workspace...
        </p>
      </div>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8faf7",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "#ffffff",
          borderRadius: "24px",
          border: "1.5px solid #dce8df",
          boxShadow: "0 12px 40px rgba(6, 60, 50, 0.08)",
          padding: "36px 28px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "38px", marginBottom: "8px" }}>👋</div>
        <h1
          style={{
            margin: "0 0 6px",
            fontSize: "24px",
            fontWeight: 800,
            color: "#063c32",
            letterSpacing: "-0.02em",
          }}
        >
          Welcome back, {userName}!
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: "14px", color: "#62746a" }}>
          What do you want to open today?
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
          {/* Seller Workspace Button */}
          {authorizedRoles.includes("SELLER") && (
            <button
              type="button"
              onClick={() => handleSelectWorkspace("SELLER")}
              disabled={switching !== null}
              style={{
                width: "100%",
                padding: "18px 20px",
                borderRadius: "16px",
                border: "1.5px solid #fed7aa",
                backgroundColor: "#fff7ed",
                color: "#9a3412",
                textAlign: "left",
                cursor: switching ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "transform 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    backgroundColor: "#ea580c",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Store size={22} />
                </div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 800 }}>Seller Dashboard</div>
                  <div style={{ fontSize: "12.5px", color: "#c2410c" }}>
                    Manage store catalog, prices & incoming orders
                  </div>
                </div>
              </div>
              {switching === "SELLER" ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <ArrowRight size={20} />
              )}
            </button>
          )}

          {/* Delivery Workspace Button */}
          {authorizedRoles.includes("DELIVERY_PARTNER") && (
            <button
              type="button"
              onClick={() => handleSelectWorkspace("DELIVERY_PARTNER")}
              disabled={switching !== null}
              style={{
                width: "100%",
                padding: "18px 20px",
                borderRadius: "16px",
                border: "1.5px solid #bfdbfe",
                backgroundColor: "#eff6ff",
                color: "#1e40af",
                textAlign: "left",
                cursor: switching ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "transform 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Bike size={22} />
                </div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 800 }}>Delivery Dashboard</div>
                  <div style={{ fontSize: "12.5px", color: "#2563eb" }}>
                    Today’s routes, customer maps & doorstep OTPs
                  </div>
                </div>
              </div>
              {switching === "DELIVERY_PARTNER" ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <ArrowRight size={20} />
              )}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            background: "none",
            border: "none",
            color: "#62746a",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </main>
  );
}
