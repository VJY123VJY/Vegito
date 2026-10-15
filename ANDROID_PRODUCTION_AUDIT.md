# Vegito Android Production Audit

## 1. Executive Summary
The Vegito Android application (`com.vegito.app`) is a native Kotlin application built with Jetpack Compose, Retrofit, Firebase Authentication, and integrated with Capacitor for hybrid web/native bridge components. The codebase contains robust implementations for Customer shopping, Seller order management, Delivery partner dispatch, and Admin analytics, connected to a FastAPI backend (`https://vegito-git-main-vijaydhavan04-1868s-projects.vercel.app/`).

## 2. Architecture & Tech Stack
- **Language**: Kotlin 2.0.21, Coroutines, StateFlow.
- **UI Framework**: Jetpack Compose (Material 3, Material Icons Extended).
- **Network**: Retrofit 2.11.0 with Gson converter and OkHttp Logging Interceptor.
- **Authentication**: Firebase Auth (Phone OTP) + Backend JWT token exchange via `SessionManager`.
- **Location & Maps**: Google Play Services Fused Location Provider and Mapbox / custom Map views (`VegitoMapView`).
- **Build System**: Gradle 8.x with Android Gradle Plugin 8.13.0, compile/target SDK 36, min SDK 24.

## 3. Core Modules & Features Audit
- **Authentication (`presentation/auth`)**:
  - `LoginScreen`, `OtpScreen`, `RegisterScreen`, `OnboardingScreen`.
  - Integrates `FirebaseAuthManager` for phone number authentication and OTP verification.
- **Customer Experience (`presentation/customer`)**:
  - `CustomerHomeScreen`, `ProductDetailScreen`, `CartScreen`, `CheckoutScreen`, `OrderTrackingScreen`, `AddressesScreen`, `FavoritesScreen`, `SearchScreen`.
  - Supports product catalog browsing, cart management, address selection, order placement, and tracking.
- **Seller Workflows (`presentation/seller`)**:
  - `SellerDashboardScreen`, `SellerOrdersScreen`, `SellerProductsScreen`, `SellerInventoryScreen`, `SellerAnalyticsScreen`, `SellerSettingsScreen`.
  - Handles order fulfillment (accept/reject, pack, ready for pickup), product inventory management, and analytics.
- **Delivery Partner Workflows (`presentation/delivery`)**:
  - `DeliveryDashboardScreen`, `DeliveryTaskScreen`, `DeliveryEarningsScreen`, `DeliveryMapScreen`.
  - Manages assigned delivery tasks, pickup verification, and customer delivery completion via OTP.
- **Admin Dashboards (`presentation/admin`)**:
  - `AdminDashboardScreen`, `AdminOrdersScreen`, `AdminSellersScreen`, `AdminDeliveryScreen`.
- **Repository & State (`data/repository`, `data/local`, `data/remote`)**:
  - `VegitoRepository` coordinates API calls to `VegitoApiService`.
  - `SessionManager` manages secure token and role storage (Customer, Seller, Delivery Partner, Admin).

## 4. Production Authentication & Firebase OTP
- **Firebase Configuration**: Verified `google-services.json` tied to project `vegito-e35a1`.
- **Error Handling**: Explicit handling added in `FirebaseAuthManager.kt` for `BILLING_NOT_ENABLED` (SMS on Spark vs Blaze plan), `TOO_MANY_ATTEMPTS_TRY_LATER`, and quota limits with actionable guidance.
- **Backend Token Exchange**: Validated fresh Firebase ID token extraction and backend exchange via Retrofit headers.

## 5. Location & Map Tracking Flow
- **Bug A Root Cause**: Stale cached fixes returning without freshness checks, monotonic clock verification missing, and hardcoded "Solapur" / "413001" fallback values in reverse geocoding.
- **Bug B Root Cause**: `OrderResponseDto` missing the authoritative nested `address` object from `OrderDetailRead`, `repository.getOrderDetail` not implemented or called upon tracking, and `CheckoutScreen.kt` silently re-querying GPS and overwriting the customer's confirmed address upon tapping "Place Order".
- **Resolution**:
  - Replaced wall-clock age checks with monotonic elapsed realtime.
  - Removed all hardcoded city/pincode fallbacks in `LocationHelper.kt`.
  - Nested `address` DTO mapping and `getOrderDetail(id)` integration into `VegitoRepository` and `VegitoApp`.
  - Made confirmed checkout delivery address immutable against background GPS recomposition and checkout taps.
  - Leaflet coordinate ordering `[lat, lng]` validated and sanitized before injection into `VegitoMapView`.

## 6. Build & Compilation Status
- **Kotlin Compilation**: Passing cleanly (`./gradlew :app:compileDebugKotlin`).
- **Unit Tests**: 100% Passing (`./gradlew testDebugUnitTest` - 6 tests in `LocationAndOrderMappingTest`, plus catalog parsing and Capacitor unit tests).
- **APK Generation**: Successfully generated debug APK at `frontend/android/app/build/outputs/apk/debug/app-debug.apk` (25.6 MB).

