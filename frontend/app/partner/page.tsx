"use client";

import React from "react";
import Link from "next/link";
import {
  Store,
  Bike,
  CheckCircle2,
  TrendingUp,
  Clock,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  MapPin,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";

export default function PartnerHubPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--vegito-bg, #f8faf7)",
        color: "var(--vegito-text-main, #12221e)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          width: "100%",
          maxWidth: "1140px",
          margin: "0 auto",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/auth"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "#62746a",
            textDecoration: "none",
            fontSize: "13.5px",
            fontWeight: 700,
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>

        <ThemeToggle />
      </header>

      {/* Main Content */}
      <section
        style={{
          width: "100%",
          maxWidth: "960px",
          margin: "0 auto",
          padding: "20px 24px 60px",
        }}
      >
        {/* Hero Section */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "999px",
              fontSize: "12.5px",
              fontWeight: 800,
              color: "#166534",
              marginBottom: "16px",
            }}
          >
            <MapPin size={14} color="#16a34a" />
            <span>Solapur Partner Network</span>
          </div>

          <h1
            style={{
              fontSize: "clamp(30px, 5vw, 42px)",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              color: "#063c32",
              lineHeight: 1.2,
              margin: "0 0 14px",
            }}
          >
            Grow with Vegito in Solapur
          </h1>
          <p
            style={{
              fontSize: "16px",
              lineHeight: 1.6,
              color: "#62746a",
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            Join Solapur’s hyper-local farm-to-table commerce ecosystem. Partner with
            us as a grocery store, mandi farmer, or delivery fleet partner.
          </p>
        </div>

        {/* Two Main Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
            marginBottom: "48px",
          }}
        >
          {/* Card 1: SELL ON VEGITO */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              border: "1.5px solid #fed7aa",
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 8px 30px rgba(194, 65, 12, 0.06)",
            }}
          >
            <div>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "16px",
                  backgroundColor: "#fff7ed",
                  color: "#ea580c",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "20px",
                }}
              >
                <Store size={26} />
              </div>

              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#ea580c",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Local Store &amp; Mandi Sellers
              </span>
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  color: "#7c2d12",
                  margin: "6px 0 12px",
                }}
              >
                Sell on Vegito
              </h2>
              <p
                style={{
                  fontSize: "14px",
                  color: "#62746a",
                  lineHeight: 1.55,
                  margin: "0 0 24px",
                }}
              >
                List your fresh vegetables, fruits, groceries and daily provisions.
                Reach thousands of Solapur households with 15-minute fulfillment.
              </p>

              {/* Benefits list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
                {[
                  "Zero platform onboarding fee",
                  "Direct daily settlements to your bank account",
                  "Live digital catalog & inventory management",
                  "Vegito delivery fleet handles doorstep deliveries",
                ].map((b, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px" }}>
                    <CheckCircle2 size={16} color="#16835b" style={{ flexShrink: 0 }} />
                    <span style={{ color: "#1e293b", fontWeight: 600 }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Link
                href="/auth/seller"
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  backgroundColor: "#ea580c",
                  color: "#ffffff",
                  borderRadius: "14px",
                  fontSize: "15px",
                  fontWeight: 800,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(234, 88, 12, 0.25)",
                  marginBottom: "12px",
                }}
              >
                <span>Register Store Now</span>
                <ArrowRight size={17} />
              </Link>

              <div style={{ textAlign: "center", fontSize: "12.5px", color: "#62746a" }}>
                Already registered?{" "}
                <Link
                  href="/auth/login"
                  style={{ color: "#ea580c", fontWeight: 700, textDecoration: "none" }}
                >
                  Seller Login
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: DELIVER WITH VEGITO */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              border: "1.5px solid #bfdbfe",
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 8px 30px rgba(37, 99, 235, 0.06)",
            }}
          >
            <div>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "16px",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "20px",
                }}
              >
                <Bike size={26} />
              </div>

              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#2563eb",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Delivery Fleet &amp; Riders
              </span>
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  color: "#1e3a8a",
                  margin: "6px 0 12px",
                }}
              >
                Deliver with Vegito
              </h2>
              <p
                style={{
                  fontSize: "14px",
                  color: "#62746a",
                  lineHeight: 1.55,
                  margin: "0 0 24px",
                }}
              >
                Earn competitive payouts delivering farm-fresh grocery orders
                in your own neighborhood. Work full-time or flexible part-time hours.
              </p>

              {/* Benefits list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
                {[
                  "Weekly payouts directly into bank / UPI",
                  "Flexible working slots (morning / evening)",
                  "Peak-hour bonuses & fuel incentives",
                  "Instant delivery assignment within 15 km",
                ].map((b, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px" }}>
                    <CheckCircle2 size={16} color="#16835b" style={{ flexShrink: 0 }} />
                    <span style={{ color: "#1e293b", fontWeight: 600 }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Link
                href="/auth/delivery"
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  borderRadius: "14px",
                  fontSize: "15px",
                  fontWeight: 800,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.25)",
                  marginBottom: "12px",
                }}
              >
                <span>Join Delivery Fleet</span>
                <ArrowRight size={17} />
              </Link>

              <div style={{ textAlign: "center", fontSize: "12.5px", color: "#62746a" }}>
                Already a rider?{" "}
                <Link
                  href="/auth/login"
                  style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none" }}
                >
                  Rider Login
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Network Stats Banner */}
        <div
          style={{
            backgroundColor: "#063c32",
            borderRadius: "20px",
            padding: "24px 32px",
            color: "#ffffff",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "24px",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#a7f3d0" }}>15 Mins</div>
            <div style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.7)", marginTop: "4px" }}>
              Avg. Delivery Time
            </div>
          </div>
          <div>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#a7f3d0" }}>100%</div>
            <div style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.7)", marginTop: "4px" }}>
              Solapur Mandi Sourced
            </div>
          </div>
          <div>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#a7f3d0" }}>₹ 0</div>
            <div style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.7)", marginTop: "4px" }}>
              Joining / Registration Fee
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
