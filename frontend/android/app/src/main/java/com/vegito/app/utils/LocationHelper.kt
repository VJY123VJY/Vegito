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
import android.os.SystemClock
import android.util.Log
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
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
        val message: String = "GPS fix took too long. Please try again or enter your address manually."
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
        if (lat == 0.0 && lng == 0.0) return false
        if (lat < -90.0 || lat > 90.0) return false
        return !(lng < -180.0 || lng > 180.0)
    }

    @SuppressLint("MissingPermission")
    suspend fun getFreshLocation(
        context: Context,
        allowApproximate: Boolean = true,
        onRecentLocation: ((LocationResult.Success) -> Unit)? = null
    ): LocationResult {
        val fusedClient = LocationServices.getFusedLocationProviderClient(context)

        // 1. Try last known location instantly (< 500ms)
        val cachedLocation = try {
            withTimeoutOrNull(1000L) {
                suspendCancellableCoroutine<Location?> { cont ->
                    fusedClient.lastLocation
                        .addOnSuccessListener { loc -> if (cont.isActive) cont.resume(loc) }
                        .addOnFailureListener { if (cont.isActive) cont.resume(null) }
                }
            }
        } catch (e: Exception) {
            null
        }

        if (cachedLocation != null && isValidCoordinates(cachedLocation.latitude, cachedLocation.longitude)) {
            return cachedLocation.toLocationSuccess(context, true, true)
        }

        // 2. Try Android LocationManager provider fallback
        val managerLocation = try {
            val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            val gpsLoc = locationManager?.getLastKnownLocation(LocationManager.GPS_PROVIDER)
            val netLoc = locationManager?.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
            listOfNotNull(gpsLoc, netLoc).maxByOrNull { it.time }
        } catch (e: Exception) {
            null
        }

        if (managerLocation != null && isValidCoordinates(managerLocation.latitude, managerLocation.longitude)) {
            return managerLocation.toLocationSuccess(context, true, true)
        }

        if (!isLocationEnabled(context)) {
            return LocationResult.GpsDisabled("Location services (GPS) are turned off.")
        }

        return LocationResult.Timeout(
            "GPS fix could not be acquired. Please ensure location services are enabled or enter your address manually."
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
                        return@withContext LocationResult.Success(
                            latitude = match.latitude,
                            longitude = match.longitude,
                            addressLine = addressStr,
                            city = match.locality ?: "Solapur",
                            state = match.adminArea ?: "Maharashtra",
                            pincode = match.postalCode ?: "413001",
                            area = match.subLocality ?: "Solapur City",
                            accuracyMeters = 20f,
                            capturedAtEpochMillis = System.currentTimeMillis(),
                            isFreshFix = true,
                            isPrecise = true
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
            var addressLine = "Current device location"
            var city = "Solapur"
            var state = "Maharashtra"
            var pincode = "413001"
            var area = "Solapur City"

            try {
                withTimeoutOrNull(2500L) {
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
                            if (!bestMatch.locality.isNullOrBlank()) city = bestMatch.locality!!
                            if (!bestMatch.adminArea.isNullOrBlank()) state = bestMatch.adminArea!!
                            if (!bestMatch.postalCode.isNullOrBlank()) pincode = bestMatch.postalCode!!
                            if (!bestMatch.subLocality.isNullOrBlank()) area = bestMatch.subLocality!!
                            if (bestMatch.maxAddressLineIndex >= 0) {
                                addressLine = bestMatch.getAddressLine(0) ?: addressLine
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Reverse geocode failed: ${e.message}")
            }

            LocationResult.Success(
                latitude = lat,
                longitude = lng,
                addressLine = addressLine,
                city = city,
                state = state,
                pincode = pincode,
                area = area,
                accuracyMeters = accuracyMeters,
                capturedAtEpochMillis = capturedAtEpochMillis,
                isFreshFix = isFreshFix,
                isPrecise = isPrecise
            )
        }
}
