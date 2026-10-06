"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bike,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  User,
  ShieldCheck,
} from "lucide-react";
import {
  sendOtp,
  verifyOtp,
  saveSession,
} from "@/lib/api/auth";
import { api, getErrorMessage } from "@/lib/api/client";
import { ThemeToggle } from "@/components/common/theme-toggle";

export default function DeliveryPartnerAuthPage() {
  const router = useRouter();

  // Wizard Flow: "phone" -> "otp" -> "profile_info"
  const [stage, setStage] = useState<"phone" | "otp" | "profile_info">("phone");

  // Step 1: Phone
  const [phone, setPhone] = useState("");

  // Step 2: OTP
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Step 3: Personal & Vehicle Details
  const [name, setName] = useState("");
  const [vehicleType, setVehicleType] = useState("Motorcycle / Scooter");
  const [vehicleNumber, setVehicleNumber] = useState("");

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

  // ── STEP 1: SEND OTP ──────────────────────────────────────────────────────
  const handleSendOtp = async (e: FormEvent) => {
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
      const res = await sendOtp("delivery", cleanPhone);
      setStage("otp");
      setResendTimer(45);
      if ((res as any)?.dev_otp) {
        setInfoMsg(`OTP sent! (Dev Auto-fill: ${(res as any).dev_otp})`);
        setOtp((res as any).dev_otp);
      } else {
        setInfoMsg(`We'll send you an OTP to verify your mobile number.`);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 2: VERIFY OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    setLoading(true);

    try {
      const session = await verifyOtp("delivery", cleanPhone, cleanOtp);
      saveSession(session);
      // Advance to profile info
      setStage("profile_info");
      setError(null);
      setInfoMsg(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 3: SUBMIT PROFILE INFO ───────────────────────────────────────────
  const handleSubmitProfile = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setLoading(true);

    try {
      // Update delivery partner profile
      try {
        await api.put("/delivery/profile", {
          name: name.trim(),
          vehicle_type: vehicleType,
          vehicle_number: vehicleNumber.trim() || undefined,
          is_available: true,
        });
      } catch (profErr) {
        console.warn("Delivery profile update notice:", profErr);
      }

      // Seamless redirect to Delivery Dashboard
      router.push("/delivery");
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
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              backgroundColor: "#eff6ff",
              color: "#1d4ed8",
              padding: "2px 8px",
              borderRadius: "6px",
              border: "1px solid #bfdbfe",
            }}
          >
            DELIVERY
          </span>
        </Link>

        <ThemeToggle />
      </header>

      {/* Main Card Container */}
      <div
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "480px",
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
            border: "1.5px solid #bfdbfe",
            padding: "32px 28px",
            boxShadow: "0 10px 30px rgba(29, 78, 216, 0.05)",
          }}
        >
          {/* Progress Indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "4px",
                borderRadius: "2px",
                backgroundColor: "#1d4ed8",
              }}
            />
            <div
              style={{
                width: "36px",
                height: "4px",
                borderRadius: "2px",
                backgroundColor: stage === "otp" || stage === "profile_info" ? "#1d4ed8" : "#e2e8f0",
              }}
            />
            <div
              style={{
                width: "36px",
                height: "4px",
                borderRadius: "2px",
                backgroundColor: stage === "profile_info" ? "#1d4ed8" : "#e2e8f0",
              }}
            />
          </div>

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
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "12px",
                color: "#1e40af",
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
              STAGE 1: MOBILE NUMBER
          ════════════════════════════════════════════════════════════════════ */}
          {stage === "phone" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "28px" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "18px",
                    backgroundColor: "#eff6ff",
                    color: "#1d4ed8",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "14px",
                  }}
                >
                  <Bike size={28} />
                </div>
                <h1
                  style={{
                    fontSize: "24px",
                    fontWeight: 900,
                    color: "#063c32",
                    margin: "0 0 6px",
                  }}
                >
                  Deliver with Vegito
                </h1>
                <p style={{ fontSize: "14px", color: "#62746a", margin: 0 }}>
                  Earn with flexible local deliveries
                </p>
              </div>

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
                        color: "#1d4ed8",
                        marginRight: "8px",
                      }}
                    >
                      +91
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter mobile number"
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
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#62746a",
                      marginTop: "8px",
                    }}
                  >
                    We'll send you an OTP to verify your number.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || phone.replace(/\D/g, "").length !== 10}
                  style={{
                    width: "100%",
                    padding: "14px",
                    backgroundColor: "#1d4ed8",
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
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <div
                style={{
                  marginTop: "24px",
                  textAlign: "center",
                  fontSize: "13.5px",
                  color: "#62746a",
                }}
              >
                Already registered?{" "}
                <Link
                  href="/auth/login"
                  style={{
                    color: "#1d4ed8",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  Login
                </Link>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              STAGE 2: OTP
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
                    color: "#1d4ed8",
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
                      border: "1.5px solid #bfdbfe",
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
                    backgroundColor: "#1d4ed8",
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
                    <span>Verify</span>
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
                    onClick={handleSendOtp}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#1d4ed8",
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
              STAGE 3: BASIC PERSONAL & VEHICLE INFORMATION
          ════════════════════════════════════════════════════════════════════ */}
          {stage === "profile_info" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <h1
                  style={{
                    fontSize: "22px",
                    fontWeight: 900,
                    color: "#063c32",
                    margin: "0 0 6px",
                  }}
                >
                  Partner details
                </h1>
                <p style={{ fontSize: "13.5px", color: "#62746a", margin: 0 }}>
                  Enter your name and delivery vehicle
                </p>
              </div>

              <form onSubmit={handleSubmitProfile}>
                {/* Full Name */}
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
                    Full name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Patil"
                    required
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      border: "1.5px solid #dce8df",
                      borderRadius: "12px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Vehicle Type */}
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
                    Vehicle type
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      border: "1.5px solid #dce8df",
                      borderRadius: "12px",
                      fontSize: "14px",
                      outline: "none",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <option value="Motorcycle / Scooter">Motorcycle / Scooter</option>
                    <option value="Bicycle">Bicycle</option>
                    <option value="Electric Scooter">Electric Scooter</option>
                    <option value="Three Wheeler">Three Wheeler</option>
                  </select>
                </div>

                {/* Vehicle Number (optional) */}
                <div style={{ marginBottom: "24px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#12221e",
                      marginBottom: "6px",
                    }}
                  >
                    Vehicle registration number (optional)
                  </label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="e.g. MH 13 AB 1234"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      border: "1.5px solid #dce8df",
                      borderRadius: "12px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  style={{
                    width: "100%",
                    padding: "14px",
                    backgroundColor: "#1d4ed8",
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
                      <span>Saving profile...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit &amp; Open Delivery Dashboard</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
