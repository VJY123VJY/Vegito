import { RoleGuard } from "@/components/role/role-guard";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={["SELLER"]}>{children}</RoleGuard>;
}
