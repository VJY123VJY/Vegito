"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShoppingBag,
  Store,
  Truck,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  MapPin,
} from "lucide-react";
import { registerUser, type AuthRole } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";

type RegisterRole = "CUSTOMER" | "SELLER" | "DELIVERY_PARTNER";

const ROLES: Array<{
  id: RegisterRole;
  label: string;
  badge: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  desc: string;
}> = [
  {
    id: "CUSTOMER",
    label: "Customer",
    badge: "Buyer",
    icon: <ShoppingBag size={20} />,
    color: "#059669",
    bgColor: "#ecfdf5",
    borderColor: "#a7f3d0",
    desc: "Order farm-fresh vegetables directly with doorstep delivery.",
  },
  {
    id: "SELLER",
    label: "Seller / Farmer",
    badge: "Producer",
    icon: <Store size={20} />,
    color: "#c2410c",
    bgColor: "#fff7ed",
    borderColor: "#fed7aa",
    desc: "List your harvests, manage wholesale catalog, and fulfill orders.",
  },
  {
    id: "DELIVERY_PARTNER",
    label: "Delivery Fleet",
    badge: "Partner",
    icon: <Truck size={20} />,
    color: "#2563eb",
    bgColor: "#eff6ff",
    borderColor: "#bfdbfe",
    desc: "Accept local deliveries, navigate routes, and earn daily payouts.",
  },
];

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRoleParam = (searchParams?.get("role") || "").toUpperCase();

  const [role, setRole] = useState<RegisterRole>(
    initialRoleParam === "SELLER"
      ? "SELLER"
      : initialRoleParam === "DELIVERY" || initialRoleParam === "DELIVERY_PARTNER"
      ? "DELIVERY_PARTNER"
      : "CUSTOMER"
  );

  // Common credentials
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("Solapur");
  const [pincode, setPincode] = useState("413001");
  const [termsAgreed, setTermsAgreed] = useState(true);

  // Customer specific
  const [address, setAddress] = useState("");

  // Seller specific
  const [businessName, setBusinessName] = useState("");

  // Delivery specific
  const [vehicleType, setVehicleType] = useState("Motorcycle");
  const [vehicleNumber, setVehicleNumber] = useState("");

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const activeRoleConfig = ROLES.find((r) => r.id === role) || ROLES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Validation
    const cleanPhone = phone.replace(/\D/g, "");
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }
    if (role === "SELLER" && !businessName.trim()) {
      setError("Please enter your Business / Farm / Store name.");
      return;
    }
    if (role === "DELIVERY_PARTNER" && !vehicleNumber.trim()) {
      setError("Please enter your vehicle registration number.");
      return;
    }
    if (!termsAgreed) {
      setError("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        name: name.trim(),
        phone: cleanPhone,
        password: password,
        role: role,
        email: email.trim() || undefined,
        city: city.trim() || "Solapur",
        pincode: pincode.trim() || "413001",
        address: address.trim() || undefined,
        business_name: role === "SELLER" ? businessName.trim() : undefined,
        vehicle_type: role === "DELIVERY_PARTNER" ? vehicleType : undefined,
        vehicle_number: role === "DELIVERY_PARTNER" ? vehicleNumber.trim() : undefined,
      });

      setSuccessMsg("Account created successfully! Redirecting to login...");
      setTimeout(() => {
        const roleParam =
          role === "CUSTOMER"
            ? "customer"
            : role === "SELLER"
            ? "seller"
            : "delivery";
        router.push(`/auth/login?role=${roleParam}&phone=${cleanPhone}`);
      }, 1500);
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f3f8f4 0%, #ffffff 40%, #eef6f0 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "36px 16px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "540px",
          backgroundColor: "#ffffff",
          borderRadius: "24px",
          boxShadow: "0 10px 40px rgba(6, 60, 50, 0.08)",
          border: "1px solid #e1e8e2",
          padding: "36px 32px",
        }}
      >
        {/* Brand header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none",
              marginBottom: "8px",
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
            Create Your Vegito Account
          </h1>
          <p style={{ margin: 0, fontSize: "13.5px", color: "#64748b" }}>
            Join Solapur&apos;s direct farm-to-door vegetable network
          </p>
        </div>

        {/* Role Picker */}
        <div style={{ marginBottom: "22px" }}>
          <label
            style={{
              display: "block",
              fontSize: "12.5px",
              fontWeight: 700,
              color: "#374151",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Select Your Role
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "10px",
            }}
          >
            {ROLES.map((r) => {
              const isSelected = role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setRole(r.id);
                    setError(null);
                  }}
                  style={{
                    padding: "12px 8px",
                    borderRadius: "14px",
                    border: isSelected
                      ? `2px solid ${r.color}`
                      : "1.5px solid #e2e8f0",
                    backgroundColor: isSelected ? r.bgColor : "#f8fafc",
                    color: isSelected ? r.color : "#475569",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                    textAlign: "center",
                    transition: "all 0.15s",
                    boxShadow: isSelected ? `0 4px 12px ${r.color}25` : "none",
                  }}
                >
                  <div style={{ color: isSelected ? r.color : "#64748b" }}>
                    {r.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: "12.5px", fontWeight: 700, lineHeight: 1.1 }}>
                      {r.label}
                    </div>
                    <div style={{ fontSize: "10px", opacity: 0.75, marginTop: "2px" }}>
                      {r.badge}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div
            style={{
              marginTop: "8px",
              fontSize: "12px",
              color: "#64748b",
              backgroundColor: "#f8fafc",
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #edf2f7",
            }}
          >
            💡 {activeRoleConfig.desc}
          </div>
        </div>

        {/* Feedback messages */}
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
              {error.toLowerCase().includes("already registered") && (
                <div style={{ marginTop: "6px" }}>
                  <Link
                    href={`/auth/login?role=${role.toLowerCase()}&phone=${phone.replace(/\D/g, "")}`}
                    style={{
                      color: "#b91c1c",
                      fontWeight: 700,
                      textDecoration: "underline",
                      fontSize: "12.5px",
                    }}
                  >
                    Click here to Login with this number →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {successMsg && (
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
            <CheckCircle size={17} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Full Name */}
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
              Full Name *
            </label>
            <div style={{ position: "relative" }}>
              <User
                size={16}
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9ca3af",
                }}
              />
              <input
                type="text"
                placeholder="e.g. Ramesh Patil"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 14px 11px 40px",
                  borderRadius: "12px",
                  border: "1.5px solid #d1d5db",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                required
              />
            </div>
          </div>

          {/* Mobile Number */}
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
              Mobile Number (10 Digits) *
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
                }}
              >
                +91
              </span>
              <input
                type="tel"
                maxLength={10}
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                style={{
                  width: "100%",
                  padding: "11px 14px 11px 48px",
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

          {/* Password & Confirm Password */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
                Password *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 6 chars"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 36px 11px 12px",
                    borderRadius: "12px",
                    border: "1.5px solid #d1d5db",
                    fontSize: "13.5px",
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
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#9ca3af",
                    cursor: "pointer",
                    padding: "2px",
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

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
                Confirm Password *
              </label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  borderRadius: "12px",
                  border: "1.5px solid #d1d5db",
                  fontSize: "13.5px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                required
              />
            </div>
          </div>

          {/* Role-specific fields */}
          {role === "SELLER" && (
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
                Business / Farm / Store Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Sahyadri Organic Orchards"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "12px",
                  border: "1.5px solid #d1d5db",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                required
              />
            </div>
          )}

          {role === "DELIVERY_PARTNER" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
                  Vehicle Type
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    borderRadius: "12px",
                    border: "1.5px solid #d1d5db",
                    fontSize: "13.5px",
                    outline: "none",
                    boxSizing: "border-box",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="Scooter">Scooter</option>
                  <option value="EV 2-Wheeler">EV 2-Wheeler</option>
                  <option value="Bicycle">Bicycle</option>
                  <option value="Mini Van">Mini Van / Tempo</option>
                </select>
              </div>
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
                  Vehicle Reg Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g. MH-13-AB-1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    borderRadius: "12px",
                    border: "1.5px solid #d1d5db",
                    fontSize: "13.5px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>
            </div>
          )}

          {/* Location details */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
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
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  borderRadius: "12px",
                  border: "1.5px solid #d1d5db",
                  fontSize: "13.5px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
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
                Pincode
              </label>
              <input
                type="text"
                value={pincode}
                maxLength={6}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  borderRadius: "12px",
                  border: "1.5px solid #d1d5db",
                  fontSize: "13.5px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Terms checkbox */}
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              fontSize: "12.5px",
              color: "#4b5563",
              cursor: "pointer",
              marginTop: "4px",
            }}
          >
            <input
              type="checkbox"
              checked={termsAgreed}
              onChange={(e) => setTermsAgreed(e.target.checked)}
              style={{ marginTop: "3px" }}
            />
            <span>
              I agree to the Vegito Terms of Service and Privacy Policy for {activeRoleConfig.label}s.
            </span>
          </label>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: "12px",
              backgroundColor: activeRoleConfig.color,
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
              boxShadow: `0 4px 14px ${activeRoleConfig.color}40`,
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Creating {activeRoleConfig.label} account...</span>
              </>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Login redirect */}
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
          <span>Already registered with Vegito? </span>
          <Link
            href={`/auth/login?role=${role.toLowerCase()}`}
            style={{
              color: activeRoleConfig.color,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Log in to your account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", backgroundColor: "#f3f8f4" }} />}>
      <RegisterContent />
    </Suspense>
  );
}
