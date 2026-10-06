package com.vegito.app.presentation.seller

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.SellerProfileDto
import com.vegito.app.ui.components.SellerShopLocationPicker
import com.vegito.app.ui.theme.VegitoPrimary
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SellerSettingsScreen(
    sellerProfile: SellerProfileDto?,
    currentLang: String,
    currentTheme: String,
    isStoreOnline: Boolean,
    onBack: () -> Unit,
    onLanguageChange: (String) -> Unit,
    onThemeToggle: () -> Unit,
    onToggleOnline: (Boolean) -> Unit,
    onUpdateShopLocation: (address: String, city: String, pincode: String, lat: Double, lng: Double) -> Unit,
    onLogout: () -> Unit
) {
    var isOnline by remember { mutableStateOf(isStoreOnline) }
    var showLogoutDialog by remember { mutableStateOf(false) }

    // Change Location State
    var showChangeLocationSheet by remember { mutableStateOf(false) }
    var showLocationChangeConfirmDialog by remember { mutableStateOf(false) }

    var pendingAddress by remember { mutableStateOf("") }
    var pendingCity by remember { mutableStateOf("") }
    var pendingPincode by remember { mutableStateOf("") }
    var pendingLat by remember { mutableDoubleStateOf(0.0) }
    var pendingLng by remember { mutableDoubleStateOf(0.0) }

    val currentAddress = sellerProfile?.address.orEmpty()
    val currentLat = sellerProfile?.latitude
    val currentLng = sellerProfile?.longitude

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Confirm Logout", fontWeight = FontWeight.Bold) },
            text = { Text("Are you sure you want to sign out and clear your session?") },
            confirmButton = {
                Button(
                    onClick = {
                        showLogoutDialog = false
                        onLogout()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Logout", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) { Text("Cancel") }
            }
        )
    }

    // Confirmation Dialog before saving Location Change
    if (showLocationChangeConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showLocationChangeConfirmDialog = false },
            title = { Text("New Shop Location Confirmation", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Are you sure you want to update your shop operating location?", fontSize = 13.sp)

                    HorizontalDivider()

                    Text("Old Location:", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(currentAddress, fontSize = 13.sp)

                    HorizontalDivider()

                    Text("New Location:", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = VegitoPrimary)
                    Text(pendingAddress, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    Text(
                        "Lat: ${String.format(Locale.US, "%.5f", pendingLat)}, Lng: ${String.format(Locale.US, "%.5f", pendingLng)}",
                        fontSize = 11.sp,
                        color = VegitoPrimary
                    )

                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "This will become your new active shop/pickup location for all future customer orders.",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showLocationChangeConfirmDialog = false
                        showChangeLocationSheet = false
                        onUpdateShopLocation(pendingAddress, pendingCity, pendingPincode, pendingLat, pendingLng)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                ) {
                    Text("Confirm Change", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLocationChangeConfirmDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Seller Settings", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // SHOP -> LOCATION SECTION
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Storefront, contentDescription = "Location", tint = VegitoPrimary)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("🏪 Shop Pickup Location", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        }
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = Color(0xFFE8F5E9)
                        ) {
                            Text(
                                "✓ ACTIVE",
                                color = Color(0xFF2E7D32),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text("Current Operating Address:", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(currentAddress, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        "Coordinates: Lat ${String.format(Locale.US, "%.5f", currentLat)}, Lng ${String.format(Locale.US, "%.5f", currentLng)}",
                        fontSize = 12.sp,
                        color = VegitoPrimary,
                        fontWeight = FontWeight.Medium
                    )

                    sellerProfile?.updatedAt?.let { ts ->
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Last updated: $ts", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Button(
                        onClick = { showChangeLocationSheet = true },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                    ) {
                        Icon(Icons.Default.EditLocation, contentDescription = "Change")
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Change Shop Location", fontWeight = FontWeight.Bold)
                    }
                }
            }

            // Store Operation
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Store Operations", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Store Availability", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text(
                                if (isOnline) "Accepting incoming customer orders" else "Store paused",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Switch(
                            checked = isOnline,
                            onCheckedChange = {
                                isOnline = it
                                onToggleOnline(it)
                            }
                        )
                    }
                }
            }

            // Language & Localization
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("App Language", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(10.dp))

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = currentLang == "en",
                            onClick = { onLanguageChange("en") },
                            label = { Text("English") }
                        )
                        FilterChip(
                            selected = currentLang == "mr",
                            onClick = { onLanguageChange("mr") },
                            label = { Text("मराठी") }
                        )
                        FilterChip(
                            selected = currentLang == "hi",
                            onClick = { onLanguageChange("hi") },
                            label = { Text("हिन्दी") }
                        )
                    }
                }
            }

            // Display & Theme
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Appearance Theme", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text(
                            "Current: ${if (currentTheme == "DARK") "Dark Mode 🌙" else "Light Mode ☀️"}",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Button(
                        onClick = onThemeToggle,
                        colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(if (currentTheme == "DARK") "Switch to Light" else "Switch to Dark")
                    }
                }
            }

            // Security & Logout
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Session & Account", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(12.dp))

                    Button(
                        onClick = { showLogoutDialog = true },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = "Logout")
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Logout & Exit Workspace", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }

    // Change Location Bottom Sheet
    if (showChangeLocationSheet) {
        ModalBottomSheet(onDismissRequest = { showChangeLocationSheet = false }) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 10.dp)
                    .padding(bottom = 24.dp)
            ) {
                SellerShopLocationPicker(
                    initialAddress = currentAddress,
                    initialLat = currentLat,
                    initialLng = currentLng,
                    isMandatory = false,
                    title = "Change Shop Location",
                    subtitle = "Select your new operating/pickup location using GPS, Map or Manual Entry.",
                    onLocationConfirmed = { addr, city, pincode, lat, lng, _ ->
                        pendingAddress = addr
                        pendingCity = city
                        pendingPincode = pincode
                        pendingLat = lat
                        pendingLng = lng
                        showLocationChangeConfirmDialog = true
                    },
                    onCancel = { showChangeLocationSheet = false }
                )
            }
        }
    }
}
