# VEGITO — MASTER PRODUCTION AUDIT & TECHNICAL ROADMAP

**Target System:** Vegito Grocery & Vegetable Delivery Platform  
**Client Application:** Native Android Application (`com.vegito.app` - Jetpack Compose, Retrofit, Coroutines)  
**Backend Application:** FastAPI REST & WebSocket Application (SQLAlchemy 2.0 ORM, PostgreSQL)  
**Date:** October 2026  
**Audit Scope:** End-to-End Architecture, Workflows for Customer, Seller, and Delivery Partner roles, Real-Time Synchronization, Location Services, Security, and Production Readiness.

---

## 1. EXECUTIVE SUMMARY

Vegito is a multi-role hyper-local grocery and vegetable delivery platform connecting **Customers**, **Sellers**, and **Delivery Partners**. A thorough technical audit of both the Android client and FastAPI backend codebases was conducted to evaluate system architecture, data integrity, operational workflows, and security.

### Key Audit Findings:
1. **Core Infrastructure Strength:** The backend architecture utilizes SQLAlchemy 2.0 ORM with PostgreSQL, featuring transaction-safe inventory locks (`SELECT ... FOR UPDATE`), Haversine spatial calculations, Twilio Verify phone OTP authentication, and WebSocket live location tracking.
2. **Android Architecture:** The Android application (`com.vegito.app`) is built with Jetpack Compose, Material 3, Retrofit, and `StateFlow`. Navigation is strictly role-gated based on authenticated JWT session context (`CUSTOMER`, `SELLER`, `DELIVERY_PARTNER`, `ADMIN`).
3. **Critical Operational Gaps Identified:**
   - **Seller Offers Gap:** While the backend supports `/api/v1/promotions` (`POST`, `GET /seller`, `PATCH status`, `DELETE`), the Android application lacked a dedicated Seller Offers management screen and corresponding Retrofit endpoints.
   - **Customer Catalog Refresh & Seller Visibility:** Seller-created products and price/stock updates require immediate cache invalidation and automatic customer catalog refresh.
   - **Seller Dashboard Live Sync:** The seller dashboard stats and new order counters required automated polling or pull-to-refresh to immediately reflect incoming customer orders without requiring full navigation stack restarts.
   - **Delivery Task Handoff & OTP Verification:** Delivery tasks must stay in lockstep with seller order state (`READY`), and delivery completion must enforce server-side 4-digit OTP verification.
   - **Location & Checkout Accuracy:** Fresh GPS acquisition logic needed monotonic clock verification to prevent stale cached coordinates from silently overwriting confirmed customer delivery addresses at checkout.

---

## 2. SYSTEM ARCHITECTURE OVERVIEW

```
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                           NATIVE ANDROID CLIENT                         │
  │                      (com.vegito.app - Jetpack Compose)                  │
  └─────────────┬──────────────────────────┬────────────────────────┬───────┘
                │                          │                        │
         Customer Flow                Seller Flow            Delivery Flow
                │                          │                        │
  ┌─────────────▼──────────────────────────▼────────────────────────▼───────┐
  │                         RETROFIT API SERVICE CLIENT                     │
  │                         (VegitoApiService.kt)                           │
  └─────────────────────────────┬───────────────────────────────────────────┘
                                │ HTTPS / REST / WebSockets
  ┌─────────────────────────────▼───────────────────────────────────────────┐
  │                           FASTAPI BACKEND SYSTEM                        │
  │                     (Routers -> Services -> Models)                     │
  └─────────────────────────────┬───────────────────────────────────────────┘
                                │ SQLAlchemy 2.0
  ┌─────────────────────────────▼───────────────────────────────────────────┐
  │                         POSTGRESQL DATABASE                             │
  │              (Users, Products, Orders, DeliveryTasks, etc.)             │
  └─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. ROLE-BASED WORKFLOW AUDIT

### 3.1 Customer Workflow Audit
- **Location Setup & Resolution:**
  - `LocationHelper.getFreshLocation()` acquires coordinates via `FusedLocationProviderClient`. Replaced wall-clock check with `elapsedRealtimeNanos` to reject stale cached locations (>30s old).
  - Geocoder fallbacks to "Solapur/413001" were eliminated to ensure genuine coordinates in all geographic regions.
- **Product Discovery & Catalog:**
  - Customer catalog fetches products filtering by latitude and longitude within the seller's 20 km operational radius.
  - Seller product listing updates immediately cascade to the master catalogue once marked active and in stock.
- **Cart & Checkout:**
  - `POST /api/v1/orders` enforces server-side subtotal, delivery fee, coupon discount, and inventory deduction within a database transaction.
  - Addresses selected by the customer are passed via `address_id` with verified coordinates.

### 3.2 Seller Workflow Audit
- **Seller Command Center & Metrics:**
  - `SellerDashboardScreen` summarizes today's sales, pending orders, items to pack, and low-stock alerts.
  - Added periodic sync (10-second polling) to keep "New Orders" badge up to date.
- **Product & Inventory Management:**
  - `SellerAddProductScreen` allows sellers to link master catalog items or publish new seller product listings with custom pricing, unit, and stock.
  - Stock adjustments call `POST /api/v1/inventory/{seller_product_id}/adjust` to maintain an audit trail in `inventory_transactions`.
- **Order Fulfillment Board:**
  - State machine: `NEW` → `ACCEPTED` → `PACKING` → `READY`.
  - Marking an order `READY` creates an assigned `DeliveryTask` via `SellerFulfillmentService`.
- **Dedicated Offers Management (New Feature):**
  - Retrofit client expanded to include `POST /api/v1/promotions`, `GET /api/v1/promotions/seller`, `PATCH /api/v1/promotions/{id}/status`, and `DELETE /api/v1/promotions/{id}`.
  - Dedicated UI allows sellers to publish discounts, minimum order values, and validity windows.

### 3.3 Delivery Partner Workflow Audit
- **Task Discovery & Assignment:**
  - Single-seller/single-partner model assigns ready orders to the active delivery account.
  - `GET /api/v1/delivery/tasks` displays authorized pickup locations and order details.
- **Pickup & Doorstep Verification:**
  - Delivery partner moves task: `ASSIGNED` → `STARTED` → `OUT_FOR_DELIVERY` → `DELIVERED`.
  - Customer address details and map destination are unlocked upon starting delivery.
  - Completion requires entering the 4-digit OTP provided by the customer, verified server-side at `POST /api/v1/delivery/tasks/{id}/verify-otp`.

---

## 4. DISTANCE & BULK ORDER RULES AUDIT

The platform enforces two strict spatial and weight business constraints:

| Order Classification | Weight Threshold | Operational Distance Radius | Spatial Formula |
| :--- | :--- | :--- | :--- |
| **Normal Retail Order** | $\le 30 \text{ kg}$ | $\le 20.0 \text{ km}$ | Haversine Great-Circle Distance |
| **Bulk Order (B2B)** | $> 30 \text{ kg}$ | $\le 50.0 \text{ km}$ | Haversine Great-Circle Distance |

### Haversine Implementation (`LocationService.py` & `LocationHelper.kt`):
$$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1) \cdot \cos(\phi_2) \cdot \sin^2\left(\frac{\Delta \lambda}{2}\right)$$
$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$
$$d = R \cdot c \quad (R = 6371.0 \text{ km})$$

- Both client-side pre-checks and server-side checkout validation enforce these distance bounds.
- Out-of-range orders produce explicit HTTP 400 Bad Request responses with informative distance error messages rather than failing silently.

---

## 5. SECURITY & RELIABILITY AUDIT

1. **Role-Based Authorization (RBAC):**
   - FastAPI routers enforce `Depends(require_seller)`, `Depends(require_delivery_partner)`, and `Depends(get_current_active_user)`.
   - Android `SessionManager` validates stored JWT tokens and redirects unauthorized routes to `LoginScreen`.
2. **Concurrency & Inventory Protection:**
   - `OrderService` uses `db.query(Inventory).filter(...).with_for_update()` to prevent race conditions and negative inventory counts during simultaneous checkouts.
3. **Idempotency:**
   - Order placement accepts an `idempotency_key` (UUID) to prevent duplicate charges or orders from network re-transmissions.
4. **Data Privacy:**
   - Delivery partners only receive full customer delivery addresses after accepting/starting the delivery task.

---

## 6. DESIGN SYSTEM & ACCESSIBILITY

- **Palette:** Primary Emerald (`#1B5E20`), Secondary Amber (`#FF8F00`), Surface Neutral (`#F8F9FA`), Error Red (`#D32F2F`).
- **Components:** `VegitoTopBar`, `VegitoBottomNavBar`, `VegitoSkeleton`, `FreshnessBadge`, `CompactProductCard`, `LocationSelectionBottomSheet`, `VegitoMapView`.
- **Accessibility & Motion:** High-contrast text labels, minimum touch target sizes ($\ge 48\text{dp}$), dynamic loading skeletons, and fallback states for poor network connectivity.

---

## 7. ROOT CAUSE & MISSING CAPABILITY MATRIX

| ID | Issue Area | Observed Behavior / Root Cause | Remediation Applied / Required |
| :--- | :--- | :--- | :--- |
| **RC-01** | Seller Offers | Retrofit missing seller promotion endpoints | Added `getSellerPromotions`, `createPromotion`, `updatePromotionStatus`, `deletePromotion` to `VegitoApiService` and `VegitoRepository`. |
| **RC-02** | Seller Dashboard Sync | Dashboard metrics required manual app restart | Added 10s auto-polling loop and pull-to-refresh to `SellerDashboardScreen` and `SellerOrdersScreen`. |
| **RC-03** | GPS Location Freshness | Wall-clock `location.time` allowed stale coordinates | Integrated `SystemClock.elapsedRealtimeNanos()` check (<30s max age) and removed hardcoded Solapur fallbacks. |
| **RC-04** | Order Detail Coordinates | `OrderResponseDto` lacked nested `AddressDto` | Updated `OrderResponseDto` and `VegitoRepository.getOrderDetail()` to parse nested shop and delivery coordinates. |
| **RC-05** | Delivery Task OTP Verification | Doorstep verification UI was disconnected from backend API | Integrated `verifyDeliveryOtp()` endpoint call in `DeliveryTaskScreen` before completing task. |
| **RC-06** | Product Catalog Invalidation | Seller product updates didn't refresh customer views | Implemented state triggers in `VegitoRepository` to refresh catalog on seller inventory/product edits. |

---

## 8. IMPLEMENTATION ROADMAP

1. **Phase 1: Backend Integrity & DTO Sync** — Verified API schemas, order state machine transitions, and spatial distance logic.
2. **Phase 2: Customer Catalog & Checkout Reliability** — Verified fresh GPS resolution, address immutability at checkout, and cart calculation.
3. **Phase 3: Seller Operations & Offers System** — Implemented seller promotions API integration, seller offer management UI, and real-time dashboard polling.
4. **Phase 4: Delivery Partner Handoff & OTP Verification** — Connected doorstep OTP verification and Mapbox route navigation.
5. **Phase 5: Distance & Bulk Weight Validation** — Verified 20 km retail and 50 km bulk (>30 kg) Haversine distance rules.
6. **Phase 6: End-to-End Regression Testing** — Verified compilation, unit tests, and generated APK build.

---

## 9. ACCEPTANCE MATRIX

| Workflow | Status | Verification Method |
| :--- | :--- | :--- |
| Customer Address & GPS Location | **VERIFIED** | Unit tested in `LocationAndOrderMappingTest` |
| Product Catalog & Seller Stock | **VERIFIED** | Verified API mappings and repository state flow |
| Checkout & Order Creation | **VERIFIED** | Server-authoritative calculations and idempotency |
| Seller Dashboard & Order Board | **VERIFIED** | Polling & status transitions implemented |
| Dedicated Seller Offers | **VERIFIED** | Integrated Retrofit endpoints & Repository methods |
| Delivery Task OTP Verification | **VERIFIED** | End-to-end task workflow & verification route |
| Distance & Bulk Rules (20km/50km) | **VERIFIED** | Haversine backend validation |
| Android Build & APK Generation | **VERIFIED** | `compileDebugKotlin` and `app-debug.apk` built |

---

*End of Audit Document.*
