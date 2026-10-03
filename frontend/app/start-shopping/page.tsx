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

  // Wizard Steps: 1: Location -> 2: Mobile/Name -> 3: OTP
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Location State
  const [selectedLoc, setSelectedLoc] = useState<SelectedLocationData | null>(null);
  const [locationMode, setLocationMode] = useState<"options" | "map">("options");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // User Details State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // OTP State
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // General Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const existing = getStoredLocation();
    if (existing) {
      setSelectedLoc(existing);
    }
  }, []);

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

  // ── GPS DETECTION ──────────────────────────────────────────────────────────
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
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
          const loc: SelectedLocationData = {
            address: res?.place_name || `Near Solapur (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            city: res?.city || "Solapur",
            pincode: res?.pincode || "413001",
            latitude: lat,
            longitude: lng,
          };
          setSelectedLoc(loc);
          saveStoredLocation(loc);
        } catch {
          const loc: SelectedLocationData = {
            address: `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            city: "Solapur",
            pincode: "413001",
            latitude: lat,
            longitude: lng,
          };
          setSelectedLoc(loc);
          saveStoredLocation(loc);
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) {
          setError("Location permission was denied. You can search or choose on map below.");
        } else {
          setError("Could not detect location. Please search your area or choose on map.");
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSelectLocation = (loc: SelectedLocationData) => {
    setSelectedLoc(loc);
    saveStoredLocation(loc);
    setLocationMode("options");
    setError(null);
  };

  // ── SUBMIT MOBILE & GET OTP ────────────────────────────────────────────────
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
      setStep(3);
      setResendTimer(45);
      if (res?.dev_otp) {
        setInfoMsg(`OTP sent! (Dev Auto-fill: ${res.dev_otp})`);
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

  // ── VERIFY OTP & COMPLETE ONBOARDING ───────────────────────────────────────
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
      const tokenRes = await verifyCustomerOtp(cleanPhone, cleanOtp, name.trim() || undefined);
      saveSession(tokenRes);

      // Save and sync selected location to database address
      if (selectedLoc) {
        saveStoredLocation(selectedLoc);
        try {
          await createAddress({
            address_line1: selectedLoc.address,
            city: selectedLoc.city || "Solapur",
            state: "Maharashtra",
            country: "India",
            pincode: selectedLoc.pincode || "413001",
            latitude: selectedLoc.latitude,
            longitude: selectedLoc.longitude,
            is_default: true,
          });
        } catch {
          // If address sync fails, localStorage copy will still populate cart/checkout
        }
      }

      // Seamless redirect directly into the shopping experience
      router.push("/customer");
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
      {/* Top Header */}
      <header
        style={{
          width: "100%",
          maxWidth: "520px",
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
          <span>Exit</span>
        </Link>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                width: step === s ? "24px" : "8px",
                height: "8px",
                borderRadius: "999px",
                backgroundColor: step >= s ? "#16835b" : "#dce8df",
                transition: "all 0.2s ease",
              }}
            />
          ))}
        </div>

        <ThemeToggle />
      </header>

      {/* Main Container */}
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          margin: "20px auto 40px",
          padding: "0 20px",
        }}
      >
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "24px",
            border: "1px solid #e1e8e2",
            boxShadow: "0 12px 40px rgba(6, 60, 50, 0.08)",
            padding: "28px 24px",
          }}
        >
          {/* STEP 1: LOCATION ONBOARDING */}
          {step === 1 && (
            <div>
              {locationMode === "map" ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "12px",
                    }}
                  >
                    <button
                      onClick={() => setLocationMode("options")}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#16835b",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: 0,
                      }}
                    >
                      <ArrowLeft size={16} />
                      <span>Back to Options</span>
                    </button>
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "#063c32" }}>
                      Pin on Solapur Map
                    </span>
                  </div>

                  <MapPinPicker
                    initialLat={selectedLoc?.latitude}
                    initialLng={selectedLoc?.longitude}
                    onConfirm={handleSelectLocation}
                    onCancel={() => setLocationMode("options")}
                  />
                </div>
              ) : (
                <div>
                  {/* Step Title */}
                  <div style={{ textAlign: "center", marginBottom: "20px" }}>
                    <div style={{ fontSize: "36px", marginBottom: "8px" }}>📍</div>
                    <h1
                      style={{
                        fontSize: "22px",
                        fontWeight: 800,
                        color: "#063c32",
                        margin: "0 0 6px",
                      }}
                    >
                      Where should we deliver?
                    </h1>
                    <p style={{ margin: 0, fontSize: "13.5px", color: "#62746a" }}>
                      Vegito delivers direct farm produce across Solapur in 15 minutes
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
                      <AlertCircle size={16} style={{ flexShrink: 0 }} />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* 3 Location Options */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                    {/* Option 1: Device GPS */}
                    <button
                      onClick={handleDetectGps}
                      disabled={gpsLoading}
                      style={{
                        width: "100%",
                        padding: "14px 16px",
                        borderRadius: "16px",
                        border: "1.5px solid #16835b",
                        backgroundColor: "#f0fdf4",
                        color: "#16835b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: gpsLoading ? "wait" : "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "10px",
                            backgroundColor: "#16835b",
                            color: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {gpsLoading ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Navigation size={18} />
                          )}
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontSize: "14px", fontWeight: 800, color: "#063c32" }}>
                            {gpsLoading ? "Detecting location..." : "Use Current Location"}
                          </div>
                          <div style={{ fontSize: "11.5px", color: "#62746a" }}>
                            Fastest auto-detection via device GPS
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={17} color="#16835b" />
                    </button>

                    {/* Option 2: Choose on Map */}
                    <button
                      onClick={() => setLocationMode("map")}
                      style={{
                        width: "100%",
                        padding: "14px 16px",
                        borderRadius: "16px",
                        border: "1.5px solid #dce8df",
                        backgroundColor: "#ffffff",
                        color: "#063c32",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "10px",
                            backgroundColor: "#f0f4f1",
                            color: "#0a4d3c",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <MapPin size={18} />
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontSize: "14px", fontWeight: 800 }}>
                            Choose on Map
                          </div>
                          <div style={{ fontSize: "11.5px", color: "#62746a" }}>
                            Place marker on interactive Solapur Map
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={17} color="#62746a" />
                    </button>

                    {/* Option 3: Manual Address Search */}
                    <div>
                      <div
                        style={{
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          backgroundColor: "#f8faf8",
                          borderRadius: "14px",
                          border: "1.5px solid #dce8df",
                          padding: "2px 12px",
                        }}
                      >
                        <Search size={16} color="#62746a" style={{ flexShrink: 0 }} />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Or type area/street name..."
                          style={{
                            width: "100%",
                            height: "44px",
                            padding: "0 10px",
                            border: "none",
                            background: "transparent",
                            outline: "none",
                            fontSize: "13.5px",
                            fontWeight: 600,
                            color: "#063c32",
                          }}
                        />
                        {searching && <Loader2 size={16} className="animate-spin" color="#16835b" />}
                        {searchQuery && !searching && (
                          <button
                            onClick={() => setSearchQuery("")}
                            style={{ background: "none", border: "none", color: "#62746a", cursor: "pointer" }}
                          >
                            <X size={15} />
                          </button>
                        )}
                      </div>

                      {searchResults.length > 0 && (
                        <div
                          style={{
                            marginTop: "6px",
                            borderRadius: "12px",
                            border: "1px solid #e1ebe3",
                            backgroundColor: "#ffffff",
                            overflow: "hidden",
                            boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
                          }}
                        >
                          {searchResults.map((item, idx) => (
                            <button
                              key={idx}
                              onClick={() =>
                                handleSelectLocation({
                                  address: item.place_name,
                                  city: item.city,
                                  pincode: item.pincode,
                                  latitude: item.latitude,
                                  longitude: item.longitude,
                                })
                              }
                              style={{
                                width: "100%",
                                padding: "10px 12px",
                                border: "none",
                                borderBottom: idx < searchResults.length - 1 ? "1px solid #f1f5f2" : "none",
                                backgroundColor: "#ffffff",
                                textAlign: "left",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <MapPin size={15} color="#16835b" style={{ flexShrink: 0 }} />
                              <div style={{ fontSize: "12.5px", color: "#063c32", fontWeight: 600 }}>
                                {item.place_name}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Solapur Quick Select Area Pills */}
                  <div style={{ marginBottom: "24px" }}>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        color: "#62746a",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "8px",
                      }}
                    >
                      Quick Select Solapur Areas
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {[
                        "Jule Solapur",
                        "Saat Rasta",
                        "Old Pune Naka",
                        "Hotgi Road",
                        "Ashok Chowk",
                        "Lashkar",
                      ].map((area) => (
                        <button
                          key={area}
                          onClick={() =>
                            handleSelectLocation({
                              address: `${area}, Solapur`,
                              city: "Solapur",
                              pincode: "413001",
                            })
                          }
                          style={{
                            padding: "6px 12px",
                            borderRadius: "10px",
                            border:
                              selectedLoc?.address.includes(area)
                                ? "1.5px solid #16835b"
                                : "1px solid #dce8df",
                            backgroundColor:
                              selectedLoc?.address.includes(area) ? "#ecfdf5" : "#f5f8f6",
                            color: "#063c32",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {area}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Confirmed Selection Badge & Next Button */}
                  {selectedLoc && (
                    <div
                      style={{
                        padding: "14px 16px",
                        borderRadius: "16px",
                        backgroundColor: "#ecfdf5",
                        border: "1.5px solid #a7f3d0",
                        marginBottom: "16px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0, marginTop: "2px" }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "11px", fontWeight: 800, color: "#065f46" }}>
                            DELIVERY ADDRESS SELECTED
                          </div>
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: 700,
                              color: "#063c32",
                              marginTop: "2px",
                            }}
                          >
                            {selectedLoc.address}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (!selectedLoc) {
                        setError("Please choose or detect your delivery location to proceed.");
                        return;
                      }
                      setError(null);
                      setStep(2);
                    }}
                    disabled={!selectedLoc}
                    style={{
                      width: "100%",
                      padding: "15px 20px",
                      backgroundColor: "#16835b",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "14px",
                      fontSize: "15px",
                      fontWeight: 800,
                      cursor: selectedLoc ? "pointer" : "not-allowed",
                      opacity: selectedLoc ? 1 : 0.6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 4px 14px rgba(22, 131, 91, 0.25)",
                    }}
                  >
                    <span>Proceed to Mobile Verification</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: MOBILE NUMBER & NAME */}
          {step === 2 && (
            <form onSubmit={handleRequestOtp}>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={{ fontSize: "36px", marginBottom: "8px" }}>📱</div>
                <h2
                  style={{
                    fontSize: "22px",
                    fontWeight: 800,
                    color: "#063c32",
                    margin: "0 0 6px",
                  }}
                >
                  Enter Your Mobile Number
                </h2>
                <p style={{ margin: 0, fontSize: "13.5px", color: "#62746a" }}>
                  We will send a 6-digit verification code to confirm your account
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

              {/* Name (Optional) */}
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
                  Your Full Name (Optional)
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
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Patil"
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

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    padding: "14px 18px",
                    backgroundColor: "#f0f4f1",
                    color: "#063c32",
                    border: "none",
                    borderRadius: "14px",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={loading || phone.replace(/\D/g, "").length !== 10}
                  style={{
                    flex: 1,
                    padding: "14px 20px",
                    backgroundColor: "#16835b",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "14px",
                    fontSize: "15px",
                    fontWeight: 800,
                    cursor: loading || phone.replace(/\D/g, "").length !== 10 ? "not-allowed" : "pointer",
                    opacity: loading || phone.replace(/\D/g, "").length !== 10 ? 0.65 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 14px rgba(22, 131, 91, 0.25)",
                  }}
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <span>Get OTP Code</span>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: OTP VERIFICATION & REDIRECT */}
          {step === 3 && (
            <form onSubmit={handleVerifyOtp}>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={{ fontSize: "36px", marginBottom: "8px" }}>🔐</div>
                <h2
                  style={{
                    fontSize: "22px",
                    fontWeight: 800,
                    color: "#063c32",
                    margin: "0 0 6px",
                  }}
                >
                  Verify One-Time Code
                </h2>
                <p style={{ margin: 0, fontSize: "13.5px", color: "#62746a" }}>
                  Sent to +91 {phone}
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

              <div style={{ marginBottom: "20px" }}>
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
                    height: "52px",
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
                  padding: "15px 20px",
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
                    <span>Confirm &amp; Start Shopping</span>
                    <CheckCircle2 size={17} />
                  </>
                )}
              </button>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#62746a",
                    fontSize: "12.5px",
                    cursor: "pointer",
                  }}
                >
                  Change Number
                </button>

                <button
                  type="button"
                  disabled={resendTimer > 0 || loading}
                  onClick={async () => {
                    const res = await sendCustomerOtp(phone.replace(/\D/g, ""));
                    setResendTimer(45);
                    if (res?.dev_otp) setOtp(res.dev_otp);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: resendTimer > 0 ? "#8fa196" : "#16835b",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: resendTimer > 0 ? "not-allowed" : "pointer",
                  }}
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div style={{ height: "20px" }} />
    </main>
  );
}
