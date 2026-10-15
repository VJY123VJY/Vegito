package com.vegito.app.utils

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Address
import android.location.Geocoder
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult as GmsLocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.util.Locale
import kotlin.coroutines.resume

sealed class LocationResult {
    data class Success(
        val latitude: Double,
        val longitude: Double,
        val addressLine: String,
        val city: String,
        val state: String,
        val pincode: String,
        val area: String,
        val accuracyMeters: Float?,
        val capturedAtEpochMillis: Long,
        val isFreshFix: Boolean = true,
        val isPrecise: Boolean = true,
        val isAddressMatch: Boolean = false,
    ) : LocationResult()

    data class GpsDisabled(val message: String = "Location services (GPS) are turned off.") : LocationResult()
    data class PreciseLocationRequired(
        val message: String = "Precise location is required to verify your delivery distance."
    ) : LocationResult()
    data class PermissionDenied(val isPermanentlyDenied: Boolean = false) : LocationResult()
    data class Timeout(
        val message: String = "GPS fix could not be acquired. Please ensure high-accuracy location is enabled or enter your address manually."
    ) : LocationResult()
    data class Error(val message: String) : LocationResult()
}

object LocationHelper {
    private const val TAG = "VegitoLocation"

    fun hasFineLocationPermission(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED

    fun hasCoarseLocationPermission(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

    fun isLocationEnabled(context: Context): Boolean {
        val locationManager = (context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager)
            ?: return false
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            locationManager.isLocationEnabled
        } else {
            locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
        }
    }

    fun isValidCoordinates(lat: Double?, lng: Double?): Boolean {
        if (lat == null || lng == null) return false
        if (lat.isNaN() || lng.isNaN()) return false
        if (lat.isInfinite() || lng.isInfinite()) return false
        if (kotlin.math.abs(lat) < 1e-5 && kotlin.math.abs(lng) < 1e-5) return false
        if (lat < -90.0 || lat > 90.0) return false
        return !(lng < -180.0 || lng > 180.0)
    }

    /**
     * Accurately determines location age in milliseconds using monotonic elapsed realtime when available.
     */
    fun getLocationAgeMillis(location: Location): Long {
        val elapsedNanos = location.elapsedRealtimeNanos
        val nowElapsedNanos = SystemClock.elapsedRealtimeNanos()
        val ageMillis = (nowElapsedNanos - elapsedNanos) / 1_000_000L
        return if (ageMillis >= 0) {
            ageMillis
        } else {
            (System.currentTimeMillis() - location.time).coerceAtLeast(0L)
        }
    }

    @SuppressLint("MissingPermission")
    suspend fun getFreshLocation(
        context: Context,
        allowApproximate: Boolean = true,
        maxFreshAgeMillis: Long = 30_000L,
        onRecentLocation: ((LocationResult.Success) -> Unit)? = null
    ): LocationResult {
        if (!hasFineLocationPermission(context) && !hasCoarseLocationPermission(context)) {
            return LocationResult.PermissionDenied(isPermanentlyDenied = false)
        }

        if (!isLocationEnabled(context)) {
            return LocationResult.GpsDisabled("Location services (GPS) are turned off.")
        }

        val fusedClient = LocationServices.getFusedLocationProviderClient(context)

        // 1. Inspect cached location
        var cachedSuccess: LocationResult.Success? = null
        var cachedAgeMillis: Long = Long.MAX_VALUE
        try {
            val cachedLocation = withTimeoutOrNull(1000L) {
                suspendCancellableCoroutine<Location?> { cont ->
                    fusedClient.lastLocation
                        .addOnSuccessListener { loc -> if (cont.isActive) cont.resume(loc) }
                        .addOnFailureListener { if (cont.isActive) cont.resume(null) }
                }
            }

            if (cachedLocation != null && isValidCoordinates(cachedLocation.latitude, cachedLocation.longitude)) {
                cachedAgeMillis = getLocationAgeMillis(cachedLocation)
                val isFresh = cachedAgeMillis in 0..maxFreshAgeMillis
                val isPrecise = hasFineLocationPermission(context) && (cachedLocation.accuracy <= 50f)
                val success = cachedLocation.toLocationSuccess(context, isFreshFix = isFresh, isPrecise = isPrecise)
                cachedSuccess = success
                onRecentLocation?.invoke(success)

                // If cached location is extremely fresh (< 15 seconds) and highly accurate (<= 30m), use it immediately
                if (cachedAgeMillis in 0..15_000L && cachedLocation.accuracy <= 30f) {
                    Log.i(TAG, "Using fresh high-accuracy cached fix (${cachedAgeMillis}ms old, acc=${cachedLocation.accuracy}m)")
                    return success
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Cached location check failed: ${e.message}")
        }

        // 2. Request active fresh GPS fix via getCurrentLocation
        val priority = if (hasFineLocationPermission(context)) {
            Priority.PRIORITY_HIGH_ACCURACY
        } else {
            Priority.PRIORITY_BALANCED_POWER_ACCURACY
        }

        try {
            val cts = com.google.android.gms.tasks.CancellationTokenSource()
            val freshLocation = withTimeoutOrNull(10_000L) {
                suspendCancellableCoroutine<Location?> { cont ->
                    fusedClient.getCurrentLocation(priority, cts.token)
                        .addOnSuccessListener { loc -> if (cont.isActive) cont.resume(loc) }
                        .addOnFailureListener { if (cont.isActive) cont.resume(null) }
                    cont.invokeOnCancellation { cts.cancel() }
                }
            }

            if (freshLocation != null && isValidCoordinates(freshLocation.latitude, freshLocation.longitude)) {
                val age = getLocationAgeMillis(freshLocation)
                if (age <= 60_000L) {
                    val isPrecise = hasFineLocationPermission(context) && (freshLocation.accuracy <= 60f)
                    Log.i(TAG, "Acquired fresh active fix: lat=${freshLocation.latitude}, lng=${freshLocation.longitude}, acc=${freshLocation.accuracy}m")
                    return freshLocation.toLocationSuccess(context, isFreshFix = true, isPrecise = isPrecise)
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "getCurrentLocation active request failed: ${e.message}")
        }

        // 3. Active fallback: single-shot location update request (wakes up GPS chips on cold start)
        try {
            val singleUpdateLocation = withTimeoutOrNull(6000L) {
                suspendCancellableCoroutine<Location?> { cont ->
                    val request = LocationRequest.Builder(priority, 1000L)
                        .setMaxUpdates(1)
                        .setDurationMillis(5000L)
                        .build()

                    val callback = object : LocationCallback() {
                        override fun onLocationResult(result: GmsLocationResult) {
                            val loc = result.lastLocation
                            fusedClient.removeLocationUpdates(this)
                            if (cont.isActive) cont.resume(loc)
                        }
                    }

                    fusedClient.requestLocationUpdates(request, callback, Looper.getMainLooper())
                        .addOnFailureListener {
                            if (cont.isActive) cont.resume(null)
                        }

                    cont.invokeOnCancellation {
                        fusedClient.removeLocationUpdates(callback)
                    }
                }
            }

            if (singleUpdateLocation != null && isValidCoordinates(singleUpdateLocation.latitude, singleUpdateLocation.longitude)) {
                val isPrecise = hasFineLocationPermission(context) && (singleUpdateLocation.accuracy <= 60f)
                Log.i(TAG, "Acquired single-update GPS fix: acc=${singleUpdateLocation.accuracy}m")
                return singleUpdateLocation.toLocationSuccess(context, isFreshFix = true, isPrecise = isPrecise)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Single-update location request failed: ${e.message}")
        }

        // 4. If active requests timed out, evaluate cached fix strictly
        if (cachedSuccess != null && cachedAgeMillis <= 60_000L) {
            Log.w(TAG, "Using recently cached fix (${cachedAgeMillis}ms old) as non-fresh fallback")
            return cachedSuccess.copy(isFreshFix = false)
        }

        // 5. Try Android LocationManager provider fallback (only if recent < 60s)
        val managerLocation = try {
            val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            val gpsLoc = locationManager?.getLastKnownLocation(LocationManager.GPS_PROVIDER)
            val netLoc = locationManager?.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
            listOfNotNull(gpsLoc, netLoc).maxByOrNull { it.time }
        } catch (e: Exception) {
            null
        }

        if (managerLocation != null && isValidCoordinates(managerLocation.latitude, managerLocation.longitude)) {
            val locAge = getLocationAgeMillis(managerLocation)
            if (locAge <= 60_000L) {
                Log.i(TAG, "Using LocationManager fallback (${locAge}ms old)")
                return managerLocation.toLocationSuccess(context, isFreshFix = false, isPrecise = managerLocation.accuracy <= 100f)
            }
        }

        return LocationResult.Timeout(
            "GPS satellite fix could not be acquired in time. Please turn on high-accuracy GPS or enter your address manually."
        )
    }

    suspend fun geocodeAddress(context: Context, addressStr: String): LocationResult.Success? =
        withContext(Dispatchers.IO) {
            try {
                if (Geocoder.isPresent()) {
                    val geocoder = Geocoder(context, Locale.getDefault())
                    val addresses = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        geocoder.getFromLocationName(addressStr, 1)
                    } else {
                        @Suppress("DEPRECATION")
                        geocoder.getFromLocationName(addressStr, 1)
                    }
                    val match = addresses?.firstOrNull()
                    if (match != null && isValidCoordinates(match.latitude, match.longitude)) {
                        val city = match.locality ?: match.subAdminArea ?: ""
                        val state = match.adminArea ?: ""
                        val pincode = match.postalCode ?: ""
                        val area = match.subLocality ?: match.thoroughfare ?: match.featureName ?: ""
                        return@withContext LocationResult.Success(
                            latitude = match.latitude,
                            longitude = match.longitude,
                            addressLine = addressStr,
                            city = city,
                            state = state,
                            pincode = pincode,
                            area = area,
                            accuracyMeters = 20f,
                            capturedAtEpochMillis = System.currentTimeMillis(),
                            isFreshFix = true,
                            isPrecise = true,
                            isAddressMatch = true
                        )
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Geocode failed: ${e.message}")
            }
            null
        }

    private suspend fun Location.toLocationSuccess(
        context: Context,
        isFreshFix: Boolean,
        isPrecise: Boolean
    ): LocationResult.Success = reverseGeocode(context, latitude, longitude, accuracy, time, isFreshFix, isPrecise)

    suspend fun reverseGeocode(
        context: Context,
        lat: Double,
        lng: Double,
        accuracyMeters: Float? = null,
        capturedAtEpochMillis: Long = System.currentTimeMillis(),
        isFreshFix: Boolean = true,
        isPrecise: Boolean = true
    ): LocationResult.Success =
        withContext(Dispatchers.IO) {
            var addressLine: String? = null
            var city = ""
            var state = ""
            var pincode = ""
            var area = ""

            try {
                withTimeoutOrNull(3000L) {
                    if (Geocoder.isPresent()) {
                        val geocoder = Geocoder(context, Locale.getDefault())
                        val addresses = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            geocoder.getFromLocation(lat, lng, 1)
                        } else {
                            @Suppress("DEPRECATION")
                            geocoder.getFromLocation(lat, lng, 1)
                        }
                        val bestMatch = addresses?.firstOrNull()
                        if (bestMatch != null) {
                            city = bestMatch.locality ?: bestMatch.subAdminArea ?: ""
                            state = bestMatch.adminArea ?: ""
                            pincode = bestMatch.postalCode ?: ""
                            area = bestMatch.subLocality ?: bestMatch.thoroughfare ?: bestMatch.featureName ?: ""
                            if (bestMatch.maxAddressLineIndex >= 0) {
                                addressLine = bestMatch.getAddressLine(0)
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Reverse geocode failed: ${e.message}")
            }

            // Construct truthful, non-fabricated address line if geocoder was unavailable
            val finalAddressLine = addressLine?.ifBlank { null }
                ?: listOf(area, city, state, pincode).filter { it.isNotBlank() }.joinToString(", ").ifBlank {
                    "GPS: ${String.format(Locale.US, "%.5f, %.5f", lat, lng)}"
                }

            val finalArea = area.ifBlank {
                if (city.isNotBlank()) city else "Current Location"
            }

            LocationResult.Success(
                latitude = lat,
                longitude = lng,
                addressLine = finalAddressLine,
                city = city,
                state = state,
                pincode = pincode,
                area = finalArea,
                accuracyMeters = accuracyMeters,
                capturedAtEpochMillis = capturedAtEpochMillis,
                isFreshFix = isFreshFix,
                isPrecise = isPrecise
            )
        }
}
