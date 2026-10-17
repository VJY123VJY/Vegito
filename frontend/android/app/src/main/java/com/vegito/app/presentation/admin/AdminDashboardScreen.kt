package com.vegito.app.presentation.admin

import androidx.compose.animation.core.*
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
    var isRefreshing by remember { mutableStateOf(false) }

    val animatedRevenue by animateFloatAsState(
        targetValue = analytics.grossRevenueToday.toFloat(),
        animationSpec = tween(durationMillis = 900, easing = FastOutSlowInEasing),
        label = "revenueAnim"
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Vegito SuperAdmin", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(7.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFF2E7D32))
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("System Operational • 99.9% Uptime", fontSize = 10.sp, color = Color(0xFF2E7D32), fontWeight = FontWeight.SemiBold)
                        }
                    }
                },
                actions = {
                    IconButton(onClick = { isRefreshing = !isRefreshing }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh Data")
                    }
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Default.ExitToApp, contentDescription = "Logout", tint = Color(0xFFC62828))
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
            // System Health & Advisory Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Shield, contentDescription = "Security", tint = VegitoPrimary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Enterprise Security & Command Center", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        "All Mandi clusters, payment gateways, and GPS dispatch engines are active. Web Command Center is recommended for geographic heatmaps & batch settlement.",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        lineHeight = 16.sp
                    )
                }
            }

            // Gross Revenue Card with Growth Indicator
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = VegitoPrimary.copy(alpha = 0.12f))
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Analytics, contentDescription = "Analytics", tint = VegitoPrimary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Gross Revenue Today", fontWeight = FontWeight.Bold, color = VegitoPrimary, fontSize = 14.sp)
                    }
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFF2E7D32).copy(alpha = 0.15f)
                        ) {
                            Text(
                                "+14.2% vs yesterday",
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF2E7D32)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "₹${String.format("%.2f", animatedRevenue)}",
                        fontSize = 32.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = VegitoPrimary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Total Platform Orders Processed: ${analytics.totalOrdersToday}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            // 4-Grid Metrics Cards
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                MetricCard(
                    modifier = Modifier.weight(1f),
                    title = "Customers",
                    value = "${analytics.totalCustomers}",
                    icon = Icons.Default.People,
                    onClick = {}
                )
                MetricCard(
                    modifier = Modifier.weight(1f),
                    title = "Sellers",
                    value = "${analytics.totalSellers}",
                    icon = Icons.Default.Store,
                    onClick = onNavigateSellers
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                MetricCard(
                    modifier = Modifier.weight(1f),
                    title = "Delivery Fleet",
                    value = "${analytics.totalDeliveryPartners}",
                    icon = Icons.Default.TwoWheeler,
                    onClick = onNavigateDelivery
                )
                MetricCard(
                    modifier = Modifier.weight(1f),
                    title = "Pending KYC",
                    value = "${analytics.pendingKycCount}",
                    icon = Icons.Default.FactCheck,
                    badgeColor = Color(0xFFE65100),
                    onClick = onNavigateSellers
                )
            }

            // Quick Management Operations
            Text("Operations Management", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(vertical = 4.dp)) {
                    AdminActionItem(
                        title = "Mandi Sellers & KYC Verification",
                        subtitle = "Verify store documents & products catalog",
                        icon = Icons.Default.Storefront,
                        badgeCount = analytics.pendingKycCount,
                        onClick = onNavigateSellers
                    )
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                    AdminActionItem(
                        title = "Delivery Fleet Verification",
                        subtitle = "Approve rider driving licenses & vehicles",
                        icon = Icons.Default.TwoWheeler,
                        badgeCount = 0,
                        onClick = onNavigateDelivery
                    )
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                    AdminActionItem(
                        title = "Live Platform Orders",
                        subtitle = "Track orders across all Solapur mandi hubs",
                        icon = Icons.Default.ReceiptLong,
                        badgeCount = analytics.totalOrdersToday,
                        onClick = onNavigateOrders
                    )
                }
            }
        }
    }
}

@Composable
private fun MetricCard(
    modifier: Modifier = Modifier,
    title: String,
    value: String,
    icon: ImageVector,
    badgeColor: Color = VegitoPrimary,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier.clickable { onClick() },
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
                Icon(icon, contentDescription = title, tint = badgeColor, modifier = Modifier.size(22.dp))
                Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(14.dp))
            }
            Spacer(modifier = Modifier.height(10.dp))
            Text(title, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)
            Spacer(modifier = Modifier.height(2.dp))
            Text(value, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

@Composable
private fun AdminActionItem(
    title: String,
    subtitle: String,
    icon: ImageVector,
    badgeCount: Int = 0,
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
        if (badgeCount > 0) {
            Badge(containerColor = Color(0xFFE65100)) {
                Text("$badgeCount", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(modifier = Modifier.width(8.dp))
        }
        Icon(
            Icons.AutoMirrored.Filled.ArrowForward,
            contentDescription = "Go",
            tint = Color.Gray,
            modifier = Modifier.size(18.dp)
        )
    }
}


