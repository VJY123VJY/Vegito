package com.vegito.app.presentation.delivery

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.ui.theme.VegitoPrimary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeliveryDashboardScreen(
    isOnline: Boolean,
    todayEarnings: Double,
    activeTasksCount: Int,
    onToggleOnline: (Boolean) -> Unit,
    onNavigateTasks: () -> Unit = {},
    onNavigateEarnings: () -> Unit = {},
    onNavigateProfile: () -> Unit = {},
    onNavigateMap: () -> Unit = {}
) {
    var onlineState by remember { mutableStateOf(isOnline) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Delivery Partner Portal", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
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
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Duty Toggle Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (onlineState) VegitoPrimary.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            if (onlineState) "ON DUTY — Ready for Tasks" else "OFF DUTY",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = if (onlineState) VegitoPrimary else Color.Gray
                        )
                        Text(
                            if (onlineState) "Receiving mandi delivery assignments in Solapur" else "Turn on switch when ready to deliver",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Switch(
                        checked = onlineState,
                        onCheckedChange = {
                            onlineState = it
                            onToggleOnline(it)
                        }
                    )
                }
            }

            // Metrics Summary Grid
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onNavigateEarnings() },
                    shape = RoundedCornerShape(16.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Icon(Icons.Default.Payments, contentDescription = "Earnings", tint = VegitoPrimary)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Today's Earnings", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("₹${String.format("%.0f", todayEarnings)}", fontSize = 22.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onNavigateTasks() },
                    shape = RoundedCornerShape(16.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Icon(Icons.Default.LocalShipping, contentDescription = "Tasks", tint = VegitoPrimary)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Active Tasks", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("$activeTasksCount Orders", fontSize = 22.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            // Quick Actions Title
            Text("Delivery Partner Hub", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(vertical = 4.dp)) {
                    DeliveryActionItem(
                        title = "Active Delivery Tasks",
                        subtitle = "Accept and fulfill mandi vegetable orders",
                        icon = Icons.Default.Task,
                        onClick = onNavigateTasks
                    )
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                    DeliveryActionItem(
                        title = "Live Navigation & Route",
                        subtitle = "GPS preview from mandi to customer",
                        icon = Icons.Default.Navigation,
                        onClick = onNavigateMap
                    )
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                    DeliveryActionItem(
                        title = "Earnings & Trips History",
                        subtitle = "Payouts, daily incentives & tips",
                        icon = Icons.Default.AccountBalanceWallet,
                        onClick = onNavigateEarnings
                    )
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                    DeliveryActionItem(
                        title = "Rider Profile & Vehicle Info",
                        subtitle = "License, vehicle number & verification",
                        icon = Icons.Default.TwoWheeler,
                        onClick = onNavigateProfile
                    )
                }
            }
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
