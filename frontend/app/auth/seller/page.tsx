"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Store,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  MapPin,
  Building,
} from "lucide-react";
import { getErrorMessage } from "@/lib/api/client";
import { saveSession, sendOtp, verifyOtp } from "@/lib/api/auth";
import { ThemeToggle } from "@/components/common/theme-toggle";

export default function SellerAuthPage() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [locality, setLocality] = useState("");
  const [otp, setOtp] = useState("");

  const [stage, setStage] = useState<"details" | "otp">("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (!resendIn) return;
    const timer = window.setInterval(
      () => setResendIn((v) => Math.max(0, v - 1)),
      1000
    );
    return () => window.clearInterval(timer);
  }, [resendIn]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);

    try {
      if (stage === "details") {
        if (!businessName.trim()) {
          setError("Please enter your store or farm business name.");
          setLoading(false);
          return;
        }

        const res = await sendOtp("seller", cleanPhone);
        setStage("otp");
        setResendIn(45);
        if ((res as any)?.dev_otp) {
          setInfoMsg(`OTP sent! (Dev Auto-fill: ${(res as any).dev_otp})`);
          setOtp((res as any).dev_otp);
        } else {
          setInfoMsg(`We sent a 6-digit verification code to +91 ${cleanPhone}`);
        }
        return;
      }

      // Verify OTP
      if (!otp.trim() || otp.trim().length < 4) {
        setError("Please enter the 6-digit verification code.");
        setLoading(false);
        return;
      }

      const session = await verifyOtp("seller", cleanPhone, otp.trim(), businessName.trim());
      saveSession(session);
      router.push("/seller");
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
        justifyContent: "space-between",
      }}
    >
      {/* Header */}
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
          href="/partner"
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
          <span>Partner Hub</span>
        </Link>

        <ThemeToggle />
      </header>

      {/* Card Form */}
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          margin: "24px auto",
          padding: "0 20px",
        }}
      >
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "24px",
            border: "1.5px solid #fed7aa",
            boxShadow: "0 12px 40px rgba(194, 65, 12, 0.08)",
            padding: "28px 24px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                backgroundColor: "#fff7ed",
                color: "#ea580c",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "12px",
              }}
            >
              <Store size={24} />
            </div>

            <div
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: "#c2410c",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Solapur Partner Network
            </div>
            <h1
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color: "#7c2d12",
                margin: "4px 0 6px",
              }}
            >
              {stage === "details" ? "Register Your Store" : "Confirm Mobile Number"}
            </h1>
            <p style={{ margin: 0, fontSize: "13px", color: "#62746a" }}>
              {stage === "details"
                ? "Start listing farm produce & groceries for 15-min delivery"
                : `Enter the 6-digit code sent to +91 ${phone}`}
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
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
              }}
            >
              <AlertCircle size={16} />
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
              <Sparkles size={16} />
              <span>{infoMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {stage === "details" ? (
              <>
                {/* Store Name */}
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
                    Store / Farm Business Name
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
                    <Building size={16} color="#62746a" style={{ marginRight: "8px" }} />
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Patil Fresh Veg & Fruits"
                      style={{
                        width: "100%",
                        height: "46px",
                        border: "none",
                        background: "transparent",
                        outline: "none",
                        fontSize: "14.5px",
                        fontWeight: 600,
                        color: "#063c32",
                      }}
                    />
                  </div>
                </div>

                {/* Mobile Number */}
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
                    Owner / Manager Mobile Number
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
                      required
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

                {/* Solapur Locality */}
                <div style={{ marginBottom: "22px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      color: "#063c32",
                      marginBottom: "6px",
                    }}
                  >
                    Store Locality in Solapur
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
                    <MapPin size={16} color="#62746a" style={{ marginRight: "8px" }} />
                    <input
                      type="text"
                      value={locality}
                      onChange={(e) => setLocality(e.target.value)}
                      placeholder="e.g. Jule Solapur / Old Pune Naka"
                      style={{
                        width: "100%",
                        height: "46px",
                        border: "none",
                        background: "transparent",
                        outline: "none",
                        fontSize: "14px",
                        color: "#063c32",
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              /* STAGE: OTP */
              <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "6px",
                  }}
                >
                  <label style={{ fontSize: "12.5px", fontWeight: 700, color: "#063c32" }}>
                    6-Digit Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setStage("details")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ea580c",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Edit Details
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
                    border: "1.5px solid #fed7aa",
                    backgroundColor: "#fff7ed",
                    textAlign: "center",
                    fontSize: "24px",
                    fontWeight: 800,
                    letterSpacing: "0.25em",
                    color: "#7c2d12",
                    outline: "none",
                  }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px 20px",
                backgroundColor: "#ea580c",
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
                boxShadow: "0 4px 14px rgba(234, 88, 12, 0.25)",
                marginBottom: stage === "otp" ? "14px" : "0",
              }}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : stage === "details" ? (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight size={17} />
                </>
              ) : (
                <>
                  <span>Verify &amp; Open Store</span>
                  <CheckCircle2 size={17} />
                </>
              )}
            </button>

            {stage === "otp" && (
              <div style={{ textAlign: "center" }}>
                <button
                  type="button"
                  disabled={resendIn > 0 || loading}
                  onClick={async () => {
                    await sendOtp("seller", phone.replace(/\D/g, ""));
                    setResendIn(45);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: resendIn > 0 ? "#9ca3af" : "#ea580c",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: resendIn > 0 ? "not-allowed" : "pointer",
                  }}
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend OTP"}
                </button>
              </div>
            )}
          </form>

          <div
            style={{
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: "1px solid #fed7aa",
              textAlign: "center",
              fontSize: "13px",
              color: "#62746a",
            }}
          >
            Already have a seller account?{" "}
            <Link
              href="/auth/login"
              style={{ color: "#ea580c", fontWeight: 700, textDecoration: "none" }}
            >
              Seller Login →
            </Link>
          </div>
        </div>
      </div>

      <div style={{ height: "20px" }} />
    </main>
  );
}
