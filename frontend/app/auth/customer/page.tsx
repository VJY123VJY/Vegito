"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Phone, Lock, Eye, EyeOff } from "lucide-react";
import { getErrorMessage } from "@/lib/api/client";
import { saveSession, sendOtp, verifyOtp } from "@/lib/api/auth";
import Link from "next/link";

export default function CustomerAuth() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"details" | "otp">("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [showOtp, setShowOtp] = useState(false);

  useEffect(() => {
    if (!resendIn) return;
    const timer = window.setInterval(() => setResendIn((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (stage === "details") {
        await sendOtp("customer", phone);
        setStage("otp");
        setResendIn(30);
      } else {
        const session = await verifyOtp("customer", phone, otp, name);
        saveSession(session);
        router.push("/customer");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #f8fdf5 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "'Inter', 'DM Sans', sans-serif",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "420px",
        background: "#ffffff",
        borderRadius: "24px",
        padding: "40px 36px",
        boxShadow: "0 20px 60px rgba(26,61,43,0.12), 0 4px 16px rgba(26,61,43,0.06)",
        border: "1px solid rgba(26,61,43,0.08)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <div style={{
              width: "36px", height: "36px",
              background: "#1a3d2b",
              borderRadius: "10px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "20px",
            }}>🌿</div>
            <span style={{ fontSize: "24px", fontWeight: "800", color: "#1a3d2b", letterSpacing: "-0.5px" }}>Vegito</span>
          </div>
          <h1 style={{ margin: "0 0 8px", fontSize: "22px", fontWeight: "700", color: "#111827" }}>Welcome Back!</h1>
          <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>
            {stage === "details" ? "Sign in to your account" : `Enter the OTP sent to ${phone}`}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {stage === "details" ? (
            <>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "6px" }}>Full Name</label>
                <div style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  border: "1.5px solid #e5e7eb", borderRadius: "10px", padding: "11px 14px",
                  background: "#fafafa", transition: "border-color 160ms",
                }}>
                  <span style={{ fontSize: "16px" }}>👤</span>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    style={{ border: "none", outline: "none", fontSize: "14px", color: "#374151", width: "100%", background: "transparent" }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "6px" }}>Mobile Number</label>
                <div style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  border: "1.5px solid #e5e7eb", borderRadius: "10px", padding: "11px 14px",
                  background: "#fafafa",
                }}>
                  <Phone size={17} color="#9ca3af" />
                  <input
                    required
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter your mobile number"
                    style={{ border: "none", outline: "none", fontSize: "14px", color: "#374151", width: "100%", background: "transparent" }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "6px" }}>
                One-Time Password
              </label>
              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                border: "1.5px solid #e5e7eb", borderRadius: "10px", padding: "11px 14px",
                background: "#fafafa",
              }}>
                <Lock size={17} color="#9ca3af" />
                <input
                  required
                  inputMode="numeric"
                  maxLength={6}
                  type={showOtp ? "text" : "password"}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit code"
                  style={{ border: "none", outline: "none", fontSize: "14px", color: "#374151", width: "100%", background: "transparent" }}
                />
                <button type="button" onClick={() => setShowOtp(!showOtp)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  {showOtp ? <EyeOff size={17} color="#9ca3af" /> : <Eye size={17} color="#9ca3af" />}
                </button>
              </div>
            </div>
          )}

          {stage === "details" && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#6b7280", cursor: "pointer" }}>
                <input type="checkbox" style={{ accentColor: "#1a3d2b", width: "14px", height: "14px" }} />
                Remember me
              </label>
              <button type="button" style={{ background: "none", border: "none", color: "#1a6b3a", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
                Forgot password?
              </button>
            </div>
          )}

          {error && (
            <p style={{
              margin: 0, padding: "10px 14px",
              background: "#fef2f2", border: "1px solid #fee2e2",
              borderRadius: "8px", color: "#dc2626", fontSize: "13px",
            }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "13px",
              background: loading ? "#4b7c5f" : "#1a3d2b",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              fontSize: "15px",
              fontWeight: "700",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "background 160ms",
              marginTop: "4px",
            }}
          >
            {loading ? <><LoaderCircle size={18} className="spin" /> Please wait...</> : stage === "details" ? "Send OTP" : "Verify & Login"}
          </button>
        </form>

        {/* Resend / Change */}
        {stage === "otp" && (
          <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
            <button onClick={() => setStage("details")} style={{
              flex: 1, padding: "10px", background: "#f3f4f6", border: "none", borderRadius: "8px",
              fontSize: "13px", fontWeight: "600", color: "#374151", cursor: "pointer",
            }}>Change details</button>
            <button
              disabled={resendIn > 0 || loading}
              onClick={async () => { await sendOtp("customer", phone); setResendIn(30); }}
              style={{
                flex: 1, padding: "10px", background: "#f3f4f6", border: "none", borderRadius: "8px",
                fontSize: "13px", fontWeight: "600", color: resendIn > 0 ? "#9ca3af" : "#1a6b3a", cursor: resendIn > 0 ? "not-allowed" : "pointer",
              }}
            >
              {resendIn ? `Resend in ${resendIn}s` : "Resend OTP"}
            </button>
          </div>
        )}

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
          <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
          <span style={{ fontSize: "12px", color: "#9ca3af" }}>OR</span>
          <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
        </div>

        {/* Social options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button style={{
            padding: "12px", border: "1.5px solid #e5e7eb", borderRadius: "10px",
            background: "#fff", fontSize: "14px", fontWeight: "600", color: "#374151",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
          }}>
            <span style={{ fontSize: "18px" }}>🔍</span> Continue with Google
          </button>
          <button style={{
            padding: "12px", border: "1.5px solid #e5e7eb", borderRadius: "10px",
            background: "#fff", fontSize: "14px", fontWeight: "600", color: "#374151",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
          }}>
            <Phone size={18} /> Continue with Phone OTP
          </button>
        </div>

        {/* Register link */}
        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "#6b7280" }}>
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" style={{ color: "#1a6b3a", fontWeight: "700", textDecoration: "none" }}>Register</Link>
        </p>

        {/* Role links */}
        <div style={{
          marginTop: "16px",
          padding: "14px",
          background: "#f9fafb",
          borderRadius: "10px",
          display: "flex",
          justifyContent: "center",
          gap: "16px",
        }}>
          <Link href="/auth/seller" style={{ fontSize: "12px", color: "#6b7280", textDecoration: "none" }}>Seller Login</Link>
          <span style={{ color: "#e5e7eb" }}>|</span>
          <Link href="/auth/delivery" style={{ fontSize: "12px", color: "#6b7280", textDecoration: "none" }}>Delivery Login</Link>
        </div>
      </div>
    </div>
  );
}
