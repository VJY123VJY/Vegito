package com.vegito.app.presentation.delivery

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
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
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeliveryTaskScreen(
    tasks: List<DeliveryTask>,
    onBack: (() -> Unit)? = null,
    onAcceptTask: (taskId: String) -> Unit,
    onVerifyPickupOtp: (taskId: String, otp: String) -> Unit = { _, _ -> },
    onVerifyCustomerOtp: (taskId: String, otp: String) -> Unit,
    onNavigateMap: (taskId: String) -> Unit = {},
    onRefresh: (() -> Unit)? = null
) {
    var showCustomerOtpDialogForTask by remember { mutableStateOf<DeliveryTask?>(null) }
    var showPickupOtpDialogForTask by remember { mutableStateOf<DeliveryTask?>(null) }
    var enteredCustomerOtp by remember { mutableStateOf("") }
    var enteredPickupOtp by remember { mutableStateOf("") }
    var processingTaskId by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    // Pickup OTP Dialog
    if (showPickupOtpDialogForTask != null) {
        val currentTask = showPickupOtpDialogForTask!!
        AlertDialog(
            onDismissRequest = {
                if (processingTaskId == null) showPickupOtpDialogForTask = null
            },
            title = { Text("Verify Seller Pickup OTP", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text(
                        "Enter the pickup verification OTP from the seller (${currentTask.sellerName}) to confirm crate handoff and securely unlock customer doorstep coordinates.",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = enteredPickupOtp,
                        onValueChange = { enteredPickupOtp = it },
                        label = { Text("Seller Pickup OTP") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        enabled = processingTaskId == null
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (processingTaskId == null && enteredPickupOtp.isNotBlank()) {
                            processingTaskId = currentTask.id
                            onVerifyPickupOtp(currentTask.id, enteredPickupOtp)
                            scope.launch {
                                delay(1200L)
                                processingTaskId = null
                                showPickupOtpDialogForTask = null
                                enteredPickupOtp = ""
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary),
                    enabled = enteredPickupOtp.isNotBlank() && processingTaskId == null
                ) {
                    if (processingTaskId == currentTask.id) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                        Spacer(modifier = Modifier.width(6.dp))
                    }
                    Text("Verify & Unlock Customer")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showPickupOtpDialogForTask = null },
                    enabled = processingTaskId == null
                ) {
                    Text("Cancel")
                }
            }
        )
    }

    // Customer Doorstep OTP Dialog
    if (showCustomerOtpDialogForTask != null) {
        val currentTask = showCustomerOtpDialogForTask!!
        AlertDialog(
            onDismissRequest = {
                if (processingTaskId == null) showCustomerOtpDialogForTask = null
            },
            title = { Text("Verify Customer Doorstep OTP", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text(
                        "Enter the customer's delivery OTP received at doorstep to confirm successful delivery handover.",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = enteredCustomerOtp,
                        onValueChange = { enteredCustomerOtp = it },
                        label = { Text("Customer OTP") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        enabled = processingTaskId == null
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (processingTaskId == null && enteredCustomerOtp.isNotBlank()) {
                            processingTaskId = currentTask.id
                            onVerifyCustomerOtp(currentTask.id, enteredCustomerOtp)
                            scope.launch {
                                delay(1200L)
                                processingTaskId = null
                                showCustomerOtpDialogForTask = null
                                enteredCustomerOtp = ""
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                    enabled = enteredCustomerOtp.isNotBlank() && processingTaskId == null
                ) {
                    if (processingTaskId == currentTask.id) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                        Spacer(modifier = Modifier.width(6.dp))
                    }
                    Text("Complete Delivery")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showCustomerOtpDialogForTask = null },
                    enabled = processingTaskId == null
                ) {
                    Text("Cancel")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Delivery Tasks Board", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                navigationIcon = {
                    if (onBack != null) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    }
                },
                actions = {
                    if (onRefresh != null) {
                        IconButton(onClick = onRefresh) {
                            Icon(Icons.Default.Refresh, contentDescription = "Refresh Tasks")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Active Deliveries (${tasks.size})", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    if (onRefresh != null) {
                        TextButton(onClick = onRefresh) {
                            Text("Refresh", fontSize = 12.sp, color = VegitoPrimary)
                        }
                    }
                }
            }

            if (tasks.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(36.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = VegitoPrimary, modifier = Modifier.size(36.dp))
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    "No delivery assignments right now",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontSize = 14.sp
                                )
                                Text(
                                    "When a seller marks an order READY, it will automatically appear here.",
                                    color = Color.Gray,
                                    fontSize = 12.sp
                                )
                            }
                        }
                    }
                }
            }

            items(tasks, key = { it.id }) { task ->
                val isProcessing = processingTaskId == task.id

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        // Header: Task / Order number + Urgent
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    "TASK #${task.orderNumber}",
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 15.sp
                                )
                                if (task.isUrgent) {
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Surface(
                                        color = Color(0xFFFFEBEE),
                                        shape = RoundedCornerShape(6.dp)
                                    ) {
                                        Text(
                                            "⚡ URGENT",
                                            color = Color(0xFFC62828),
                                            fontWeight = FontWeight.ExtraBold,
                                            fontSize = 10.sp,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                            }

                            Surface(
                                color = if (task.isPickupVerified) Color(0xFFE8F5E9) else Color(0xFFFFF3E0),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(
                                    if (task.status.uppercase() == "DELIVERED") "DELIVERED"
                                    else if (task.isPickupVerified) "OUT FOR DELIVERY"
                                    else "AWAITING PICKUP",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (task.isPickupVerified) Color(0xFF2E7D32) else Color(0xFFE65100),
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Pickup Store
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Store, contentDescription = "Seller", tint = VegitoPrimary, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text("Pickup Location:", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(
                                    task.sellerName.ifBlank { "Shree Ganesh Store" } +
                                            if (task.sellerAddress.isNotBlank()) " • ${task.sellerAddress}" else "",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Privacy Enforcement Logic (Sections 11 & 14):
                        // Before pickup verification, customer exact location is locked!
                        if (task.isPickupVerified) {
                            Surface(
                                color = Color(0xFFE8F5E9),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Home, contentDescription = "Dropoff", tint = Color(0xFF2E7D32), modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            "Customer Dropoff (Unlocked):",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp,
                                            color = Color(0xFF2E7D32)
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        task.customerAddress ?: task.customerArea.ifBlank { "Customer Delivery Address Unlocked" },
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                    if (!task.customerName.isNullOrBlank()) {
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text("Customer: ${task.customerName}", fontSize = 11.sp, color = Color.Gray)
                                    }
                                }
                            }
                        } else {
                            Surface(
                                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Default.Lock, contentDescription = "Locked", tint = Color.Gray, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Column {
                                        Text("Customer Location Locked 🔒", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                        Text(
                                            "Exact address & coordinates will unlock after seller pickup OTP verification.",
                                            fontSize = 11.sp,
                                            color = Color.Gray
                                        )
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Action Buttons Row (Double-tap protected)
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
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Map Route")
                            }

                            if (task.status.uppercase() == "PENDING") {
                                Button(
                                    onClick = {
                                        if (processingTaskId == null) {
                                            processingTaskId = task.id
                                            onAcceptTask(task.id)
                                            scope.launch {
                                                delay(1200L)
                                                processingTaskId = null
                                            }
                                        }
                                    },
                                    enabled = !isProcessing,
                                    colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary),
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    if (isProcessing) {
                                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                                        Spacer(modifier = Modifier.width(6.dp))
                                    }
                                    Text("Accept Task")
                                }
                            } else if (!task.isPickupVerified) {
                                Button(
                                    onClick = { showPickupOtpDialogForTask = task },
                                    enabled = !isProcessing,
                                    colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary),
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    Icon(Icons.Default.Key, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Verify Pickup OTP")
                                }
                            } else if (task.status.uppercase() != "DELIVERED") {
                                Button(
                                    onClick = { showCustomerOtpDialogForTask = task },
                                    enabled = !isProcessing,
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Complete Delivery")
                                }
                            } else {
                                Surface(
                                    color = Color(0xFFE8F5E9),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text(
                                        "✓ Delivered",
                                        color = Color(0xFF1B5E20),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
