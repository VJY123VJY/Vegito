"use client";

import Link from "next/link";
import { ArrowRight, Package, ShieldCheck, Truck } from "lucide-react";

const cards = [
  {
    title: "I'M A CUSTOMER",
    body: "Buy fresh vegetables from trusted local sellers.",
    href: "/auth/customer",
    icon: Package,
  },
  {
    title: "I'M A SELLER",
    body: "Sell vegetables and manage your business on Vegito.",
    href: "/auth/seller",
    icon: ShieldCheck,
  },
  {
    title: "I'M A DELIVERY PARTNER",
    body: "Deliver orders and earn with daily fulfilment tasks.",
    href: "/auth/delivery",
    icon: Truck,
  },
];

export default function RegisterChoicePage() {
  return (
    <main className="auth-page">
      <section style={{ width: "min(100%, 720px)" }}>
        <p className="section-kicker">JOIN VEGITO</p>
        <h1>How will you use Vegito?</h1>
        <p>Choose the role that matches how you want to shop, sell, or deliver.</p>

        <div style={{ display: "grid", gap: 16, marginTop: 28 }}>
          {cards.map(({ title, body, href, icon: Icon }) => (
            <Link key={title} href={href} className="primary-action" style={{ justifyContent: "space-between", width: "100%", padding: "18px 20px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ display: "grid", placeItems: "center", width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.14)" }}>
                  <Icon size={18} />
                </span>
                <span style={{ textAlign: "left" }}>
                  <strong style={{ display: "block", fontSize: 15, letterSpacing: 0.4 }}>{title}</strong>
                  <small style={{ display: "block", marginTop: 4, opacity: 0.85, fontSize: 12 }}>{body}</small>
                </span>
              </span>
              <ArrowRight size={18} />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
