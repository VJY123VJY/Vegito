package com.vegito.app.ui.components

import android.Manifest
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
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

private enum class LocationSheetState {
    OPTIONS,
    DETECTING,
    SUCCESS_CONFIRM,
    GPS_DISABLED,
    PERMISSION_DENIED,
    ERROR_RETRY,
    MANUAL_ENTRY
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LocationSelectionBottomSheet(
    currentAddress: SavedAddress?,
    onDismiss: () -> Unit,
    onAddressConfirmed: (SavedAddress) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    var state by remember { mutableStateOf(LocationSheetState.OPTIONS) }
    var detectedSuccess by remember { mutableStateOf<LocationResult.Success?>(null) }
    var errorMessage by remember { mutableStateOf("") }

    // Manual Entry Fields
    var manualAddressLine by remember { mutableStateOf(currentAddress?.addressLine ?: "") }
    var manualLandmark by remember { mutableStateOf(currentAddress?.landmark ?: "") }
    var manualCity by remember { mutableStateOf(currentAddress?.city.orEmpty()) }
    var manualPincode by remember { mutableStateOf(currentAddress?.pincode.orEmpty()) }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true
        val coarseGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true

        if (fineGranted) {
            state = LocationSheetState.DETECTING
            scope.launch {
                when (val result = LocationHelper.getFreshLocation(context)) {
                    is LocationResult.Success -> {
                        detectedSuccess = result
                        state = LocationSheetState.SUCCESS_CONFIRM
                    }
                    is LocationResult.GpsDisabled -> {
                        state = LocationSheetState.GPS_DISABLED
                    }
                    is LocationResult.PreciseLocationRequired -> {
                        errorMessage = result.message
                        state = LocationSheetState.PERMISSION_DENIED
                    }
                    is LocationResult.PermissionDenied -> {
                        state = LocationSheetState.PERMISSION_DENIED
                    }
                    is LocationResult.Timeout -> {
                        errorMessage = result.message
                        state = LocationSheetState.ERROR_RETRY
                    }
                    is LocationResult.Error -> {
                        errorMessage = result.message
                        state = LocationSheetState.ERROR_RETRY
                    }
                }
            }
        } else if (coarseGranted) {
            errorMessage = "Precise location is required to verify your delivery distance."
            state = LocationSheetState.ERROR_RETRY
        } else {
            state = LocationSheetState.PERMISSION_DENIED
        }
    }

    fun startLocationDetection() {
        if (!LocationHelper.isLocationEnabled(context)) {
            state = LocationSheetState.GPS_DISABLED
            return
        }
        permissionLauncher.launch(
            arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            )
        )
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 12.dp)
                .padding(bottom = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            AnimatedContent(targetState = state, label = "LocationSheetAnimation") { targetState ->
                when (targetState) {
                    LocationSheetState.OPTIONS -> {
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Surface(
                                shape = CircleShape,
                                color = VegitoPrimary.copy(alpha = 0.15f),
                                modifier = Modifier.size(56.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = Icons.Default.LocationOn,
                                        contentDescription = "Location",
                                        tint = VegitoPrimary,
                                        modifier = Modifier.size(32.dp)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "Set Delivery Location",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "Vegito uses your location to verify delivery availability and find fresh produce near you.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.Center
                            )

                            Spacer(modifier = Modifier.height(24.dp))

                            Button(
                                onClick = { startLocationDetection() },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(52.dp),
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                            ) {
                                Icon(Icons.Default.MyLocation, contentDescription = "GPS")
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Use Current Location (GPS)", fontWeight = FontWeight.SemiBold)
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            TextButton(
                                onClick = { state = LocationSheetState.MANUAL_ENTRY }
                            ) {
                                Icon(Icons.Default.EditLocation, contentDescription = "Manual")
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Enter Address Manually", color = VegitoPrimary)
                            }
                        }
                    }

                    LocationSheetState.DETECTING -> {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            CircularProgressIndicator(
                                color = VegitoPrimary,
                                strokeWidth = 3.dp,
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(modifier = Modifier.height(20.dp))
                            Text(
                                text = "Detecting your location...",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "Requesting real GPS fix from your device. Please wait...",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.Center
                            )
                        }
                    }

                    LocationSheetState.SUCCESS_CONFIRM -> {
                        val success = detectedSuccess
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Surface(
                                shape = CircleShape,
                                color = Color(0xFF2E7D32).copy(alpha = 0.15f),
                                modifier = Modifier.size(56.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = Icons.Default.CheckCircle,
                                        contentDescription = "Success",
                                        tint = Color(0xFF2E7D32),
                                        modifier = Modifier.size(32.dp)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(14.dp))
                            Text(
                                text = "Current Location Detected",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(8.dp))

                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Place, contentDescription = "Pin", tint = VegitoPrimary)
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = success?.area.orEmpty().ifBlank { "Current GPS location" },
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 15.sp
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        text = success?.addressLine ?: "",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = "GPS: ${String.format("%.4f", success?.latitude ?: 0.0)}, ${String.format("%.4f", success?.longitude ?: 0.0)} • ${success?.city}, ${success?.pincode}",
                                        fontSize = 12.sp,
                                        color = VegitoPrimary,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(20.dp))

                            Button(
                                onClick = {
                                    if (success != null) {
                                        onAddressConfirmed(
                                            SavedAddress(
                                                id = "loc_${System.currentTimeMillis()}",
                                                title = success.area.ifBlank { "Current Location" },
                                                addressLine = success.addressLine,
                                                latitude = success.latitude,
                                                longitude = success.longitude,
                                                city = success.city,
                                                pincode = success.pincode,
                                                state = success.state,
                                                isDefault = true
                                            )
                                        )
                                        onDismiss()
                                    }
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(50.dp),
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                            ) {
                                Text("Use This Location", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            TextButton(onClick = { startLocationDetection() }) {
                                Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = VegitoPrimary)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Refresh Location", color = VegitoPrimary)
                            }
                        }
                    }

                    LocationSheetState.GPS_DISABLED -> {
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Default.LocationOff,
                                contentDescription = "GPS Disabled",
                                tint = MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(52.dp)
                            )
                            Spacer(modifier = Modifier.height(14.dp))
                            Text(
                                text = "Location Services Turned Off",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "Please turn on device location (GPS) to allow Vegito to detect your delivery address.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(20.dp))

                            Button(
                                onClick = {
                                    val intent = Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)
                                    context.startActivity(intent)
                                    state = LocationSheetState.OPTIONS
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(50.dp),
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                            ) {
                                Text("Turn On Location")
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            OutlinedButton(
                                onClick = { state = LocationSheetState.MANUAL_ENTRY },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(50.dp),
                                shape = RoundedCornerShape(14.dp)
                            ) {
                                Text("Enter Address Manually")
                            }
                        }
                    }

                    LocationSheetState.PERMISSION_DENIED -> {
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Default.SecurityUpdateWarning,
                                contentDescription = "Permission Denied",
                                tint = MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(52.dp)
                            )
                            Spacer(modifier = Modifier.height(14.dp))
                            Text(
                                text = "Precise Location Required",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "Precise location is required to verify your delivery distance. Enable Precise Location in app settings or enter your address manually.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(20.dp))

                            Button(
                                onClick = {
                                    val intent = Intent(
                                        Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                                        Uri.fromParts("package", context.packageName, null)
                                    )
                                    context.startActivity(intent)
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(50.dp),
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                            ) {
                                Text("Enable Precise Location")
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            OutlinedButton(
                                onClick = { state = LocationSheetState.MANUAL_ENTRY },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(50.dp),
                                shape = RoundedCornerShape(14.dp)
                            ) {
                                Text("Enter Address Manually")
                            }
                        }
                    }

                    LocationSheetState.ERROR_RETRY -> {
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Default.ErrorOutline,
                                contentDescription = "Error",
                                tint = MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(52.dp)
                            )
                            Spacer(modifier = Modifier.height(14.dp))
                            Text(
                                text = "Location Detection Failed",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = errorMessage.ifBlank { "Could not detect GPS coordinates. Please retry or pick on map." },
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(20.dp))

                            Button(
                                onClick = { startLocationDetection() },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(50.dp),
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                            ) {
                                Text("Try Again")
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            TextButton(onClick = { state = LocationSheetState.MANUAL_ENTRY }) {
                                Text("Enter Address Manually", color = VegitoPrimary)
                            }
                        }
                    }

                    LocationSheetState.MANUAL_ENTRY -> {
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalAlignment = Alignment.Start
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Enter Address Manually",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                TextButton(onClick = { state = LocationSheetState.OPTIONS }) {
                                    Text("Back")
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedTextField(
                                value = manualAddressLine,
                                onValueChange = { manualAddressLine = it },
                                label = { Text("House / Flat / Street / Area *") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(10.dp))

                            OutlinedTextField(
                                value = manualLandmark,
                                onValueChange = { manualLandmark = it },
                                label = { Text("Landmark (Optional)") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(10.dp))

                            Row(modifier = Modifier.fillMaxWidth()) {
                                OutlinedTextField(
                                    value = manualCity,
                                    onValueChange = { manualCity = it },
                                    label = { Text("City *") },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(12.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                OutlinedTextField(
                                    value = manualPincode,
                                    onValueChange = { manualPincode = it },
                                    label = { Text("Pincode *") },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(12.dp)
                                )
                            }

                            Spacer(modifier = Modifier.height(20.dp))

                            Button(
                                onClick = {
                                    if (manualAddressLine.isNotBlank()) {
                                        val addr = SavedAddress(
                                            id = "man_${System.currentTimeMillis()}",
                                            title = "Home",
                                            addressLine = listOfNotNull(manualAddressLine, manualLandmark, manualCity, manualPincode).filter { it.isNotBlank() }.joinToString(", "),
                                            landmark = manualLandmark.ifBlank { null },
                                            latitude = null,
                                            longitude = null,
                                            city = manualCity,
                                            pincode = manualPincode,
                                            state = "Maharashtra",
                                            isDefault = true
                                        )
                                        onAddressConfirmed(addr)
                                        onDismiss()
                                    }
                                },
                                enabled = manualAddressLine.isNotBlank(),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(50.dp),
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                            ) {
                                Text("Save & Use Address", fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                }
            }
        }
    }
}
