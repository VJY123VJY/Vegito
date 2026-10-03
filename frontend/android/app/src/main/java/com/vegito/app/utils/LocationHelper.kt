package com.vegito.app.utils

import android.annotation.SuppressLint
import android.content.Context
import android.location.Address
import android.location.Geocoder
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.util.Log
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
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
        val area: String
    ) : LocationResult()

    data class GpsDisabled(val message: String = "Location services (GPS) are turned off.") : LocationResult()
    data class PermissionDenied(val isPermanentlyDenied: Boolean = false) : LocationResult()
    data class Timeout(val message: String = "Location detection is taking too long.") : LocationResult()
    data class Error(val message: String) : LocationResult()
}

object LocationHelper {
    private const val TAG = "VegitoLocation"
    private const val TIMEOUT_MS = 10000L

    fun isGpsEnabled(context: Context): Boolean {
        val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            ?: return false
        return locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
    }

    /**
     * Validates geographic coordinates strictly:
     * - Latitude between -90 and 90
     * - Longitude between -180 and 180
     * - Rejects (0, 0), NaN, Infinite
     */
    fun isValidCoordinates(lat: Double?, lng: Double?): Boolean {
        if (lat == null || lng == null) return false
        if (lat.isNaN() || lng.isNaN()) return false
        if (lat.isInfinite() || lng.isInfinite()) return false
        if (lat == 0.0 && lng == 0.0) return false
        if (lat < -90.0 || lat > 90.0) return false
        if (lng < -180.0 || lng > 180.0) return false
        return true
    }

    @SuppressLint("MissingPermission")
    suspend fun getFreshLocation(context: Context): LocationResult {
        if (!isGpsEnabled(context)) {
            Log.w(TAG, "GPS / Location provider is disabled")
            return LocationResult.GpsDisabled()
        }

        return withTimeoutOrNull(TIMEOUT_MS) {
            try {
                // 1. Try Google FusedLocationProviderClient first
                val fusedClient = LocationServices.getFusedLocationProviderClient(context)
                val location = requestFusedLocation(fusedClient)
                    ?: requestLocationManagerFallback(context)

                if (location != null && isValidCoordinates(location.latitude, location.longitude)) {
                    Log.i(TAG, "Acquired real GPS fix: lat=${location.latitude}, lng=${location.longitude}, acc=${location.accuracy}m")
                    reverseGeocode(context, location.latitude, location.longitude)
                } else {
                    LocationResult.Error("Unable to acquire valid GPS coordinates. Please try again.")
                }
            } catch (e: SecurityException) {
                Log.e(TAG, "SecurityException: Location permission missing", e)
                LocationResult.PermissionDenied()
            } catch (e: Exception) {
                Log.e(TAG, "Exception during location acquisition: ${e.message}", e)
                LocationResult.Error(e.message ?: "Failed to get location")
            }
        } ?: LocationResult.Timeout()
    }

    @SuppressLint("MissingPermission")
    private suspend fun requestFusedLocation(fusedClient: FusedLocationProviderClient): Location? {
        val cts = CancellationTokenSource()
        return suspendCancellableCoroutine { cont ->
            cont.invokeOnCancellation { cts.cancel() }
            fusedClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cts.token)
                .addOnSuccessListener { loc: Location? ->
                    if (loc != null && isValidCoordinates(loc.latitude, loc.longitude)) {
                        cont.resume(loc)
                    } else {
                        // Fallback to lastLocation if fresh location returned null
                        fusedClient.lastLocation
                            .addOnSuccessListener { lastLoc ->
                                cont.resume(lastLoc)
                            }
                            .addOnFailureListener {
                                cont.resume(null)
                            }
                    }
                }
                .addOnFailureListener {
                    // Try lastLocation as fallback
                    fusedClient.lastLocation
                        .addOnSuccessListener { lastLoc -> cont.resume(lastLoc) }
                        .addOnFailureListener { cont.resume(null) }
                }
        }
    }

    @SuppressLint("MissingPermission")
    private fun requestLocationManagerFallback(context: Context): Location? {
        val lm = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return null
        val gpsLoc = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER)
        val netLoc = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)

        return when {
            gpsLoc != null && netLoc != null -> if (gpsLoc.time >= netLoc.time) gpsLoc else netLoc
            gpsLoc != null -> gpsLoc
            else -> netLoc
        }
    }

    suspend fun reverseGeocode(context: Context, lat: Double, lng: Double): LocationResult.Success =
        withContext(Dispatchers.IO) {
            var addressLine = "Delivery Location ($lat, $lng)"
            var city = "Solapur"
            var state = "Maharashtra"
            var pincode = "413001"
            var area = "Solapur Central"

            try {
                if (Geocoder.isPresent()) {
                    val geocoder = Geocoder(context, Locale.getDefault())
                    val addresses: List<Address>? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        suspendCancellableCoroutine { cont ->
                            geocoder.getFromLocation(lat, lng, 1, object : Geocoder.GeocodeListener {
                                override fun onGeocode(results: MutableList<Address>) {
                                    cont.resume(results)
                                }
                                override fun onError(errorMessage: String?) {
                                    cont.resume(null)
                                }
                            })
                        }
                    } else {
                        @Suppress("DEPRECATION")
                        geocoder.getFromLocation(lat, lng, 1)
                    }

                    val bestMatch = addresses?.firstOrNull()
                    if (bestMatch != null) {
                        val thoroughfare = bestMatch.thoroughfare ?: ""
                        val subThoroughfare = bestMatch.subThoroughfare ?: ""
                        val subLoc = bestMatch.subLocality ?: ""
                        val loc = bestMatch.locality ?: bestMatch.subAdminArea ?: ""
                        val admin = bestMatch.adminArea ?: ""
                        val postal = bestMatch.postalCode ?: ""

                        if (loc.isNotBlank()) city = loc
                        if (admin.isNotBlank()) state = admin
                        if (postal.isNotBlank()) pincode = postal
                        if (subLoc.isNotBlank()) area = subLoc

                        val streetPart = listOf(subThoroughfare, thoroughfare).filter { it.isNotBlank() }.joinToString(" ")
                        val parts = listOfNotNull(
                            streetPart.ifBlank { null },
                            subLoc.ifBlank { null },
                            city.ifBlank { null },
                            admin.ifBlank { null },
                            postal.ifBlank { null }
                        )

                        addressLine = if (bestMatch.maxAddressLineIndex >= 0) {
                            bestMatch.getAddressLine(0) ?: parts.joinToString(", ")
                        } else {
                            parts.joinToString(", ")
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Geocoder reverse-lookup failed: ${e.message}")
            }

            LocationResult.Success(
                latitude = lat,
                longitude = lng,
                addressLine = addressLine,
                city = city,
                state = state,
                pincode = pincode,
                area = area
            )
        }
}
