"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Store,
  Navigation,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Search,
} from "lucide-react";
import {
  sendOtp,
  verifyOtp,
  saveSession,
  getRoleRedirectPath,
} from "@/lib/api/auth";
import { reverseGeocode, searchAddressGeocode, type GeocodingResult } from "@/lib/api/map";
import { api, getErrorMessage } from "@/lib/api/client";
import { MapPinPicker } from "@/components/location/map-pin-picker";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { getFreshDeviceCoordinates } from "@/lib/api/location-helper";

export default function SellerAuthPage() {
  const router = useRouter();

  // Wizard Flow: "phone" -> "otp" -> "shop_info"
  const [stage, setStage] = useState<"phone" | "otp" | "shop_info">("phone");

  // Step 1: Phone
  const [phone, setPhone] = useState("");

  // Step 2: OTP
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Step 3: Shop Information & Location
  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopLat, setShopLat] = useState<number | null>(null);
  const [shopLng, setShopLng] = useState<number | null>(null);
  const [locationDetected, setLocationDetected] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

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
      const res = await sendOtp("seller", cleanPhone);
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
      const session = await verifyOtp("seller", cleanPhone, cleanOtp);
      saveSession(session);
      if (!session.is_new_user) {
        window.location.href = "/seller";
        return;
      }
      // Advance to shop info for new seller onboarding
      setStage("shop_info");
      setError(null);
      setInfoMsg(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 3: REAL SELLER GPS DETECTION ────────────────────────────────────
  const handleDetectSellerGps = async () => {
    setError(null);
    setGpsLoading(true);

    try {
      const coords = await getFreshDeviceCoordinates({ timeoutMs: 20000 });
      const lat = coords.latitude;
      const lng = coords.longitude;
      setShopLat(lat);
      setShopLng(lng);

      try {
        const geo = await reverseGeocode(lat, lng);
        const detectedText = geo?.place_name || geo?.address_line1 || `Shop at GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        setShopAddress(detectedText);
        setLocationDetected(true);
      } catch {
        setShopAddress(`Shop at GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        setLocationDetected(true);
      }
      if (coords.isLowAccuracy) {
        setError("Location fix is approximate. You can fine-tune your shop pin on the map below.");
      } else {
        setError(null);
      }
    } catch (err: any) {
      if (err?.coordinates) {
        const lat = err.coordinates.latitude;
        const lng = err.coordinates.longitude;
        setShopLat(lat);
        setShopLng(lng);
        setShopAddress(`Shop at GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        setLocationDetected(true);
        setError("Location fix is approximate. You can fine-tune your shop pin on the map below.");
      } else if (err?.code === "PERMISSION_DENIED") {
        setError("Location permission was denied. You can choose shop location on map.");
      } else {
        setError(err?.message || "Could not detect device GPS. Please choose shop location on map.");
      }
    } finally {
      setGpsLoading(false);
    }
  };

  // ── STEP 3: SUBMIT SHOP INFORMATION ──────────────────────────────────────
  const handleSaveShopInfo = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!shopName.trim()) {
      setError("Please enter your shop or farm name.");
      return;
    }

    if (shopLat === null || shopLng === null) {
      setError("Please detect your shop location using GPS or choose on map.");
      return;
    }

    setLoading(true);

    try {
      // Update seller profile with real GPS coordinates and shop name
      await api.patch("/seller/profile", {
        business_name: shopName.trim(),
        address: shopAddress.trim() || undefined,
        latitude: shopLat,
        longitude: shopLng,
        is_available: true,
      });

      // Seamless redirect to Seller Dashboard
      window.location.href = "/seller";
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="auth-page"
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
              backgroundColor: "#fff7ed",
              color: "#c2410c",
              padding: "2px 8px",
              borderRadius: "6px",
              border: "1px solid #fed7aa",
            }}
          >
            SELLER
          </span>
        </Link>

        <ThemeToggle />
      </header>

      {/* Main Form Container */}
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
            border: "1.5px solid #fed7aa",
            padding: "32px 28px",
            boxShadow: "0 10px 30px rgba(194, 65, 12, 0.05)",
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
                backgroundColor: "#c2410c",
              }}
            />
            <div
              style={{
                width: "36px",
                height: "4px",
                borderRadius: "2px",
                backgroundColor: stage === "otp" || stage === "shop_info" ? "#c2410c" : "#e2e8f0",
              }}
            />
            <div
              style={{
                width: "36px",
                height: "4px",
                borderRadius: "2px",
                backgroundColor: stage === "shop_info" ? "#c2410c" : "#e2e8f0",
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
                backgroundColor: "#fff7ed",
                border: "1px solid #fed7aa",
                borderRadius: "12px",
                color: "#9a3412",
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
                    backgroundColor: "#fff7ed",
                    color: "#c2410c",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "14px",
                  }}
                >
                  <Store size={28} />
                </div>
                <h1
                  style={{
                    fontSize: "24px",
                    fontWeight: 900,
                    color: "#063c32",
                    margin: "0 0 6px",
                  }}
                >
                  Start selling with Vegito
                </h1>
                <p style={{ fontSize: "14px", color: "#62746a", margin: 0 }}>
                  Grow your grocery business with fast local deliveries
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
                        color: "#c2410c",
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
                    backgroundColor: "#c2410c",
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
                Already registered as a partner?{" "}
                <Link
                  href="/auth/login"
                  style={{
                    color: "#c2410c",
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
                    color: "#c2410c",
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
                      border: "1.5px solid #fed7aa",
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
                    backgroundColor: "#c2410c",
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
                      color: "#c2410c",
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
              STAGE 3: BASIC SHOP INFORMATION + SHOP LOCATION
          ════════════════════════════════════════════════════════════════════ */}
          {stage === "shop_info" && (
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
                  Basic shop information
                </h1>
                <p style={{ fontSize: "13.5px", color: "#62746a", margin: 0 }}>
                  Configure your store name and pickup location
                </p>
              </div>

              <form onSubmit={handleSaveShopInfo}>
                {/* Shop Name */}
                <div style={{ marginBottom: "18px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#12221e",
                      marginBottom: "6px",
                    }}
                  >
                    Shop name
                  </label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Kisan Fresh Store, Swami Market"
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

                {/* Shop Location Section */}
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
                    Shop location
                  </label>

                  {/* Detected Shop Location Confirmation Card */}
                  {locationDetected && shopAddress && (
                    <div
                      style={{
                        padding: "14px",
                        backgroundColor: "#fff7ed",
                        border: "1.5px solid #fed7aa",
                        borderRadius: "14px",
                        marginBottom: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          color: "#c2410c",
                          fontSize: "12.5px",
                          fontWeight: 800,
                          marginBottom: "4px",
                        }}
                      >
                        <CheckCircle2 size={16} />
                        <span>✓ Shop location detected</span>
                      </div>
                      <p
                        style={{
                          fontSize: "13.5px",
                          fontWeight: 600,
                          color: "#9a3412",
                          margin: 0,
                          lineHeight: 1.4,
                        }}
                      >
                        {shopAddress}
                      </p>
                    </div>
                  )}

                  {/* Location Action Buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={handleDetectSellerGps}
                      disabled={gpsLoading}
                      style={{
                        width: "100%",
                        padding: "13px 16px",
                        backgroundColor: "#c2410c",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "12px",
                        fontSize: "14px",
                        fontWeight: 800,
                        cursor: gpsLoading ? "wait" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                      }}
                    >
                      {gpsLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Detecting shop GPS...</span>
                        </>
                      ) : (
                        <>
                          <Navigation size={16} />
                          <span>Use my current location</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowMap(!showMap)}
                      style={{
                        width: "100%",
                        padding: "11px 16px",
                        backgroundColor: "#ffffff",
                        border: "1.5px solid #fed7aa",
                        borderRadius: "12px",
                        fontSize: "13.5px",
                        fontWeight: 700,
                        color: "#9a3412",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <MapPin size={16} />
                      <span>{showMap ? "Hide map" : "Choose location on map"}</span>
                    </button>
                  </div>

                  {/* Interactive Map Picker */}
                  {showMap && (
                    <div style={{ marginTop: "12px" }}>
                      <div style={{ height: "300px", borderRadius: "12px", overflow: "hidden", marginBottom: "8px" }}>
                        <MapPinPicker
                          initialLat={shopLat || 17.5253}
                          initialLng={shopLng || 76.2052}
                          onConfirm={(loc: any) => {
                            setShopLat(loc.latitude);
                            setShopLng(loc.longitude);
                            setShopAddress(loc.address);
                            setLocationDetected(true);
                            setShowMap(false);
                          }}
                          onCancel={() => setShowMap(false)}
                        />
                      </div>
                      <p style={{ fontSize: "11.5px", color: "#62746a", textAlign: "center", margin: 0 }}>
                        Drag pin or click on map to pinpoint your shop
                      </p>
                    </div>
                  )}
                </div>

                {/* Human-readable Shop Address */}
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
                    Shop address
                  </label>
                  <textarea
                    rows={2}
                    value={shopAddress}
                    onChange={(e) => setShopAddress(e.target.value)}
                    placeholder="Enter or refine shop address..."
                    required
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1.5px solid #dce8df",
                      borderRadius: "12px",
                      fontSize: "13.5px",
                      outline: "none",
                      resize: "none",
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !shopName.trim() || shopLat === null}
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
                      <span>Saving shop details...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit &amp; Open Seller Dashboard</span>
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
