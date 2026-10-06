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
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.util.Locale
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

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
    data class PreciseLocationRequired(
        val message: String = "Precise location is required to verify your delivery distance."
    ) : LocationResult()
    data class PermissionDenied(val isPermanentlyDenied: Boolean = false) : LocationResult()
    data class Timeout(
        val message: String = "GPS did not get a precise fix in time. Turn on Precise Location, move to an open area, and try again."
    ) : LocationResult()
    data class Error(val message: String) : LocationResult()
}

object LocationHelper {
    private const val TAG = "VegitoLocation"
    private const val TIMEOUT_MS = 45000L
    private const val MAX_ACCEPTABLE_ACCURACY_METERS = 100.0f
    private const val MAX_LOCATION_AGE_MS = 45_000L

    fun hasFineLocationPermission(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED

    fun hasCoarseLocationPermission(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

    fun isLocationEnabled(context: Context): Boolean {
        val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            ?: return false
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            locationManager.isLocationEnabled
        } else {
            locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
        }
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

    private fun isLocationFreshAndAccurate(location: Location): Boolean {
        if (!location.hasAccuracy()) return false
        if (location.accuracy > MAX_ACCEPTABLE_ACCURACY_METERS) return false
        if (location.elapsedRealtimeNanos <= 0L) return false
        val ageMs = (SystemClock.elapsedRealtimeNanos() - location.elapsedRealtimeNanos) / 1_000_000L
        return ageMs >= 0L && ageMs <= MAX_LOCATION_AGE_MS
    }

    @SuppressLint("MissingPermission")
    suspend fun getFreshLocation(context: Context): LocationResult {
        if (!hasFineLocationPermission(context)) {
            return if (hasCoarseLocationPermission(context)) {
                Log.w(TAG, "Approximate location permission only; precise GPS is required")
                LocationResult.PreciseLocationRequired()
            } else {
                Log.w(TAG, "Location permission missing")
                LocationResult.PermissionDenied()
            }
        }

        if (!isLocationEnabled(context)) {
            Log.w(TAG, "Android location services are disabled")
            return LocationResult.GpsDisabled()
        }

        return withTimeoutOrNull(TIMEOUT_MS) {
            try {
                val fusedClient = LocationServices.getFusedLocationProviderClient(context)
                val location = requestFusedLocation(fusedClient)

                if (location != null && isLocationFreshAndAccurate(location)) {
                    Log.i(TAG, "Acquired fresh GPS fix: lat=${location.latitude}, lng=${location.longitude}, acc=${location.accuracy}m, ageMs=${System.currentTimeMillis() - location.time}")
                    reverseGeocode(context, location.latitude, location.longitude)
                } else {
                    val msg = "Precise location is required to verify your delivery distance. Move to an open area and try again."
                    Log.w(TAG, "Rejected stale or low-accuracy GPS fix: ${location?.accuracy ?: "unknown"}m")
                    LocationResult.Error(msg)
                }
            } catch (e: SecurityException) {
                Log.e(TAG, "SecurityException: Location permission missing", e)
                LocationResult.PermissionDenied()
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.e(TAG, "Exception during location acquisition: ${e.message}", e)
                LocationResult.Error(e.message ?: "Failed to get location")
            }
        } ?: LocationResult.Timeout()
    }

    @SuppressLint("MissingPermission")
    private suspend fun requestFusedLocation(fusedClient: FusedLocationProviderClient): Location? {
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 1000L)
            .setMinUpdateIntervalMillis(500L)
            .setMaxUpdateAgeMillis(0L)
            .setWaitForAccurateLocation(true)
            .build()

        return suspendCancellableCoroutine { cont ->
            val callback = object : LocationCallback() {
                override fun onLocationResult(result: com.google.android.gms.location.LocationResult) {
                    val location = result.lastLocation ?: return
                    if (isValidCoordinates(location.latitude, location.longitude) &&
                        isLocationFreshAndAccurate(location) &&
                        cont.isActive
                    ) {
                        fusedClient.removeLocationUpdates(this)
                        cont.resume(location)
                    }
                }
            }

            cont.invokeOnCancellation {
                fusedClient.removeLocationUpdates(callback)
            }

            fusedClient.requestLocationUpdates(request, callback, Looper.getMainLooper())
                .addOnFailureListener { error ->
                    fusedClient.removeLocationUpdates(callback)
                    if (cont.isActive) cont.resumeWithException(error)
                }
        }
    }

    suspend fun reverseGeocode(context: Context, lat: Double, lng: Double): LocationResult.Success =
        withContext(Dispatchers.IO) {
            var addressLine = "Address unavailable"
            var city = ""
            var state = ""
            var pincode = ""
            var area = ""

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
                        }.ifBlank { "Address unavailable" }
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
