"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  MAPBOX_TOKEN,
  getMapStyle,
  searchAddressGeocode,
  reverseGeocode,
  GeocodingResult,
} from "@/lib/api/map";
import { Search, MapPin, Check, Loader2, Crosshair, AlertCircle } from "lucide-react";

export interface SelectedAddressCoords {
  latitude: number;
  longitude: number;
  address_line1: string;
  city: string;
  pincode: string;
}

interface AddressPickerMapProps {
  initialLat?: number;
  initialLng?: number;
  onConfirmLocation: (coords: SelectedAddressCoords) => void;
  height?: string;
}

export function AddressPickerMap({
  initialLat,
  initialLng,
  onConfirmLocation,
  height = "380px",
}: AddressPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const hasInitialCoordinates =
    initialLat != null && initialLng != null &&
    Number.isFinite(initialLat) && Number.isFinite(initialLng) &&
    initialLat >= -90 && initialLat <= 90 && initialLng >= -180 && initialLng <= 180;
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(
    hasInitialCoordinates ? { lat: initialLat!, lng: initialLng! } : null
  );
  const [resolvedAddress, setResolvedAddress] = useState<SelectedAddressCoords | null>(null);

  // Initialize the map only after a real coordinate is selected.
  useEffect(() => {
    if (!currentCoords || !containerRef.current || mapRef.current) return;

    let mapboxgl: any;
    let isCancelled = false;

    import("mapbox-gl").then((module) => {
      if (isCancelled || !containerRef.current) return;
      mapboxgl = module.default || module;
      if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: getMapStyle(),
        center: [currentCoords.lng, currentCoords.lat],
        zoom: 14,
        attributionControl: false,
      });

      mapRef.current = map;

      map.on("load", () => {
        if (isCancelled) return;

        // Custom draggable red pin marker
        const el = document.createElement("div");
        el.style.cssText = `
          width: 38px;
          height: 38px;
          background: #dc2626;
          border: 3px solid #ffffff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
          cursor: grab;
        `;
        const inner = document.createElement("div");
        inner.style.cssText = "transform: rotate(45deg); font-size: 16px;";
        inner.textContent = "📍";
        el.appendChild(inner);

        const marker = new mapboxgl.Marker({ element: el, draggable: true, anchor: "bottom" })
          .setLngLat([currentCoords.lng, currentCoords.lat])
          .addTo(map);

        markerRef.current = marker;

        // Update coordinates on drag end
        marker.on("dragend", async () => {
          const lngLat = marker.getLngLat();
          handleLocationSelected(lngLat.lat, lngLat.lng);
        });
        map.on("error", () => {
          setLocationError("The map could not load tiles. Search for an address or use GPS instead.");
        });

        // Click on map moves marker
        map.on("click", (e: any) => {
          marker.setLngLat(e.lngLat);
          handleLocationSelected(e.lngLat.lat, e.lngLat.lng);
        });
      });
    }).catch((error) => {
      console.warn("Failed to load address map:", error);
      setLocationError("The map could not load. Search for an address or try again.");
    });

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [Boolean(currentCoords)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hasInitialCoordinates) void handleLocationSelected(initialLat!, initialLng!);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLocationSelected(lat: number, lng: number) {
    setCurrentCoords({ lat, lng });
    setLocationError("");
    setIsReverseGeocoding(true);
    try {
      const geo = await reverseGeocode(lat, lng);
      if (!geo?.place_name) {
        setResolvedAddress({ latitude: lat, longitude: lng, address_line1: "", city: "", pincode: "" });
        setLocationError("Address lookup failed. Search for an address or enter the address details below.");
        return;
      }
      setResolvedAddress({
        latitude: lat,
        longitude: lng,
        address_line1: geo.place_name,
        city: geo.city || "",
        pincode: geo.pincode || "",
      });
    } catch {
      setResolvedAddress({ latitude: lat, longitude: lng, address_line1: "", city: "", pincode: "" });
      setLocationError("Address lookup failed. Search for an address or enter the address details below.");
    } finally {
      setIsReverseGeocoding(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setLocationError("");
    try {
      const results = await searchAddressGeocode(searchQuery);
      setSearchResults(results);
      if (results.length === 0) setLocationError("No matching addresses found. Try a nearby street or locality.");
    } catch {
      setLocationError("Address search is unavailable. Try again or use your current location.");
    } finally {
      setIsSearching(false);
    }
  }

  function handleSelectResult(r: GeocodingResult) {
    setSearchResults([]);
    setSearchQuery(r.place_name);
    setCurrentCoords({ lat: r.latitude, lng: r.longitude });
    setResolvedAddress({
      latitude: r.latitude,
      longitude: r.longitude,
      address_line1: r.place_name,
      city: r.city || "",
      pincode: r.pincode || "",
    });
    setLocationError("");

    if (mapRef.current) {
      mapRef.current.flyTo({ center: [r.longitude, r.latitude], zoom: 15 });
    }
    if (markerRef.current) {
      markerRef.current.setLngLat([r.longitude, r.latitude]);
    }
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("Location isn’t available on this device. Search for an address instead.");
      return;
    }
    setIsLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void handleLocationSelected(position.coords.latitude, position.coords.longitude)
          .finally(() => setIsLocating(false));
      },
      (error) => {
        setIsLocating(false);
        setLocationError(error.code === 1
          ? "Location permission was denied. Search for your address instead."
          : "Current location is unavailable. Search for your address instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const canConfirm = Boolean(
    resolvedAddress?.address_line1.trim() &&
    resolvedAddress.city.trim() &&
    resolvedAddress.pincode.trim() &&
    !isReverseGeocoding
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{ position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: "#ffffff",
            border: "1.5px solid #e1e8e2",
            borderRadius: "12px",
            padding: "10px 14px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
          }}
        >
          <Search size={18} color="#62746a" />
          <input
            type="text"
            placeholder="Search address or area in Solapur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "13.5px",
              color: "#13221b",
            }}
          />
          <button
            type="submit"
            disabled={isSearching}
            style={{
              padding: "6px 14px",
              backgroundColor: "#16835b",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "12.5px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {isSearching ? <Loader2 size={14} className="animate-spin" /> : "Search"}
          </button>
        </div>

        {/* Dropdown Results */}
        {searchResults.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              backgroundColor: "#ffffff",
              border: "1px solid #e1e8e2",
              borderRadius: "12px",
              marginTop: "6px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              zIndex: 30,
              overflow: "hidden",
            }}
          >
            {searchResults.map((r, i) => (
              <div
                key={i}
                onClick={() => handleSelectResult(r)}
                style={{
                  padding: "10px 14px",
                  borderBottom: i < searchResults.length - 1 ? "1px solid #f4f7f3" : "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f4f7f3")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
              >
                <MapPin size={16} color="#16835b" />
                <span style={{ color: "#13221b" }}>{r.place_name}</span>
              </div>
            ))}
          </div>
        )}
      </form>

      <button type="button" onClick={handleUseCurrentLocation} disabled={isLocating} className="text-button">
        {isLocating ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} />}
        Use current location
      </button>
      {locationError ? (
        <p role="alert" style={{ margin: 0, color: "#b91c1c", fontSize: "12px", display: "flex", alignItems: "center", gap: 6 }}>
          <AlertCircle size={14} /> {locationError}
        </p>
      ) : null}

      {/* Map Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height,
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid #e1e8e2",
        }}
      >
        {currentCoords ? (
          <div ref={containerRef} style={{ width: "100%", height: "100%", backgroundColor: "#e9f6ee" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", padding: 24, textAlign: "center", color: "#62746a", backgroundColor: "#f4f7f3" }}>
            Search for an address or use your current location to place a pin.
          </div>
        )}

        {/* Hint banner */}
        {currentCoords ? <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "12px",
            right: "12px",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(4px)",
            padding: "8px 14px",
            borderRadius: "10px",
            border: "1px solid #e1e8e2",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "#063c32",
            fontWeight: 600,
          }}
        >
          <span>📍 Drag pin or tap on map to adjust exact doorstep location</span>
          {isReverseGeocoding && <Loader2 size={14} className="animate-spin" color="#16835b" />}
        </div> : null}
      </div>

      {/* Selected Coordinates & Confirmation */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e1e8e2",
          borderRadius: "14px",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ flex: 1, minWidth: "220px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "11.5px", color: "#62746a", fontWeight: 700, textTransform: "uppercase" }}>
            Selected Doorstep Coordinates
          </p>
          {resolvedAddress ? (
            <>
              <p style={{ margin: 0, fontSize: "13.5px", fontWeight: 700, color: "#063c32" }}>
                Lat: {resolvedAddress.latitude.toFixed(6)}, Lng: {resolvedAddress.longitude.toFixed(6)}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
                {resolvedAddress.address_line1}
              </p>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: "12px", color: "#62746a" }}>
              No address selected yet.
            </p>
          )}
        </div>

        {resolvedAddress ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "8px", marginTop: "10px" }}>
          <label style={{ display: "grid", gap: "4px", fontSize: "11px", color: "#62746a" }}>
            Address
            <input
              required
              value={resolvedAddress.address_line1}
              onChange={(event) => setResolvedAddress((current) => current ? { ...current, address_line1: event.target.value } : current)}
              aria-label="Address line"
              style={{ minWidth: 0, padding: "8px", border: "1px solid #dce8df", borderRadius: "8px" }}
            />
          </label>
          <label style={{ display: "grid", gap: "4px", fontSize: "11px", color: "#62746a" }}>
            City
            <input
              required
              value={resolvedAddress.city}
              onChange={(event) => setResolvedAddress((current) => current ? { ...current, city: event.target.value } : current)}
              aria-label="City"
              style={{ minWidth: 0, padding: "8px", border: "1px solid #dce8df", borderRadius: "8px" }}
            />
          </label>
          <label style={{ display: "grid", gap: "4px", fontSize: "11px", color: "#62746a" }}>
            Pincode
            <input
              required
              inputMode="numeric"
              value={resolvedAddress.pincode}
              onChange={(event) => setResolvedAddress((current) => current ? { ...current, pincode: event.target.value.replace(/\D/g, "").slice(0, 10) } : current)}
              aria-label="Pincode"
              style={{ minWidth: 0, padding: "8px", border: "1px solid #dce8df", borderRadius: "8px" }}
            />
          </label>
        </div>
      ) : null}

      {resolvedAddress ? (
        <button
          type="button"
          onClick={() => { if (canConfirm && resolvedAddress) onConfirmLocation(resolvedAddress); }}
          disabled={!canConfirm}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            backgroundColor: canConfirm ? "#063c32" : "#94a3b8",
            color: "#ffffff",
            border: "none",
            borderRadius: "10px",
            fontSize: "13.5px",
            fontWeight: 800,
            cursor: canConfirm ? "pointer" : "not-allowed",
            boxShadow: "0 2px 8px rgba(6, 60, 50, 0.2)",
          }}
        >
          <Check size={16} /> Confirm Location
        </button>
      ) : null}
      </div>
    </div>
  );
}
