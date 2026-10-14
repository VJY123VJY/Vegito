"use client";

import { usePathname } from "next/navigation";
import { RoleGuard } from "@/components/role/role-guard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The login route manages authentication and must not be trapped in a role guard loop
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>{children}</RoleGuard>;
}
