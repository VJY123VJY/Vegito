"use client";

import React from "react";
import Link from "next/link";
import {
  ShoppingBag,
  LogIn,
  Store,
  Bike,
  Sparkles,
  MapPin,
  Clock,
  ShieldCheck,
  ArrowRight,
  Leaf,
  ChevronRight,
} from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { useTranslation } from "@/context/i18n-context";

export default function AuthLandingPage() {
  const { language, setLanguage, t } = useTranslation();

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
      {/* Top Header Bar */}
      <header
        style={{
          width: "100%",
          maxWidth: "1140px",
          margin: "0 auto",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <span style={{ fontSize: "28px" }}>🥬</span>
          <div>
            <span
              style={{
                fontSize: "22px",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                color: "#063c32",
              }}
            >
              VEGITO
            </span>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 800,
                color: "#16835b",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Solapur Direct
            </div>
          </div>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Language Switcher */}
          <div
            style={{
              display: "flex",
              backgroundColor: "rgba(10, 77, 60, 0.06)",
              borderRadius: "12px",
              padding: "3px",
              gap: "2px",
            }}
          >
            {(["en", "mr", "hi"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                style={{
                  padding: "4px 8px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: language === lang ? "#0a4d3c" : "transparent",
                  color: language === lang ? "#ffffff" : "#62746a",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {lang === "en" ? "EN" : lang === "mr" ? "मराठी" : "हिन्दी"}
              </button>
            ))}
          </div>

          <ThemeToggle />
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "680px",
          margin: "0 auto",
          padding: "32px 20px 48px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* City & Feature Pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            backgroundColor: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: "999px",
            fontSize: "12.5px",
            fontWeight: 800,
            color: "#065f46",
            marginBottom: "20px",
            boxShadow: "0 2px 8px rgba(6, 95, 70, 0.06)",
          }}
        >
          <MapPin size={14} color="#059669" />
          <span>Solapur, Maharashtra · 15 Min Delivery</span>
        </div>

        {/* Brand Headline */}
        <h1
          style={{
            fontSize: "clamp(34px, 7vw, 48px)",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: "#063c32",
            lineHeight: 1.15,
            margin: "0 0 12px",
          }}
        >
          VEGITO <span style={{ fontSize: "0.9em" }}>🥬</span>
          <br />
          <span style={{ color: "#16835b" }}>Fresh groceries.</span> Fast delivery.
        </h1>

        <p
          style={{
            fontSize: "16px",
            lineHeight: 1.55,
            color: "#4a5d53",
            maxWidth: "520px",
            margin: "0 0 32px",
          }}
        >
          Crisp farm vegetables, fruits, dairy &amp; daily staples straight from Solapur
          mandis to your doorstep in 15 minutes.
        </p>

        {/* Primary Customer Actions */}
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginBottom: "40px",
          }}
        >
          {/* Start Shopping — Main Customer Journey */}
          <Link
            href="/start-shopping"
            style={{
              width: "100%",
              padding: "16px 24px",
              backgroundColor: "#16835b",
              color: "#ffffff",
              borderRadius: "16px",
              fontSize: "16px",
              fontWeight: 800,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              boxShadow: "0 6px 20px rgba(22, 131, 91, 0.28)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
          >
            <ShoppingBag size={20} />
            <span>Start Shopping</span>
            <ArrowRight size={18} />
          </Link>

          {/* Login with Mobile OTP */}
          <Link
            href="/auth/login"
            style={{
              width: "100%",
              padding: "14px 24px",
              backgroundColor: "#ffffff",
              color: "#063c32",
              border: "1.5px solid #dce8df",
              borderRadius: "16px",
              fontSize: "15px",
              fontWeight: 700,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
              transition: "all 0.15s ease",
            }}
          >
            <LogIn size={18} color="#16835b" />
            <span>Login with Mobile Number</span>
          </Link>
        </div>

        {/* Partner Section Divider */}
        <div
          style={{
            width: "100%",
            maxWidth: "520px",
            position: "relative",
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              right: 0,
              height: "1px",
              backgroundColor: "#dce8df",
            }}
          />
          <span
            style={{
              position: "relative",
              padding: "0 16px",
              backgroundColor: "var(--vegito-bg, #f8faf7)",
              fontSize: "13px",
              fontWeight: 800,
              color: "#62746a",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Are you a partner?
          </span>
        </div>

        {/* Partner Cards Grid */}
        <div
          style={{
            width: "100%",
            maxWidth: "520px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "14px",
            marginBottom: "36px",
          }}
        >
          {/* Sell on Vegito */}
          <Link
            href="/auth/seller"
            style={{
              padding: "18px 20px",
              backgroundColor: "#ffffff",
              border: "1.5px solid #fed7aa",
              borderRadius: "18px",
              textDecoration: "none",
              color: "inherit",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "0 4px 14px rgba(194, 65, 12, 0.06)",
              transition: "transform 0.15s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  backgroundColor: "#fff7ed",
                  color: "#c2410c",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Store size={18} />
              </div>
              <ChevronRight size={18} color="#c2410c" />
            </div>

            <div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#9a3412" }}>
                Sell on Vegito
              </div>
              <div style={{ fontSize: "12px", color: "#62746a", marginTop: "2px" }}>
                List vegetables &amp; groceries. Instant settlements &amp; high volume.
              </div>
            </div>
          </Link>

          {/* Deliver with Vegito */}
          <Link
            href="/auth/delivery"
            style={{
              padding: "18px 20px",
              backgroundColor: "#ffffff",
              border: "1.5px solid #bfdbfe",
              borderRadius: "18px",
              textDecoration: "none",
              color: "inherit",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.06)",
              transition: "transform 0.15s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bike size={18} />
              </div>
              <ChevronRight size={18} color="#2563eb" />
            </div>

            <div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#1d4ed8" }}>
                Deliver with Vegito
              </div>
              <div style={{ fontSize: "12px", color: "#62746a", marginTop: "2px" }}>
                Deliver in your neighborhood. Flexible hours &amp; weekly payouts.
              </div>
            </div>
          </Link>
        </div>

        {/* Partner Hub link */}
        <Link
          href="/partner"
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#16835b",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            marginBottom: "36px",
          }}
        >
          <span>Explore Vegito Partner Programs</span>
          <ArrowRight size={14} />
        </Link>

        {/* City Trust Badges */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "20px",
            paddingTop: "20px",
            borderTop: "1px solid #edf2ee",
            width: "100%",
            maxWidth: "560px",
            color: "#62746a",
            fontSize: "12.5px",
            fontWeight: 600,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Clock size={16} color="#16835b" />
            <span>15-Min Fast Delivery</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Leaf size={16} color="#16835b" />
            <span>100% Farm Fresh Mandi Produce</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ShieldCheck size={16} color="#16835b" />
            <span>Verified Local Sellers</span>
          </div>
        </div>
      </section>
    </main>
  );
}
