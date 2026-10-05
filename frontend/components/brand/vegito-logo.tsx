"use client";

import React from "react";

export interface VegitoLogoProps {
  variant?: "full" | "compact" | "icon" | "mark";
  animated?: boolean;
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  colorMode?: "light" | "dark" | "auto";
  showTagline?: boolean;
}

/**
 * VegitoLogo — Official Animated Delivery Rider Logo Suite
 * Communicates: VEGETABLES + DELIVERY PERSON + MOTORBIKE + FAST DELIVERY
 * 100% Crisp Vector SVG with optional subtle CSS animation and reduced-motion support.
 */
export function VegitoLogo({
  variant = "full",
  animated = true,
  size,
  className = "",
  style = {},
  colorMode = "auto",
  showTagline = true,
}: VegitoLogoProps) {
  const isDark = colorMode === "dark";
  const textColor = isDark ? "#ffffff" : "var(--vegito-logo-text, #063c32)";
  const tagColor = isDark ? "#34d399" : "#16835b";

  // Calculate default heights/widths based on variant
  const defaultHeight = variant === "full" ? (size ?? 44) : (size ?? 38);

  return (
    <div
      className={`vegito-brand-logo ${animated ? "vegito-logo-animated" : ""} ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: variant === "full" ? "10px" : "0",
        textDecoration: "none",
        userSelect: "none",
        ...style,
      }}
      aria-label="Vegito - Fresh Vegetables Delivered Fast"
    >
      <style jsx>{`
        @keyframes vegitoRiderCruise {
          0%, 100% {
            transform: translate(0, 0);
          }
          40% {
            transform: translate(3px, -1px);
          }
          65% {
            transform: translate(4px, 0.5px);
          }
          85% {
            transform: translate(1px, -0.5px);
          }
        }

        @keyframes vegitoBasketBounce {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
          }
          45% {
            transform: translate(0.5px, -2.5px) rotate(1.5deg);
          }
          70% {
            transform: translate(-0.5px, 0.8px) rotate(-1deg);
          }
        }

        @keyframes vegitoSpeedDash {
          0%, 100% {
            opacity: 0.15;
            transform: translateX(0);
          }
          50% {
            opacity: 0.95;
            transform: translateX(-4px);
          }
        }

        @keyframes vegitoWheelSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .vegito-logo-animated .anim-rider-group {
          animation: vegitoRiderCruise 3.6s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
        }

        .vegito-logo-animated .anim-basket-group {
          animation: vegitoBasketBounce 3.6s cubic-bezier(0.35, 0.1, 0.25, 1) infinite;
          transform-origin: 38px 72px;
        }

        .vegito-logo-animated .anim-speed-line {
          animation: vegitoSpeedDash 2.4s ease-in-out infinite;
        }

        @media (max-width: 480px) {
          .vegito-brand-logo.responsive-hide-mobile-text .vegito-text-group {
            display: none !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .vegito-logo-animated .anim-rider-group,
          .vegito-logo-animated .anim-basket-group,
          .vegito-logo-animated .anim-speed-line {
            animation: none !important;
          }
        }
      `}</style>

      {/* ── VECTOR ICON EMBED ── */}
      <svg
        viewBox="0 0 140 110"
        width={typeof defaultHeight === "number" ? defaultHeight * 1.27 : defaultHeight}
        height={defaultHeight}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: "visible", flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="vJacketGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#16835b" />
            <stop offset="100%" stopColor="#0a4d3c" />
          </linearGradient>
          <linearGradient id="vBikeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
          <linearGradient id="vCrateGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f766e" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>
          <filter id="vSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Dynamic Speed Lines (behind bike) */}
        <g className="anim-speed-line" opacity="0.6">
          <line x1="8" y1="92" x2="24" y2="92" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="2" y1="78" x2="18" y2="78" stroke="#34d399" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          <line x1="12" y1="64" x2="22" y2="64" stroke="#6ee7b7" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
        </g>

        {/* Main Rider & Bike Dynamic Unit */}
        <g className="anim-rider-group">
          {/* Ground Contact Shadow */}
          <ellipse cx="72" cy="103" rx="48" ry="4" fill="rgba(6, 60, 50, 0.18)" />

          {/* ── 1. MOTORBIKE / SCOOTER ── */}
          {/* Rear Wheel */}
          <g>
            <circle cx="36" cy="88" r="16" fill="#1e293b" />
            <circle cx="36" cy="88" r="11" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
            <circle cx="36" cy="88" r="5" fill="#16835b" />
          </g>

          {/* Front Wheel */}
          <g>
            <circle cx="106" cy="88" r="16" fill="#1e293b" />
            <circle cx="106" cy="88" r="11" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
            <circle cx="106" cy="88" r="5" fill="#16835b" />
          </g>

          {/* Modern Scooter Body Chassis */}
          <path
            d="M 38 88 L 52 74 L 82 74 L 102 88 L 94 62 L 76 68 L 54 68 Z"
            fill="url(#vBikeGrad)"
          />
          {/* Scooter Footboard / Underbody */}
          <path
            d="M 50 82 L 84 82 L 80 88 L 48 88 Z"
            fill="#0f172a"
          />

          {/* Front Steering Fork & Handlebars */}
          <path
            d="M 106 88 L 95 52 L 88 48"
            stroke="#1e293b"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="87" cy="48" r="3.5" fill="#0f172a" />

          {/* Bright Modern LED Headlight */}
          <path
            d="M 98 56 L 107 58 L 98 63 Z"
            fill="#f59e0b"
            filter="url(#vSoftGlow)"
          />
          <ellipse cx="106" cy="59" rx="1.5" ry="3" fill="#ffffff" />

          {/* ── 2. VEGETABLE DELIVERY BASKET / CRATE ── */}
          <g className="anim-basket-group">
            {/* The Mounted Carrier Crate */}
            <rect
              x="22"
              y="54"
              width="26"
              height="20"
              rx="4"
              fill="url(#vCrateGrad)"
              stroke="#042f2e"
              strokeWidth="1.2"
            />
            {/* Crate Aeration Slats */}
            <line x1="25" y1="60" x2="45" y2="60" stroke="#14b8a6" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
            <line x1="25" y1="66" x2="45" y2="66" stroke="#14b8a6" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />

            {/* ── FRESH VEGETABLES OVERFLOWING ── */}
            {/* Crisp Leafy Greens / Palak / Cabbage */}
            <path
              d="M 23 54 C 20 46, 26 40, 31 46 C 36 40, 43 44, 40 54 Z"
              fill="#22c55e"
            />
            <path
              d="M 28 54 C 27 46, 33 42, 36 48 Z"
              fill="#4ade80"
            />
            {/* Central Leaf Vein */}
            <path
              d="M 31 52 Q 32 45 34 43"
              stroke="#15803d"
              strokeWidth="1"
              strokeLinecap="round"
            />

            {/* Fresh Red Tomato */}
            <circle cx="43" cy="52" r="6" fill="#ef4444" />
            {/* Tomato Highlight */}
            <circle cx="41.5" cy="49.5" r="1.5" fill="#fca5a5" />
            {/* Tomato Stem Crown */}
            <path
              d="M 43 46 L 42 44 M 43 46 L 45 45 M 43 46 L 43 43"
              stroke="#15803d"
              strokeWidth="1.2"
              strokeLinecap="round"
            />

            {/* Crisp Fresh Carrot Angled */}
            <path
              d="M 36 50 L 48 38 C 49 37, 51 39, 49 41 L 38 53 Z"
              fill="#f97316"
            />
            {/* Carrot Leaf Top */}
            <path
              d="M 49 38 L 54 34 M 49 38 L 52 32 M 50 39 L 55 38"
              stroke="#22c55e"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </g>

          {/* ── 3. FRIENDLY DELIVERY RIDER ── */}
          {/* Rider Legs & Pants */}
          <path
            d="M 52 68 L 65 74 L 74 84"
            stroke="#0f172a"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Rider Jacket / Torso in Vegito Green */}
          <path
            d="M 48 66 L 56 46 L 75 48 L 70 70 Z"
            fill="url(#vJacketGrad)"
            stroke="#064e3b"
            strokeWidth="1"
          />

          {/* Rider Forward Arm steering handlebar */}
          <path
            d="M 68 50 L 80 56 L 87 49"
            stroke="#16835b"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Rider Glove */}
          <circle cx="87" cy="49" r="3" fill="#0f172a" />

          {/* Rider Helmet / Head */}
          <circle cx="66" cy="34" r="11" fill="#0f172a" />
          {/* Helm Visor & Vegito Emerald Stripe */}
          <path
            d="M 66 25 C 72 25, 77 29, 77 35 L 68 35 Z"
            fill="#10b981"
          />
          {/* Visor Glint */}
          <path
            d="M 72 32 L 77 33 L 73 35 Z"
            fill="#67e8f9"
          />
        </g>
      </svg>

      {/* ── WORDMARK (Full variant) ── */}
      {variant === "full" && (
        <div className="vegito-text-group" style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
            <span
              style={{
                fontSize: "24px",
                fontWeight: 900,
                color: textColor,
                letterSpacing: "-0.04em",
                fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
              }}
            >
              Vegito
            </span>
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "#22c55e",
                display: "inline-block",
                marginLeft: "2px",
              }}
            />
          </div>
          {showTagline && (
            <span
              style={{
                fontSize: "9px",
                fontWeight: 800,
                color: tagColor,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginTop: "2px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              FRESH • SMART • FAST
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default VegitoLogo;
