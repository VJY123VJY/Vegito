"use client";

import React from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Store,
  Bike,
  ArrowRight,
  LogIn,
} from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";

export default function RegisterHubPage() {
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
      <header
        style={{
          width: "100%",
          maxWidth: "800px",
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
          <span style={{ fontSize: "26px" }}>🥬</span>
          <span
            style={{
              fontSize: "20px",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: "#063c32",
            }}
          >
            VEGITO
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <div
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "460px",
          margin: "0 auto",
          padding: "24px 20px 48px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "24px",
            border: "1.5px solid #dce8df",
            padding: "32px 28px",
            boxShadow: "0 10px 30px rgba(6, 60, 50, 0.05)",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: "36px" }}>🥬</span>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 900,
              color: "#063c32",
              margin: "12px 0 6px",
            }}
          >
            Create your Vegito account
          </h1>
          <p style={{ fontSize: "14px", color: "#62746a", margin: "0 0 28px" }}>
            Choose how you'd like to use Vegito
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", textAlign: "left" }}>
            {/* Customer: Start Shopping */}
            <Link
              href="/start-shopping"
              style={{
                padding: "18px 20px",
                backgroundColor: "#ecfdf5",
                border: "1.5px solid #a7f3d0",
                borderRadius: "16px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    backgroundColor: "#16835b",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ShoppingBag size={22} />
                </div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#065f46" }}>
                    Start Shopping
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#62746a" }}>
                    Order fresh farm produce &amp; groceries
                  </div>
                </div>
              </div>
              <ArrowRight size={18} color="#059669" />
            </Link>

            {/* Seller: Sell on Vegito */}
            <Link
              href="/auth/seller"
              style={{
                padding: "18px 20px",
                backgroundColor: "#fff7ed",
                border: "1.5px solid #fed7aa",
                borderRadius: "16px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    backgroundColor: "#c2410c",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Store size={22} />
                </div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#9a3412" }}>
                    Sell on Vegito
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#62746a" }}>
                    For farmers, vendors &amp; shop owners
                  </div>
                </div>
              </div>
              <ArrowRight size={18} color="#c2410c" />
            </Link>

            {/* Delivery Partner: Deliver with Vegito */}
            <Link
              href="/auth/delivery"
              style={{
                padding: "18px 20px",
                backgroundColor: "#eff6ff",
                border: "1.5px solid #bfdbfe",
                borderRadius: "16px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    backgroundColor: "#1d4ed8",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Bike size={22} />
                </div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#1e40af" }}>
                    Deliver with Vegito
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#62746a" }}>
                    Earn with local order deliveries
                  </div>
                </div>
              </div>
              <ArrowRight size={18} color="#1d4ed8" />
            </Link>
          </div>

          <div
            style={{
              marginTop: "28px",
              paddingTop: "20px",
              borderTop: "1px solid #f1f5f9",
              fontSize: "13.5px",
              color: "#62746a",
            }}
          >
            Already have an account?{" "}
            <Link
              href="/auth/login"
              style={{
                color: "#16835b",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
