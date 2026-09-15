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
    if (!role || !allow.includes(role)) {
      router.replace(redirectTo ?? getRoleRedirectPath(role));
      return;
    }
    setReady(true);
  }, [allow, redirectTo, router]);

  if (!ready) return null;
  return <>{children}</>;
}
