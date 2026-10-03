package com.vegito.app.presentation.seller

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.Order
import com.vegito.app.ui.theme.VegitoPrimary

@Composable
fun SellerOrdersScreen(
    orders: List<Order>,
    onUpdateStatus: (orderId: String, newStatus: String) -> Unit,
    onVerifyPickupOtp: (orderId: String, otp: String) -> Unit
) {
    var showOtpDialogForOrder by remember { mutableStateOf<Order?>(null) }
    var enteredOtp by remember { mutableStateOf("") }

    if (showOtpDialogForOrder != null) {
        AlertDialog(
            onDismissRequest = { showOtpDialogForOrder = null },
            title = { Text("Verify Delivery Partner Pickup OTP") },
            text = {
                Column {
                    Text("Ask Delivery Partner for pickup verification OTP before package handoff.")
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = enteredOtp,
                        onValueChange = { enteredOtp = it },
                        label = { Text("Enter Pickup OTP") },
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
                    }
                ) {
                    Text("Verify & Handover")
                }
            },
            dismissButton = {
                TextButton(onClick = { showOtpDialogForOrder = null }) { Text("Cancel") }
            }
        )
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp)
    ) {
        item {
            Text("Seller Order Pipeline", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(12.dp))
        }

        items(orders) { order ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Order #${order.orderNumber}", fontWeight = FontWeight.Bold)
                        Surface(
                            color = VegitoPrimary.copy(alpha = 0.15f),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                order.status,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = VegitoPrimary,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Total Amount: ₹${order.totalAmount}", fontWeight = FontWeight.Bold)

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        when (order.status) {
                            "NEW" -> Button(onClick = { onUpdateStatus(order.id, "ACCEPTED") }) { Text("Accept") }
                            "ACCEPTED" -> Button(onClick = { onUpdateStatus(order.id, "PACKING") }) { Text("Packing") }
                            "PACKING" -> Button(onClick = { onUpdateStatus(order.id, "READY") }) { Text("Mark Ready") }
                            "READY" -> OutlinedButton(onClick = { showOtpDialogForOrder = order }) { Text("Verify Pickup OTP") }
                        }
                    }
                }
            }
        }
    }
}
