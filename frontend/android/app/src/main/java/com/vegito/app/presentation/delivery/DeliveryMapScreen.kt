package com.vegito.app.presentation.delivery

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalContext
import com.vegito.app.data.model.DeliveryTask
import com.vegito.app.ui.components.VegitoMapView
import com.vegito.app.ui.theme.VegitoPrimary
import com.vegito.app.utils.LocationHelper
import com.vegito.app.utils.LocationResult
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeliveryMapScreen(
    task: DeliveryTask?,
    onBack: () -> Unit,
    onVerifyPickupOtp: (taskId: String, otp: String) -> Unit,
    onVerifyCustomerOtp: (taskId: String, otp: String) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var riderLat by remember { mutableStateOf(17.6740) }
    var riderLng by remember { mutableStateOf(75.9010) }
    var showPickupDialog by remember { mutableStateOf(false) }
    var showCustomerDialog by remember { mutableStateOf(false) }
    var inputOtp by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        scope.launch {
            val res = LocationHelper.getFreshLocation(context)
            if (res is LocationResult.Success) {
                riderLat = res.latitude
                riderLng = res.longitude
            }
        }
    }

    if (showPickupDialog && task != null) {
        AlertDialog(
            onDismissRequest = { showPickupDialog = false },
            title = { Text("Verify Mandi Pickup OTP") },
            text = {
                Column {
                    Text("Enter the 4-digit OTP from seller to verify crate pickup and unlock customer doorstep coordinates.")
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = inputOtp,
                        onValueChange = { inputOtp = it },
                        label = { Text("Seller Pickup OTP") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        onVerifyPickupOtp(task.id, inputOtp)
                        showPickupDialog = false
                        inputOtp = ""
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                ) {
                    Text("Verify Pickup")
                }
            },
            dismissButton = {
                TextButton(onClick = { showPickupDialog = false }) { Text("Cancel") }
            }
        )
    }

    if (showCustomerDialog && task != null) {
        AlertDialog(
            onDismissRequest = { showCustomerDialog = false },
            title = { Text("Verify Customer Doorstep OTP") },
            text = {
                Column {
                    Text("Enter customer's 4-digit OTP to complete doorstep delivery.")
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = inputOtp,
                        onValueChange = { inputOtp = it },
                        label = { Text("Customer OTP") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        onVerifyCustomerOtp(task.id, inputOtp)
                        showCustomerDialog = false
                        inputOtp = ""
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32))
                ) {
                    Text("Complete Order")
                }
            },
            dismissButton = {
                TextButton(onClick = { showCustomerDialog = false }) { Text("Cancel") }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Live Route Navigation", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { paddingValues ->
        if (task == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                Text("No active delivery task currently selected")
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Live Interactive Navigation Map
                VegitoMapView(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(260.dp),
                    riderLat = riderLat,
                    riderLng = riderLng,
                    shopLat = 17.6805,
                    shopLng = 75.9064,
                    customerLat = if (task.isPickupVerified) 17.6599 else null,
                    customerLng = if (task.isPickupVerified) 75.9064 else null,
                    shopName = task.sellerName ?: "Solapur Mandi",
                    customerAddress = if (task.isPickupVerified) (task.customerAddress ?: "Doorstep Destination") else "Protected (Unlocked after pickup)",
                    statusText = if (task.isPickupVerified) "DELIVERING_TO_CUSTOMER" else "EN_ROUTE_TO_PICKUP",
                    showRoute = true,
                    onGpsClick = {
                        scope.launch {
                            val res = LocationHelper.getFreshLocation(context)
                            if (res is LocationResult.Success) {
                                riderLat = res.latitude
                                riderLng = res.longitude
                            }
                        }
                    }
                )

                // Stage 1: Pickup from Seller
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (task.isPickupVerified) Color(0xFFE8F5E9) else MaterialTheme.colorScheme.surface
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
                                Box(
                                    modifier = Modifier
                                        .size(28.dp)
                                        .clip(CircleShape)
                                        .background(if (task.isPickupVerified) Color(0xFF2E7D32) else VegitoPrimary),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        if (task.isPickupVerified) Icons.Default.Check else Icons.Default.Store,
                                        contentDescription = "Pickup",
                                        tint = Color.White,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text("Mandi Pickup Store", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    Text(task.sellerName, fontSize = 12.sp, color = Color.Gray)
                                }
                            }

                            if (!task.isPickupVerified) {
                                Button(
                                    onClick = { showPickupDialog = true },
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                ) {
                                    Text("Enter Pickup OTP", fontSize = 12.sp)
                                }
                            } else {
                                Text("VERIFIED", color = Color(0xFF2E7D32), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    }
                }

                // Stage 2: Doorstep Dropoff
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(28.dp)
                                        .clip(CircleShape)
                                        .background(if (task.isPickupVerified) VegitoPrimary else Color.LightGray),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        if (task.isPickupVerified) Icons.Default.Home else Icons.Default.Lock,
                                        contentDescription = "Dropoff",
                                        tint = Color.White,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text("Customer Doorstep Drop", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    if (task.isPickupVerified) {
                                        Text(task.customerAddress ?: "Solapur City Core", fontSize = 12.sp, color = VegitoPrimary)
                                    } else {
                                        Text("Locked until pickup verification", fontSize = 12.sp, color = Color.Gray)
                                    }
                                }
                            }

                            if (task.isPickupVerified) {
                                Button(
                                    onClick = { showCustomerDialog = true },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                ) {
                                    Text("Verify Delivery OTP", fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
