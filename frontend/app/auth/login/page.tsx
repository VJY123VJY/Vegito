"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Store,
  Truck,
  Sparkles,
  KeyRound,
} from "lucide-react";
import {
  loginWithPassword,
  sendLoginOtp,
  verifyLoginOtp,
  saveSession,
  getRoleRedirectPath,
  type AuthRole,
} from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";

type LoginRole = "customer" | "seller" | "delivery" | "admin";

const ROLE_META: Record<
  LoginRole,
  {
    label: string;
    authRole: AuthRole;
    icon: string;
    color: string;
    bgBadge: string;
    borderBadge: string;
    demoPhone: string;
    demoPass: string;
    subtext: string;
  }
> = {
  customer: {
    label: "Customer",
    authRole: "CUSTOMER",
    icon: "👤",
    color: "#059669",
    bgBadge: "#ecfdf5",
    borderBadge: "#a7f3d0",
    demoPhone: "9309424359",
    demoPass: "test123",
    subtext: "Order fresh farm harvest directly to your doorstep",
  },
  seller: {
    label: "Seller",
    authRole: "SELLER",
    icon: "🏪",
    color: "#c2410c",
    bgBadge: "#fff7ed",
    borderBadge: "#fed7aa",
    demoPhone: "9999999991",
    demoPass: "test123",
    subtext: "Manage farm produce catalog, incoming orders & inventory",
  },
  delivery: {
    label: "Delivery Fleet",
    authRole: "DELIVERY_PARTNER",
    icon: "🚚",
    color: "#2563eb",
    bgBadge: "#eff6ff",
    borderBadge: "#bfdbfe",
    demoPhone: "9999999992",
    demoPass: "test123",
    subtext: "Real-time dispatch, route navigation & doorstep OTP delivery",
  },
  admin: {
    label: "Admin HQ",
    authRole: "ADMIN",
    icon: "🛡️",
    color: "#7c3aed",
    bgBadge: "#f5f3ff",
    borderBadge: "#ddd6fe",
    demoPhone: "9999999999",
    demoPass: "admin123",
    subtext: "Platform analytics, vendor governance & city fleet controls",
  },
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryRole = searchParams?.get("role")?.toLowerCase() as LoginRole | undefined;
  const queryPhone = searchParams?.get("phone") || "";

  const [activeRole, setActiveRole] = useState<LoginRole>(
    queryRole && ROLE_META[queryRole] ? queryRole : "customer"
  );
  const [authMethod, setAuthMethod] = useState<"password" | "otp">("password");

  // Form State
  const [phone, setPhone] = useState(queryPhone);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP State
  const [otpStage, setOtpStage] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    if (queryRole && ROLE_META[queryRole]) {
      setActiveRole(queryRole);
    }
  }, [queryRole]);

  useEffect(() => {
    if (!resendTimer) return;
    const interval = setInterval(() => {
      setResendTimer((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const meta = ROLE_META[activeRole];

  // ── PASSWORD LOGIN ────────────────────────────────────────────────────────
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const tokenRes = await loginWithPassword(cleanPhone, password, meta.authRole);
      saveSession(tokenRes);
      router.push(getRoleRedirectPath(tokenRes.role));
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── OTP LOGIN FALLBACK ────────────────────────────────────────────────────
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setInfoMsg(null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    try {
      const res = await sendLoginOtp(cleanPhone);
      setOtpStage("otp");
      setResendTimer(30);
      if (res.dev_otp) {
        setInfoMsg(`OTP sent successfully! (Dev OTP: ${res.dev_otp})`);
        setOtp(res.dev_otp);
      } else {
        setInfoMsg("OTP sent successfully to your mobile number.");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setError("Please enter the 6-digit OTP code.");
      return;
    }

    setLoading(true);
    try {
      const tokenRes = await verifyLoginOtp(phone.replace(/\D/g, ""), cleanOtp);
      // Verify role match
      if (
        meta.authRole !== "SUPER_ADMIN" &&
        tokenRes.role !== meta.authRole &&
        !(meta.authRole === "ADMIN" && tokenRes.role === "SUPER_ADMIN")
      ) {
        setError(
          `This account is registered as ${tokenRes.role.replace(
            "_",
            " "
          )}. Please select the ${tokenRes.role.replace("_", " ")} tab to login.`
        );
        setLoading(false);
        return;
      }
      saveSession(tokenRes);
      router.push(getRoleRedirectPath(tokenRes.role));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (roleKey: LoginRole) => {
    const r = ROLE_META[roleKey];
    setActiveRole(roleKey);
    setPhone(r.demoPhone);
    setPassword(r.demoPass);
    setAuthMethod("password");
    setError(null);
    setInfoMsg(null);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f3f8f4 0%, #ffffff 40%, #eef6f0 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "#ffffff",
          borderRadius: "24px",
          boxShadow: "0 10px 40px rgba(6, 60, 50, 0.08)",
          border: "1px solid #e1e8e2",
          padding: "32px 28px",
        }}
      >
        {/* Brand header */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none",
              marginBottom: "10px",
            }}
          >
            <span
              style={{
                width: "36px",
                height: "36px",
                backgroundColor: "#16835b",
                borderRadius: "10px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: "20px",
                fontWeight: 800,
              }}
            >
              🍃
            </span>
            <span
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "24px",
                fontWeight: 800,
                color: "#16382b",
                letterSpacing: "-0.5px",
              }}
            >
              Vegito
            </span>
          </Link>
          <h1
            style={{
              margin: "4px 0",
              fontSize: "22px",
              fontWeight: 800,
              color: "#1a2e26",
            }}
          >
            Sign in to Your Account
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
            {meta.subtext}
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "6px",
            backgroundColor: "#f1f5f2",
            padding: "4px",
            borderRadius: "14px",
            marginBottom: "20px",
          }}
        >
          {(Object.keys(ROLE_META) as LoginRole[]).map((roleKey) => {
            const r = ROLE_META[roleKey];
            const isSelected = activeRole === roleKey;
            return (
              <button
                key={roleKey}
                type="button"
                onClick={() => {
                  setActiveRole(roleKey);
                  setError(null);
                  setInfoMsg(null);
                }}
                style={{
                  padding: "8px 4px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: isSelected ? "#ffffff" : "transparent",
                  color: isSelected ? r.color : "#64748b",
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "2px",
                  boxShadow: isSelected ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: "15px" }}>{r.icon}</span>
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>

        {/* Error / Info messages */}
        {error && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "12px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              fontSize: "13px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              lineHeight: 1.45,
            }}
          >
            <AlertCircle size={17} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <span>{error}</span>
              {error.toLowerCase().includes("not found") && (
                <div style={{ marginTop: "6px" }}>
                  <Link
                    href={`/auth/register?role=${activeRole}`}
                    style={{
                      color: "#b91c1c",
                      fontWeight: 700,
                      textDecoration: "underline",
                      fontSize: "12.5px",
                    }}
                  >
                    Click here to Register as {meta.label} →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {infoMsg && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "12px",
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#166534",
              fontSize: "13px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* ── PASSWORD LOGIN FORM (PRIMARY) ────────────────────────── */}
        {authMethod === "password" && (
          <form onSubmit={handlePasswordLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Mobile Number
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    color: "#6b7280",
                    pointerEvents: "none",
                  }}
                >
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="Enter 10-digit mobile"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  style={{
                    width: "100%",
                    padding: "12px 14px 12px 50px",
                    borderRadius: "12px",
                    border: "1.5px solid #d1d5db",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                    letterSpacing: "0.5px",
                    fontWeight: 500,
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "#374151",
                  }}
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setAuthMethod("otp")}
                  style={{
                    background: "none",
                    border: "none",
                    color: meta.color,
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Forgot / Use OTP
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 42px 12px 14px",
                    borderRadius: "12px",
                    border: "1.5px solid #d1d5db",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#9ca3af",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: "12px",
                backgroundColor: meta.color,
                color: "#ffffff",
                border: "none",
                fontSize: "14.5px",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                marginTop: "6px",
                boxShadow: `0 4px 14px ${meta.color}40`,
                transition: "background-color 0.2s",
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In as {meta.label}</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        )}

        {/* ── OTP LOGIN FORM (FALLBACK) ────────────────────────────── */}
        {authMethod === "otp" && (
          <div>
            {otpStage === "phone" ? (
              <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Mobile Number for SMS OTP
                  </label>
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: "14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: "13.5px",
                        fontWeight: 600,
                        color: "#6b7280",
                        pointerEvents: "none",
                      }}
                    >
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="Enter 10-digit mobile"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      style={{
                        width: "100%",
                        padding: "12px 14px 12px 50px",
                        borderRadius: "12px",
                        border: "1.5px solid #d1d5db",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                        letterSpacing: "0.5px",
                        fontWeight: 500,
                      }}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "13px",
                    borderRadius: "12px",
                    backgroundColor: meta.color,
                    color: "#ffffff",
                    border: "none",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Phone size={17} />}
                  <span>Send Login OTP</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <label style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151" }}>
                      Enter 6-Digit OTP
                    </label>
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>
                      Sent to +91 {phone}
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      border: "1.5px solid #d1d5db",
                      fontSize: "16px",
                      textAlign: "center",
                      letterSpacing: "4px",
                      fontWeight: 700,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "13px",
                    borderRadius: "12px",
                    backgroundColor: meta.color,
                    color: "#ffffff",
                    border: "none",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={17} />}
                  <span>Verify &amp; Enter Dashboard</span>
                </button>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => setOtpStage("phone")}
                    style={{ background: "none", border: "none", color: "#64748b", fontSize: "12px", cursor: "pointer", padding: 0 }}
                  >
                    Change Number
                  </button>
                  <button
                    type="button"
                    disabled={resendTimer > 0 || loading}
                    onClick={() => handleSendOtp()}
                    style={{
                      background: "none",
                      border: "none",
                      color: resendTimer > 0 ? "#94a3b8" : meta.color,
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: resendTimer > 0 ? "default" : "pointer",
                      padding: 0,
                    }}
                  >
                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                  </button>
                </div>
              </form>
            )}

            <div style={{ textAlign: "center", marginTop: "14px" }}>
              <button
                type="button"
                onClick={() => setAuthMethod("password")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  fontSize: "12.5px",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Back to Password Login
              </button>
            </div>
          </div>
        )}

        {/* Register redirection */}
        {activeRole !== "admin" && (
          <div
            style={{
              marginTop: "20px",
              paddingTop: "16px",
              borderTop: "1px solid #f1f5f9",
              textAlign: "center",
              fontSize: "13px",
              color: "#64748b",
            }}
          >
            <span>Don&apos;t have a {meta.label} account? </span>
            <Link
              href={`/auth/register?role=${activeRole}`}
              style={{
                color: meta.color,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Register here
            </Link>
          </div>
        )}

        {/* ── QUICK DEMO LOGINS ────────────────────────────────────── */}
        <div
          style={{
            marginTop: "22px",
            backgroundColor: "#f8fafc",
            borderRadius: "16px",
            padding: "14px",
            border: "1px dashed #cbd5e1",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11.5px",
              fontWeight: 700,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "10px",
            }}
          >
            <Sparkles size={14} color="#f59e0b" />
            <span>Fast Demo Test Logins</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "8px",
            }}
          >
            {(Object.keys(ROLE_META) as LoginRole[]).map((rKey) => {
              const r = ROLE_META[rKey];
              return (
                <button
                  key={rKey}
                  type="button"
                  onClick={() => handleQuickFill(rKey)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "10px",
                    border: `1px solid ${r.borderBadge}`,
                    backgroundColor: r.bgBadge,
                    color: r.color,
                    fontSize: "11.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    textAlign: "left",
                  }}
                >
                  <span>{r.icon}</span>
                  <div>
                    <div style={{ lineHeight: 1.1 }}>{r.label}</div>
                    <div style={{ fontSize: "10px", opacity: 0.8, fontWeight: 500 }}>
                      {r.demoPhone.slice(0, 5)}...
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", backgroundColor: "#f3f8f4" }} />}>
      <LoginContent />
    </Suspense>
  );
}
