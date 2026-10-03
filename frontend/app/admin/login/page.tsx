"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { loginWithPassword, saveSession } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import { ThemeToggle } from "@/components/common/theme-toggle";

export default function AdminLoginPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit registered mobile number.");
      return;
    }
    if (!password) {
      setError("Please enter your administrator password.");
      return;
    }

    setLoading(true);

    try {
      const res = await loginWithPassword(cleanPhone, password, "ADMIN");

      // Verify that this user is indeed an ADMIN or SUPER_ADMIN
      const userRoles = res.authorized_roles || [res.role];
      const hasAdmin = userRoles.includes("ADMIN") || userRoles.includes("SUPER_ADMIN") || res.role === "ADMIN" || res.role === "SUPER_ADMIN";

      if (!hasAdmin) {
        setError("Access denied. This portal is strictly restricted to authorized platform administrators.");
        setLoading(false);
        return;
      }

      saveSession(res);
      router.push("/admin");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#062820",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Top Header */}
      <header
        style={{
          width: "100%",
          maxWidth: "480px",
          margin: "0 auto",
          padding: "20px 24px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldCheck size={20} color="#34d399" />
          <span
            style={{
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#34d399",
            }}
          >
            VEGITO SECURITY PORTAL
          </span>
        </div>

        <ThemeToggle />
      </header>

      {/* Main Login Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          margin: "32px auto",
          padding: "0 20px",
        }}
      >
        <div
          style={{
            backgroundColor: "#09362c",
            borderRadius: "24px",
            border: "1px solid rgba(52, 211, 153, 0.2)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
            padding: "32px 26px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "16px",
                backgroundColor: "rgba(52, 211, 153, 0.15)",
                color: "#34d399",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "14px",
              }}
            >
              <Lock size={24} />
            </div>

            <h1
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color: "#ffffff",
                margin: "0 0 6px",
                letterSpacing: "-0.01em",
              }}
            >
              Admin HQ Authentication
            </h1>
            <p style={{ margin: 0, fontSize: "13px", color: "rgba(255, 255, 255, 0.65)" }}>
              Platform management &amp; governance console
            </p>
          </div>

          {error && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "12px",
                backgroundColor: "rgba(220, 38, 38, 0.2)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                color: "#fca5a5",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "20px",
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin}>
            {/* Phone */}
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  color: "rgba(255, 255, 255, 0.85)",
                  marginBottom: "6px",
                }}
              >
                Administrator Mobile Number
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "14px",
                  padding: "2px 14px",
                }}
              >
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#34d399",
                    marginRight: "8px",
                  }}
                >
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 10-digit number"
                  autoFocus
                  style={{
                    width: "100%",
                    height: "46px",
                    border: "none",
                    background: "transparent",
                    outline: "none",
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#ffffff",
                    letterSpacing: "0.04em",
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  color: "rgba(255, 255, 255, 0.85)",
                  marginBottom: "6px",
                }}
              >
                Password
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "14px",
                  padding: "2px 14px",
                }}
              >
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: "100%",
                    height: "46px",
                    border: "none",
                    background: "transparent",
                    outline: "none",
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#ffffff",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.5)",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || phone.replace(/\D/g, "").length !== 10 || !password}
              style={{
                width: "100%",
                padding: "15px 20px",
                backgroundColor: "#10b981",
                color: "#ffffff",
                border: "none",
                borderRadius: "14px",
                fontSize: "15px",
                fontWeight: 800,
                cursor: loading ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 18px rgba(16, 185, 129, 0.35)",
              }}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <span>Sign In to Admin HQ</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <div
            style={{
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              textAlign: "center",
              fontSize: "12px",
              color: "rgba(255, 255, 255, 0.5)",
            }}
          >
            Authorized access only · Solapur City Operation Fleet Controls
          </div>
        </div>
      </div>

      <div style={{ height: "20px" }} />
    </main>
  );
}
