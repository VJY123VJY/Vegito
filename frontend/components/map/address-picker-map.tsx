"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  MAPBOX_TOKEN,
  DEFAULT_SOLAPUR_COORDS,
  getMapStyle,
  searchAddressGeocode,
  reverseGeocode,
  GeocodingResult,
} from "@/lib/api/map";
import { Search, MapPin, Check, Loader2 } from "lucide-react";

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

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat || DEFAULT_SOLAPUR_COORDS[1],
    lng: initialLng || DEFAULT_SOLAPUR_COORDS[0],
  });

  const [resolvedAddress, setResolvedAddress] = useState<SelectedAddressCoords>({
    latitude: initialLat || DEFAULT_SOLAPUR_COORDS[1],
    longitude: initialLng || DEFAULT_SOLAPUR_COORDS[0],
    address_line1: "Selected Location, Solapur",
    city: "Solapur",
    pincode: "413001",
  });

  // Initialize Mapbox map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

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

        // Click on map moves marker
        map.on("click", (e: any) => {
          marker.setLngLat(e.lngLat);
          handleLocationSelected(e.lngLat.lat, e.lngLat.lng);
        });
      });
    });

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLocationSelected(lat: number, lng: number) {
    setCurrentCoords({ lat, lng });
    setIsReverseGeocoding(true);
    try {
      const geo = await reverseGeocode(lat, lng);
      if (geo) {
        setResolvedAddress({
          latitude: lat,
          longitude: lng,
          address_line1: geo.place_name,
          city: geo.city || "Solapur",
          pincode: geo.pincode || "413001",
        });
      }
    } finally {
      setIsReverseGeocoding(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchAddressGeocode(searchQuery);
      setSearchResults(results);
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
      city: r.city || "Solapur",
      pincode: r.pincode || "413001",
    });

    if (mapRef.current) {
      mapRef.current.flyTo({ center: [r.longitude, r.latitude], zoom: 15 });
    }
    if (markerRef.current) {
      markerRef.current.setLngLat([r.longitude, r.latitude]);
    }
  }

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
        <div ref={containerRef} style={{ width: "100%", height: "100%", backgroundColor: "#e9f6ee" }} />

        {/* Hint banner */}
        <div
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
        </div>
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
          <p style={{ margin: 0, fontSize: "13.5px", fontWeight: 700, color: "#063c32" }}>
            Lat: {currentCoords.lat.toFixed(6)}, Lng: {currentCoords.lng.toFixed(6)}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
            {resolvedAddress.address_line1}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onConfirmLocation(resolvedAddress)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            backgroundColor: "#063c32",
            color: "#ffffff",
            border: "none",
            borderRadius: "10px",
            fontSize: "13.5px",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(6, 60, 50, 0.2)",
          }}
        >
          <Check size={16} /> Confirm Location
        </button>
      </div>
    </div>
  );
}
