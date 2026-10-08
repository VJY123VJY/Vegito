package com.vegito.app.presentation.customer

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.SavedAddress
import com.vegito.app.ui.theme.VegitoPrimary
import com.vegito.app.utils.LocationHelper
import com.vegito.app.utils.LocationResult
import kotlinx.coroutines.launch

@Composable
fun LocationSetupScreen(
    onLocationConfirmed: suspend (SavedAddress) -> SavedAddress?,
    onSkip: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var detecting by remember { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }
    var resolvingManualAddress by remember { mutableStateOf(false) }
    var detectedAddress by remember { mutableStateOf<LocationResult.Success?>(null) }
    var resolvedManualAddress by remember { mutableStateOf<LocationResult.Success?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var showManualEntry by remember { mutableStateOf(false) }

    var manualAddressLine by remember { mutableStateOf("") }
    var manualCity by remember { mutableStateOf("") }
    var manualPincode by remember { mutableStateOf("") }

    fun confirmAddress(address: SavedAddress) {
        scope.launch {
            saving = true
            errorMessage = null
            try {
                if (onLocationConfirmed(address) == null) {
                    errorMessage = "Could not save your address. Please check your connection and try again."
                }
            } catch (e: Exception) {
                errorMessage = "Could not save your address. Please try again."
            } finally {
                saving = false
            }
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true
        val coarseGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true

        if (fineGranted || coarseGranted) {
            detecting = true
            detectedAddress = null
            errorMessage = null
            scope.launch {
                when (val result = LocationHelper.getFreshLocation(
                    context = context,
                    allowApproximate = true,
                    onRecentLocation = { detectedAddress = it }
                )) {
                    is LocationResult.Success -> {
                        detectedAddress = result
                        detecting = false
                    }
                    is LocationResult.GpsDisabled -> {
                        errorMessage = "Location services (GPS) are turned off."
                        detecting = false
                    }
                    is LocationResult.PreciseLocationRequired -> {
                        errorMessage = result.message
                        detecting = false
                    }
                    is LocationResult.PermissionDenied -> {
                        errorMessage = "Location permission was denied."
                        detecting = false
                    }
                    is LocationResult.Timeout -> {
                        errorMessage = result.message
                        detecting = false
                    }
                    is LocationResult.Error -> {
                        errorMessage = result.message
                        detecting = false
                    }
                }
            }
        } else if (coarseGranted) {
            errorMessage = "Precise location is required to verify your delivery distance."
            detecting = false
        } else {
            errorMessage = "Location permission is required to detect nearby fresh produce."
            detecting = false
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Surface(
                shape = CircleShape,
                color = VegitoPrimary.copy(alpha = 0.15f),
                modifier = Modifier.size(80.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = "Location",
                        tint = VegitoPrimary,
                        modifier = Modifier.size(44.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "📍 Find fresh groceries near you",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "We use your location to find nearby sellers, check delivery availability and calculate delivery distance.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(32.dp))

            if (detecting) {
                CircularProgressIndicator(color = VegitoPrimary)
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    if (detectedAddress == null) "Detecting your current location..."
                    else "Using recent location temporarily • checking for a fresh fix...",
                    fontSize = 14.sp
                )
                detectedAddress?.let { recent ->
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        recent.addressLine,
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                }
            } else if (detectedAddress != null) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            when {
                                detectedAddress!!.isFreshFix && detectedAddress!!.isPrecise -> "Fresh precise location:"
                                detectedAddress!!.isFreshFix -> "Fresh approximate location:"
                                else -> "Recent location (not fresh):"
                            },
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = VegitoPrimary
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(detectedAddress!!.addressLine, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                        Spacer(modifier = Modifier.height(2.dp))
                        Text("${detectedAddress!!.city} - ${detectedAddress!!.pincode}", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        detectedAddress!!.accuracyMeters?.let { accuracy ->
                            Text("Accuracy: ${accuracy.toInt()} m", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        if (!detectedAddress!!.isFreshFix) {
                            Text(
                                "Retry to get a fresh location before confirming.",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.error
                            )
                        }
                        Text(
                            "Captured: ${((System.currentTimeMillis() - detectedAddress!!.capturedAtEpochMillis).coerceAtLeast(0) / 1000)} seconds ago",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = {
                        val addr = SavedAddress(
                            id = "addr_${System.currentTimeMillis()}",
                            title = "Current Location",
                            addressLine = detectedAddress!!.addressLine,
                            city = detectedAddress!!.city,
                            state = detectedAddress!!.state,
                            pincode = detectedAddress!!.pincode,
                            latitude = detectedAddress!!.latitude,
                            longitude = detectedAddress!!.longitude,
                            isDefault = true,
                            capturedAsCurrentLocation = true
                        )
                        confirmAddress(addr)
                    },
                    enabled = !saving && detectedAddress!!.isFreshFix,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                ) {
                    Text(if (saving) "Saving Location..." else "Confirm Location & Start Shopping", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                }
                if (!detectedAddress!!.isFreshFix) {
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedButton(
                        onClick = {
                            errorMessage = null
                            permissionLauncher.launch(
                                arrayOf(
                                    Manifest.permission.ACCESS_FINE_LOCATION,
                                    Manifest.permission.ACCESS_COARSE_LOCATION
                                )
                            )
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Try Again")
                    }
                    TextButton(onClick = {
                        detectedAddress = null
                        showManualEntry = true
                    }) {
                        Text("Enter Address Manually")
                    }
                }
            } else if (showManualEntry) {
                OutlinedTextField(
                    value = manualAddressLine,
                    onValueChange = {
                        manualAddressLine = it
                        resolvedManualAddress = null
                    },
                    label = { Text("Street Address / Area") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true
                )
                Spacer(modifier = Modifier.height(12.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = manualCity,
                        onValueChange = {
                            manualCity = it
                            resolvedManualAddress = null
                        },
                        label = { Text("City") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = manualPincode,
                        onValueChange = {
                            manualPincode = it
                            resolvedManualAddress = null
                        },
                        label = { Text("Pincode") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true
                    )
                }

                resolvedManualAddress?.let { match ->
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        "Address coordinates found for ${match.city.ifBlank { manualCity }}. Confirm to use this geocoded location.",
                        fontSize = 13.sp,
                        color = VegitoPrimary,
                        textAlign = TextAlign.Center
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = {
                        if (manualAddressLine.isNotBlank() && manualCity.isNotBlank() && manualPincode.isNotBlank()) {
                            val match = resolvedManualAddress
                            if (match != null) {
                                confirmAddress(
                                    SavedAddress(
                                        id = "addr_${System.currentTimeMillis()}",
                                        title = "Manual Address",
                                        addressLine = manualAddressLine,
                                        city = manualCity,
                                        state = match.state,
                                        pincode = manualPincode,
                                        latitude = match.latitude,
                                        longitude = match.longitude,
                                        isDefault = true,
                                        capturedAsCurrentLocation = false
                                    )
                                )
                            } else {
                                resolvingManualAddress = true
                                errorMessage = null
                                scope.launch {
                                    val query = listOf(manualAddressLine, manualCity, manualPincode)
                                        .joinToString(", ")
                                    when (val result = LocationHelper.geocodeAddress(context, query)) {
                                        is LocationResult.Success -> resolvedManualAddress = result
                                        is LocationResult.Error -> errorMessage = result.message
                                        else -> errorMessage = "Address search did not return a usable location."
                                    }
                                    resolvingManualAddress = false
                                }
                            }
                        }
                    },
                    enabled = !saving && !resolvingManualAddress &&
                        manualAddressLine.isNotBlank() && manualCity.isNotBlank() && manualPincode.isNotBlank(),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                ) {
                    Text(
                        when {
                            saving -> "Saving Address..."
                            resolvingManualAddress -> "Finding Address..."
                            resolvedManualAddress != null -> "Confirm Address & Start Shopping"
                            else -> "Find Address Coordinates"
                        },
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp
                    )
                }
            } else {
                Button(
                    onClick = {
                        permissionLauncher.launch(
                            arrayOf(
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION
                            )
                        )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                ) {
                    Text("Allow Location", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedButton(
                    onClick = { showManualEntry = true },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text("Enter Address Manually", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                }

                Spacer(modifier = Modifier.height(12.dp))

                TextButton(onClick = onSkip) {
                    Text("Skip for now", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            errorMessage?.let { err ->
                Spacer(modifier = Modifier.height(16.dp))
                Text(text = err, color = MaterialTheme.colorScheme.error, fontSize = 13.sp, textAlign = TextAlign.Center)
                val requiresPreciseLocation = err.contains("Precise location", ignoreCase = true)
                val requiresAppSettings = requiresPreciseLocation ||
                    err.contains("permission", ignoreCase = true)
                val locationServicesDisabled = err.contains("Location services", ignoreCase = true)
                if (requiresAppSettings || locationServicesDisabled) {
                    TextButton(
                        onClick = {
                            val intent = if (requiresAppSettings) {
                                Intent(
                                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                                    Uri.fromParts("package", context.packageName, null)
                                )
                            } else {
                                Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)
                            }
                            context.startActivity(intent)
                        }
                    ) {
                        Text(
                            when {
                                requiresPreciseLocation -> "Enable Precise Location"
                                requiresAppSettings -> "Open App Settings"
                                else -> "Turn On Location"
                            },
                            color = VegitoPrimary
                        )
                    }
                }
            }
        }
    }
}
