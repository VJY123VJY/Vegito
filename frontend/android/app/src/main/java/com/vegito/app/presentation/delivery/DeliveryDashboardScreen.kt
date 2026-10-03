package com.vegito.app.presentation.delivery

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.ui.theme.VegitoPrimary

@Composable
fun DeliveryDashboardScreen(
    isOnline: Boolean,
    todayEarnings: Double,
    activeTasksCount: Int,
    onToggleOnline: (Boolean) -> Unit
) {
    var onlineState by remember { mutableStateOf(isOnline) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = if (onlineState) VegitoPrimary.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Delivery Mode", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text(if (onlineState) "ONLINE — Ready for tasks" else "OFFLINE", fontSize = 12.sp)
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

        Spacer(modifier = Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Card(
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Icon(Icons.Default.Payments, contentDescription = "Earnings", tint = VegitoPrimary)
                    Text("Today's Earnings", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("₹$todayEarnings", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                }
            }

            Card(
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Icon(Icons.Default.LocalShipping, contentDescription = "Tasks", tint = VegitoPrimary)
                    Text("Active Delivery", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("$activeTasksCount Task", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
