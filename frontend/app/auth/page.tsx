import Link from "next/link";
import { ArrowUpRight, Bike, Package, Store } from "lucide-react";
import styles from "@/styles/auth-gateway.module.css";

export default function AuthLandingPage() {
  const roles = [
    ["Customer", "Shop Solapur produce and track deliveries.", Package, "/auth/register?role=customer"],
    ["Seller / farmer", "List your products and fulfil local orders.", Store, "/auth/register?role=seller"],
    ["Delivery partner", "Accept assigned tasks and complete deliveries.", Bike, "/auth/register?role=delivery"],
  ] as const;
  return <main className={styles.shell}><section className={styles.card}>
    <p className={styles.eyebrow}>VEGITO · SOLAPUR</p>
    <h1 className={styles.heading}>One market, three ways to participate.</h1>
    <p className={styles.copy}>Choose a role to register or log in with your verified mobile number.</p>
    <div className={styles.roleGrid}>{roles.map(([title, body, Icon, href]) => <Link className={styles.role} href={href} key={title}><span className={styles.icon}><Icon size={22} /></span><span><strong>{title}</strong><small>{body}</small></span><ArrowUpRight size={18} /></Link>)}</div>
    <div className={styles.meta}><span>OTP verified</span><span>PostgreSQL-backed</span><span>Solapur only</span></div>
    <p className={styles.copy}>Already have an account? <Link href="/auth/login">Login with Mobile OTP</Link></p>
  </section></main>;
}
