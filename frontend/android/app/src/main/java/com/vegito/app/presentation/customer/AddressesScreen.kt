package com.vegito.app.presentation.customer

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.AddressCreateDto
import com.vegito.app.data.model.SavedAddress
import com.vegito.app.ui.theme.VegitoPrimary
import com.vegito.app.utils.LocationHelper
import com.vegito.app.utils.LocationResult
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddressesScreen(
    addresses: List<SavedAddress>,
    selectedAddressId: String?,
    onBack: () -> Unit,
    onSelectAddress: (SavedAddress) -> Unit,
    onAddAddress: (AddressCreateDto) -> Unit,
    onDeleteAddress: (Int) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var showAddDialog by remember { mutableStateOf(false) }

    // Dialog state
    var addressLine by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    var state by remember { mutableStateOf("") }
    var pincode by remember { mutableStateOf("") }
    var landmark by remember { mutableStateOf("") }
    var isDefault by remember { mutableStateOf(false) }
    var latitude by remember { mutableStateOf<Double?>(null) }
    var longitude by remember { mutableStateOf<Double?>(null) }
    var locationIsPrecise by remember { mutableStateOf(false) }
    var locationAccuracyMeters by remember { mutableStateOf<Float?>(null) }
    var isCapturingLocation by remember { mutableStateOf(false) }
    var locationError by remember { mutableStateOf<String?>(null) }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        ) {
            isCapturingLocation = true
            locationError = null
            scope.launch {
                latitude = null
                longitude = null
                when (val result = LocationHelper.getFreshLocation(context, allowApproximate = true)) {
                    is LocationResult.Success -> {
                        latitude = result.latitude
                        longitude = result.longitude
                        locationIsPrecise = result.isPrecise
                        locationAccuracyMeters = result.accuracyMeters
                        city = result.city
                        state = result.state
                        pincode = result.pincode
                    }
                    else -> locationError = when (result) {
                        is LocationResult.GpsDisabled -> "Turn on GPS and try again."
                        is LocationResult.PreciseLocationRequired -> result.message
                        is LocationResult.PermissionDenied -> "Precise location permission is required."
                        is LocationResult.Timeout -> result.message
                        is LocationResult.Error -> result.message
                        is LocationResult.Success -> null
                    }
                }
                isCapturingLocation = false
            }
        } else {
            locationError = "Location permission is required to detect your current address."
        }
    }

    if (showAddDialog) {
        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            title = { Text("Add Delivery Address", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = addressLine,
                        onValueChange = { addressLine = it },
                        label = { Text("Flat / House No. / Street") },
                        singleLine = false,
                        maxLines = 3,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = landmark,
                        onValueChange = { landmark = it },
                        label = { Text("Landmark (Optional)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = city,
                            onValueChange = { city = it },
                            label = { Text("City") },
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = pincode,
                            onValueChange = { pincode = it },
                            label = { Text("Pincode") },
                            modifier = Modifier.weight(1f)
                        )
                    }
                    OutlinedTextField(
                        value = state,
                        onValueChange = { state = it },
                        label = { Text("State") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedButton(
                        onClick = {
                            latitude = null
                            longitude = null
                            locationError = null
                            locationPermissionLauncher.launch(
                                arrayOf(
                                    Manifest.permission.ACCESS_FINE_LOCATION,
                                    Manifest.permission.ACCESS_COARSE_LOCATION
                                )
                            )
                        },
                        enabled = !isCapturingLocation,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            when {
                                isCapturingLocation -> "Detecting precise location..."
                                latitude != null && longitude != null ->
                                    if (locationIsPrecise) "Fresh precise location captured"
                                    else "Fresh approximate location captured"
                                else -> "Use current device location"
                            }
                        )
                    }
                    if (latitude != null && longitude != null) {
                        Text(
                            "Accuracy: ${locationAccuracyMeters?.let { "${it.toInt()} m" } ?: "not reported"}",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    locationError?.let {
                        Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                        if (it.contains("permission", ignoreCase = true)) {
                            TextButton(onClick = {
                                context.startActivity(
                                    Intent(
                                        Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                                        Uri.fromParts("package", context.packageName, null)
                                    )
                                )
                            }) {
                                Text("Open App Settings")
                            }
                        }
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = isDefault,
                            onCheckedChange = { isDefault = it }
                        )
                        Text("Set as default address", fontSize = 14.sp)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (addressLine.isNotBlank() && city.isNotBlank() && state.isNotBlank() &&
                            pincode.isNotBlank() && latitude != null && longitude != null
                        ) {
                            onAddAddress(
                                AddressCreateDto(
                                    addressLine1 = addressLine.trim(),
                                    city = city.trim(),
                                    state = state.trim(),
                                    pincode = pincode.trim(),
                                    landmark = landmark.ifBlank { null },
                                    isDefault = isDefault,
                                    latitude = latitude,
                                    longitude = longitude
                                )
                            )
                            showAddDialog = false
                            addressLine = ""
                            landmark = ""
                            city = ""
                            state = ""
                            pincode = ""
                            latitude = null
                            longitude = null
                        }
                    },
                    enabled = !isCapturingLocation && addressLine.isNotBlank() && city.isNotBlank() && state.isNotBlank() &&
                        pincode.isNotBlank() && latitude != null && longitude != null,
                    colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                ) {
                    Text("Save Address")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Saved Delivery Addresses", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = VegitoPrimary,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Address")
            }
        }
    ) { paddingValues ->
        if (addresses.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = "No Address",
                        tint = Color.Gray,
                        modifier = Modifier.size(64.dp)
                    )
                    Text("No saved addresses found", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Text(
                        "Add an address to get fast 10-30 min vegetable deliveries",
                        color = Color.Gray,
                        fontSize = 14.sp
                    )
                    Button(
                        onClick = { showAddDialog = true },
                        colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                    ) {
                        Text("Add New Address")
                    }
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(addresses, key = { it.id }) { addr ->
                    val isSelected = addr.id == selectedAddressId
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSelectAddress(addr) },
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isSelected) VegitoPrimary.copy(alpha = 0.08f)
                            else MaterialTheme.colorScheme.surface
                        ),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        if (isSelected) Icons.Default.CheckCircle else Icons.Default.LocationOn,
                                        contentDescription = "Address",
                                        tint = if (isSelected) VegitoPrimary else Color.Gray,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        "${addr.city}, ${addr.pincode}",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 15.sp
                                    )
                                    if (addr.isDefault) {
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Surface(
                                            color = VegitoPrimary.copy(alpha = 0.15f),
                                            shape = RoundedCornerShape(6.dp)
                                        ) {
                                            Text(
                                                "DEFAULT",
                                                color = VegitoPrimary,
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                }

                                addr.id.toIntOrNull()?.let { intId ->
                                    IconButton(
                                        onClick = { onDeleteAddress(intId) },
                                        modifier = Modifier.size(32.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.DeleteOutline,
                                            contentDescription = "Delete",
                                            tint = MaterialTheme.colorScheme.error,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                addr.addressLine,
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )

                            if (!addr.landmark.isNullOrBlank()) {
                                Text(
                                    "Near: ${addr.landmark}",
                                    fontSize = 12.sp,
                                    color = Color.Gray
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
