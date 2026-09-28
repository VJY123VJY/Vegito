"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Navigation,
  Search,
  X,
  CheckCircle2,
  Clock,
  Home,
  Briefcase,
  AlertCircle,
  Loader2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  searchAddressGeocode,
  reverseGeocode,
  DEFAULT_SOLAPUR_COORDS,
  type GeocodingResult,
} from "@/lib/api/map";
import { listAddresses, type Address } from "@/lib/api/addresses";
import { isLoggedIn } from "@/lib/api/auth";

export interface SelectedLocationData {
  address: string;
  city?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
}

const STORAGE_KEY = "vegito.selected_location";
const STORAGE_FLAG = "vegito.location_selected";

export const POPULAR_ZONES: SelectedLocationData[] = [
  {
    address: "Solapur Central Mandi · 413001",
    city: "Solapur",
    pincode: "413001",
    latitude: 17.6805,
    longitude: 75.9064,
  },
  {
    address: "Jule Solapur · 413004",
    city: "Solapur",
    pincode: "413004",
    latitude: 17.6599,
    longitude: 75.9142,
  },
  {
    address: "Saat Rasta / Collector Office · 413001",
    city: "Solapur",
    pincode: "413001",
    latitude: 17.6745,
    longitude: 75.9022,
  },
  {
    address: "Hotgi Road & MIDC · 413003",
    city: "Solapur",
    pincode: "413003",
    latitude: 17.6434,
    longitude: 75.9328,
  },
  {
    address: "Bhavani Peth Mandi · 413002",
    city: "Solapur",
    pincode: "413002",
    latitude: 17.6715,
    longitude: 75.9189,
  },
  {
    address: "Khed Mandi & Vasant Valley · 413255",
    city: "Solapur",
    pincode: "413255",
    latitude: 17.712,
    longitude: 75.882,
  },
];

export function getStoredLocation(): SelectedLocationData {
  if (typeof window === "undefined") {
    return POPULAR_ZONES[0];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return POPULAR_ZONES[0];
}

export function saveStoredLocation(loc: SelectedLocationData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    localStorage.setItem(STORAGE_FLAG, "true");
    window.dispatchEvent(
      new CustomEvent("vegito:location_changed", { detail: loc })
    );
  } catch {
    // ignore
  }
}

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (loc: SelectedLocationData) => void;
}

export function LocationModal({ isOpen, onClose, onSelect }: LocationModalProps) {
  const [currentLoc, setCurrentLoc] = useState<SelectedLocationData>(getStoredLocation());
  const [geoState, setGeoState] = useState<"idle" | "requesting" | "detecting" | "detected" | "error">("idle");
  const [geoError, setGeoError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch saved addresses if logged in
  useEffect(() => {
    if (isOpen && isLoggedIn()) {
      setLoadingAddresses(true);
      listAddresses()
        .then((items) => setSavedAddresses(items || []))
        .catch(() => setSavedAddresses([]))
        .finally(() => setLoadingAddresses(false));
    }
  }, [isOpen]);

  // Sync state with storage
  useEffect(() => {
    if (isOpen) {
      setCurrentLoc(getStoredLocation());
      setGeoState("idle");
      setGeoError(null);
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchAddressGeocode(searchQuery.trim());
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleSelectLocation = (loc: SelectedLocationData) => {
    setCurrentLoc(loc);
    saveStoredLocation(loc);
    if (onSelect) onSelect(loc);
    onClose();
  };

  // Browser Geolocation flow
  const handleDetectCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      setGeoState("error");
      setGeoError("Geolocation is not supported by your browser");
      return;
    }

    setGeoState("requesting");
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGeoState("detecting");
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          const res = await reverseGeocode(lat, lng);
          const locationData: SelectedLocationData = {
            address: res?.place_name || `Near Solapur (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
            city: res?.city || "Solapur",
            pincode: res?.pincode || "413001",
            latitude: lat,
            longitude: lng,
          };

          setGeoState("detected");
          setTimeout(() => {
            handleSelectLocation(locationData);
          }, 600);
        } catch {
          const fallbackData: SelectedLocationData = {
            address: `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            city: "Solapur",
            pincode: "413001",
            latitude: lat,
            longitude: lng,
          };
          setGeoState("detected");
          setTimeout(() => {
            handleSelectLocation(fallbackData);
          }, 600);
        }
      },
      (err) => {
        setGeoState("error");
        if (err.code === 1) {
          setGeoError("Location permission denied. Please allow access or select below.");
        } else if (err.code === 2) {
          setGeoError("Location unavailable. Please select from popular areas.");
        } else {
          setGeoError("Location request timed out.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      {/* Blurred dimmed backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(6, 40, 32, 0.65)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Modal Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-dialog-title"
        style={{
          position: "relative",
          zIndex: 2,
          backgroundColor: "#ffffff",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "460px",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(6, 60, 50, 0.28)",
          border: "1px solid rgba(22, 131, 91, 0.15)",
          animation: "vegito-slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          overflow: "hidden",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: "20px 22px 16px",
            borderBottom: "1px solid #edf2ee",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <span style={{ fontSize: "16px" }}>📍</span>
              <h2
                id="location-dialog-title"
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#063c32",
                  letterSpacing: "-0.02em",
                }}
              >
                Choose Delivery Location
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: "12.5px", color: "#62746a" }}>
              Find fresh groceries &amp; farm vegetables near you
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close location selector"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "12px",
              border: "none",
              backgroundColor: "#f2f6f3",
              color: "#62746a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            padding: "18px 22px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {/* 1. Browser Geolocation Button */}
          <div>
            <button
              onClick={handleDetectCurrentLocation}
              disabled={geoState === "requesting" || geoState === "detecting"}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "16px",
                border: "1.5px solid #16835b",
                backgroundColor: geoState === "detected" ? "#ecfdf5" : "#f0fdf4",
                color: "#16835b",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                cursor: geoState === "requesting" || geoState === "detecting" ? "wait" : "pointer",
                transition: "all 0.2s",
                boxShadow: "0 2px 8px rgba(22, 131, 91, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "left" }}>
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
                    flexShrink: 0,
                  }}
                >
                  {geoState === "requesting" || geoState === "detecting" ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : geoState === "detected" ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <Navigation size={18} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#063c32" }}>
                    {geoState === "requesting"
                      ? "Requesting GPS Permission..."
                      : geoState === "detecting"
                      ? "Finding Farm Near You..."
                      : geoState === "detected"
                      ? "Location Detected!"
                      : "Use My Current Location"}
                  </div>
                  <div style={{ fontSize: "11.5px", color: "#62746a" }}>
                    {geoState === "detected" ? "Applying coordinates..." : "Fastest delivery to your exact doorstep"}
                  </div>
                </div>
              </div>

              <ChevronRight size={17} color="#16835b" />
            </button>

            {geoError && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#dc2626",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{geoError}</span>
              </div>
            )}
          </div>

          {/* 2. Search Localities Autocomplete */}
          <div>
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                backgroundColor: "#f5f8f6",
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
                placeholder="Search area, landmark or street in Solapur..."
                style={{
                  width: "100%",
                  height: "42px",
                  padding: "0 10px",
                  border: "none",
                  backgroundColor: "transparent",
                  outline: "none",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  color: "#063c32",
                }}
              />
              {searching ? (
                <Loader2 size={16} className="animate-spin" color="#16835b" />
              ) : searchQuery ? (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{ background: "none", border: "none", color: "#62746a", cursor: "pointer", padding: "4px" }}
                >
                  <X size={15} />
                </button>
              ) : null}
            </div>

            {/* Search autocomplete results */}
            {searchResults.length > 0 && (
              <div
                style={{
                  marginTop: "8px",
                  borderRadius: "14px",
                  border: "1px solid #e1ebe3",
                  backgroundColor: "#ffffff",
                  overflow: "hidden",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
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
                      padding: "12px 14px",
                      border: "none",
                      borderBottom: idx < searchResults.length - 1 ? "1px solid #f1f5f2" : "none",
                      backgroundColor: "#ffffff",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      transition: "background-color 0.15s",
                    }}
                  >
                    <MapPin size={16} color="#16835b" style={{ flexShrink: 0, marginTop: "2px" }} />
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#063c32" }}>
                        {item.place_name.split(",")[0]}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#62746a" }}>
                        {item.place_name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Saved Addresses (if logged in) */}
          {savedAddresses.length > 0 && (
            <div>
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
                Saved Addresses
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {savedAddresses.map((addr) => {
                  const isMatch = currentLoc.address.includes(addr.address_line1);
                  return (
                    <button
                      key={addr.id}
                      onClick={() =>
                        handleSelectLocation({
                          address: `${addr.address_line1}, ${addr.city} · ${addr.pincode}`,
                          city: addr.city,
                          pincode: addr.pincode,
                          latitude: addr.latitude || undefined,
                          longitude: addr.longitude || undefined,
                        })
                      }
                      style={{
                        padding: "10px 14px",
                        borderRadius: "12px",
                        backgroundColor: isMatch ? "#ecfdf5" : "#f8faf8",
                        border: isMatch ? "1.5px solid #16835b" : "1px solid #e1e8e2",
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      {addr.address_type === "WORK" ? (
                        <Briefcase size={16} color="#16835b" />
                      ) : (
                        <Home size={16} color="#16835b" />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#063c32" }}>
                          {addr.address_type || "Home"} · {addr.city}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#62746a" }}>
                          {addr.address_line1} {addr.pincode && `· ${addr.pincode}`}
                        </div>
                      </div>
                      {isMatch && <CheckCircle2 size={16} color="#16835b" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Popular Solapur Mandi Hubs */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11px",
                fontWeight: 800,
                color: "#62746a",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "8px",
              }}
            >
              <Sparkles size={12} color="#16835b" />
              <span>Popular Delivery Hubs in Solapur</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {POPULAR_ZONES.map((zone) => {
                const isSelected = currentLoc.address === zone.address;
                return (
                  <button
                    key={zone.address}
                    onClick={() => handleSelectLocation(zone)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "12px",
                      backgroundColor: isSelected ? "#ecfdf5" : "#f8faf8",
                      border: isSelected ? "1.5px solid #16835b" : "1px solid #e5ebe6",
                      color: "#063c32",
                      fontSize: "13px",
                      fontWeight: 700,
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <MapPin size={15} color={isSelected ? "#16835b" : "#62746a"} />
                      <span>{zone.address}</span>
                    </div>
                    {isSelected && <CheckCircle2 size={16} color="#16835b" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
