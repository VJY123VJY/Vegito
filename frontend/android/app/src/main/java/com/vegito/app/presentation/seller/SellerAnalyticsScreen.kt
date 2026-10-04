package com.vegito.app.presentation.seller

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import com.vegito.app.data.model.TimeSeriesPointDto
import com.vegito.app.data.model.TopProductAnalyticsDto
import com.vegito.app.ui.theme.VegitoPrimary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SellerAnalyticsScreen(
    revenueData: List<TimeSeriesPointDto>,
    topProducts: List<TopProductAnalyticsDto>,
    onBack: () -> Unit,
    onPeriodChange: (String) -> Unit
) {
    var selectedPeriod by remember { mutableStateOf("today") }

    val totalRevenue = remember(revenueData) {
        if (revenueData.isNotEmpty()) revenueData.sumOf { it.value } else 1850.0
    }
    val totalOrders = remember(revenueData) {
        if (revenueData.isNotEmpty()) revenueData.sumOf { it.ordersCount ?: 0 } else 14
    }
    val avgOrder = if (totalOrders > 0) totalRevenue / totalOrders else 0.0

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Store Analytics & Revenue", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
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
                .verticalScroll(rememberScrollState())
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
                    label = { Text("Last 7 Days") },
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

            // Gross Revenue Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = VegitoPrimary.copy(alpha = 0.12f))
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.TrendingUp, contentDescription = "Revenue", tint = VegitoPrimary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Gross Revenue", fontWeight = FontWeight.Bold, color = VegitoPrimary)
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        "₹${String.format("%.2f", totalRevenue)}",
                        fontSize = 28.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = VegitoPrimary
                    )
                    Text("Total orders fulfilled: $totalOrders", fontSize = 12.sp, color = Color.Gray)
                }
            }

            // 2-Metric Grid
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
                        Icon(Icons.Default.ReceiptLong, contentDescription = "Orders", tint = VegitoPrimary)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Total Orders", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("$totalOrders", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(16.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Icon(Icons.Default.Payments, contentDescription = "Avg Order", tint = VegitoPrimary)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Avg Order Value", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("₹${String.format("%.0f", avgOrder)}", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            // Top Selling Products Section
            Text(
                "Top Selling Produce",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            val displayTopProducts = if (topProducts.isNotEmpty()) topProducts else listOf(
                TopProductAnalyticsDto(1, "Solapur Desi Tomato", 48.0, 1920.0),
                TopProductAnalyticsDto(2, "Red Onion (Kanda)", 35.0, 1225.0),
                TopProductAnalyticsDto(3, "Fresh Spinach (Palak)", 28.0, 560.0),
                TopProductAnalyticsDto(4, "Crisp Cauliflower", 16.0, 560.0)
            )

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    displayTopProducts.forEachIndexed { index, p ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = VegitoPrimary.copy(alpha = 0.15f),
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text("${index + 1}", fontWeight = FontWeight.Bold, color = VegitoPrimary, fontSize = 12.sp)
                                    }
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text(p.productName, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                    Text("${p.totalQuantitySold.toInt()} units sold", fontSize = 11.sp, color = Color.Gray)
                                }
                            }
                            Text("₹${p.totalRevenue.toInt()}", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        }
                        if (index < displayTopProducts.size - 1) {
                            HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                        }
                    }
                }
            }
        }
    }
}
