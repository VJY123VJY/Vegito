package com.vegito.app.presentation.delivery

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
import com.vegito.app.data.model.DeliveryEarningsData
import com.vegito.app.ui.theme.VegitoPrimary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeliveryEarningsScreen(
    earningsData: DeliveryEarningsData,
    onBack: () -> Unit,
    onPeriodChange: (String) -> Unit
) {
    var selectedPeriod by remember { mutableStateOf("today") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Earnings & Payouts", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Period selector
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = selectedPeriod == "today",
                    onClick = {
                        selectedPeriod = "today"
                        onPeriodChange("today")
                    },
                    label = { Text("Today") },
                    modifier = Modifier.weight(1f)
                )
                FilterChip(
                    selected = selectedPeriod == "week",
                    onClick = {
                        selectedPeriod = "week"
                        onPeriodChange("week")
                    },
                    label = { Text("This Week") },
                    modifier = Modifier.weight(1f)
                )
                FilterChip(
                    selected = selectedPeriod == "month",
                    onClick = {
                        selectedPeriod = "month"
                        onPeriodChange("month")
                    },
                    label = { Text("This Month") },
                    modifier = Modifier.weight(1f)
                )
            }

            // Total Payout Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = VegitoPrimary.copy(alpha = 0.12f))
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.AccountBalanceWallet, contentDescription = "Wallet", tint = VegitoPrimary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Total Earned ($selectedPeriod)", fontWeight = FontWeight.Bold, color = VegitoPrimary)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "₹${String.format("%.2f", earningsData.totalEarnings)}",
                        fontSize = 32.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = VegitoPrimary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "Includes ₹${earningsData.tips} tips & ₹${earningsData.surgeBonus} surge bonuses",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Breakdown Grid
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(16.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Icon(Icons.Default.TwoWheeler, contentDescription = "Trips", tint = VegitoPrimary)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Completed Trips", fontSize = 11.sp, color = Color.Gray)
                        Text("${earningsData.completedOrdersCount}", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(16.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Icon(Icons.Default.PriceCheck, contentDescription = "Base", tint = VegitoPrimary)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Base Trip Pay", fontSize = 11.sp, color = Color.Gray)
                        Text("₹${String.format("%.0f", earningsData.basePay)}", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Text("Recent Completed Trips", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

            val displayTrips = if (earningsData.recentTrips.isNotEmpty()) earningsData.recentTrips else listOf(
                com.vegito.app.data.model.DeliveryTripSummary(1, "VEG-8819", 45.0, 5.0, 3.2, "DELIVERED"),
                com.vegito.app.data.model.DeliveryTripSummary(2, "VEG-8815", 40.0, 10.0, 2.8, "DELIVERED"),
                com.vegito.app.data.model.DeliveryTripSummary(3, "VEG-8810", 55.0, 0.0, 4.5, "DELIVERED")
            )

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(displayTrips, key = { it.orderId }) { trip ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("Order #${trip.orderNumber}", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text("${trip.distanceKm} km • Solapur Local", fontSize = 12.sp, color = Color.Gray)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("₹${trip.payout + trip.tip}", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = VegitoPrimary)
                                if (trip.tip > 0) {
                                    Text("+₹${trip.tip} tip", fontSize = 11.sp, color = Color(0xFF2E7D32), fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
