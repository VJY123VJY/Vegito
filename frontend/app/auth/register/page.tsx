"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Bike, ShoppingBag, Store } from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";

const registrationRoles = [
  {
    href: "/start-shopping",
    title: "Customer",
    description: "Shop fresh groceries and get them delivered.",
    icon: ShoppingBag,
    className: "auth-role-customer",
  },
  {
    href: "/auth/seller",
    title: "Seller",
    description: "Sell vegetables, fruits and groceries on Vegito.",
    icon: Store,
    className: "auth-role-seller",
  },
  {
    href: "/auth/delivery",
    title: "Delivery Boy",
    description: "Deliver local orders and earn with Vegito.",
    icon: Bike,
    className: "auth-role-delivery",
  },
];

export default function RegisterHubPage() {
  return (
    <main className="auth-page">
      <header className="auth-header">
        <Link href="/" className="auth-brand" aria-label="Vegito home">
          <span className="auth-brand-mark" aria-hidden="true">🥬</span>
          <span>VEGITO</span>
        </Link>
        <ThemeToggle />
      </header>

      <section className="auth-stage" aria-labelledby="register-title">
        <div className="auth-card auth-register-card">
          <Link href="/" className="auth-back-button auth-register-back">
            <ArrowLeft size={16} /> Home
          </Link>
          <div className="auth-card-heading">
            <span className="auth-eyebrow">ONE ACCOUNT. A FRESH START.</span>
            <h1 id="register-title">Create your Vegito account</h1>
            <p>Choose how you’d like to be part of your local marketplace.</p>
          </div>

          <div className="auth-role-list" aria-label="Choose an account type">
            {registrationRoles.map(({ href, title, description, icon: Icon, className }) => (
              <Link className={`auth-role-card ${className}`} href={href} key={title}>
                <span className="auth-role-icon"><Icon size={22} /></span>
                <span className="auth-role-copy">
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
                <ArrowRight size={18} className="auth-role-arrow" />
              </Link>
            ))}
          </div>

          <div className="auth-card-footer">
            <span>Already have an account?</span>
            <Link href="/auth/login">Sign in <ArrowRight size={15} /></Link>
          </div>
        </div>
        <p className="auth-trust-note">Secure sign-in and registration with your mobile number.</p>
      </section>
    </main>
  );
}
