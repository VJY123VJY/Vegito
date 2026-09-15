"use client";

import Link from "next/link";
import { ArrowRight, Bike, Package, ShieldCheck } from "lucide-react";

const cards = [
  { title: "Customer Login", body: "Shop fresh produce and manage deliveries.", href: "/auth/login/customer", icon: Package },
  { title: "Seller Login", body: "Manage product listings, orders, and inventory.", href: "/auth/login/seller", icon: ShieldCheck },
  { title: "Delivery Partner Login", body: "Track assignments and deliver orders quickly.", href: "/auth/login/delivery", icon: Bike },
];

export default function LoginChoicePage() {
  return (
    <main className="auth-page">
      <section style={{ width: "min(100%, 720px)" }}>
        <p className="section-kicker">LOGIN TO VEGITO</p>
        <h1>Choose your role</h1>
        <p>Each role has its own secure dashboard and work area.</p>
        <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
          {cards.map(({ title, body, href, icon: Icon }) => (
            <Link key={title} href={href} className="primary-action" style={{ justifyContent: "space-between", width: "100%", padding: "18px 20px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ display: "grid", placeItems: "center", width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.14)" }}>
                  <Icon size={18} />
                </span>
                <span style={{ textAlign: "left" }}>
                  <strong style={{ display: "block", fontSize: 15 }}>{title}</strong>
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
