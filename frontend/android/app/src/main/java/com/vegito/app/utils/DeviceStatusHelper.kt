package com.vegito.app.utils

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager

enum class GpsQuality {
    GOOD,
    WEAK,
    UNAVAILABLE
}

enum class NetworkStatus {
    ONLINE,
    WEAK,
    OFFLINE
}

object DeviceStatusHelper {

    fun getBatteryLevel(context: Context): Int? {
        return try {
            val batteryStatus: Intent? = IntentFilter(Intent.ACTION_BATTERY_CHANGED).let { filter ->
                context.registerReceiver(null, filter)
            }
            val level: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
            val scale: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
            if (level >= 0 && scale > 0) {
                (level * 100 / scale)
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }

    fun getNetworkStatus(context: Context): NetworkStatus {
        return try {
            val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
                ?: return NetworkStatus.OFFLINE
            val network = cm.activeNetwork ?: return NetworkStatus.OFFLINE
            val capabilities = cm.getNetworkCapabilities(network) ?: return NetworkStatus.OFFLINE
            val hasInternet = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            val isValidated = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)

            if (hasInternet && isValidated) {
                NetworkStatus.ONLINE
            } else if (hasInternet) {
                NetworkStatus.WEAK
            } else {
                NetworkStatus.OFFLINE
            }
        } catch (e: Exception) {
            NetworkStatus.OFFLINE
        }
    }

    fun evaluateGpsQuality(accuracyMeters: Float?, isEnabled: Boolean): GpsQuality {
        if (!isEnabled || accuracyMeters == null || accuracyMeters <= 0f) {
            return GpsQuality.UNAVAILABLE
        }
        return if (accuracyMeters <= 15f) {
            GpsQuality.GOOD
        } else {
            GpsQuality.WEAK
        }
    }
}
