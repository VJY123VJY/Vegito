# VEGITO ANDROID — LOCATION & ORDER MAP ROOT CAUSE AUDIT

## 1. Executive Summary

This document traces the complete location and order mapping flow in the Vegito Android application (`com.vegito.app`) and FastAPI backend, identifying the root causes of:
1. **Bug A: "Use My Current Location" returning stale, incorrect, or fallback location data.**
2. **Bug B: Order Map Location Mismatch between selected delivery destination and the live tracking map.**

---

## 2. Bug A: "Use My Current Location" — Data Flow & Root Causes

### A. Data Flow Trace
1. **User action:** User taps "Use Current Location (GPS)" on `LocationSelectionBottomSheet.kt`, `LocationSetupScreen.kt`, or `AddressesScreen.kt`.
2. **Permission check:** `LocationSelectionBottomSheet` requests `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION`.
3. **Execution:** Calls `LocationHelper.getFreshLocation(context, allowApproximate, ...)`:
   - Queries `fusedClient.lastLocation` (timeout 800ms).
   - If present, invokes `cachedLocation.toLocationSuccess(context, ...)`.
   - Calls `fusedClient.getCurrentLocation(priority, cancellationToken)` (timeout 7000ms).
   - If `getCurrentLocation` times out or fails (common indoors or on emulator/cold GPS start), falls back to `cachedSuccess` (last known location from previous apps/sessions) or `LocationManager.getLastKnownLocation`.
   - Reverse geocodes using `LocationHelper.reverseGeocode(lat, lng)`.

### B. Identified Root Causes for Bug A
1. **Premature Return of Stale / Session-Old Cached Location:**
   - In `LocationHelper.kt` lines 97–155, if `getCurrentLocation` cannot acquire a fresh satellite lock within 7 seconds, it quietly returns `cachedSuccess` without alerting the caller that the fix is stale.
   - `lastLocation` can be hours or days old (from a completely different location or past session).
   - When returned, callers like `AddressesScreen.kt` and `LocationSelectionBottomSheet.kt` treated any `LocationResult.Success` as a valid current position.
2. **Hardcoded Fallback in Reverse Geocoding:**
   - In `LocationHelper.kt` lines 227–232:
     ```kotlin
     var addressLine = "Current device location"
     var city = "Solapur"
     var state = "Maharashtra"
     var pincode = "413001"
     var area = "Solapur City"
     ```
   - When Android `Geocoder.getFromLocation(lat, lng, 1)` times out (2500ms), fails due to network error, or returns an address without subLocality/postalCode, `LocationHelper` was silently substituting **"Solapur"**, **"Maharashtra"**, **"413001"**, and **"Solapur City"**.
   - If a user in Pune, Ekurke, or another city tapped "Use My Current Location", the geocoding fallback overwrote the city and pincode with Solapur!
3. **Stale Age Calculation:**
   - `now - cachedLocation.time` relied on wall-clock `location.time`, which can be inconsistent with device sleep states. It lacked monotonic clock verification (`SystemClock.elapsedRealtimeNanos() - location.elapsedRealtimeNanos`).
4. **No Continuous Active GPS Request Fallback:**
   - If `getCurrentLocation` times out, `LocationHelper` did not attempt a single high-accuracy update via `requestLocationUpdates` with a dedicated callback before giving up, leaving cold-start GPS devices with only stale cached data.

---

## 3. Bug B: Order Map Location Mismatch — Data Flow & Root Causes

### A. Data Flow Trace
1. **User confirms delivery location in `CheckoutScreen.kt`:**
   - `currentAddress` has verified `latitude` and `longitude`.
   - `onPlaceOrder(paymentMethod, targetAddress)` is invoked.
2. **Checkout Submission in `VegitoApp.kt`:**
   - Calls `repository.createOrder(addressId = addrId, sellerId = targetSellerId, paymentMethod = method)`.
   - Submits `address_id` to `POST /api/v1/orders`.
3. **Backend Order Creation in `OrderService.checkout`:**
   - Backend loads `Address` by `address_id`.
   - Resolves `cust_lat, cust_lon = LocationService.resolve_address_coordinates(db, address)`.
   - Sets `order.delivery_latitude = cust_lat`, `order.delivery_longitude = cust_lon`.
   - Sets `order.customer_delivery_address = full_delivery_address`.
   - Resolves seller shop coordinates: `order.shop_id = sp_prof.id`, seller profile coordinates.
   - Returns `OrderDetailRead` containing:
     - `address: AddressRead` (with `latitude`, `longitude`, `address_line1`, `city`, `pincode`)
     - `delivery_latitude`, `delivery_longitude`
     - `shop_latitude`, `shop_longitude`, `shop_name`
4. **Order Tracking Rendering in Android:**
   - In `VegitoApp.kt`:
     `activeOrder = serverOrder.toDomainOrder().copy(deliveryAddress = checkoutAddress)`
     `customerOrdersList = repository.getCustomerOrders().map { it.toDomainOrder() }`
     `navController.navigate("customer_tracking")`
   - In `OrderTrackingScreen.kt`:
     Reads `order.deliveryAddress.latitude`, `order.deliveryAddress.longitude`, `order.sellerLat`, `order.sellerLng`.
     Renders `VegitoMapView(shopLat, shopLng, customerLat, customerLng, ...)`.

### B. Identified Root Causes for Bug B
1. **`OrderResponseDto` Missing `address` Field in Android:**
   - In `VegitoModels.kt` lines 533–555:
     `OrderResponseDto` only declared `@SerializedName("customer_delivery_address") val customerDeliveryAddress: String? = null`.
     It **did not declare** `@SerializedName("address") val address: AddressDto? = null`.
   - The FastAPI backend returns the authoritative address nested under `"address": { ... }` in `OrderDetailRead`.
   - Because `address` was not declared in `OrderResponseDto`, Gson ignored the server's authoritative `address` object completely.
2. **`GET /api/v1/orders` (Order List) Omits Shop & Address Coordinates:**
   - In `backend/app/schemas/order.py`, `OrderRead` (used by list endpoints) includes `delivery_latitude` and `delivery_longitude`, but **omits** `shop_latitude`, `shop_longitude`, `customer_delivery_address`, and the `address` object (which only exist in `OrderDetailRead`).
   - When `repository.getCustomerOrders()` was called, each order had `shop_latitude = null` and `shop_longitude = null`.
   - In `VegitoApp.kt`:
     `val ordToTrack = activeOrder ?: customerOrdersList.firstOrNull()`
   - Whenever `activeOrder` was null, or when the user navigated to "Customer Orders" and clicked "Track Order" on any order, `ordToTrack` was built from the incomplete `OrderRead` list item!
   - As a result, `order.sellerLat` was null, causing `OrderTrackingScreen.kt` to either show "Live route is unavailable" or fallback incorrectly.
3. **Android Never Fetched Authoritative Order Detail from `GET /api/v1/orders/{id}`:**
   - `VegitoApiService.kt` declared `getOrderDetail(@Path("id") orderId: Int)`, but **`VegitoRepository.kt` never implemented `getOrderDetail`**, and `VegitoApp.kt` never called it.
   - The tracking screen relied entirely on whatever stale or incomplete order object was held in local memory.
4. **Silent GPS Overwrite During Checkout (`CheckoutScreen.kt`):**
   - In `CheckoutScreen.kt` lines 166–200, when the user tapped "Place Order", if the address was originally detected via GPS (`capturedAsCurrentLocation == true`), the screen triggered `onRefreshCurrentLocation()`, querying device GPS right at the moment of checkout!
   - If the user was indoors, had moved, or experienced GPS jitter, this silently created a new address and replaced the customer's confirmed delivery destination.
   - This actively caused Bug B where orders ended up with unexpected coordinates different from the confirmed pin.
5. **Coordinate Consistency Across Leaflet/Mapbox in `VegitoMapView.kt`:**
   - Leaflet expects coordinates in `[lat, lng]` order (`L.marker([lat, lng])`, `L.latLngBounds([lat, lng])`).
   - GeoJSON and Mapbox Point APIs expect `[lng, lat]` order (`Point.fromLngLat(lng, lat)`).
   - In `VegitoMapView.kt`, Javascript strings were passed as:
     `var waypoints = [[$shopLat, $shopLng]];`
     If any coordinate was null or 0, Leaflet defaulted to `[0, 0]` or the shop location.
   - Validation before injecting into the WebView was missing; if `customerLat` was null or 0.0, the marker was omitted or placed at the equator.

---

## 4. End-to-End Resolutions Implemented

1. **Fixed `LocationHelper.kt`:**
   - Eliminated hardcoded "Solapur" / "413001" fallbacks. Geocoder returns genuine detected values or empty/unavailable flags when it cannot resolve.
   - Replaced wall-clock age calculation with monotonic clock verification (`SystemClock.elapsedRealtimeNanos() - location.elapsedRealtimeNanos`).
   - Reject Null Island coordinates and precision noise (`kotlin.math.abs(lat) < 1e-5 && kotlin.math.abs(lng) < 1e-5`).
   - Strict fresh fix age threshold (< 30s) and accuracy validation.
   - Added active single-shot `LocationCallback` if `getCurrentLocation` fails before falling back.
2. **Fixed `OrderResponseDto` & `toDomainOrder()` in `VegitoModels.kt`:**
   - Added `@SerializedName("address") val address: AddressDto? = null`.
   - Updated `toDomainOrder()`: if `address` is present, constructs `deliveryAddress = address.toSavedAddress()`, ensuring the exact confirmed address and coordinates are preserved.
   - Fixed `toSavedAddress()` to cleanly preserve `addressLine1`, `addressLine2`, and `landmark` as street address while keeping `city`, `state`, and `pincode` in their respective fields.
3. **Implemented `getOrderDetail(orderId)` in `VegitoRepository.kt` & Integrated into `VegitoApp.kt`:**
   - Added `suspend fun getOrderDetail(orderId: Int): Order?` calling `GET /api/v1/orders/{id}`.
   - In `VegitoApp.kt` `composable("customer_tracking")`: when tracking is opened or refreshed, loads authoritative `OrderDetailRead` (containing verified shop coordinates, delivery coordinates, and customer address) and updates `activeOrder`.
4. **Protected Selected Delivery Address State in `CheckoutScreen.kt`:**
   - Removed the silent GPS re-polling on "Place Order". The user's confirmed delivery address is immutable and authoritative at checkout.
5. **Fixed `VegitoMapView.kt` & `DeliveryMapScreen.kt` Safety:**
   - Verified that customer delivery coordinates are hidden before pickup verification and exposed only after pickup OTP verification.
   - Shop, customer, and delivery partner coordinates are rendered conditionally and validated before JavaScript injection.
6. **Comprehensive Unit Tests (`LocationAndOrderMappingTest.kt`):**
   - 6 automated tests covering coordinate validation, out-of-bounds detection, nested address mapping, Null Island rejection, and order destination immutability across device movement.
   - 100% tests passing (`BUILD SUCCESSFUL`).
   - APK built successfully: `app-debug.apk` (25.6 MB).

