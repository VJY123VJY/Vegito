"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Navigation,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  Sparkles,
  Phone,
  User,
  X,
  ChevronRight,
  LogIn,
} from "lucide-react";
import {
  sendCustomerOtp,
  verifyCustomerOtp,
  saveSession,
} from "@/lib/api/auth";
import {
  saveStoredLocation,
  getStoredLocation,
  type SelectedLocationData,
} from "@/components/location/location-modal";
import { MapPinPicker } from "@/components/location/map-pin-picker";
import {
  searchAddressGeocode,
  reverseGeocode,
  type GeocodingResult,
} from "@/lib/api/map";
import { createAddress } from "@/lib/api/addresses";
import { getErrorMessage } from "@/lib/api/client";
import { ThemeToggle } from "@/components/common/theme-toggle";

export default function StartShoppingPage() {
  const router = useRouter();

  // Wizard Flow: "phone" -> "otp" -> "location"
  const [step, setStep] = useState<"phone" | "otp" | "location">("phone");

  // Step 1: Phone
  const [phone, setPhone] = useState("");

  // Step 2: OTP
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Step 3: Location
  const [selectedLoc, setSelectedLoc] = useState<SelectedLocationData | null>(null);
  const [locationMode, setLocationMode] = useState<"options" | "search" | "map">("options");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  // General Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!resendTimer) return;
    const interval = setInterval(() => {
      setResendTimer((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Debounced search for manual address autocomplete
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchAddressGeocode(searchQuery.trim());
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // ── STEP 1: REQUEST OTP ──────────────────────────────────────────────────
  const handleRequestOtp = async (e: React.FormEvent) => {
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
      const res = await sendCustomerOtp(cleanPhone);
      setStep("otp");
      setResendTimer(45);
      if (res?.dev_otp) {
        setInfoMsg(`OTP sent! (Dev Auto-fill: ${res.dev_otp})`);
        setOtp(res.dev_otp);
      } else {
        setInfoMsg(`We'll send you an OTP to verify your number.`);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 2: VERIFY OTP ────────────────────────────────────────────────────
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
      const tokenRes = await verifyCustomerOtp(cleanPhone, cleanOtp);
      saveSession(tokenRes);
      // Advance to location picker step
      setStep("location");
      setError(null);
      setInfoMsg(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 3: FRESH GPS DETECTION ───────────────────────────────────────────
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setError(null);
    setGpsLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const res = await reverseGeocode(lat, lng);
          const detectedAddr = res?.place_name || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
          const loc: SelectedLocationData = {
            address: detectedAddr,
            city: res?.city || "",
            pincode: res?.pincode || "",
            latitude: lat,
            longitude: lng,
          };
          setSelectedLoc(loc);
        } catch {
          const loc: SelectedLocationData = {
            address: `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            city: "",
            pincode: "",
            latitude: lat,
            longitude: lng,
          };
          setSelectedLoc(loc);
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) {
          setError("Location permission was denied. You can enter address manually or choose on map.");
        } else {
          setError("Could not detect location. Please enter address manually or choose on map.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // ── STEP 3: CONFIRM & SAVE LOCATION ───────────────────────────────────────
  const handleConfirmLocation = async (locToSave?: SelectedLocationData) => {
    const targetLoc = locToSave || selectedLoc;
    if (!targetLoc) {
      setError("Please detect your current location or choose on map first.");
      return;
    }

    setSavingLocation(true);
    setError(null);

    try {
      saveStoredLocation(targetLoc);
      try {
        await createAddress({
          address_line1: targetLoc.address,
          city: targetLoc.city || "Local Area",
          state: "Maharashtra",
          country: "India",
          pincode: targetLoc.pincode || "413001",
          latitude: targetLoc.latitude,
          longitude: targetLoc.longitude,
          is_default: true,
          address_type: "HOME",
        });
      } catch (addrErr) {
        // Address save fallback: stored in localStorage for cart & checkout
        console.warn("Address save notice:", addrErr);
      }
      // Redirect directly to Customer Home
      router.push("/customer");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingLocation(false);
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
            border: "1.5px solid #dce8df",
            padding: "32px 28px",
            boxShadow: "0 10px 30px rgba(6, 60, 50, 0.05)",
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
                backgroundColor: "#16835b",
              }}
            />
            <div
              style={{
                width: "36px",
                height: "4px",
                borderRadius: "2px",
                backgroundColor: step === "otp" || step === "location" ? "#16835b" : "#e2e8f0",
              }}
            />
            <div
              style={{
                width: "36px",
                height: "4px",
                borderRadius: "2px",
                backgroundColor: step === "location" ? "#16835b" : "#e2e8f0",
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
              STEP 1: MOBILE NUMBER
          ════════════════════════════════════════════════════════════════════ */}
          {step === "phone" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "28px" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "18px",
                    backgroundColor: "#ecfdf5",
                    color: "#16835b",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "14px",
                  }}
                >
                  <ShoppingBag size={28} />
                </div>
                <h1
                  style={{
                    fontSize: "24px",
                    fontWeight: 900,
                    color: "#063c32",
                    margin: "0 0 6px",
                  }}
                >
                  Create your Vegito account
                </h1>
                <p style={{ fontSize: "14px", color: "#62746a", margin: 0 }}>
                  Start fresh grocery shopping in seconds
                </p>
              </div>

              <form onSubmit={handleRequestOtp}>
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
                    transition: "opacity 0.15s ease",
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
          )}

          {/* ════════════════════════════════════════════════════════════════════
              STEP 2: OTP VERIFICATION
          ════════════════════════════════════════════════════════════════════ */}
          {step === "otp" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "28px" }}>
                <button
                  type="button"
                  onClick={() => setStep("phone")}
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
                    onClick={handleRequestOtp}
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
              STEP 3: CUSTOMER DELIVERY LOCATION
          ════════════════════════════════════════════════════════════════════ */}
          {step === "location" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "18px",
                    backgroundColor: "#ecfdf5",
                    color: "#16835b",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "12px",
                  }}
                >
                  <MapPin size={28} />
                </div>
                <h1
                  style={{
                    fontSize: "22px",
                    fontWeight: 900,
                    color: "#063c32",
                    margin: "0 0 6px",
                  }}
                >
                  📍 Set your delivery location
                </h1>
                <p style={{ fontSize: "13.5px", color: "#62746a", margin: 0 }}>
                  We check fresh produce sellers within 20 KM of your location
                </p>
              </div>

              {/* Detected Location Card (if detected) */}
              {selectedLoc && (
                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "#f0fdf4",
                    border: "1.5px solid #86efac",
                    borderRadius: "16px",
                    marginBottom: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "#15803d",
                      fontSize: "13px",
                      fontWeight: 800,
                      marginBottom: "6px",
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>✓ Delivery location detected</span>
                  </div>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#14532d",
                      margin: "0 0 14px",
                      lineHeight: 1.4,
                    }}
                  >
                    {selectedLoc.address}
                  </p>

                  <button
                    type="button"
                    onClick={() => handleConfirmLocation()}
                    disabled={savingLocation}
                    style={{
                      width: "100%",
                      padding: "12px",
                      backgroundColor: "#16835b",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "12px",
                      fontSize: "14px",
                      fontWeight: 800,
                      cursor: savingLocation ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    {savingLocation ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm Location &amp; Start Shopping</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Options */}
              {locationMode === "options" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {/* Option 1: Use my current location */}
                  <button
                    type="button"
                    onClick={handleDetectGps}
                    disabled={gpsLoading}
                    style={{
                      width: "100%",
                      padding: "15px 18px",
                      backgroundColor: "#16835b",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "14px",
                      fontSize: "14.5px",
                      fontWeight: 800,
                      cursor: gpsLoading ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                      boxShadow: "0 4px 14px rgba(22, 131, 91, 0.2)",
                    }}
                  >
                    {gpsLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Detecting fresh GPS...</span>
                      </>
                    ) : (
                      <>
                        <Navigation size={18} />
                        <span>Use my current location</span>
                      </>
                    )}
                  </button>

                  {/* Option 2: Enter address manually */}
                  <button
                    type="button"
                    onClick={() => setLocationMode("search")}
                    style={{
                      width: "100%",
                      padding: "13px 18px",
                      backgroundColor: "#ffffff",
                      border: "1.5px solid #dce8df",
                      borderRadius: "14px",
                      color: "#063c32",
                      fontSize: "14px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <Search size={16} color="#16835b" />
                    <span>Enter address manually</span>
                  </button>

                  {/* Option 3: Choose on map */}
                  <button
                    type="button"
                    onClick={() => setLocationMode("map")}
                    style={{
                      width: "100%",
                      padding: "13px 18px",
                      backgroundColor: "#ffffff",
                      border: "1.5px solid #dce8df",
                      borderRadius: "14px",
                      color: "#063c32",
                      fontSize: "14px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <MapPin size={16} color="#16835b" />
                    <span>Choose on map</span>
                  </button>
                </div>
              )}

              {/* Search Mode */}
              {locationMode === "search" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      border: "1.5px solid #dce8df",
                      borderRadius: "12px",
                      padding: "8px 12px",
                      marginBottom: "12px",
                    }}
                  >
                    <Search size={16} color="#16835b" style={{ marginRight: "8px" }} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search locality, street, or landmark..."
                      autoFocus
                      style={{
                        flex: 1,
                        border: "none",
                        outline: "none",
                        fontSize: "14px",
                      }}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        style={{ background: "none", border: "none", cursor: "pointer" }}
                      >
                        <X size={16} color="#62746a" />
                      </button>
                    )}
                  </div>

                  {searching && (
                    <div style={{ textAlign: "center", padding: "12px", color: "#62746a", fontSize: "13px" }}>
                      Searching addresses...
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div
                      style={{
                        maxHeight: "220px",
                        overflowY: "auto",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        marginBottom: "14px",
                      }}
                    >
                      {searchResults.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const loc: SelectedLocationData = {
                              address: item.place_name,
                              city: item.city || "",
                              pincode: item.pincode || "",
                              latitude: item.latitude,
                              longitude: item.longitude,
                            };
                            setSelectedLoc(loc);
                            setLocationMode("options");
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "10px 14px",
                            borderBottom: idx < searchResults.length - 1 ? "1px solid #f1f5f9" : "none",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "13px",
                            color: "#12221e",
                          }}
                        >
                          {item.place_name}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setLocationMode("options")}
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: "none",
                      border: "none",
                      color: "#62746a",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Back to options
                  </button>
                </div>
              )}

              {/* Map Mode */}
              {locationMode === "map" && (
                <div>
                  <div style={{ height: "340px", borderRadius: "14px", overflow: "hidden", marginBottom: "14px" }}>
                    <MapPinPicker
                      initialLat={selectedLoc?.latitude || 17.5253}
                      initialLng={selectedLoc?.longitude || 76.2052}
                      onConfirm={(loc: SelectedLocationData) => {
                        setSelectedLoc(loc);
                        setLocationMode("options");
                      }}
                      onCancel={() => setLocationMode("options")}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
