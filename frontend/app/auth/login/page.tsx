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
  Store,
  Bike,
  ShoppingBag,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  sendLoginOtp,
  verifyLoginOtp,
  loginWithPassword,
  saveSession,
  getRoleRedirectPath,
  getStoredUserName,
  getStoredRole,
  getStoredAuthorizedRoles,
  clearSession,
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
  const rawRole = (searchParams?.get("role") || "").toUpperCase();
  const queryRole: AuthRole | null =
    rawRole === "CUSTOMER"
      ? "CUSTOMER"
      : rawRole === "SELLER"
      ? "SELLER"
      : rawRole === "DELIVERY" || rawRole === "DELIVERY_PARTNER"
      ? "DELIVERY_PARTNER"
      : null;

  // Stages: "phone" -> "otp" -> "workspace_select" (if multi-role)
  const [stage, setStage] = useState<"phone" | "otp" | "workspace_select">("phone");
  const [phone, setPhone] = useState(queryPhone);
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Multi-role workspace picker state
  const [multiRoleSession, setMultiRoleSession] = useState<TokenResponse | null>(null);
  const [switchingRole, setSwitchingRole] = useState<AuthRole | null>(null);

  // Alternative Password Auth Mode
  const [authMode, setAuthMode] = useState<"otp" | "password">("otp");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [activeUser, setActiveUser] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<AuthRole | null>(null);

  useEffect(() => {
    const user = getStoredUserName();
    const r = getStoredRole();
    if (user && r) {
      setActiveUser(user);
      setActiveRole(r);
    }
  }, []);

  useEffect(() => {
    if (!resendTimer) return;
    const interval = setInterval(() => {
      setResendTimer((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // ── SEND OTP ──────────────────────────────────────────────────────────────
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
        setInfoMsg("OTP sent successfully to your mobile number.");
      }
    } catch (err: any) {
      const msg = getErrorMessage(err);
      if (msg.toLowerCase().includes("not found")) {
        setError("Account not found. Click below to Start Shopping and create your account.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── VERIFY OTP ────────────────────────────────────────────────────────────
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
      const tokenRes = await verifyLoginOtp(phone.replace(/\D/g, ""), cleanOtp, queryRole || undefined);
      saveSession(tokenRes);

      const roles = tokenRes.authorized_roles || [tokenRes.role];

      // If user came via a specific portal and is authorized for that role, go directly
      if (queryRole && roles.includes(queryRole)) {
        router.push(getRoleRedirectPath(queryRole));
        return;
      }

      // Multi-role discovery: If user has multiple roles and didn't specify portal, allow choosing workspace
      if (roles.length > 1) {
        setMultiRoleSession(tokenRes);
        setStage("workspace_select");
        return;
      }

      // Single-role: Direct seamless redirect
      router.push(getRoleRedirectPath(tokenRes.role));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── PASSWORD LOGIN FALLBACK ───────────────────────────────────────────────
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
      const tokenRes = await loginWithPassword(cleanPhone, password, queryRole || undefined);
      saveSession(tokenRes);

      const roles = tokenRes.authorized_roles || [tokenRes.role];

      if (queryRole && roles.includes(queryRole)) {
        router.push(getRoleRedirectPath(queryRole));
        return;
      }

      if (roles.length > 1) {
        setMultiRoleSession(tokenRes);
        setStage("workspace_select");
        return;
      }

      router.push(getRoleRedirectPath(tokenRes.role));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── WORKSPACE SELECTION ───────────────────────────────────────────────────
  const handleSelectWorkspace = async (targetRole: AuthRole) => {
    setError(null);
    setSwitchingRole(targetRole);

    try {
      // If already active in that role
      if (multiRoleSession?.role === targetRole) {
        router.push(getRoleRedirectPath(targetRole));
        return;
      }

      // Switch workspace via backend API
      const switched = await switchWorkspace(targetRole);
      saveSession(switched);
      router.push(getRoleRedirectPath(targetRole));
    } catch (err) {
      setError(getErrorMessage(err));
      setSwitchingRole(null);
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
        <Link
          href="/auth"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "#62746a",
            textDecoration: "none",
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </Link>

        <ThemeToggle />
      </header>

      {/* Main Container Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          margin: "24px auto",
          padding: "0 20px",
        }}
      >
        {/* Already Logged In Banner */}
        {activeUser && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "14px",
              backgroundColor: "#ecfdf5",
              border: "1px solid #a7f3d0",
              color: "#065f46",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <div>
              <strong>{activeUser}</strong> ({activeRole})
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => router.push(getRoleRedirectPath(activeRole))}
                style={{
                  background: "none",
                  border: "none",
                  color: "#059669",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontSize: "12.5px",
                }}
              >
                Go to App →
              </button>
              <button
                onClick={() => {
                  clearSession();
                  setActiveUser(null);
                  setActiveRole(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#dc2626",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "24px",
            border: "1px solid #e1e8e2",
            boxShadow: "0 12px 40px rgba(6, 60, 50, 0.08)",
            padding: "28px 24px",
          }}
        >
          {/* STAGE 1 & 2: MOBILE OTP LOGIN */}
          {stage !== "workspace_select" ? (
            <>
              {/* Header Title */}
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <div style={{ fontSize: "36px", marginBottom: "8px" }}>🥬</div>
                <h1
                  style={{
                    fontSize: "24px",
                    fontWeight: 800,
                    color: "#063c32",
                    margin: "0 0 6px",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {authMode === "otp"
                    ? stage === "phone"
                      ? "Welcome to Vegito"
                      : "Verify OTP"
                    : "Login with Password"}
                </h1>
                <p style={{ margin: 0, fontSize: "13.5px", color: "#62746a" }}>
                  {authMode === "otp"
                    ? stage === "phone"
                      ? "Enter your mobile number to sign in or get started"
                      : `Enter the 6-digit code sent to +91 ${phone}`
                    : "Enter your registered phone and password"}
                </p>
              </div>

              {/* Error & Info Alerts */}
              {error && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "12px",
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "16px",
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {infoMsg && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "12px",
                    backgroundColor: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    color: "#166534",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "16px",
                  }}
                >
                  <Sparkles size={16} style={{ flexShrink: 0 }} />
                  <span>{infoMsg}</span>
                </div>
              )}

              {/* Form Content */}
              {authMode === "otp" ? (
                stage === "phone" ? (
                  // STAGE: PHONE INPUT
                  <form onSubmit={handleSendOtp}>
                    <div style={{ marginBottom: "18px" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "12.5px",
                          fontWeight: 700,
                          color: "#063c32",
                          marginBottom: "6px",
                        }}
                      >
                        Mobile Number
                      </label>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          backgroundColor: "#f8faf8",
                          border: "1.5px solid #dce8df",
                          borderRadius: "14px",
                          padding: "2px 14px",
                          transition: "border-color 0.15s",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: 700,
                            color: "#62746a",
                            marginRight: "8px",
                          }}
                        >
                          +91
                        </span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
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
                            color: "#063c32",
                            letterSpacing: "0.04em",
                          }}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || phone.replace(/\D/g, "").length !== 10}
                      style={{
                        width: "100%",
                        padding: "14px 20px",
                        backgroundColor: "#16835b",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "14px",
                        fontSize: "15px",
                        fontWeight: 800,
                        cursor:
                          loading || phone.replace(/\D/g, "").length !== 10
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          loading || phone.replace(/\D/g, "").length !== 10 ? 0.65 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        boxShadow: "0 4px 14px rgba(22, 131, 91, 0.25)",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <>
                          <span>Continue with OTP</span>
                          <ArrowRight size={17} />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  // STAGE: OTP INPUT
                  <form onSubmit={handleVerifyOtp}>
                    <div style={{ marginBottom: "18px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "6px",
                        }}
                      >
                        <label
                          style={{
                            fontSize: "12.5px",
                            fontWeight: 700,
                            color: "#063c32",
                          }}
                        >
                          6-Digit OTP Code
                        </label>
                        <button
                          type="button"
                          onClick={() => setStage("phone")}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#16835b",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Change Number
                        </button>
                      </div>

                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="••••••"
                        autoFocus
                        style={{
                          width: "100%",
                          height: "50px",
                          borderRadius: "14px",
                          border: "1.5px solid #dce8df",
                          backgroundColor: "#f8faf8",
                          textAlign: "center",
                          fontSize: "24px",
                          fontWeight: 800,
                          letterSpacing: "0.25em",
                          color: "#063c32",
                          outline: "none",
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otp.trim().length < 4}
                      style={{
                        width: "100%",
                        padding: "14px 20px",
                        backgroundColor: "#16835b",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "14px",
                        fontSize: "15px",
                        fontWeight: 800,
                        cursor: loading || otp.trim().length < 4 ? "not-allowed" : "pointer",
                        opacity: loading || otp.trim().length < 4 ? 0.65 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        boxShadow: "0 4px 14px rgba(22, 131, 91, 0.25)",
                        marginBottom: "14px",
                      }}
                    >
                      {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <>
                          <span>Verify &amp; Continue</span>
                          <CheckCircle2 size={17} />
                        </>
                      )}
                    </button>

                    <div style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        disabled={resendTimer > 0 || loading}
                        onClick={() => handleSendOtp()}
                        style={{
                          background: "none",
                          border: "none",
                          color: resendTimer > 0 ? "#8fa196" : "#16835b",
                          fontSize: "12.5px",
                          fontWeight: 700,
                          cursor: resendTimer > 0 ? "not-allowed" : "pointer",
                        }}
                      >
                        {resendTimer > 0
                          ? `Resend OTP in ${resendTimer}s`
                          : "Didn't receive OTP? Resend"}
                      </button>
                    </div>
                  </form>
                )
              ) : (
                // PASSWORD LOGIN FORM
                <form onSubmit={handlePasswordLogin}>
                  <div style={{ marginBottom: "14px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        color: "#063c32",
                        marginBottom: "6px",
                      }}
                    >
                      Mobile Number
                    </label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        backgroundColor: "#f8faf8",
                        border: "1.5px solid #dce8df",
                        borderRadius: "14px",
                        padding: "2px 14px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 700,
                          color: "#62746a",
                          marginRight: "8px",
                        }}
                      >
                        +91
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        placeholder="Enter 10-digit number"
                        style={{
                          width: "100%",
                          height: "46px",
                          border: "none",
                          background: "transparent",
                          outline: "none",
                          fontSize: "15px",
                          fontWeight: 700,
                          color: "#063c32",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: "18px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        color: "#063c32",
                        marginBottom: "6px",
                      }}
                    >
                      Password
                    </label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        backgroundColor: "#f8faf8",
                        border: "1.5px solid #dce8df",
                        borderRadius: "14px",
                        padding: "2px 14px",
                      }}
                    >
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        style={{
                          width: "100%",
                          height: "46px",
                          border: "none",
                          background: "transparent",
                          outline: "none",
                          fontSize: "15px",
                          fontWeight: 700,
                          color: "#063c32",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#62746a",
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
                    disabled={loading || !password || phone.replace(/\D/g, "").length !== 10}
                    style={{
                      width: "100%",
                      padding: "14px 20px",
                      backgroundColor: "#16835b",
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
                      boxShadow: "0 4px 14px rgba(22, 131, 91, 0.25)",
                    }}
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : "Sign In"}
                  </button>
                </form>
              )}

              {/* Mode Switch & Registration Links */}
              <div
                style={{
                  marginTop: "24px",
                  paddingTop: "18px",
                  borderTop: "1px solid #edf2ee",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  textAlign: "center",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === "otp" ? "password" : "otp");
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
                  {authMode === "otp" ? "Use Password Instead" : "Use Mobile OTP Instead"}
                </button>

                <div style={{ fontSize: "13px", color: "#62746a" }}>
                  New customer?{" "}
                  <Link
                    href="/start-shopping"
                    style={{ color: "#16835b", fontWeight: 800, textDecoration: "none" }}
                  >
                    Start Shopping →
                  </Link>
                </div>
              </div>
            </>
          ) : (
            // STAGE 3: MULTI-ROLE WORKSPACE SELECTION MODAL
            <div>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={{ fontSize: "36px", marginBottom: "8px" }}>👋</div>
                <h2
                  style={{
                    fontSize: "22px",
                    fontWeight: 800,
                    color: "#063c32",
                    margin: "0 0 6px",
                  }}
                >
                  Welcome back, {multiRoleSession?.name || "Partner"}!
                </h2>
                <p style={{ margin: 0, fontSize: "13.5px", color: "#62746a" }}>
                  Your account has multiple roles. Select a workspace to continue:
                </p>
              </div>

              {error && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "12px",
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    fontSize: "13px",
                    marginBottom: "16px",
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {/* Continue as Seller (if authorized) */}
                {(multiRoleSession?.authorized_roles?.includes("SELLER") ||
                  multiRoleSession?.role === "SELLER") && (
                  <button
                    onClick={() => handleSelectWorkspace("SELLER")}
                    disabled={switchingRole !== null}
                    style={{
                      width: "100%",
                      padding: "16px 18px",
                      borderRadius: "16px",
                      border: "1.5px solid #fed7aa",
                      backgroundColor: "#fff7ed",
                      color: "#9a3412",
                      textAlign: "left",
                      cursor: switchingRole ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "12px",
                          backgroundColor: "#ea580c",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Store size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: "15px", fontWeight: 800 }}>
                          Continue as Seller
                        </div>
                        <div style={{ fontSize: "12px", color: "#c2410c" }}>
                          Store dashboard, farm produce catalog &amp; orders
                        </div>
                      </div>
                    </div>
                    {switchingRole === "SELLER" ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </button>
                )}

                {/* Continue as Delivery Partner (if authorized) */}
                {(multiRoleSession?.authorized_roles?.includes("DELIVERY_PARTNER") ||
                  multiRoleSession?.role === "DELIVERY_PARTNER") && (
                  <button
                    onClick={() => handleSelectWorkspace("DELIVERY_PARTNER")}
                    disabled={switchingRole !== null}
                    style={{
                      width: "100%",
                      padding: "16px 18px",
                      borderRadius: "16px",
                      border: "1.5px solid #bfdbfe",
                      backgroundColor: "#eff6ff",
                      color: "#1e40af",
                      textAlign: "left",
                      cursor: switchingRole ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "12px",
                          backgroundColor: "#2563eb",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Bike size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: "15px", fontWeight: 800 }}>
                          Continue Delivery
                        </div>
                        <div style={{ fontSize: "12px", color: "#3b82f6" }}>
                          Live dispatch, order tasks &amp; doorstep delivery
                        </div>
                      </div>
                    </div>
                    {switchingRole === "DELIVERY_PARTNER" ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </button>
                )}

                {/* Continue Shopping (Customer) — Available for everyone */}
                <button
                  onClick={() => handleSelectWorkspace("CUSTOMER")}
                  disabled={switchingRole !== null}
                  style={{
                    width: "100%",
                    padding: "16px 18px",
                    borderRadius: "16px",
                    border: "1.5px solid #a7f3d0",
                    backgroundColor: "#ecfdf5",
                    color: "#065f46",
                    textAlign: "left",
                    cursor: switchingRole ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "transform 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "12px",
                        backgroundColor: "#16835b",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ShoppingBag size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 800 }}>
                        Continue Shopping
                      </div>
                      <div style={{ fontSize: "12px", color: "#059669" }}>
                        Browse fresh vegetables, farm harvest &amp; cart
                      </div>
                    </div>
                  </div>
                  {switchingRole === "CUSTOMER" ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Partner Link */}
        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#62746a" }}>
            Want to register a business or fleet?{" "}
            <Link
              href="/partner"
              style={{ color: "#16835b", fontWeight: 800, textDecoration: "none" }}
            >
              Partner Hub →
            </Link>
          </p>
        </div>
      </div>

      {/* Empty footer spacer */}
      <div style={{ height: "20px" }} />
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
          }}
        >
          <Loader2 size={32} className="animate-spin" color="#16835b" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
