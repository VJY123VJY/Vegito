# VEGITO DESIGN SYSTEM & MOTION SPECIFICATION
**Version:** 3.0-PREMIUM  
**Philosophy:** Fresh • Fast • Smart • Local • Trusted  
**Identity:** Next-Generation Mandai & APMC Fresh Grocery Technology Platform

---

## 1. Brand Identity & Visual Language

VEGITO is not a generic food-delivery app or a clone of any instant-grocery platform. It bridges the authentic, organic vitality of Indian Mandais (APMC local agricultural markets) with high-precision AI freshness intelligence and privacy-centric logistics.

### Core Visual Pillars:
1. **Living Freshness (Organic Vitality):** Deep forest emeralds, crisp dewy leaf greens, and sun-ripened citrus accents. Produce visuals are treated with natural textures rather than synthetic neon glows.
2. **Precision Engineering (Fintech-Grade Clarity):** Clean geometric typography, balanced padding, crisp hairline borders (`0.5dp`), and zero visual noise.
3. **Contextual Motion (Purposeful Dynamics):** Every animation communicates state change, feedback, or spatial orientation. No gratuitous jumping or childish bouncy loops.
4. **Doorstep Privacy Guarantee:** Visual cues and masked state indicators honoring strict customer doorstep GPS privacy until authorized seller pickup verification.

---

## 2. Design Tokens

### 2.1 Color Palette

| Token Name | Hex Code | Purpose / Usage |
| :--- | :--- | :--- |
| `VegitoPrimary` | `#0A4D3C` | Deep Mandi Emerald. Main brand tone, hero headers, primary buttons. |
| `VegitoPrimaryLight` | `#2E7D32` | Forest Green. Vibrant action states, success confirmations, active pills. |
| `VegitoMint` | `#00C853` | Dewy Mint. Freshness badges, live rider pulse, delivery en-route dots. |
| `VegitoSecondary` | `#FF6D00` | Sunburst Harvest Orange. Flash offers, discount callouts, urgent alerts. |
| `VegitoAccent` | `#FFAB00` | Solar Amber. Rating stars, warnings, harvest tags. |
| `FreshHigh` | `#1B5E20` | ≥ 85% Freshness. Deep organic green. |
| `FreshMid` | `#E65100` | 70%–84% Freshness. Amber-gold harvest. |
| `FreshLow` | `#C62828` | < 70% Freshness. Urgent clearance / discount marker. |
| `SurfaceLight` | `#FFFFFF` | Primary card background in light theme. |
| `BackgroundLight` | `#F8FAF6` | Soft pearl mist background in light theme. |
| `SurfaceDark` | `#1A201C` | Charcoal forest card surface in dark theme. |
| `BackgroundDark` | `#0D120F` | Midnight earth background in dark theme. |

### 2.2 Gradients

- **Emerald Dawn (Hero Gradient):** Linear gradient from `#0A4D3C` (0%) to `#1B5E20` (60%) to `#2E7D32` (100%).
- **Harvest Sunset (Offer Accent):** Linear gradient from `#FF6D00` to `#FF9100`.
- **Dewy Fresh Glass (Surface Overlay):** Radial highlight `Color.White.copy(alpha = 0.08f)` at top-left corner of cards.

### 2.3 Typography Hierarchy

- **Hero Title / Numbers:** Bold / ExtraBold Geometric (24sp - 32sp). Crisp tabular numerals for prices and stock counts.
- **Section Headers:** Bold 18sp - 20sp, letter spacing -0.2sp.
- **Card Titles:** SemiBold 14sp - 15sp, max 1-2 lines with graceful ellipsis.
- **Meta / Freshness / Badges:** Bold 10sp - 12sp uppercase tracking +0.5sp.
- **Body & Captions:** Regular / Medium 12sp - 14sp, high contrast for outdoor sunlight readability.

### 2.4 Spacing & Corner Radii

- **Grid Base:** 4dp incremental scale (4dp, 8dp, 12dp, 16dp, 20dp, 24dp, 32dp).
- **Corner Radii:**
  - Micro Badges & Chips: `8dp`
  - Compact Cards & Input Fields: `14dp`
  - Standard Cards & Modals: `20dp`
  - Hero Cards & Bottom Sheets: `28dp`
  - Avatars & Action Pills: `CircleShape` (Fully rounded)

---

## 3. Motion & Animation System

### 3.1 Timing Hierarchy

| Motion Category | Duration | Easing Spec | Use Case |
| :--- | :--- | :--- | :--- |
| **Micro-Interaction** | 120ms – 160ms | FastOutSlowIn (`CubicBezier(0.4, 0.0, 0.2, 1)`) | Button press scale, checkbox toggle, heart pop. |
| **Element Transition** | 200ms – 260ms | Standard Easing (`CubicBezier(0.2, 0.0, 0, 1)`) | Quantity +/-, tab switcher indicator, chip filter. |
| **Card / List Entrance**| 280ms – 360ms | Decelerate (`CubicBezier(0.0, 0.0, 0.2, 1)`) | Staggered product load, search results appearing. |
| **Modal & Sheet Slide** | 350ms – 420ms | Emphasized Decelerate (`CubicBezier(0.05, 0.7, 0.1, 1)`) | Bottom sheets, full-screen dialogs, tracking timeline. |
| **Living Ambient Motion**| 1800ms – 2400ms| Infinite Sine Wave | Live Rider pulse, ultra-fresh leaf dew glow. |

### 3.2 Physics & Micro-Interactions

1. **Spring Press Scale (`Modifier.bounceClick()`):**
   - On down-touch: Scale down to `0.95f` over 100ms.
   - On release / cancel: Spring back to `1.0f` with `dampingRatio = 0.7f` (gentle tactile responsiveness without cartoonish rubber-banding).
2. **Staggered Entrance Animation:**
   - Lazy lists stagger items with an index offset of `min(index * 35ms, 250ms)`.
   - Alpha animates from `0f` to `1f`, translation Y from `24dp` to `0dp`.
3. **Freshness Gauge Fill:**
   - Dynamic fill animation runs from `0f` to actual backend percentage over 600ms on first render.
4. **Error Shake (`Modifier.shakeOnError()`):**
   - On invalid OTP or validation failure: Subtle 3-cycle horizontal shake (-6dp, +6dp, -3dp, +3dp, 0dp) over 280ms.
5. **Reduced Motion Adaptation:**
   - Detects system animator duration scale. When animations are disabled, all durations collapse to `0ms` and transitions default to direct value assignment.

---

## 4. Component Design Specifications

### 4.1 Compact Product Card
- **Layout:** Vertical card with 1:1 produce viewport, rounded `14dp`.
- **Freshness Tag:** Top-left pill with live percentage and color-coded leaf icon.
- **Heart Favorite Button:** Top-right circular translucent pill with spring scale pop.
- **Price Block:** Dual-row layout: bold rupee amount + unit subtitle (`₹40 / kg`).
- **Interactive Add / Quantity Controller:**
  - Zero quantity: Clean bordered `ADD +` pill.
  - $\ge 1$ quantity: Solid emerald pill with `-`, count, and `+` touch targets (min 36dp touch target).

### 4.2 Zig-Zag Showcase Section
- **Alternating Asymmetric Composition:**
  - Even index: Hero image on the left (50% width), highlights/nutrition/APMC farm source on the right.
  - Odd index: Highlights on the left, hero produce image on the right.
- Gives the browse feed an editorial harvest magazine feel rather than a repetitive grid.

### 4.3 Premium Offer Carousel
- **Features:**
  - Auto-scrolling banner with touch-pause gesture support.
  - Multi-stop gradient backdrops reflecting produce colors (Mango gold, Apple crimson, Leafy green).
  - Expanding pill pagination dots that smoothly animate width (`8dp` $\rightarrow$ `24dp`) when active.
  - Real backend discounts, seller names, and 1-tap quick add.

### 4.4 Real-Time Map & Route Visualization (`VegitoMapView`)
- **Mapbox & Leaflet Hybrid Core:**
  - Smooth HTML5 canvas vector rendering.
  - Pulsing delivery rider marker with green radar ring.
  - Dynamic store and customer destination pins.
  - Animated route polyline.
  - Floating GPS recenter FAB with one-tap location acquisition.
  - Strict privacy rule: Customer doorstep coordinates remain hidden until seller pickup is completed.

### 4.5 Skeleton Loading States
- Replaces generic circular progress spinners with content-matching shimmer skeletons (`ProductCardSkeleton`, `OfferBannerSkeleton`, `OrderCardSkeleton`).
- Shimmer sweep: 1200ms linear gradient sweep across gray/tinted cards.

---

## 5. Accessibility & Localization

- **Contrast Ratios:** All text elements exceed WCAG AA standards (minimum 4.5:1 on background).
- **Touch Targets:** Minimum interactive touch target is 44dp $\times$ 44dp.
- **Trilingual Support:** Built-in localization support for **English**, **मराठी (Marathi)**, and **हिंदी (Hindi)** across all headers, status messages, and CTA buttons.
