"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredRole, getRoleRedirectPath } from "@/lib/api/auth";

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
    const role = getStoredRole();
    if (!role) {
      const defaultRole = allow.includes("CUSTOMER")
        ? "customer"
        : allow.includes("SELLER")
        ? "seller"
        : allow.includes("DELIVERY_PARTNER")
        ? "delivery"
        : "admin";
      router.replace(redirectTo ?? `/auth/login?role=${defaultRole}`);
      return;
    }
    if (!allow.includes(role)) {
      router.replace(redirectTo ?? `/unauthorized?required=${allow.join(",")}&current=${role}`);
      return;
    }
    setReady(true);
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
