"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Phone,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Store,
  Bike,
  ShoppingBag,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  sendLoginOtp,
  verifyLoginOtp,
  loginWithPassword,
  saveSession,
  getRoleRedirectPath,
  switchWorkspace,
  type AuthRole,
  type TokenResponse,
} from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import { ThemeToggle } from "@/components/common/theme-toggle";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryPhone = searchParams?.get("phone") || "";

  // Stages: "phone" -> "otp" -> "workspace_select" (if account has multiple authorized roles)
  const [stage, setStage] = useState<"phone" | "otp" | "workspace_select">("phone");
  const [phone, setPhone] = useState(queryPhone);
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Multi-role session state
  const [multiRoleSession, setMultiRoleSession] = useState<TokenResponse | null>(null);

  // Optional password fallback
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!resendTimer) return;
    const interval = setInterval(() => {
      setResendTimer((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // ── STEP 1: SEND LOGIN OTP ────────────────────────────────────────────────
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setInfoMsg(null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    try {
      const res = await sendLoginOtp(cleanPhone);
      setStage("otp");
      setResendTimer(45);
      if (res?.dev_otp) {
        setInfoMsg(`OTP sent! (Dev Auto-fill: ${res.dev_otp})`);
        setOtp(res.dev_otp);
      } else {
        setInfoMsg(`We sent a 6-digit verification code to +91 ${cleanPhone}`);
      }
    } catch (err: any) {
      const msg = getErrorMessage(err);
      if (msg.toLowerCase().includes("not found")) {
        setError("Account not found. Please click 'Start Shopping' or partner registration below.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 2: VERIFY OTP & AUTOMATIC ROLE ROUTING ───────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setError("Please enter the 6-digit OTP code.");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    setLoading(true);

    try {
      const tokenRes = await verifyLoginOtp(cleanPhone, cleanOtp);
      saveSession(tokenRes);

      const authorizedRoles = tokenRes.authorized_roles || [tokenRes.role];

      // Section 12: Same account Seller + Delivery Partner
      const hasSeller = authorizedRoles.includes("SELLER");
      const hasDelivery = authorizedRoles.includes("DELIVERY_PARTNER");
      if (hasSeller && hasDelivery && authorizedRoles.length > 1) {
        setMultiRoleSession(tokenRes);
        setStage("workspace_select");
        return;
      }

      // Section 11: Route automatically by authorized role
      const redirectParam = searchParams?.get("redirect");
      if (tokenRes.role === "CUSTOMER") {
        router.push(redirectParam || "/customer");
      } else if (tokenRes.role === "SELLER") {
        router.push("/seller");
      } else if (tokenRes.role === "DELIVERY_PARTNER") {
        router.push("/delivery");
      } else if (tokenRes.role === "ADMIN" || tokenRes.role === "SUPER_ADMIN") {
        router.push("/admin");
      } else {
        setError("Your account role could not be determined. Please contact support.");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── OPTIONAL PASSWORD LOGIN ───────────────────────────────────────────────
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const tokenRes = await loginWithPassword(cleanPhone, password);
      saveSession(tokenRes);

      const authorizedRoles = tokenRes.authorized_roles || [tokenRes.role];

      if (authorizedRoles.includes("SELLER") && authorizedRoles.includes("DELIVERY_PARTNER")) {
        setMultiRoleSession(tokenRes);
        setStage("workspace_select");
        return;
      }

      const redirectParam = searchParams?.get("redirect");
      if (tokenRes.role === "CUSTOMER" && redirectParam) {
        router.push(redirectParam);
      } else {
        router.push(getRoleRedirectPath(tokenRes.role));
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── WORKSPACE SELECTION (SELLER vs DELIVERY) ─────────────────────────────
  const handleChooseWorkspace = async (targetRole: AuthRole) => {
    setLoading(true);
    try {
      if (multiRoleSession?.role !== targetRole) {
        await switchWorkspace(targetRole);
      }
      router.push(getRoleRedirectPath(targetRole));
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

      {/* Main Card Container */}
      <div
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "440px",
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
          }}
        >
          {/* Feedback Alerts */}
          {error && (
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "12px",
                color: "#b91c1c",
                fontSize: "13.5px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "20px",
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {infoMsg && (
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: "#ecfdf5",
                border: "1px solid #a7f3d0",
                borderRadius: "12px",
                color: "#065f46",
                fontSize: "13.5px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "20px",
              }}
            >
              <CheckCircle2 size={16} />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              STAGE 1: SIMPLE MOBILE LOGIN
          ════════════════════════════════════════════════════════════════════ */}
          {stage === "phone" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "28px" }}>
                <h1
                  style={{
                    fontSize: "26px",
                    fontWeight: 900,
                    color: "#063c32",
                    margin: "0 0 6px",
                  }}
                >
                  Welcome back 👋
                </h1>
                <p style={{ fontSize: "14px", color: "#62746a", margin: 0 }}>
                  Enter your mobile number to continue
                </p>
              </div>

              {!usePassword ? (
                /* OTP Login Form */
                <form onSubmit={handleSendOtp}>
                  <div style={{ marginBottom: "20px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#12221e",
                        marginBottom: "8px",
                      }}
                    >
                      Mobile number
                    </label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        border: "1.5px solid #dce8df",
                        borderRadius: "14px",
                        padding: "4px 14px",
                        backgroundColor: "#fcfdfc",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "15px",
                          fontWeight: 700,
                          color: "#16835b",
                          marginRight: "8px",
                        }}
                      >
                        +91
                      </span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Mobile number"
                        maxLength={10}
                        autoFocus
                        required
                        style={{
                          flex: 1,
                          border: "none",
                          outline: "none",
                          fontSize: "15px",
                          fontWeight: 600,
                          backgroundColor: "transparent",
                          padding: "10px 0",
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || phone.replace(/\D/g, "").length !== 10}
                    style={{
                      width: "100%",
                      padding: "14px",
                      backgroundColor: "#16835b",
                      color: "#ffffff",
                      borderRadius: "14px",
                      border: "none",
                      fontSize: "15px",
                      fontWeight: 800,
                      cursor: loading ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      opacity: phone.replace(/\D/g, "").length === 10 ? 1 : 0.6,
                      boxShadow: "0 4px 14px rgba(22, 131, 91, 0.2)",
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue with OTP</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Password Login Form */
                <form onSubmit={handlePasswordLogin}>
                  <div style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#12221e",
                        marginBottom: "6px",
                      }}
                    >
                      Mobile number
                    </label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        border: "1.5px solid #dce8df",
                        borderRadius: "14px",
                        padding: "4px 14px",
                        backgroundColor: "#fcfdfc",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "15px",
                          fontWeight: 700,
                          color: "#16835b",
                          marginRight: "8px",
                        }}
                      >
                        +91
                      </span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Mobile number"
                        maxLength={10}
                        required
                        style={{
                          flex: 1,
                          border: "none",
                          outline: "none",
                          fontSize: "15px",
                          fontWeight: 600,
                          backgroundColor: "transparent",
                          padding: "10px 0",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: "20px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#12221e",
                        marginBottom: "6px",
                      }}
                    >
                      Password
                    </label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        border: "1.5px solid #dce8df",
                        borderRadius: "14px",
                        padding: "4px 14px",
                        backgroundColor: "#fcfdfc",
                      }}
                    >
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        required
                        style={{
                          flex: 1,
                          border: "none",
                          outline: "none",
                          fontSize: "15px",
                          fontWeight: 600,
                          backgroundColor: "transparent",
                          padding: "10px 0",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#62746a" }}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || phone.replace(/\D/g, "").length !== 10 || !password}
                    style={{
                      width: "100%",
                      padding: "14px",
                      backgroundColor: "#16835b",
                      color: "#ffffff",
                      borderRadius: "14px",
                      border: "none",
                      fontSize: "15px",
                      fontWeight: 800,
                      cursor: loading ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Logging in...</span>
                      </>
                    ) : (
                      <>
                        <span>Login</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Toggle OTP vs Password */}
              <div style={{ textAlign: "center", marginTop: "14px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setUsePassword(!usePassword);
                    setError(null);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#16835b",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {usePassword ? "Login with OTP instead" : "Login with Password instead"}
                </button>
              </div>

              {/* Divider */}
              <div
                style={{
                  margin: "24px 0 20px",
                  position: "relative",
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
                    backgroundColor: "#e2e8f0",
                  }}
                />
                <span
                  style={{
                    position: "relative",
                    padding: "0 12px",
                    backgroundColor: "#ffffff",
                    fontSize: "12px",
                    color: "#62746a",
                    fontWeight: 700,
                  }}
                >
                  New to Vegito?
                </span>
              </div>

              {/* Start Shopping Link */}
              <Link
                href="/start-shopping"
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: "#ecfdf5",
                  border: "1.5px solid #a7f3d0",
                  borderRadius: "14px",
                  color: "#065f46",
                  fontSize: "14px",
                  fontWeight: 800,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  marginBottom: "20px",
                }}
              >
                <ShoppingBag size={18} />
                <span>Start Shopping</span>
              </Link>

              {/* Partner Links */}
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: "12.5px", color: "#62746a", fontWeight: 700 }}>
                  Partner?
                </span>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "16px",
                    marginTop: "8px",
                  }}
                >
                  <Link
                    href="/auth/seller"
                    style={{
                      fontSize: "13px",
                      fontWeight: 800,
                      color: "#c2410c",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Store size={15} />
                    <span>Sell on Vegito</span>
                  </Link>

                  <Link
                    href="/auth/delivery"
                    style={{
                      fontSize: "13px",
                      fontWeight: 800,
                      color: "#1d4ed8",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Bike size={15} />
                    <span>Deliver with Vegito</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              STAGE 2: OTP VERIFICATION
          ════════════════════════════════════════════════════════════════════ */}
          {stage === "otp" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "28px" }}>
                <button
                  type="button"
                  onClick={() => setStage("phone")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "none",
                    border: "none",
                    color: "#16835b",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    marginBottom: "12px",
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>Change mobile number</span>
                </button>
                <h1
                  style={{
                    fontSize: "24px",
                    fontWeight: 900,
                    color: "#063c32",
                    margin: "0 0 6px",
                  }}
                >
                  Verify your mobile number
                </h1>
                <p style={{ fontSize: "14px", color: "#62746a", margin: 0 }}>
                  Enter the 6-digit OTP sent to:{" "}
                  <strong>+91 {phone}</strong>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp}>
                <div style={{ marginBottom: "24px" }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    autoFocus
                    required
                    style={{
                      width: "100%",
                      textAlign: "center",
                      letterSpacing: "0.25em",
                      fontSize: "22px",
                      fontWeight: 800,
                      border: "1.5px solid #dce8df",
                      borderRadius: "14px",
                      padding: "14px",
                      outline: "none",
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.trim().length < 4}
                  style={{
                    width: "100%",
                    padding: "14px",
                    backgroundColor: "#16835b",
                    color: "#ffffff",
                    borderRadius: "14px",
                    border: "none",
                    fontSize: "15px",
                    fontWeight: 800,
                    cursor: loading ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify &amp; Login</span>
                  )}
                </button>
              </form>

              <div
                style={{
                  marginTop: "20px",
                  textAlign: "center",
                  fontSize: "13px",
                  color: "#62746a",
                }}
              >
                Didn't receive it?{" "}
                {resendTimer > 0 ? (
                  <span>Resend in {resendTimer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#16835b",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              STAGE 3: MULTI-ROLE WORKSPACE SELECTOR (Section 12)
          ════════════════════════════════════════════════════════════════════ */}
          {stage === "workspace_select" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <h1
                  style={{
                    fontSize: "24px",
                    fontWeight: 900,
                    color: "#063c32",
                    margin: "0 0 6px",
                  }}
                >
                  Welcome back 👋
                </h1>
                <p style={{ fontSize: "14px", color: "#62746a", margin: 0 }}>
                  What would you like to manage?
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* 🏪 Seller Workspace */}
                <button
                  type="button"
                  onClick={() => handleChooseWorkspace("SELLER")}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "16px 20px",
                    backgroundColor: "#fff7ed",
                    border: "1.5px solid #fed7aa",
                    borderRadius: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "28px" }}>🏪</span>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 800, color: "#9a3412" }}>
                        Seller Dashboard
                      </div>
                      <div style={{ fontSize: "12px", color: "#62746a" }}>
                        Manage orders, produce &amp; inventory
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={18} color="#c2410c" />
                </button>

                {/* 🚚 Delivery Workspace */}
                <button
                  type="button"
                  onClick={() => handleChooseWorkspace("DELIVERY_PARTNER")}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "16px 20px",
                    backgroundColor: "#eff6ff",
                    border: "1.5px solid #bfdbfe",
                    borderRadius: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "28px" }}>🚚</span>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 800, color: "#1e40af" }}>
                        Delivery Dashboard
                      </div>
                      <div style={{ fontSize: "12px", color: "#62746a" }}>
                        View delivery tasks &amp; earnings
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={18} color="#1d4ed8" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "var(--vegito-bg, #f8faf7)",
          }}
        >
          <Loader2 size={32} className="animate-spin text-emerald-600" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
