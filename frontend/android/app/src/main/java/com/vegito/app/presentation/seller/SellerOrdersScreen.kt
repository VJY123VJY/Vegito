package com.vegito.app.presentation.seller

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
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
import com.vegito.app.data.model.Order
import com.vegito.app.ui.theme.VegitoPrimary
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

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
    var selectedTab by remember { mutableStateOf("ALL") }
    var processingOrderId by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    val tabs = listOf("ALL", "NEW", "ACCEPTED", "PACKING", "READY")

    // Filter orders according to selected tab
    val filteredOrders = remember(orders, selectedTab) {
        val list = when (selectedTab) {
            "NEW" -> orders.filter { it.status.uppercase() in listOf("NEW", "ORDER_PLACED") }
            "ACCEPTED" -> orders.filter { it.status.uppercase() in listOf("ACCEPTED", "SELLER_ACCEPTED") }
            "PACKING" -> orders.filter { it.status.uppercase() in listOf("PACKING", "PREPARING") }
            "READY" -> orders.filter { it.status.uppercase() in listOf("READY", "READY_FOR_PICKUP") }
            else -> orders
        }

        // Smart sorting: Urgent first, then actionable states, then others
        list.sortedWith(
            compareByDescending<Order> { it.isUrgent }
                .thenBy { order ->
                    when (order.status.uppercase()) {
                        "NEW", "ORDER_PLACED" -> 0
                        "ACCEPTED", "SELLER_ACCEPTED" -> 1
                        "PACKING", "PREPARING" -> 2
                        "READY", "READY_FOR_PICKUP" -> 3
                        "PICKED_UP", "OUT_FOR_DELIVERY" -> 4
                        else -> 5
                    }
                }
        )
    }

    if (showOtpDialogForOrder != null) {
        AlertDialog(
            onDismissRequest = { showOtpDialogForOrder = null },
            title = { Text("Verify Pickup OTP", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text("Enter the 6-digit pickup verification OTP provided by the delivery partner.")
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = enteredOtp,
                        onValueChange = { enteredOtp = it },
                        label = { Text("Pickup OTP Code") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val ord = showOtpDialogForOrder
                        if (ord != null && enteredOtp.isNotBlank()) {
                            processingOrderId = ord.id
                            onVerifyPickupOtp(ord.id, enteredOtp)
                            scope.launch {
                                delay(1200L)
                                processingOrderId = null
                            }
                        }
                        showOtpDialogForOrder = null
                        enteredOtp = ""
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary),
                    enabled = enteredOtp.isNotBlank() && processingOrderId == null
                ) {
                    Text("Verify & Release Package")
                }
            },
            dismissButton = {
                TextButton(onClick = { showOtpDialogForOrder = null }) { Text("Cancel") }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Seller Order Board", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Filter Tabs Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                tabs.forEach { tabName ->
                    val isSelected = selectedTab == tabName
                    val count = when (tabName) {
                        "NEW" -> orders.count { it.status.uppercase() in listOf("NEW", "ORDER_PLACED") }
                        "ACCEPTED" -> orders.count { it.status.uppercase() in listOf("ACCEPTED", "SELLER_ACCEPTED") }
                        "PACKING" -> orders.count { it.status.uppercase() in listOf("PACKING", "PREPARING") }
                        "READY" -> orders.count { it.status.uppercase() in listOf("READY", "READY_FOR_PICKUP") }
                        else -> orders.size
                    }

                    FilterChip(
                        selected = isSelected,
                        onClick = { selectedTab = tabName },
                        label = {
                            Text(
                                if (tabName == "ALL") "All ($count)" else "$tabName ($count)",
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                fontSize = 12.sp
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = VegitoPrimary.copy(alpha = 0.15f),
                            selectedLabelColor = VegitoPrimary
                        )
                    )
                }
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                if (filteredOrders.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(40.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                "No orders found in '$selectedTab' category",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 14.sp
                            )
                        }
                    }
                }

                items(filteredOrders, key = { it.id }) { order ->
                    val statusUpper = order.status.uppercase()
                    val isProcessing = processingOrderId == order.id

                    val (statusBg, statusFg) = when (statusUpper) {
                        "NEW", "ORDER_PLACED" -> Color(0xFFFFF3E0) to Color(0xFFE65100)
                        "ACCEPTED", "SELLER_ACCEPTED" -> Color(0xFFE3F2FD) to Color(0xFF1565C0)
                        "PACKING", "PREPARING" -> Color(0xFFF3E5F5) to Color(0xFF7B1FA2)
                        "READY", "READY_FOR_PICKUP" -> Color(0xFFE8F5E9) to Color(0xFF2E7D32)
                        "PICKED_UP", "OUT_FOR_DELIVERY" -> Color(0xFFE0F2F1) to Color(0xFF00695C)
                        "DELIVERED" -> Color(0xFFE8F5E9) to Color(0xFF1B5E20)
                        else -> Color(0xFFEEEEEE) to Color(0xFF616161)
                    }

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            // Header Row: Order ID + Badges
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        "ORDER #${order.orderNumber}",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 15.sp
                                    )
                                    if (order.isUrgent) {
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
                                    color = statusBg,
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text(
                                        statusUpper.replace("_", " "),
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = statusFg,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            // Customer name & placed time row
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                if (!order.customerName.isNullOrBlank()) {
                                    Text(
                                        "Customer: ${order.customerName}",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                } else {
                                    Text(
                                        "Customer Order",
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }

                                if (order.createdAt.isNotBlank()) {
                                    Text(
                                        order.createdAt.take(19).replace("T", " "),
                                        fontSize = 11.sp,
                                        color = Color.Gray
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(6.dp))

                            // Items count and total amount
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                val count = if (order.itemsCount > 0) order.itemsCount else order.items.size
                                Text(
                                    "$count ${if (count == 1) "Item" else "Items"}",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )

                                Text(
                                    "₹${order.totalAmount}",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = VegitoPrimary
                                )
                            }

                            // Preparation Timer indicator for packing state
                            if (statusUpper in listOf("PACKING", "PREPARING")) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Surface(
                                    color = Color(0xFFF3E5F5),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(
                                            Icons.Default.HourglassTop,
                                            contentDescription = "Packing",
                                            tint = Color(0xFF7B1FA2),
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            "Order Packing in Progress • Prepare items for handoff",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Medium,
                                            color = Color(0xFF7B1FA2)
                                        )
                                    }
                                }
                            }

                            // Pickup OTP Display for READY state
                            if (!order.pickupOtp.isNullOrBlank() || statusUpper in listOf("READY", "READY_FOR_PICKUP")) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Surface(
                                    color = Color(0xFFE8F5E9),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                Icons.Default.Key,
                                                contentDescription = "OTP",
                                                tint = Color(0xFF1B5E20),
                                                modifier = Modifier.size(16.dp)
                                            )
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text(
                                                "Seller Pickup OTP:",
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = Color(0xFF1B5E20)
                                            )
                                        }
                                        Text(
                                            order.pickupOtp ?: "Ready for Pickup",
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = Color(0xFF1B5E20)
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // State Machine Action Buttons (Double-tap protected, strict forward-only transitions)
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.End,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                when (statusUpper) {
                                    "NEW", "ORDER_PLACED" -> {
                                        Button(
                                            onClick = {
                                                if (processingOrderId == null) {
                                                    processingOrderId = order.id
                                                    onUpdateStatus(order.id, "ACCEPTED")
                                                    scope.launch {
                                                        delay(1200L)
                                                        processingOrderId = null
                                                    }
                                                }
                                            },
                                            enabled = !isProcessing,
                                            colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary),
                                            shape = RoundedCornerShape(10.dp)
                                        ) {
                                            if (isProcessing) {
                                                CircularProgressIndicator(
                                                    color = Color.White,
                                                    modifier = Modifier.size(16.dp),
                                                    strokeWidth = 2.dp
                                                )
                                                Spacer(modifier = Modifier.width(6.dp))
                                            }
                                            Text("Accept Order", fontWeight = FontWeight.Bold)
                                        }
                                    }

                                    "ACCEPTED", "SELLER_ACCEPTED" -> {
                                        Button(
                                            onClick = {
                                                if (processingOrderId == null) {
                                                    processingOrderId = order.id
                                                    onUpdateStatus(order.id, "PACKING")
                                                    scope.launch {
                                                        delay(1200L)
                                                        processingOrderId = null
                                                    }
                                                }
                                            },
                                            enabled = !isProcessing,
                                            colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary),
                                            shape = RoundedCornerShape(10.dp)
                                        ) {
                                            if (isProcessing) {
                                                CircularProgressIndicator(
                                                    color = Color.White,
                                                    modifier = Modifier.size(16.dp),
                                                    strokeWidth = 2.dp
                                                )
                                                Spacer(modifier = Modifier.width(6.dp))
                                            }
                                            Text("Start Packing", fontWeight = FontWeight.Bold)
                                        }
                                    }

                                    "PACKING", "PREPARING" -> {
                                        Button(
                                            onClick = {
                                                if (processingOrderId == null) {
                                                    processingOrderId = order.id
                                                    onUpdateStatus(order.id, "READY")
                                                    scope.launch {
                                                        delay(1200L)
                                                        processingOrderId = null
                                                    }
                                                }
                                            },
                                            enabled = !isProcessing,
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                                            shape = RoundedCornerShape(10.dp)
                                        ) {
                                            if (isProcessing) {
                                                CircularProgressIndicator(
                                                    color = Color.White,
                                                    modifier = Modifier.size(16.dp),
                                                    strokeWidth = 2.dp
                                                )
                                                Spacer(modifier = Modifier.width(6.dp))
                                            }
                                            Text("Mark Ready", fontWeight = FontWeight.Bold)
                                        }
                                    }

                                    "READY", "READY_FOR_PICKUP" -> {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            Surface(
                                                color = Color(0xFFE8F5E9),
                                                shape = RoundedCornerShape(8.dp)
                                            ) {
                                                Text(
                                                    "✓ Ready for Delivery",
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color(0xFF2E7D32),
                                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                                )
                                            }

                                            OutlinedButton(
                                                onClick = { showOtpDialogForOrder = order },
                                                shape = RoundedCornerShape(10.dp)
                                            ) {
                                                Text("Verify OTP", fontSize = 12.sp)
                                            }
                                        }
                                    }

                                    "PICKED_UP", "OUT_FOR_DELIVERY" -> {
                                        Text(
                                            "🚚 Out for Delivery",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp,
                                            color = Color(0xFF00695C)
                                        )
                                    }

                                    "DELIVERED" -> {
                                        Text(
                                            "✓ Delivered",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp,
                                            color = Color(0xFF1B5E20)
                                        )
                                    }

                                    else -> {
                                        Text(
                                            statusUpper,
                                            fontSize = 12.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
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
}
