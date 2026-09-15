import { RoleGuard } from "@/components/role/role-guard";
import styles from "@/styles/customer-commerce.module.css";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={["CUSTOMER"]}><div className={styles.page}>{children}</div></RoleGuard>;
}
