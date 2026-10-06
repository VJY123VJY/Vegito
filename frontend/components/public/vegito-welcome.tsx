"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  LogIn,
  Store,
  Bike,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  getAuthToken,
  getStoredRole,
  getRoleRedirectPath,
  type AuthRole,
} from "@/lib/api/auth";
import { ThemeToggle } from "@/components/common/theme-toggle";

export function VegitoWelcome() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    const role = getStoredRole();
    if (token && role) {
      router.replace(getRoleRedirectPath(role));
    } else {
      setCheckingAuth(false);
    }
  }, [router]);

  if (checkingAuth) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--vegito-bg, #f8faf7)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <span style={{ fontSize: "40px" }}>🥬</span>
          <p style={{ marginTop: "12px", color: "#62746a", fontWeight: 600 }}>
            Loading Vegito...
          </p>
        </div>
      </div>
    );
  }

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
      {/* Top Header */}
      <header
        style={{
          width: "100%",
          maxWidth: "1040px",
          margin: "0 auto",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "28px" }}>🥬</span>
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
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Welcome Container */}
      <section
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "520px",
          margin: "0 auto",
          padding: "36px 20px 48px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* Brand Icon + Name */}
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "24px",
            backgroundColor: "#ecfdf5",
            border: "1.5px solid #a7f3d0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "36px",
            marginBottom: "20px",
            boxShadow: "0 6px 16px rgba(16, 185, 129, 0.12)",
          }}
        >
          🥬
        </div>

        <h1
          style={{
            fontSize: "clamp(32px, 6vw, 42px)",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: "#063c32",
            lineHeight: 1.15,
            margin: "0 0 10px",
          }}
        >
          VEGITO 🥬
        </h1>

        <p
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "#16835b",
            margin: "0 0 32px",
          }}
        >
          Fresh groceries. Fast delivery.
        </p>

        {/* Primary Customer CTA: Start Shopping */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "14px" }}>
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
              transition: "transform 0.15s ease",
            }}
          >
            <ShoppingBag size={20} />
            <span>Start Shopping</span>
            <ArrowRight size={18} />
          </Link>

          {/* Already have an account? Login */}
          <div
            style={{
              marginTop: "8px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontSize: "14px",
              color: "#62746a",
            }}
          >
            <span>Already have an account?</span>
            <Link
              href="/auth/login"
              style={{
                color: "#16835b",
                fontWeight: 800,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <LogIn size={15} />
              <span>Login</span>
            </Link>
          </div>
        </div>

        {/* Partner Section Divider */}
        <div
          style={{
            width: "100%",
            position: "relative",
            margin: "20px 0 24px",
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
              padding: "0 14px",
              backgroundColor: "var(--vegito-bg, #f8faf7)",
              fontSize: "12px",
              fontWeight: 800,
              color: "#62746a",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Partner with Vegito
          </span>
        </div>

        {/* Partner Buttons */}
        <div
          style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          {/* Sell on Vegito */}
          <Link
            href="/auth/seller"
            style={{
              padding: "16px 14px",
              backgroundColor: "#ffffff",
              border: "1.5px solid #fed7aa",
              borderRadius: "16px",
              textDecoration: "none",
              color: "#063c32",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 3px 10px rgba(194, 65, 12, 0.05)",
              transition: "transform 0.15s ease",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                backgroundColor: "#fff7ed",
                color: "#c2410c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Store size={20} />
            </div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#9a3412" }}>
              Sell on Vegito
            </div>
            <div style={{ fontSize: "11px", color: "#62746a", textAlign: "center" }}>
              Shop &amp; farm owners
            </div>
          </Link>

          {/* Deliver with Vegito */}
          <Link
            href="/auth/delivery"
            style={{
              padding: "16px 14px",
              backgroundColor: "#ffffff",
              border: "1.5px solid #bfdbfe",
              borderRadius: "16px",
              textDecoration: "none",
              color: "#063c32",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 3px 10px rgba(29, 78, 216, 0.05)",
              transition: "transform 0.15s ease",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                backgroundColor: "#eff6ff",
                color: "#1d4ed8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bike size={20} />
            </div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#1e40af" }}>
              Deliver with Vegito
            </div>
            <div style={{ fontSize: "11px", color: "#62746a", textAlign: "center" }}>
              Flexible delivery partner
            </div>
          </Link>
        </div>

        {/* Feature Badges */}
        <div
          style={{
            marginTop: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px",
            fontSize: "12px",
            color: "#62746a",
            fontWeight: 600,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <Clock size={14} color="#16835b" />
            <span>Fast Delivery</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <Sparkles size={14} color="#16835b" />
            <span>Farm Fresh Produce</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <ShieldCheck size={14} color="#16835b" />
            <span>Direct from Mandi</span>
          </div>
        </div>
      </section>
    </main>
  );
}
