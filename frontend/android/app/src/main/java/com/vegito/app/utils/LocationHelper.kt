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
import androidx.annotation.RequiresApi
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.util.Locale
import kotlin.coroutines.resume
import kotlin.time.Duration.Companion.milliseconds

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
    ) : LocationResult()

    data class GpsDisabled(val message: String = "Location services (GPS) are turned off.") : LocationResult()
    data class PreciseLocationRequired(
        val message: String = "Precise location is required to verify your delivery distance."
    ) : LocationResult()
    data class PermissionDenied(val isPermanentlyDenied: Boolean = false) : LocationResult()
    data class Timeout(
        val message: String = "GPS fix took too long. Please try again or choose your location on map."
    ) : LocationResult()
    data class Error(val message: String) : LocationResult()
}

object LocationHelper {
    private const val TAG = "VegitoLocation"
    private const val TIMEOUT_MS = 30_000L
    private const val MAX_ACCEPTABLE_ACCURACY_METERS = 150.0f
    private const val MAX_LOCATION_AGE_MS = 15_000L

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
        return !(lng < -180.0 || lng > 180.0)
    }

    private fun getAgeMs(location: Location): Long {
        return if (location.elapsedRealtimeNanos > 0L) {
            (SystemClock.elapsedRealtimeNanos() - location.elapsedRealtimeNanos) / 1_000_000L
        } else {
            System.currentTimeMillis() - location.time
        }
    }

    private fun isFreshAccurateFix(location: Location): Boolean {
        if (!isValidCoordinates(location.latitude, location.longitude) || !location.hasAccuracy()) return false
        val ageMs = getAgeMs(location)
        return ageMs in 0..MAX_LOCATION_AGE_MS &&
            location.accuracy.isFinite() &&
            location.accuracy <= MAX_ACCEPTABLE_ACCURACY_METERS
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

        val location = try {
            withTimeoutOrNull(TIMEOUT_MS.milliseconds) {
                val fusedClient = LocationServices.getFusedLocationProviderClient(context)
                requestFusedLocationUpdates(fusedClient)
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "Location permission was revoked during the request", e)
            return LocationResult.PermissionDenied()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Log.e(TAG, "Fresh location request failed", e)
            return LocationResult.Error("Unable to get a fresh location. Please try again.")
        }

        if (location == null) {
            Log.w(TAG, "No accurate fresh location fix within ${TIMEOUT_MS}ms")
            return LocationResult.Timeout("Unable to get a fresh location. Please try again.")
        }

        val ageMs = getAgeMs(location)
        Log.i(TAG, "Fresh location acquired: accuracy=${location.accuracy}m, ageMs=$ageMs")
        return reverseGeocode(
            context = context,
            lat = location.latitude,
            lng = location.longitude,
            accuracyMeters = location.accuracy,
            capturedAtEpochMillis = location.time,
        )
    }

    @SuppressLint("MissingPermission")
    private suspend fun requestFusedLocationUpdates(fusedClient: FusedLocationProviderClient): Location? {
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 1000L)
            .setMinUpdateIntervalMillis(500L)
            .setMaxUpdateAgeMillis(0L)
            .setWaitForAccurateLocation(true)
            .build()

        return suspendCancellableCoroutine { cont ->
            val callback = object : LocationCallback() {
                override fun onLocationResult(result: com.google.android.gms.location.LocationResult) {
                    val location = result.lastLocation ?: return
                    if (cont.isActive && isFreshAccurateFix(location)) {
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
                    if (cont.isActive) cont.resumeWith(Result.failure(error))
                }
        }
    }

    suspend fun reverseGeocode(
        context: Context,
        lat: Double,
        lng: Double,
        accuracyMeters: Float? = null,
        capturedAtEpochMillis: Long = System.currentTimeMillis(),
    ): LocationResult.Success =
        withContext(Dispatchers.IO) {
            var addressLine = "Current Location (${String.format(Locale.US, "%.4f, %.4f", lat, lng)})"
            var city = ""
            var state = ""
            var pincode = ""
            var area = ""

            try {
                withTimeoutOrNull(3500L.milliseconds) {
                    if (Geocoder.isPresent()) {
                        val geocoder = Geocoder(context, Locale.getDefault())
                        val addresses: List<Address>? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            getFromLocationTiramisu(geocoder, lat, lng)
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

                            val streetPart = sequenceOf(subThoroughfare, thoroughfare)
                                .filter { it.isNotBlank() }
                                .joinToString(" ")
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
                            }.ifBlank { addressLine }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Geocoder reverse-lookup failed (${e.javaClass.simpleName})")
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
            )
        }

    @RequiresApi(Build.VERSION_CODES.TIRAMISU)
    private suspend fun getFromLocationTiramisu(
        geocoder: Geocoder,
        lat: Double,
        lng: Double
    ): List<Address>? = suspendCancellableCoroutine { cont ->
        geocoder.getFromLocation(
            lat,
            lng,
            1,
            object : Geocoder.GeocodeListener {
                override fun onGeocode(addresses: MutableList<Address>) {
                    if (cont.isActive) cont.resume(addresses)
                }
                override fun onError(errorMessage: String?) {
                    if (cont.isActive) cont.resume(null)
                }
            }
        )
    }
}
