package com.vegito.app.ui.components

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.ui.theme.VegitoPrimary
import com.vegito.app.utils.LocationHelper
import com.vegito.app.utils.LocationResult
import kotlinx.coroutines.launch
import java.util.Locale

private enum class LocationPickerMode {
    OPTIONS,
    DETECTING,
    MANUAL_ENTRY,
    CAPTURED_CONFIRM
}

@Composable
fun SellerShopLocationPicker(
    initialAddress: String? = null,
    initialLat: Double? = null,
    initialLng: Double? = null,
    isMandatory: Boolean = true,
    title: String = "🏪 Shop Location",
    subtitle: String = "Your shop location is required for delivery eligibility and pickup.",
    onLocationConfirmed: (
        address: String,
        city: String,
        pincode: String,
        lat: Double,
        lng: Double,
        accuracy: Float?,
        capturedAtEpochMillis: Long
    ) -> Unit,
    onCancel: (() -> Unit)? = null
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var pickerMode by remember { mutableStateOf(LocationPickerMode.OPTIONS) }
    var addressLine by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    var pincode by remember { mutableStateOf("") }
    var lat by remember { mutableDoubleStateOf(0.0) }
    var lng by remember { mutableDoubleStateOf(0.0) }
    var accuracyMeters by remember { mutableStateOf<Float?>(null) }
    var capturedAtEpochMillis by remember { mutableStateOf<Long?>(null) }
    var locationCaptureQuality by remember { mutableStateOf<String?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var manualAddress by remember { mutableStateOf("") }
    var isSearchingAddress by remember { mutableStateOf(false) }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true
        val coarseGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (fineGranted || coarseGranted) {
            pickerMode = LocationPickerMode.DETECTING
            errorMessage = null
            scope.launch {
                when (val result = LocationHelper.getFreshLocation(
                    context = context,
                    allowApproximate = false
                )) {
                    is LocationResult.Success -> {
                        addressLine = result.addressLine
                        city = result.city
                        pincode = result.pincode
                        lat = result.latitude
                        lng = result.longitude
                        accuracyMeters = result.accuracyMeters
                        capturedAtEpochMillis = result.capturedAtEpochMillis
                        locationCaptureQuality = when {
                            result.isAddressMatch -> "Address match — check that it points to your shop."
                            !result.isFreshFix ->
                                "Using a recent saved device location, not a live GPS fix. Confirm it points to your shop."
                            !result.isPrecise -> "Approximate device location. Search the shop address for a more reliable pin."
                            else -> "Fresh precise GPS location."
                        }
                        pickerMode = LocationPickerMode.CAPTURED_CONFIRM
                    }
                    is LocationResult.GpsDisabled -> {
                        errorMessage = "Location services (GPS) are turned off on your device."
                        pickerMode = LocationPickerMode.OPTIONS
                    }
                    is LocationResult.PreciseLocationRequired -> {
                        errorMessage = "Allow precise location for an accurate shop pin, or search for the shop address."
                        pickerMode = LocationPickerMode.OPTIONS
                    }
                    is LocationResult.PermissionDenied -> {
                        errorMessage = "Allow precise location for Vegito in Android Settings, or search for the shop address."
                        pickerMode = LocationPickerMode.OPTIONS
                    }
                    is LocationResult.Timeout -> {
                        errorMessage = "${result.message} You can also search for the shop address below."
                        pickerMode = LocationPickerMode.OPTIONS
                    }
                    is LocationResult.Error -> {
                        errorMessage = result.message
                        pickerMode = LocationPickerMode.OPTIONS
                    }
                }
            }
        } else {
            errorMessage = "Allow location access to capture your shop location, or search for its address."
            pickerMode = LocationPickerMode.OPTIONS
        }
    }

    fun startGpsDetection() {
        errorMessage = null
        addressLine = ""
        city = ""
        pincode = ""
        lat = 0.0
        lng = 0.0
        accuracyMeters = null
        capturedAtEpochMillis = null
        locationCaptureQuality = null
        if (!LocationHelper.isLocationEnabled(context)) {
            errorMessage = "Current location is unavailable. Turn on device location and try again."
            val intent = Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)
            context.startActivity(intent)
            return
        }
        permissionLauncher.launch(
            arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            )
        )
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Surface(
                shape = CircleShape,
                color = VegitoPrimary.copy(alpha = 0.15f),
                modifier = Modifier.size(56.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.Storefront,
                        contentDescription = "Shop Location",
                        tint = VegitoPrimary,
                        modifier = Modifier.size(32.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(20.dp))

            when (pickerMode) {
                LocationPickerMode.OPTIONS -> {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        if (LocationHelper.isValidCoordinates(initialLat, initialLng) && !initialAddress.isNullOrBlank()) {
                            Surface(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                color = MaterialTheme.colorScheme.surfaceVariant
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text("Current saved shop location", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(initialAddress, fontSize = 12.sp)
                                    Text(
                                        "${String.format(Locale.US, "%.6f", initialLat)}, ${String.format(Locale.US, "%.6f", initialLng)}",
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }

                        Button(
                            onClick = { startGpsDetection() },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                        ) {
                            Icon(Icons.Default.MyLocation, contentDescription = "GPS")
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Use My Current Location", fontWeight = FontWeight.Bold)
                        }

                        OutlinedButton(
                            onClick = {
                                errorMessage = null
                                manualAddress = ""
                                pickerMode = LocationPickerMode.MANUAL_ENTRY
                            },
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Icon(Icons.Default.EditLocation, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Enter Shop Address Manually")
                        }

                        if (!isMandatory && onCancel != null) {
                            TextButton(
                                onClick = onCancel,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Cancel", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }

                LocationPickerMode.MANUAL_ENTRY -> {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(
                            "Search for the shop's real address. Review the matched coordinates before saving.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        OutlinedTextField(
                            value = manualAddress,
                            onValueChange = { manualAddress = it },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Shop address") },
                            placeholder = { Text("Area, town, district") },
                            minLines = 2,
                            shape = RoundedCornerShape(12.dp),
                            enabled = !isSearchingAddress
                        )
                        Button(
                            onClick = {
                                scope.launch {
                                    isSearchingAddress = true
                                    errorMessage = null
                                    when (val result = LocationHelper.geocodeAddress(context, manualAddress)) {
                                        is LocationResult.Success -> {
                                            addressLine = result.addressLine
                                            city = result.city
                                            pincode = result.pincode
                                            lat = result.latitude
                                            lng = result.longitude
                                            accuracyMeters = null
                                            capturedAtEpochMillis = result.capturedAtEpochMillis
                                            pickerMode = LocationPickerMode.CAPTURED_CONFIRM
                                        }
                                        is LocationResult.Error -> errorMessage = result.message
                                        else -> errorMessage = "Unable to find that address. Please try again."
                                    }
                                    isSearchingAddress = false
                                }
                            },
                            enabled = manualAddress.isNotBlank() && !isSearchingAddress,
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                        ) {
                            if (isSearchingAddress) {
                                CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Searching address…")
                            } else {
                                Text("Find Address")
                            }
                        }
                        TextButton(
                            onClick = { pickerMode = LocationPickerMode.OPTIONS },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Back to location options")
                        }
                    }
                }

                LocationPickerMode.DETECTING -> {
                    Column(
                        modifier = Modifier.padding(vertical = 16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        CircularProgressIndicator(color = VegitoPrimary, modifier = Modifier.size(44.dp))
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Detecting current GPS location...", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Connecting to Android device location provider...", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }

                LocationPickerMode.CAPTURED_CONFIRM -> {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.Start
                    ) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFFE8F5E9),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = "Captured", tint = Color(0xFF2E7D32))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("✓ Shop Location Captured", fontWeight = FontWeight.Bold, color = Color(0xFF1B5E20), fontSize = 14.sp)
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        Text("Address:", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = VegitoPrimary)
                        Text(addressLine, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                        locationCaptureQuality?.let { quality ->
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                quality,
                                fontSize = 12.sp,
                                color = if (locationCaptureQuality?.startsWith("Using a recent") == true) {
                                    MaterialTheme.colorScheme.error
                                } else {
                                    MaterialTheme.colorScheme.onSurfaceVariant
                                }
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column {
                                Text("Latitude:", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(String.format(Locale.US, "%.6f", lat), fontWeight = FontWeight.Medium, fontSize = 13.sp)
                            }
                            Column {
                                Text("Longitude:", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(String.format(Locale.US, "%.6f", lng), fontWeight = FontWeight.Medium, fontSize = 13.sp)
                            }
                            accuracyMeters?.let { acc ->
                                Column {
                                    Text("Accuracy:", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text("~${acc.toInt()}m", fontWeight = FontWeight.Medium, fontSize = 13.sp)
                                }
                            }
                        }
                        capturedAtEpochMillis?.let { capturedAt ->
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                "Captured ${((System.currentTimeMillis() - capturedAt).coerceAtLeast(0) / 1000)} seconds ago",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        Spacer(modifier = Modifier.height(20.dp))

                        Button(
                            onClick = {
                                if (LocationHelper.isValidCoordinates(lat, lng) && addressLine.isNotBlank()) {
                                    onLocationConfirmed(
                                        addressLine,
                                        city,
                                        pincode,
                                        lat,
                                        lng,
                                        accuracyMeters,
                                        capturedAtEpochMillis ?: System.currentTimeMillis()
                                    )
                                } else {
                                    errorMessage = "Please enter or detect a valid shop address."
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                        ) {
                            Text("Confirm & Save Location", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        TextButton(
                            onClick = { pickerMode = LocationPickerMode.OPTIONS },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Re-capture or Change Method", color = VegitoPrimary)
                        }
                    }
                }

            }

            errorMessage?.let { err ->
                Spacer(modifier = Modifier.height(12.dp))
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = err,
                        color = MaterialTheme.colorScheme.error,
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center
                    )
                    if (pickerMode == LocationPickerMode.OPTIONS) {
                        TextButton(
                            onClick = {
                                if (err.contains("permission", ignoreCase = true) ||
                                    err.contains("precise location", ignoreCase = true)
                                ) {
                                    context.startActivity(
                                        Intent(
                                            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                                            Uri.fromParts("package", context.packageName, null)
                                        )
                                    )
                                } else {
                                    startGpsDetection()
                                }
                            }
                        ) {
                            Text(
                                if (err.contains("permission", ignoreCase = true) ||
                                    err.contains("precise location", ignoreCase = true)
                                ) "Open App Settings" else "Try Again",
                                color = VegitoPrimary
                            )
                        }
                    }
                }
            }
        }
    }
}
