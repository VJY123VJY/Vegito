package com.vegito.app.presentation.seller

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.SellerDashboardStats
import com.vegito.app.ui.theme.VegitoPrimary

@Composable
fun SellerDashboardScreen(
    stats: SellerDashboardStats,
    onToggleOnline: (Boolean) -> Unit
) {
    var isOnline by remember { mutableStateOf(stats.isOnline) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Online Toggle Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = if (isOnline) VegitoPrimary.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Store Status", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text(if (isOnline) "Accepting New Orders" else "Store Offline", fontSize = 12.sp)
                }
                Switch(
                    checked = isOnline,
                    onCheckedChange = {
                        isOnline = it
                        onToggleOnline(it)
                    }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Metrics Grid
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Card(
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Icon(Icons.Default.AttachMoney, contentDescription = "Sales", tint = VegitoPrimary)
                    Text("Today's Sales", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("₹${stats.todaySales}", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                }
            }

            Card(
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Icon(Icons.Default.Receipt, contentDescription = "Orders", tint = VegitoPrimary)
                    Text("Active Orders", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("${stats.activeOrdersCount}", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
