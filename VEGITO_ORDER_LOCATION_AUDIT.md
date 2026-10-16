# VEGITO — CRITICAL ORDER ROUTING & ACCURATE CUSTOMER LOCATION AUDIT

**Date:** 2026-10-10  
**Target Environment:** Android Client (`frontend/android`) & FastAPI Backend (`backend/app`)  
**Scope:** Order Placement, Idempotency, GPS Location Accuracy/Freshness, Seller Order Routing, and Seller Dashboard Synchronization.

---

## 1. Executive Summary

This audit investigates two core production flow issues in the Vegito ecosystem:
1. **Problem A:** A customer places an order, but the order does not appear in the correct seller's dashboard or does not update reliably.
2. **Problem B:** Customer location is missing, inaccurate, stale, or not correctly associated with the order during placement.

Vegito V1 operates with a single configured shop and seller account where the operator can act as both Seller and Delivery Partner. Both the authoritative backend routing rules (`0 < distance <= 20 km`) and client-side order flow and location acquisitions were audited.

---

## 2. Customer-to-Seller Order Flow Audit

### Step-by-Step Code Path Trace

```
1. Customer Login / Session
   File & Function: `VegitoApp.kt` -> `SessionManager` / `triggerTwilioSendOtp`
   API: `POST /api/v1/auth/verify-otp` or `POST /api/v1/auth/login-password`
   Authenticated User ID: `user.id` (Customer role)

2. Location Permission & Acquisition
   File & Function: `LocationHelper.kt` -> `getFreshLocation()`
   Native API: `LocationServices.getFusedLocationProviderClient(context)`
   Coordinates: `(latitude, longitude)`, accuracy in meters (`accuracyMeters`)
   Snapshot: Transformed into `SavedAddress`

3. Eligible Shop/Product Discovery
   File & Function: `VegitoRepository.kt` -> `getProductCatalog()`
   API: `GET /api/v1/products?latitude={lat}&longitude={lng}`
   Rules: Filters products available from active sellers within 20 km.

4. Cart & Product Selection
   File & Function: `VegitoRepository.kt` -> `addToCart(sellerProductId, quantity)`
   API: `POST /api/v1/cart/items`
   Relationship: Cart items lock `seller_product_id` and authoritative `seller_id`.

5. Checkout & Eligibility Verification
   File & Function: `CheckoutScreen.kt` -> `onCheckDeliveryEligibility(address)`
   API: `GET /api/v1/orders/delivery-fee?address_id={id}`
   Validation: Server calculates Haversine distance between customer coordinates and seller shop coordinates; enforces `0 < distance <= 20.0 km`.

6. Order Creation API
   File & Function: `VegitoRepository.kt` -> `createOrder(addressId, paymentMethod, ...)`
   API: `POST /api/v1/orders`
   Payload: `OrderCreate(address_id, payment_method, coupon_code, customer_note, idempotency_key)`

7. Database Commit & Seller Association
   File & Function: `OrderService.checkout()` (`backend/app/services/order_service.py`)
   DB Transactions:
     - Atomically locks inventory rows (`SELECT ... FOR UPDATE` sorted by ID).
     - Resolves address coordinates snapshot: `cust_lat`, `cust_lon`.
     - Validates seller `sp_prof.is_available` and strict distance bounds (`0 < distance <= 20 km`).
     - Inserts `Order` with `seller_id = sp_prof.user_id`, `shop_id = sp_prof.id`, `delivery_latitude`, `delivery_longitude`, `customer_delivery_address`.
     - Inserts `OrderItem` list, creates `DeliveryTask`, logs `OrderStatusHistory`, empties cart.
     - Commits transaction.

8. Seller Dashboard & Orders API
   File & Function: `SellerService.list_orders()` (`backend/app/services/seller_service.py`)
   API: `GET /api/v1/seller/orders` and `GET /api/v1/seller/dashboard/summary`
   Seller ID: Authenticated `current_user.id` (Seller role).
   Query Filter:
     `or_(Order.seller_id == user.id, Order.shop_id == profile_id, ...)`
   Result: Returns paginated `OrderRead` records.

9. Seller Dashboard & Order Board Display
   File & Function: `VegitoApp.kt` -> `SellerDashboardScreen.kt` / `SellerOrdersScreen.kt`
   Display: Displays order count badges, order list, status chips, and action buttons.
```

---

## 3. Root Causes Identified

### Root Cause A: Order Routing & Dashboard Visibility Issues

1. **Missing Idempotency Protection on Android Client:**
   - In `VegitoModels.kt` and `VegitoRepository.kt`, `OrderCreateRequest` omitted `idempotency_key`.
   - Rapid double-clicks or transient network retries in `CheckoutScreen.kt` caused duplicate orders or subsequent 400 Bad Request errors due to stock lock contention.
2. **Missing Active Synchronization / Polling on Seller Dashboard:**
   - In `VegitoApp.kt`, `composable("seller_dashboard")` only fetched statistics and orders once on component mount (`LaunchedEffect(token, currentRoute)`).
   - If a customer placed an order while the seller was viewing `seller_dashboard`, the dashboard metrics ("New Orders", "Pending", "Orders") did NOT update until navigating away or restarting the app.
   - In contrast, `composable("seller_orders")` polled every 10 seconds, but lacked a pull-to-refresh or onRefresh action callback to manually force an immediate sync.
3. **Incomplete Status Variant Matching in `SellerOrdersScreen.kt`:**
   - Backend order status transitions include variants like `NEW`, `ORDER_PLACED`, `ACCEPTED`, `SELLER_ACCEPTED`, `PACKING`, `PREPARING`, `READY`, `READY_FOR_PICKUP`, `OUT_FOR_DELIVERY`, and `DELIVERED`.
   - If an order moved to `READY` or `READY_FOR_PICKUP` or was picked up by delivery mode, filter chips did not accommodate status transitions cleanly or provide dedicated tabs for in-transit orders.
4. **Active Order Domain Mapping Incompleteness:**
   - Upon completing checkout in `VegitoApp.kt` (lines 1079-1091), `activeOrder` was constructed manually from `serverOrder` without pulling `serverOrder.toDomainOrder()`, missing items count and full address details if certain fields were null.

### Root Cause B: Customer Location Acquisition & Snapshot Inaccuracies

1. **Stale Location Fixes Reused Falsely as Fresh Fixes:**
   - In `LocationHelper.kt`, `getFreshLocation()` checked `fusedClient.lastLocation`.
   - If a cached location existed, it immediately returned it as `isFreshFix = true` without checking location timestamp age (`System.currentTimeMillis() - loc.time`).
   - A location obtained days or hours ago (or when the user was in another city) was treated as a fresh fix.
2. **Lack of `getCurrentLocation` with `PRIORITY_HIGH_ACCURACY`:**
   - If `lastLocation` was null or stale, `LocationHelper.kt` immediately fell back to legacy `LocationManager.getLastKnownLocation()`, which also only returns cached provider fixes rather than initiating a genuine active GPS request via Google Play Services `getCurrentLocation()`.
3. **Mock ID Assignment for Temporary Coordinates:**
   - In `LocationSelectionBottomSheet.kt`, selecting "Use This Location" generated a mock ID `loc_${System.currentTimeMillis()}`.
   - When passed into `CheckoutScreen.kt`, `addr.id.toIntOrNull()` was `null` unless explicitly saved to the backend database via `onAddressUpdated`.
   - If the address was saved on the fly via `onRefreshCurrentLocation()`, any failure in refreshing led to a silent fallback or checkout error.
4. **Accuracy and Timestamp Metadata:**
   - GPS accuracy radius in meters (`accuracyMeters`) and fix timestamp were not passed down consistently to the address creation DTO.

---

## 4. Remediation Plan

1. **Android Location Acquisition (`LocationHelper.kt`):**
   - Verify timestamp age: Any cached location older than 60 seconds is NOT considered a fresh fix.
   - Call `fusedClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cancellationToken)` to request an active fresh GPS fix with timeout.
   - Validate coordinate sanity: non-zero, within [-90, +90] latitude and [-180, +180] longitude, not NaN or infinite.
   - Accurately tag `accuracyMeters`, `isFreshFix`, and `isPrecise`.
2. **Order Creation & Idempotency (`VegitoModels.kt`, `VegitoRepository.kt`, `CheckoutScreen.kt`):**
   - Add `idempotency_key` (UUID string) to `OrderCreateRequest` and pass it from `createOrder()`.
   - Implement debouncing in `CheckoutScreen.kt` to prevent double clicks and display unambiguous progress indicators.
   - Ensure `SavedAddress` creation from GPS assigns the actual database ID before submitting checkout.
3. **Seller Dashboard & Order Board Synchronization (`VegitoApp.kt`, `SellerDashboardScreen.kt`, `SellerOrdersScreen.kt`):**
   - Add polling (every 10s) and manual pull-to-refresh to `seller_dashboard` so new incoming orders immediately update metrics and order boards.
   - Add refresh capability to `SellerOrdersScreen.kt`.
   - Ensure all status transitions (`NEW`, `ACCEPTED`, `PACKING`, `READY`, `PICKED_UP`, `DELIVERED`, `CANCELLED`) are cleanly handled.
4. **Preserve V1 Business Rules:**
   - Maintain the authoritative `0 < distance <= 20 km` rule.
   - Protect existing database records; no schema modifications needed.
   - Validate end-to-end with unit tests.
