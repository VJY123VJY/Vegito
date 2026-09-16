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

  if (!ready) return null;
  return <>{children}</>;
}
