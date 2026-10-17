package com.vegito.app.presentation.delivery

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.DeliveryTask
import com.vegito.app.ui.theme.VegitoPrimary
import com.vegito.app.utils.DeviceStatusHelper
import com.vegito.app.utils.GpsQuality
import com.vegito.app.utils.LocationHelper
import com.vegito.app.utils.LocationResult
import com.vegito.app.utils.NetworkStatus

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeliveryDashboardScreen(
    isOnline: Boolean,
    todayEarnings: Double,
    activeTasksCount: Int,
    tasks: List<DeliveryTask> = emptyList(),
    onToggleOnline: (Boolean) -> Unit,
    onNavigateTasks: () -> Unit = {},
    onNavigateEarnings: () -> Unit = {},
    onNavigateProfile: () -> Unit = {},
    onNavigateMap: (taskId: String?) -> Unit = {},
    onSwitchWorkspace: ((String) -> Unit)? = null
) {
    var onlineState by remember { mutableStateOf(isOnline) }
    val context = LocalContext.current

    // Real device diagnostics
    val batteryLevel = remember { DeviceStatusHelper.getBatteryLevel(context) }
    val networkStatus = remember { DeviceStatusHelper.getNetworkStatus(context) }
    var gpsAccuracy by remember { mutableStateOf<Float?>(null) }
    var isGpsEnabled by remember { mutableStateOf(LocationHelper.isLocationEnabled(context)) }

    LaunchedEffect(Unit) {
        val loc = LocationHelper.getFreshLocation(context)
        if (loc is LocationResult.Success) {
            gpsAccuracy = loc.accuracyMeters
            isGpsEnabled = true
        } else {
            isGpsEnabled = LocationHelper.isLocationEnabled(context)
        }
    }

    val gpsQuality = remember(gpsAccuracy, isGpsEnabled) {
        DeviceStatusHelper.evaluateGpsQuality(gpsAccuracy, isGpsEnabled)
    }

    // Task metric counts
    val activeDeliveries = tasks.count { it.status.uppercase() in listOf("ACCEPTED", "IN_PROGRESS", "PICKED_UP") }
    val newTasksCount = tasks.count { it.status.uppercase() in listOf("PENDING", "ASSIGNED") }
    val completedCount = tasks.count { it.status.uppercase() == "DELIVERED" }
    val urgentCount = tasks.count { it.isUrgent }

    val currentTask = tasks.firstOrNull { it.status.uppercase() != "DELIVERED" } ?: tasks.firstOrNull()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Delivery Command Center", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                actions = {
                    IconButton(onClick = onNavigateProfile) {
                        Icon(Icons.Default.AccountCircle, contentDescription = "Profile")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Workspace Switcher (Seller Mode / Delivery Mode)
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(4.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    OutlinedButton(
                        onClick = { onSwitchWorkspace?.invoke("seller") },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = MaterialTheme.colorScheme.onSurface
                        ),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(vertical = 10.dp)
                    ) {
                        Icon(Icons.Default.Storefront, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Seller Mode", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }

                    Button(
                        onClick = { /* Already in Delivery Mode */ },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = VegitoPrimary,
                            contentColor = Color.White
                        ),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(vertical = 10.dp)
                    ) {
                        Icon(Icons.Default.LocalShipping, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Delivery Mode", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }
            }

            // Header Banner: DELIVERY CENTER + LIVE ONLINE TOGGLE
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(46.dp)
                                    .clip(CircleShape)
                                    .background(VegitoPrimary.copy(alpha = 0.12f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("🛵", fontSize = 22.sp)
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text("FLEET COMMAND", fontWeight = FontWeight.Bold, fontSize = 11.5.sp, color = VegitoPrimary, letterSpacing = 0.8.sp)
                                Text("Delivery Partner", fontWeight = FontWeight.Black, fontSize = 19.sp, color = MaterialTheme.colorScheme.onSurface)
                            }
                        }

                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = if (onlineState) Color(0xFF047857).copy(alpha = 0.12f) else Color(0xFFEF4444).copy(alpha = 0.12f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, if (onlineState) Color(0xFF047857).copy(alpha = 0.3f) else Color(0xFFEF4444).copy(alpha = 0.3f)),
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .clickable {
                                    val newState = !onlineState
                                    onlineState = newState
                                    onToggleOnline(newState)
                                }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(CircleShape)
                                        .background(if (onlineState) Color(0xFF10B981) else Color(0xFFEF4444))
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = if (onlineState) "ON DUTY" else "OFF DUTY",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = if (onlineState) Color(0xFF047857) else Color(0xFFDC2626)
                                )
                            }
                        }
                    }
                }
            }

            // Real Live Device Status Row (Battery, Network, GPS)
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Battery
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("🔋", fontSize = 13.sp)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = if (batteryLevel != null) "$batteryLevel%" else "100%",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    // Network
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        val netColor = when (networkStatus) {
                            NetworkStatus.ONLINE -> Color(0xFF047857)
                            NetworkStatus.WEAK -> Color(0xFFF57F17)
                            NetworkStatus.OFFLINE -> Color(0xFFDC2626)
                        }
                        Box(modifier = Modifier.size(7.dp).clip(CircleShape).background(netColor))
                        Spacer(modifier = Modifier.width(5.dp))
                        Text(
                            text = "Net: ${networkStatus.name}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = netColor
                        )
                    }

                    // GPS Status
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        val gpsColor = when (gpsQuality) {
                            GpsQuality.GOOD -> Color(0xFF047857)
                            GpsQuality.WEAK -> Color(0xFFF57F17)
                            GpsQuality.UNAVAILABLE -> Color(0xFFDC2626)
                        }
                        Box(modifier = Modifier.size(7.dp).clip(CircleShape).background(gpsColor))
                        Spacer(modifier = Modifier.width(5.dp))
                        Text(
                            text = "GPS: ${gpsQuality.name}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = gpsColor
                        )
                    }
                }
            }

            // Summary Metrics Grid (Active, New Tasks, Completed, Urgent)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                MetricCard(
                    title = "Active Delivery",
                    value = "$activeDeliveries",
                    icon = Icons.Default.DirectionsBike,
                    color = VegitoPrimary,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateTasks
                )
                MetricCard(
                    title = "New Tasks",
                    value = "$newTasksCount",
                    icon = Icons.Default.Task,
                    color = Color(0xFF1565C0),
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateTasks
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                MetricCard(
                    title = "Completed Today",
                    value = "$completedCount",
                    icon = Icons.Default.CheckCircle,
                    color = Color(0xFF2E7D32),
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateTasks
                )
                MetricCard(
                    title = "Urgent Delivery",
                    value = "$urgentCount",
                    icon = Icons.Default.Bolt,
                    color = Color(0xFFC62828),
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateTasks
                )
            }

            // Active / New Delivery Card
            if (currentTask != null) {
                Text(
                    "CURRENT DELIVERY TASK",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    letterSpacing = 0.8.sp
                )

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "Order #${currentTask.orderNumber}",
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 16.sp
                            )
                            if (currentTask.isUrgent) {
                                Surface(
                                    color = Color(0xFFFFEBEE),
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        "⚡ URGENT",
                                        color = Color(0xFFC62828),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 10.sp,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Pickup
                        Row(verticalAlignment = Alignment.Top) {
                            Icon(Icons.Default.Store, contentDescription = "Shop", tint = VegitoPrimary, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text("Pickup:", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(currentTask.sellerName.ifBlank { "Shree Ganesh Store" }, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // Destination (Privacy enforced)
                        Row(verticalAlignment = Alignment.Top) {
                            Icon(
                                if (currentTask.isPickupVerified) Icons.Default.LocationOn else Icons.Default.Lock,
                                contentDescription = "Drop",
                                tint = if (currentTask.isPickupVerified) Color(0xFF2E7D32) else Color.Gray,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text("Destination:", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                if (currentTask.isPickupVerified) {
                                    Text(
                                        currentTask.customerAddress ?: "Customer dropoff address verified",
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 13.sp,
                                        color = Color(0xFF2E7D32)
                                    )
                                } else {
                                    Text(
                                        "Customer location locked until pickup verification",
                                        fontSize = 12.sp,
                                        color = Color.Gray,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        Button(
                            onClick = { onNavigateMap(currentTask.id) },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.Navigation, contentDescription = "Navigate", modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                if (currentTask.isPickupVerified) "Navigate to Customer" else "Open Delivery Task",
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            // Quick Hub Actions
            Text("Delivery Partner Hub", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(vertical = 4.dp)) {
                    DeliveryActionItem(
                        title = "Delivery Tasks Board",
                        subtitle = "View and fulfill assigned orders",
                        icon = Icons.Default.Task,
                        onClick = onNavigateTasks
                    )
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                    DeliveryActionItem(
                        title = "Live Route Navigation",
                        subtitle = "Map navigation from store to customer",
                        icon = Icons.Default.Navigation,
                        onClick = { onNavigateMap(currentTask?.id) }
                    )
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                    DeliveryActionItem(
                        title = "Earnings & Trips",
                        subtitle = "Delivery payout summaries and completed runs",
                        icon = Icons.Default.AccountBalanceWallet,
                        onClick = onNavigateEarnings
                    )
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                    DeliveryActionItem(
                        title = "Partner Profile & Vehicle",
                        subtitle = "Rohit Mehta • Shree Ganesh Store Fleet",
                        icon = Icons.Default.TwoWheeler,
                        onClick = onNavigateProfile
                    )
                }
            }
        }
    }
}

@Composable
private fun MetricCard(
    title: String,
    value: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        modifier = modifier
            .clip(RoundedCornerShape(18.dp))
            .clickable { onClick() },
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.45f)),
        shadowElevation = 1.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(color.copy(alpha = 0.12f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(icon, contentDescription = title, tint = color, modifier = Modifier.size(20.dp))
                }
                Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f), modifier = Modifier.size(14.dp))
            }
            Spacer(modifier = Modifier.height(10.dp))
            Text(value, fontSize = 22.sp, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.onSurface)
            Spacer(modifier = Modifier.height(2.dp))
            Text(title, fontSize = 11.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)
        }
    }
}

@Composable
private fun DeliveryActionItem(
    title: String,
    subtitle: String,
    icon: ImageVector,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = title, tint = VegitoPrimary, modifier = Modifier.size(24.dp))
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Text(subtitle, fontSize = 11.sp, color = Color.Gray)
        }
        Icon(
            Icons.AutoMirrored.Filled.ArrowForward,
            contentDescription = "Go",
            tint = Color.Gray,
            modifier = Modifier.size(18.dp)
        )
    }
}
