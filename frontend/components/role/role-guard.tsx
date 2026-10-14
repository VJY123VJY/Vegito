"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredRole, getAuthToken, getMe, clearSession, type AuthRole } from "@/lib/api/auth";

export function RoleGuard({
  allow,
  redirectTo,
  children,
}: {
  allow: Array<"CUSTOMER" | "SELLER" | "DELIVERY_PARTNER" | "ADMIN" | "SUPER_ADMIN">;
  redirectTo?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    const role = getStoredRole();
    const isAdminRoute = allow.includes("ADMIN") || allow.includes("SUPER_ADMIN");

    // Strict Platform Separation: PWA hosts only Admin & Super Admin command centers.
    if (!isAdminRoute) {
      router.replace(redirectTo ?? "/unauthorized?reason=platform_separation");
      return;
    }

    if (!token || !role) {
      router.replace(redirectTo ?? "/admin/login");
      return;
    }

    const isAllowed = role === "ADMIN" || role === "SUPER_ADMIN";

    if (!isAllowed) {
      router.replace(redirectTo ?? `/unauthorized?required=ADMIN&current=${role}`);
      return;
    }

    let isMounted = true;
    getMe()
      .then((user) => {
        if (!isMounted) return;
        if (!user) {
          clearSession();
          router.replace(redirectTo ?? "/admin/login");
          return;
        }

        const realRole = (user.role_name as AuthRole) || role;
        const authRoles: AuthRole[] = (user.authorized_roles && user.authorized_roles.length > 0)
          ? user.authorized_roles
          : [realRole];

        const isUserAllowed =
          realRole === "ADMIN" ||
          realRole === "SUPER_ADMIN" ||
          authRoles.includes("ADMIN") ||
          authRoles.includes("SUPER_ADMIN");

        if (!isUserAllowed) {
          router.replace(redirectTo ?? `/unauthorized?required=ADMIN&current=${realRole}`);
          return;
        }

        setReady(true);
      })
      .catch(() => {
        if (!isMounted) return;
        clearSession();
        router.replace(redirectTo ?? "/admin/login");
      });

    return () => {
      isMounted = false;
    };
  }, [allow, redirectTo, router]);

  if (!ready) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8faf7",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "20px",
            backgroundColor: "#063c32",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 12px 30px rgba(6, 60, 50, 0.18)",
            marginBottom: "16px",
          }}
        >
          <span style={{ fontSize: "30px" }}>🥬</span>
        </div>
        <div style={{ fontSize: "19px", fontWeight: 800, color: "#063c32", letterSpacing: "-0.02em" }}>
          Vegito
        </div>
        <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#62746a", fontWeight: 600 }}>
          Fresh vegetables, straight from Solapur farms
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
