import { RoleGuard } from "@/components/role/role-guard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>{children}</RoleGuard>;
}
