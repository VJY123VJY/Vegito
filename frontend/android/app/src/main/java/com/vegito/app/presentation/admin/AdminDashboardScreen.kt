package com.vegito.app.presentation.admin

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.AdminAnalytics
import com.vegito.app.ui.theme.VegitoPrimary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminDashboardScreen(
    analytics: AdminAnalytics,
    onNavigateSellers: () -> Unit = {},
    onNavigateDelivery: () -> Unit = {},
    onNavigateOrders: () -> Unit = {},
    onLogout: () -> Unit = {}
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Vegito SuperAdmin", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                actions = {
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Default.ExitToApp, contentDescription = "Logout")
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
            // Gross Revenue Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = VegitoPrimary.copy(alpha = 0.12f))
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Analytics, contentDescription = "Analytics", tint = VegitoPrimary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Gross Revenue Today", fontWeight = FontWeight.Bold, color = VegitoPrimary)
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "₹${String.format("%.2f", analytics.grossRevenueToday)}",
                        fontSize = 30.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = VegitoPrimary
                    )
                    Text("Total Platform Orders: ${analytics.totalOrdersToday}", fontSize = 12.sp, color = Color.Gray)
                }
            }

            // Summary 3-Column / 2-Row Grid
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
                        Icon(Icons.Default.People, contentDescription = "Customers", tint = VegitoPrimary)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Customers", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("${analytics.totalCustomers}", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onNavigateSellers() },
                    shape = RoundedCornerShape(16.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Icon(Icons.Default.Store, contentDescription = "Sellers", tint = VegitoPrimary)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Sellers", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("${analytics.totalSellers}", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onNavigateDelivery() },
                    shape = RoundedCornerShape(16.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Icon(Icons.Default.TwoWheeler, contentDescription = "Delivery", tint = VegitoPrimary)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Delivery Partners", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("${analytics.totalDeliveryPartners}", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onNavigateSellers() },
                    shape = RoundedCornerShape(16.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Icon(Icons.Default.FactCheck, contentDescription = "KYC", tint = Color(0xFFE65100))
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Pending KYC", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("${analytics.pendingKycCount}", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color(0xFFE65100))
                    }
                }
            }

            // Quick Management Actions
            Text("Operations Management", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(vertical = 4.dp)) {
                    AdminActionItem(
                        title = "Mandi Sellers & KYC Verification",
                        subtitle = "Verify store documents & products catalog",
                        icon = Icons.Default.Storefront,
                        onClick = onNavigateSellers
                    )
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                    AdminActionItem(
                        title = "Delivery Fleet Verification",
                        subtitle = "Approve rider driving licenses & vehicles",
                        icon = Icons.Default.TwoWheeler,
                        onClick = onNavigateDelivery
                    )
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                    AdminActionItem(
                        title = "Live Platform Orders",
                        subtitle = "Track orders across all Solapur mandi hubs",
                        icon = Icons.Default.ReceiptLong,
                        onClick = onNavigateOrders
                    )
                }
            }
        }
    }
}

@Composable
private fun AdminActionItem(
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
