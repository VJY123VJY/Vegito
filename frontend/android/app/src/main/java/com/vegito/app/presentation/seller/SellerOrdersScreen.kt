package com.vegito.app.presentation.seller

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.Order
import com.vegito.app.ui.theme.VegitoPrimary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SellerOrdersScreen(
    orders: List<Order>,
    onBack: (() -> Unit)? = null,
    onUpdateStatus: (orderId: String, newStatus: String) -> Unit,
    onVerifyPickupOtp: (orderId: String, otp: String) -> Unit
) {
    var showOtpDialogForOrder by remember { mutableStateOf<Order?>(null) }
    var enteredOtp by remember { mutableStateOf("") }

    if (showOtpDialogForOrder != null) {
        AlertDialog(
            onDismissRequest = { showOtpDialogForOrder = null },
            title = { Text("पिकअप ओटीपी पडताळणी / Pickup OTP") },
            text = {
                Column {
                    Text("डिलिव्हरी पार्टनरकडून ६-अंकी पिकअप ओटीपी घ्या आणि इथे प्रविष्ट करा.")
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = enteredOtp,
                        onValueChange = { enteredOtp = it },
                        label = { Text("पिकअप OTP कोड (Pickup OTP)") },
                        singleLine = true
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showOtpDialogForOrder?.let { onVerifyPickupOtp(it.id, enteredOtp) }
                        showOtpDialogForOrder = null
                        enteredOtp = ""
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                ) {
                    Text("पडताळणी करा आणि माल द्या")
                }
            },
            dismissButton = {
                TextButton(onClick = { showOtpDialogForOrder = null }) { Text("रद्द करा") }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("ऑर्डर पाइपलाइन (Orders Pipeline)", fontWeight = FontWeight.Bold, fontSize = 17.sp) },
                navigationIcon = {
                    if (onBack != null) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(16.dp)
        ) {
            item {
                Text("सक्रिय ग्राहक ऑर्डर्स (Active Customer Orders)", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Text("नवीन ऑर्डर्स स्वीकारा, पॅक करा आणि पिकअपसाठी तयार ठेवा", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(12.dp))
            }

            if (orders.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
                        Text("सध्या कोणतीही प्रलंबित ऑर्डर नाही / No pending orders", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }

            items(orders) { order ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 6.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        val statusUpper = order.status.uppercase()
                        val (statusBg, statusFg) = when (statusUpper) {
                            "NEW", "ORDER_PLACED" -> Color(0xFFFFF3E0) to Color(0xFFE65100)
                            "ACCEPTED", "SELLER_ACCEPTED" -> Color(0xFFE3F2FD) to Color(0xFF1565C0)
                            "PACKING", "PREPARING" -> Color(0xFFF3E5F5) to Color(0xFF7B1FA2)
                            "READY", "READY_FOR_PICKUP" -> Color(0xFFE8F5E9) to Color(0xFF2E7D32)
                            "PICKED_UP", "OUT_FOR_DELIVERY" -> Color(0xFFE0F2F1) to Color(0xFF00695C)
                            "DELIVERED" -> Color(0xFFE8F5E9) to Color(0xFF1B5E20)
                            else -> Color(0xFFEEEEEE) to Color(0xFF616161)
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Order #${order.orderNumber}", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            Surface(
                                color = statusBg,
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(
                                    statusUpper,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = statusFg,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("एकूण रक्कम: ₹${order.totalAmount}", fontWeight = FontWeight.Bold)
                            if (order.deliveryFee > 0) {
                                Text("डिलिव्हरी: ₹${order.deliveryFee}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }

                        if (!order.pickupOtp.isNullOrBlank()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Surface(
                                color = Color(0xFFE8F5E9),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("🔑 पिकअप कोड (Rider Pickup OTP):", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1B5E20))
                                    Text(order.pickupOtp, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF1B5E20))
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            when (statusUpper) {
                                "NEW", "ORDER_PLACED" -> Button(
                                    onClick = { onUpdateStatus(order.id, "ACCEPTED") },
                                    colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                                ) { Text("स्वीकारा (Accept)") }
                                "ACCEPTED", "SELLER_ACCEPTED" -> Button(
                                    onClick = { onUpdateStatus(order.id, "PACKING") },
                                    colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                                ) { Text("पॅक करा (Start Packing)") }
                                "PACKING", "PREPARING" -> Button(
                                    onClick = { onUpdateStatus(order.id, "READY") },
                                    colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                                ) { Text("तयार आहे (Mark Ready)") }
                                "READY", "READY_FOR_PICKUP" -> OutlinedButton(onClick = { showOtpDialogForOrder = order }) {
                                    Text("पिकअप OTP पडताळा")
                                }
                                else -> {
                                    Text(statusUpper, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
