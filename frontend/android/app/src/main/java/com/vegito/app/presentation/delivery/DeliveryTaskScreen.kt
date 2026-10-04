package com.vegito.app.presentation.delivery

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Store
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.DeliveryTask
import com.vegito.app.ui.theme.VegitoPrimary

@Composable
fun DeliveryTaskScreen(
    tasks: List<DeliveryTask>,
    onAcceptTask: (taskId: String) -> Unit,
    onVerifyPickupOtp: (taskId: String, otp: String) -> Unit = { _, _ -> },
    onVerifyCustomerOtp: (taskId: String, otp: String) -> Unit,
    onNavigateMap: (taskId: String) -> Unit = {}
) {
    var showCustomerOtpDialogForTask by remember { mutableStateOf<DeliveryTask?>(null) }
    var showPickupOtpDialogForTask by remember { mutableStateOf<DeliveryTask?>(null) }
    var enteredCustomerOtp by remember { mutableStateOf("") }
    var enteredPickupOtp by remember { mutableStateOf("") }

    if (showPickupOtpDialogForTask != null) {
        AlertDialog(
            onDismissRequest = { showPickupOtpDialogForTask = null },
            title = { Text("Mandi Seller Pickup OTP") },
            text = {
                Column {
                    Text("Enter 4-digit OTP provided by the mandi seller to verify package pickup.")
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = enteredPickupOtp,
                        onValueChange = { enteredPickupOtp = it },
                        label = { Text("Seller Pickup OTP") },
                        singleLine = true
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showPickupOtpDialogForTask?.let { onVerifyPickupOtp(it.id, enteredPickupOtp) }
                        showPickupOtpDialogForTask = null
                        enteredPickupOtp = ""
                    }
                ) {
                    Text("Verify & Unlock Customer")
                }
            },
            dismissButton = {
                TextButton(onClick = { showPickupOtpDialogForTask = null }) { Text("Cancel") }
            }
        )
    }

    if (showCustomerOtpDialogForTask != null) {
        AlertDialog(
            onDismissRequest = { showCustomerOtpDialogForTask = null },
            title = { Text("Customer Delivery Verification OTP") },
            text = {
                Column {
                    Text("Enter 4-digit OTP provided by customer at doorstep to complete delivery.")
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = enteredCustomerOtp,
                        onValueChange = { enteredCustomerOtp = it },
                        label = { Text("Customer OTP") },
                        singleLine = true
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showCustomerOtpDialogForTask?.let { onVerifyCustomerOtp(it.id, enteredCustomerOtp) }
                        showCustomerOtpDialogForTask = null
                        enteredCustomerOtp = ""
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32))
                ) {
                    Text("Complete Delivery")
                }
            },
            dismissButton = {
                TextButton(onClick = { showCustomerOtpDialogForTask = null }) { Text("Cancel") }
            }
        )
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp)
    ) {
        item {
            Text("Delivery Tasks", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(12.dp))
        }

        if (tasks.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text("No available delivery assignments right now", color = Color.Gray)
                }
            }
        }

        items(tasks) { task ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Task #${task.orderNumber}", fontWeight = FontWeight.Bold)
                        Text("Earnings: ₹${task.earnings}", fontWeight = FontWeight.Bold, color = VegitoPrimary)
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Store, contentDescription = "Seller", tint = VegitoPrimary)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Pickup: ${task.sellerName} (${task.sellerAddress})")
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Privacy Enforcement Logic:
                    // Before pickup verification, customer exact location is locked!
                    if (task.isPickupVerified) {
                        Surface(
                            color = VegitoPrimary.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Text("Customer Unlocked:", fontWeight = FontWeight.Bold, color = VegitoPrimary)
                                Text(task.customerAddress ?: "Solapur West, Maharashtra")
                            }
                        }
                    } else {
                        Surface(
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.Lock, contentDescription = "Locked", tint = Color.Gray)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Customer location locked until seller pickup OTP verification.", fontSize = 11.sp, color = Color.Gray)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedButton(
                            onClick = { onNavigateMap(task.id) },
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.Navigation, contentDescription = "Map", modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Map Route")
                        }

                        if (task.status == "PENDING") {
                            Button(onClick = { onAcceptTask(task.id) }) { Text("Accept Task") }
                        } else if (!task.isPickupVerified) {
                            Button(onClick = { showPickupOtpDialogForTask = task }) { Text("Verify Pickup OTP") }
                        } else {
                            Button(
                                onClick = { showCustomerOtpDialogForTask = task },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32))
                            ) {
                                Text("Complete Delivery")
                            }
                        }
                    }
                }
            }
        }
    }
}
