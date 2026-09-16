import { RoleGuard } from "@/components/role/role-guard";

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={["DELIVERY_PARTNER", "ADMIN", "SUPER_ADMIN"]}>{children}</RoleGuard>;
}
