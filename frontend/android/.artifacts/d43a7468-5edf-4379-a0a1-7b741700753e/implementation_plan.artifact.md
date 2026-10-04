# Vegito Website to Android 100% Feature Parity Implementation Plan

This document outlines the comprehensive audit and implementation plan to achieve 100% feature, UI, API, and workflow parity between the Vegito Next.js web application and the native Android application.

## User Review Required

> [!IMPORTANT]
> **No Fake Data or Mocking Policy**: All features, products, categories, offers, inventory, orders, tracking, and B2B workflows must connect directly to the existing backend APIs without hardcoded mock data or resetting the database.

> [!NOTE]
> **Role-Based Workspaces**: Full support for Customer, Seller, Delivery Partner, and Admin roles, including workspace switching and role guards.

## Open Questions

- None. Backend endpoints and website components have been fully audited.

## Proposed Changes

### 1. Authentication & Role Management (`com.vegito.app.presentation.auth`)
- **[MODIFY]** [LoginScreen.kt](file:///C:/Users/vijay/OneDrive/Desktop/Vegito/frontend/android/app/src/main/java/com/vegito/app/presentation/auth/LoginScreen.kt) & [OtpScreen.kt](file:///C:/Users/vijay/OneDrive/Desktop/Vegito/frontend/android/app/src/main/java/com/vegito/app/presentation/auth/OtpScreen.kt)
  - Align with website auth flows (`/auth/login`, `/auth/register`), supporting multi-role detection (`customer`, `seller`, `delivery_partner`, `admin`), workspace switching, and auto-resume after auth gate (e.g., adding to cart or checkout).

### 2. Location & GPS (`com.vegito.app.utils` & `presentation.customer`)
- **[MODIFY]** [LocationHelper.kt](file:///C:/Users/vijay/OneDrive/Desktop/Vegito/frontend/android/app/src/main/java/com/vegito/app/utils/LocationHelper.kt) & [LocationSetupScreen.kt](file:///C:/Users/vijay/OneDrive/Desktop/Vegito/frontend/android/app/src/main/java/com/vegito/app/presentation/customer/LocationSetupScreen.kt)
  - Ensure FusedLocationProviderClient integration, real-time GPS coordinates, reverse geocoding, saved addresses, and delivery eligibility checks matching website location modal.

### 3. Catalog, Search, Categories & Products (`com.vegito.app.presentation.customer`)
- **[MODIFY]** [CustomerHomeScreen.kt](file:///C:/Users/vijay/OneDrive/Desktop/Vegito/frontend/android/app/src/main/java/com/vegito/app/presentation/customer/CustomerHomeScreen.kt), [SearchScreen.kt](file:///C:/Users/vijay/OneDrive/Desktop/Vegito/frontend/android/app/src/main/java/com/vegito/app/presentation/customer/SearchScreen.kt), [ProductDetailScreen.kt](file:///C:/Users/vijay/OneDrive/Desktop/Vegito/frontend/android/app/src/main/java/com/vegito/app/presentation/customer/ProductDetailScreen.kt)
  - Complete fruit and vegetable categories (leafy, roots, tubers, bulbs, gourds, fruit vegetables, beans, peas, cruciferous, mushrooms, herbs, seasonal, exotic, berries, melons, stone fruits, pome fruits, citrus, tropical), search filtering/sorting, freshness indicators, and responsive compact product grids.

### 4. Offers & Zig-Zag Layout (`com.vegito.app.ui.components`)
- **[MODIFY]** [OfferCarousel.kt](file:///C:/Users/vijay/OneDrive/Desktop/Vegito/frontend/android/app/src/main/java/com/vegito/app/ui/components/OfferCarousel.kt) & [ZigZagSection.kt](file:///C:/Users/vijay/OneDrive/Desktop/Vegito/frontend/android/app/src/main/java/com/vegito/app/ui/components/ZigZagSection.kt)
  - Implement exact website offer behavior, dynamic fruit/vegetable offers, and alternating zig-zag layout (Image-Content, Content-Image) with smooth Compose animations.

### 5. Cart, Checkout & Orders (`com.vegito.app.presentation.customer`)
- **[MODIFY]** [CartScreen.kt](file:///C:/Users/vijay/OneDrive/Desktop/Vegito/frontend/android/app/src/main/java/com/vegito/app/presentation/customer/CartScreen.kt), [CheckoutScreen.kt](file:///C:/Users/vijay/OneDrive/Desktop/Vegito/frontend/android/app/src/main/java/com/vegito/app/presentation/customer/CheckoutScreen.kt), [OrderTrackingScreen.kt](file:///C:/Users/vijay/OneDrive/Desktop/Vegito/frontend/android/app/src/main/java/com/vegito/app/presentation/customer/OrderTrackingScreen.kt)
  - Cart persistence, delivery fee calculation, coupon/discount handling, payment verification, and Mapbox live delivery tracking with seller pickup and customer destination OTP handoff.

### 6. Seller Workspace (`com.vegito.app.presentation.seller`)
- **[MODIFY]** [SellerDashboardScreen.kt](file:///C:/Users/vijay/OneDrive/Desktop/Vegito/frontend/android/app/src/main/java/com/vegito/app/presentation/seller/SellerDashboardScreen.kt), [SellerOrdersScreen.kt](file:///C:/Users/vijay/OneDrive/Desktop/Vegito/frontend/android/app/src/main/java/com/vegito/app/presentation/seller/SellerOrdersScreen.kt), [SellerProductsScreen.kt](file:///C:/Users/vijay/OneDrive/Desktop/Vegito/frontend/android/app/src/main/java/com/vegito/app/presentation/seller/SellerProductsScreen.kt)
  - Online/offline toggle, order queue management, packing/ready status updates, pickup OTP verification, product inventory management, add/edit products, freshness controls, and analytics.

### 7. Delivery Partner Workspace (`com.vegito.app.presentation.delivery`)
- **[MODIFY]** [DeliveryDashboardScreen.kt](file:///C:/Users/vijay/OneDrive/Desktop/Vegito/frontend/android/app/src/main/java/com/vegito/app/presentation/delivery/DeliveryDashboardScreen.kt), [DeliveryTaskScreen.kt](file:///C:/Users/vijay/OneDrive/Desktop/Vegito/frontend/android/app/src/main/java/com/vegito/app/presentation/delivery/DeliveryTaskScreen.kt)
  - Task acceptance, seller pickup navigation, seller OTP verification, customer location unlock, customer delivery OTP verification, and earnings/history tracking.

### 8. B2B, Support, Notifications, Profile, Theme & Localization (`com.vegito.app`)
- **[MODIFY]** [B2BBulkScreen.kt](file:///C:/Users/vijay/OneDrive/Desktop/Vegito/frontend/android/app/src/main/java/com/vegito/app/presentation/b2b/B2BBulkScreen.kt), [ProfileScreen.kt](file:///C:/Users/vijay/OneDrive/Desktop/Vegito/frontend/android/app/src/main/java/com/vegito/app/presentation/customer/ProfileScreen.kt), [Localization.kt](file:///C:/Users/vijay/OneDrive/Desktop/Vegito/frontend/android/app/src/main/java/com/vegito/app/utils/Localization.kt), [Theme.kt](file:///C:/Users/vijay/OneDrive/Desktop/Vegito/frontend/android/app/src/main/java/com/vegito/app/ui/theme/Theme.kt)
  - B2B bulk quote requests, support complaint filing, notifications center, profile settings, dynamic Dark/Light mode, and multi-language support (English, Marathi, Hindi).

## Verification Plan

### Automated Tests
- Run `./gradlew clean assembleDebug` to verify compilation and build success across all modules.
- Run `./gradlew test` for unit tests.

### Manual Verification
- Deploy to physical Android device or emulator to test end-to-end flow: App Open -> Location Permission -> GPS -> Public Home -> Offers -> Categories -> Search -> Product -> Cart -> Auth/OTP -> Checkout -> Order -> Seller Packing/Ready -> Delivery Pickup/Customer Handoff -> Delivered.
