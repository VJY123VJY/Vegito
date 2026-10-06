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
    onBack: () -> Unit,
    onAddressUpdated: (SavedAddress) -> Unit,
    onCheckDeliveryEligibility: suspend (SavedAddress) -> DeliveryFeeResponse?,
    onPlaceOrder: (paymentMethod: String) -> Unit
) {
    val scope = rememberCoroutineScope()
    var currentAddress by remember(selectedAddress) { mutableStateOf(selectedAddress) }
    var paymentMethod by remember { mutableStateOf("COD") }
    var showLocationSheet by remember { mutableStateOf(false) }
    var isCheckingEligibility by remember { mutableStateOf(false) }
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

    // Automatically prompt for location if missing or invalid
    LaunchedEffect(addr) {
        eligibilityResponse = null
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
                    eligibilityError = "Sorry, this location is outside the seller's delivery area. (${String.format("%.1f", res.distanceKm)} km from seller)"
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
                                    onPlaceOrder(paymentMethod)
                                } catch (e: Exception) {
                                    orderError = "Your order could not be placed. Please try again."
                                } finally {
                                    isPlacingOrder = false
                                }
                            }
                        },
                        enabled = hasValidCoordinates && isDeliverable && !isCheckingEligibility && !isPlacingOrder,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                    ) {
                        if (isCheckingEligibility || isPlacingOrder) {
                            CircularProgressIndicator(
                                color = Color.White,
                                modifier = Modifier.size(24.dp),
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                if (isPlacingOrder) "Placing Order..." else "Checking Delivery Radius...",
                                fontSize = 15.sp
                            )
                        } else {
                            Text(
                                text = "Place Order • ₹${String.format("%.1f", finalGrandTotal)}",
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
                                Text("Refresh", color = VegitoPrimary, fontSize = 13.sp)
                            }
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
                                        text = "GPS Location Missing",
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.error,
                                        fontSize = 13.sp
                                    )
                                    Text(
                                        text = "Please set real GPS delivery coordinates to continue.",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onErrorContainer
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Button(
                        onClick = { showLocationSheet = true },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)
                    ) {
                        Icon(Icons.Default.EditLocation, contentDescription = "Change", tint = MaterialTheme.colorScheme.onSecondaryContainer)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (hasValidCoordinates) "Change Location Pin" else "Set Delivery Location Now",
                            color = MaterialTheme.colorScheme.onSecondaryContainer,
                            fontWeight = FontWeight.SemiBold
                        )
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
                            Text("Calculating distance to nearest seller mandi...", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                onAddressUpdated(addr)
                currentAddress = addr
                eligibilityError = null
                orderError = null
                showLocationSheet = false
            }
        )
    }
}
