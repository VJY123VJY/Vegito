"use client";

import React, { useEffect, useState } from "react";
import {
  MapPin,
  Search,
  Mic,
  X,
  Sparkles,
  ChevronDown,
  ShoppingBag,
} from "lucide-react";

interface CustomerHeroProps {
  selectedLocation: string;
  onOpenLocationModal: () => void;
  userName?: string;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onOpenVoiceModal?: () => void;
}

export function CustomerHero({
  selectedLocation,
  onOpenLocationModal,
  userName,
  searchQuery,
  onSearchChange,
  onOpenVoiceModal,
}: CustomerHeroProps) {
  const [greeting, setGreeting] = useState("Welcome");

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 21 ? "Good evening" : "Welcome back");
  }, []);

  return (
    <section
      aria-label="Welcome and search"
      style={{
        position: "relative",
        borderRadius: "28px",
        overflow: "hidden",
        background: "linear-gradient(135deg, #063c32 0%, #0d5843 55%, #16835b 100%)",
        color: "#ffffff",
        padding: "30px 24px 28px",
        boxShadow: "0 14px 40px rgba(6, 60, 50, 0.16)",
      }}
    >
      {/* ── FLOATING ANIMATED FRESH PRODUCE ────────────────────── */}
      <div
        className="animate-float-1"
        style={{
          position: "absolute",
          top: "14px",
          right: "24px",
          fontSize: "36px",
          opacity: 0.32,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        🍅
      </div>
      <div
        className="animate-float-2"
        style={{
          position: "absolute",
          bottom: "18px",
          right: "90px",
          fontSize: "32px",
          opacity: 0.28,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        🥕
      </div>
      <div
        className="animate-float-3"
        style={{
          position: "absolute",
          top: "40px",
          right: "170px",
          fontSize: "28px",
          opacity: 0.24,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        🥬
      </div>
      <div
        className="animate-float-1"
        style={{
          position: "absolute",
          bottom: "25px",
          left: "240px",
          fontSize: "26px",
          opacity: 0.18,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        🥔
      </div>

      {/* Hero Content */}
      <div style={{ position: "relative", zIndex: 2 }}>
        {/* Dynamic Greeting */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#a7f3d0" }}>
            {greeting} {userName ? `, ${userName.split(" ")[0]}` : ""} 👋
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            margin: "0 0 10px",
            fontSize: "clamp(24px, 5.5vw, 34px)",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 1.18,
            color: "#ffffff",
          }}
        >
          Fresh choices for the way you cook.
        </h1>

        {/* Location selector button */}
        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={onOpenLocationModal}
            aria-label="Change delivery location"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "6px 14px",
              borderRadius: "999px",
              backgroundColor: "rgba(255, 255, 255, 0.16)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              color: "#ffffff",
              fontSize: "12.5px",
              fontWeight: 700,
              cursor: "pointer",
              maxWidth: "100%",
            }}
          >
            <MapPin size={14} color="#34d399" style={{ flexShrink: 0 }} />
            <span
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "260px",
              }}
            >
              {selectedLocation || "Choose delivery location"}
            </span>
            <ChevronDown size={14} color="#34d399" style={{ flexShrink: 0 }} />
          </button>
        </div>

        {/* Interactive Search Bar inside Hero */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            padding: "2px 14px",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.15)",
          }}
        >
          <Search size={18} color="#62746a" style={{ flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search vegetables, fruits, tomatoes, milk..."
            style={{
              width: "100%",
              height: "46px",
              padding: "0 12px",
              border: "none",
              backgroundColor: "transparent",
              outline: "none",
              fontSize: "14px",
              fontWeight: 600,
              color: "#063c32",
            }}
          />

          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              style={{
                background: "none",
                border: "none",
                color: "#62746a",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={16} />
            </button>
          )}

          {onOpenVoiceModal && (
            <button
              onClick={onOpenVoiceModal}
              title="Voice Search produce"
              aria-label="Voice search"
              style={{
                background: "none",
                border: "none",
                color: "#16835b",
                cursor: "pointer",
                padding: "6px 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Mic size={18} />
            </button>
          )}
        </div>

        {/* Feature Pills */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginTop: "16px",
            fontSize: "11.5px",
            fontWeight: 700,
            color: "rgba(255, 255, 255, 0.9)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Sparkles size={13} color="#34d399" /> Current seller listings
          </span>
          <span>•</span>
          <span>Availability checked at checkout</span>
        </div>
      </div>
    </section>
  );
}
