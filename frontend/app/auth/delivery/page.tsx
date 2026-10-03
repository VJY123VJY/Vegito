"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bike,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  User,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { getErrorMessage } from "@/lib/api/client";
import { saveSession, sendOtp, verifyOtp } from "@/lib/api/auth";
import { ThemeToggle } from "@/components/common/theme-toggle";

export default function DeliveryPartnerAuthPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState("Bike / Motorcycle");
  const [vehicleNumber, setVehicleNumber] = useState("");
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
        if (!name.trim()) {
          setError("Please enter your full name.");
          setLoading(false);
          return;
        }

        const res = await sendOtp("delivery", cleanPhone);
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

      const session = await verifyOtp("delivery", cleanPhone, otp.trim(), name.trim());
      saveSession(session);
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
            border: "1.5px solid #bfdbfe",
            boxShadow: "0 12px 40px rgba(37, 99, 235, 0.08)",
            padding: "28px 24px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "12px",
              }}
            >
              <Bike size={24} />
            </div>

            <div
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: "#2563eb",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Solapur Delivery Fleet
            </div>
            <h1
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color: "#1e3a8a",
                margin: "4px 0 6px",
              }}
            >
              {stage === "details" ? "Join Vegito Delivery Fleet" : "Confirm Mobile Number"}
            </h1>
            <p style={{ margin: 0, fontSize: "13px", color: "#62746a" }}>
              {stage === "details"
                ? "Flexible hours, weekly bank payouts & neighborhood delivery"
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
                {/* Full Name */}
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
                    Full Name (As per Aadhaar/PAN)
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
                    <User size={16} color="#62746a" style={{ marginRight: "8px" }} />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Anand Shinde"
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
                    Mobile Number (For Task Alerts)
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

                {/* Vehicle Type */}
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
                    Vehicle Type
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    style={{
                      width: "100%",
                      height: "46px",
                      borderRadius: "14px",
                      border: "1.5px solid #dce8df",
                      backgroundColor: "#f8faf8",
                      padding: "0 14px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#063c32",
                      outline: "none",
                    }}
                  >
                    <option value="Bike / Motorcycle">Bike / Motorcycle</option>
                    <option value="Scooter / Activa">Scooter / Activa</option>
                    <option value="Electric Scooter / EV">Electric Scooter / EV</option>
                    <option value="Bicycle">Bicycle</option>
                  </select>
                </div>

                {/* Vehicle Number */}
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
                    Vehicle Registration Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. MH 13 AB 1234"
                    style={{
                      width: "100%",
                      height: "46px",
                      borderRadius: "14px",
                      border: "1.5px solid #dce8df",
                      backgroundColor: "#f8faf8",
                      padding: "0 14px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#063c32",
                      outline: "none",
                      textTransform: "uppercase",
                    }}
                  />
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
                      color: "#2563eb",
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
                    border: "1.5px solid #bfdbfe",
                    backgroundColor: "#eff6ff",
                    textAlign: "center",
                    fontSize: "24px",
                    fontWeight: 800,
                    letterSpacing: "0.25em",
                    color: "#1e3a8a",
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
                backgroundColor: "#2563eb",
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
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.25)",
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
                  <span>Verify &amp; Start Delivering</span>
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
                    await sendOtp("delivery", phone.replace(/\D/g, ""));
                    setResendIn(45);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: resendIn > 0 ? "#9ca3af" : "#2563eb",
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
              borderTop: "1px solid #bfdbfe",
              textAlign: "center",
              fontSize: "13px",
              color: "#62746a",
            }}
          >
            Already an active delivery partner?{" "}
            <Link
              href="/auth/login"
              style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none" }}
            >
              Partner Login →
            </Link>
          </div>
        </div>
      </div>

      <div style={{ height: "20px" }} />
    </main>
  );
}
