package com.vegito.app.presentation.customer

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.CartSummary
import com.vegito.app.data.model.DeliveryFeeResponse
import com.vegito.app.data.model.SavedAddress
import com.vegito.app.ui.components.LocationSelectionBottomSheet
import com.vegito.app.ui.theme.VegitoPrimary
import com.vegito.app.ui.theme.VegitoSecondary
import com.vegito.app.utils.LocationHelper
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckoutScreen(
    cart: CartSummary,
    selectedAddress: SavedAddress?,
    savedAddresses: List<SavedAddress>,
    onBack: () -> Unit,
    onSavedAddressSelected: (SavedAddress) -> Unit,
    onAddressUpdated: suspend (SavedAddress) -> SavedAddress?,
    onRefreshCurrentLocation: suspend () -> SavedAddress?,
    onCheckDeliveryEligibility: suspend (SavedAddress) -> DeliveryFeeResponse?,
    onPlaceOrder: suspend (paymentMethod: String, address: SavedAddress) -> Boolean
) {
    val scope = rememberCoroutineScope()
    var currentAddress by remember(selectedAddress) { mutableStateOf(selectedAddress) }
    var paymentMethod by remember { mutableStateOf("COD") }
    var showLocationSheet by remember { mutableStateOf(false) }
    var showSavedAddressesDialog by remember { mutableStateOf(false) }
    var isCheckingEligibility by remember { mutableStateOf(false) }
    var isRefreshingLocation by remember { mutableStateOf(false) }
    var isPlacingOrder by remember { mutableStateOf(false) }
    var eligibilityResponse by remember { mutableStateOf<DeliveryFeeResponse?>(null) }
    var eligibilityError by remember { mutableStateOf<String?>(null) }
    var orderError by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(selectedAddress) {
        currentAddress = selectedAddress
    }

    val addr = currentAddress
    val hasValidCoordinates = addr != null && LocationHelper.isValidCoordinates(
        addr.latitude,
        addr.longitude
    )
    val hasMultipleSellers = cart.items.map { it.product.sellerId }
        .filter { it.isNotBlank() }
        .distinct()
        .size > 1

    // Automatically prompt for location if missing or invalid
    LaunchedEffect(addr, hasMultipleSellers) {
        eligibilityResponse = null
        if (hasMultipleSellers) {
            eligibilityError = "Your cart contains products from multiple sellers. Place separate orders for each seller."
            return@LaunchedEffect
        }
        if (!hasValidCoordinates) {
            showLocationSheet = true
        } else if (addr != null) {
            isCheckingEligibility = true
            eligibilityError = null
            try {
                val res = onCheckDeliveryEligibility(addr)
                eligibilityResponse = res
                if (res == null) {
                    eligibilityError = "Could not verify delivery eligibility. Please try again."
                } else if (!res.isDeliverable) {
                    eligibilityError = if (!res.sellerOnline) {
                        "This seller is currently offline. Please choose another seller or try again later."
                    } else {
                        "Sorry, this location is outside the seller's delivery area. (${String.format("%.1f", res.distanceKm)} km from seller)"
                    }
                }
            } catch (e: Exception) {
                eligibilityError = "Unable to verify delivery distance. Please verify address."
            } finally {
                isCheckingEligibility = false
            }
        }
    }

    val isDeliverable = hasValidCoordinates && eligibilityError == null && eligibilityResponse?.isDeliverable == true
    val calculatedDeliveryFee = eligibilityResponse?.deliveryFee ?: 0.0
    val finalGrandTotal = (cart.subtotal + calculatedDeliveryFee - cart.discount).coerceAtLeast(0.0)
    val addressToDisplay = addr

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Checkout & Delivery", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        bottomBar = {
            Surface(shadowElevation = 8.dp) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    if (eligibilityError != null) {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = MaterialTheme.colorScheme.errorContainer,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 12.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.Warning,
                                    contentDescription = "Error",
                                    tint = MaterialTheme.colorScheme.error
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = eligibilityError ?: "Delivery not available",
                                    color = MaterialTheme.colorScheme.onErrorContainer,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                    }
                    orderError?.let { message ->
                        Text(
                            text = message,
                            color = MaterialTheme.colorScheme.error,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(bottom = 8.dp)
                        )
                    }

                    Button(
                        onClick = {
                            scope.launch {
                                isPlacingOrder = true
                                orderError = null
                                try {
                                    var addressToPlace = currentAddress
                                    if (addressToPlace?.capturedAsCurrentLocation == true) {
                                        isRefreshingLocation = true
                                        val refreshedAddress = onRefreshCurrentLocation()
                                        isRefreshingLocation = false
                                        if (refreshedAddress == null || !LocationHelper.isValidCoordinates(
                                                refreshedAddress.latitude,
                                                refreshedAddress.longitude
                                            )
                                        ) {
                                            orderError = "Could not refresh your current location. Please select it again or choose a saved address."
                                            showLocationSheet = true
                                            return@launch
                                        }

                                        addressToPlace = refreshedAddress
                                        currentAddress = refreshedAddress
                                        isCheckingEligibility = true
                                        val freshEligibility = onCheckDeliveryEligibility(refreshedAddress)
                                        isCheckingEligibility = false
                                        eligibilityResponse = freshEligibility
                                        eligibilityError = when {
                                            freshEligibility == null ->
                                                "Could not verify delivery eligibility. Please try again."
                                            !freshEligibility.isDeliverable && !freshEligibility.sellerOnline ->
                                                "This store is currently offline. Please try again later."
                                            !freshEligibility.isDeliverable ->
                                                "This location is outside the selected store's delivery area (${String.format("%.1f", freshEligibility.distanceKm)} km away)."
                                            else -> null
                                        }
                                        if (freshEligibility?.isDeliverable != true) {
                                            orderError = eligibilityError
                                                ?: "Delivery is not available at this location."
                                            return@launch
                                        }
                                    }

                                    val placed = addressToPlace?.let {
                                        onPlaceOrder(paymentMethod, it)
                                    } ?: false
                                    if (!placed) {
                                        orderError = "Your order could not be placed. Please try again."
                                    }
                                } catch (e: Exception) {
                                    orderError = "Your order could not be placed. Please try again."
                                } finally {
                                    isRefreshingLocation = false
                                    isCheckingEligibility = false
                                    isPlacingOrder = false
                                }
                            }
                        },
                        enabled = cart.items.isNotEmpty() && hasValidCoordinates && isDeliverable &&
                            !isCheckingEligibility && !isRefreshingLocation && !isPlacingOrder,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                    ) {
                        if (isCheckingEligibility || isRefreshingLocation || isPlacingOrder) {
                            CircularProgressIndicator(
                                color = Color.White,
                                modifier = Modifier.size(24.dp),
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                when {
                                    isPlacingOrder -> "Placing order..."
                                    isRefreshingLocation -> "Refreshing location..."
                                    else -> "Checking delivery..."
                                },
                                fontSize = 15.sp
                            )
                        } else {
                            Text(
                                text = if (cart.items.isEmpty()) "Your basket is empty"
                                else "Place order • ₹${String.format("%.2f", finalGrandTotal)}",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            // 1. DELIVERY LOCATION CARD
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                shape = CircleShape,
                                color = VegitoPrimary.copy(alpha = 0.12f),
                                modifier = Modifier.size(36.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        Icons.Default.LocationOn,
                                        contentDescription = "Location",
                                        tint = VegitoPrimary,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Text("Delivery Address", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }

                        Row {
                            TextButton(onClick = { showLocationSheet = true }) {
                                Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = VegitoPrimary, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Use current location", color = VegitoPrimary, fontSize = 13.sp)
                            }
                        }
                    }

                    if (savedAddresses.isNotEmpty()) {
                        TextButton(
                            onClick = { showSavedAddressesDialog = true },
                            contentPadding = PaddingValues(horizontal = 0.dp, vertical = 4.dp)
                        ) {
                            Icon(Icons.Default.Home, contentDescription = "Saved addresses", modifier = Modifier.size(17.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Choose a saved address")
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    if (addressToDisplay != null && hasValidCoordinates) {
                        Text(
                            text = addressToDisplay.title,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = addressToDisplay.addressLine,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 13.sp
                        )
                        if (addressToDisplay.capturedAsCurrentLocation) {
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "Current device location — it will be refreshed before your order is placed.",
                                color = VegitoPrimary,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = VegitoPrimary.copy(alpha = 0.08f)
                        ) {
                            Text(
                                text = "GPS: ${String.format("%.4f", addressToDisplay.latitude)}, ${String.format("%.4f", addressToDisplay.longitude)} • ${addressToDisplay.city}",
                                fontSize = 11.sp,
                                color = VegitoPrimary,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    } else {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.5f),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.Warning, contentDescription = "Warning", tint = MaterialTheme.colorScheme.error)
                                Spacer(modifier = Modifier.width(8.dp))
                                Column {
                                    Text(
                                        text = "Delivery location needed",
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.error,
                                        fontSize = 13.sp
                                    )
                                    Text(
                                        text = "Choose a saved address or detect your current location to continue.",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onErrorContainer
                                    )
                                }
                            }
                        }
                    }

                    TextButton(
                        onClick = { showLocationSheet = true },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.EditLocation, contentDescription = "Change delivery location")
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(if (hasValidCoordinates) "Change delivery location" else "Select delivery location")
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 2. DELIVERY ELIGIBILITY STATUS
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Moped,
                            contentDescription = "Delivery",
                            tint = if (isDeliverable) VegitoPrimary else MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text("Delivery Radius & Eligibility", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    if (isCheckingEligibility) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Checking distance to the selected store...", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    } else if (eligibilityResponse != null) {
                        val dist = eligibilityResponse!!.distanceKm
                        Text(
                            text = "Distance from seller: ${String.format("%.1f", dist)} km (Max: ${String.format("%.0f", eligibilityResponse!!.maxAllowedKm)} km)",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        if (eligibilityResponse!!.isDeliverable) {
                            Text(
                                text = "✓ Delivery Available • Calculated Fee: ₹${String.format("%.1f", calculatedDeliveryFee)}",
                                color = Color(0xFF2E7D32),
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        } else {
                            Text(
                                text = "✕ Outside 15 km delivery radius.",
                                color = MaterialTheme.colorScheme.error,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }
                    } else {
                        Text(
                            text = eligibilityError ?: "Delivery eligibility has not been verified.",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 3. PAYMENT METHOD
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Payment, contentDescription = "Payment", tint = VegitoPrimary)
                        Spacer(modifier = Modifier.width(10.dp))
                        Text("Payment Method", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    }
                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        RadioButton(
                            selected = paymentMethod == "COD",
                            onClick = { paymentMethod = "COD" }
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Column {
                            Text("Cash on Delivery (COD)", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                            Text("Pay via cash or UPI to delivery partner upon arrival", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        RadioButton(
                            selected = paymentMethod == "ONLINE",
                            onClick = { paymentMethod = "ONLINE" }
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Column {
                            Text("Online Payment (UPI / QR / Cards)", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                            Text("Pay securely via Google Pay, PhonePe, Paytm or Card", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 4. ORDER BILL SUMMARY
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Bill Details", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Item Total", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("₹${String.format("%.1f", cart.subtotal)}", fontSize = 13.sp)
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Delivery Partner Fee", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("₹${String.format("%.1f", calculatedDeliveryFee)}", fontSize = 13.sp)
                    }

                    if (cart.discount > 0) {
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Offer Discount", fontSize = 13.sp, color = Color(0xFF2E7D32))
                            Text("- ₹${String.format("%.1f", cart.discount)}", fontSize = 13.sp, color = Color(0xFF2E7D32), fontWeight = FontWeight.Bold)
                        }
                    }

                    Divider(modifier = Modifier.padding(vertical = 10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Grand Total", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Text(
                            "₹${String.format("%.1f", finalGrandTotal)}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = VegitoPrimary
                        )
                    }
                }
            }
        }
    }

    if (showLocationSheet) {
        LocationSelectionBottomSheet(
            currentAddress = currentAddress,
            onDismiss = { showLocationSheet = false },
            onAddressConfirmed = { addr ->
                scope.launch {
                    val savedAddress = onAddressUpdated(addr)
                    if (savedAddress != null) {
                        currentAddress = savedAddress
                        eligibilityError = null
                        orderError = null
                        showLocationSheet = false
                    } else {
                        eligibilityError = "Could not save this delivery address. Please try again."
                    }
                }
            }
        )
    }

    if (showSavedAddressesDialog) {
        AlertDialog(
            onDismissRequest = { showSavedAddressesDialog = false },
            title = { Text("Choose a delivery address", fontWeight = FontWeight.Bold) },
            text = {
                Column(
                    modifier = Modifier
                        .heightIn(max = 360.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    savedAddresses.forEach { address ->
                        TextButton(
                            onClick = {
                                val selected = address.copy(capturedAsCurrentLocation = false)
                                currentAddress = selected
                                onSavedAddressSelected(selected)
                                eligibilityError = null
                                orderError = null
                                showSavedAddressesDialog = false
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.fillMaxWidth()) {
                                Text(address.title, fontWeight = FontWeight.Bold)
                                Text(
                                    address.addressLine,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showSavedAddressesDialog = false }) {
                    Text("Close")
                }
            }
        )
    }
}
