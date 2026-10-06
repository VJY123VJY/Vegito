package com.vegito.app.presentation.seller

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
import com.vegito.app.data.model.SellerDashboardStats
import com.vegito.app.data.model.SellerProfileDto
import com.vegito.app.ui.theme.VegitoPrimary
import com.vegito.app.ui.theme.VegitoSecondary
import com.vegito.app.ui.theme.bounceClick

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SellerDashboardScreen(
    stats: SellerDashboardStats,
    storeName: String = "Solapur Mandi Store",
    sellerProfile: SellerProfileDto? = null,
    onToggleOnline: (Boolean) -> Unit,
    onNavigateOrders: () -> Unit,
    onNavigateProducts: () -> Unit,
    onNavigateAddProduct: () -> Unit = onNavigateProducts,
    onNavigateInventory: () -> Unit = {},
    onNavigateAnalytics: () -> Unit = {},
    onNavigateBulkOrders: () -> Unit = {},
    onNavigateProfile: () -> Unit,
    onNavigateSettings: () -> Unit,
    onNavigateNotifications: () -> Unit,
    onNavigateB2B: () -> Unit,
    onLogout: () -> Unit
) {
    var isOnline by remember { mutableStateOf(stats.isOnline) }
    var showMenuSheet by remember { mutableStateOf(false) }

    // Synchronize isOnline with incoming stats
    LaunchedEffect(stats.isOnline) {
        isOnline = stats.isOnline
    }

    val animatedSales by animateIntAsState(
        targetValue = stats.todaySales.toInt(),
        animationSpec = tween(durationMillis = 800, easing = FastOutSlowInEasing),
        label = "salesAnim"
    )
    val animatedOrders by animateIntAsState(
        targetValue = stats.activeOrdersCount,
        animationSpec = tween(durationMillis = 600, easing = FastOutSlowInEasing),
        label = "ordersAnim"
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(storeName, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(if (isOnline) Color(0xFF2E7D32) else Color.Gray)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                if (isOnline) "ACCEPTING ORDERS • LIVE" else "STORE OFFLINE",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isOnline) Color(0xFF2E7D32) else Color.Gray
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = onNavigateNotifications) {
                        Icon(Icons.Default.Notifications, contentDescription = "Notifications")
                    }
                    IconButton(onClick = onNavigateProfile) {
                        Icon(Icons.Default.AccountCircle, contentDescription = "Profile")
                    }
                    IconButton(onClick = { showMenuSheet = true }) {
                        Icon(Icons.Default.Menu, contentDescription = "Menu")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onNavigateAddProduct,
                icon = { Icon(Icons.Default.Add, contentDescription = "Add Produce") },
                text = { Text("Add Produce", fontWeight = FontWeight.Bold) },
                containerColor = VegitoPrimary,
                contentColor = Color.White,
                shape = RoundedCornerShape(16.dp)
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
            // Online / Offline Toggle Card (Entire card is clickable)
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(18.dp))
                    .clickable {
                        val newState = !isOnline
                        isOnline = newState
                        onToggleOnline(newState)
                    },
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (isOnline) VegitoPrimary.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Live Store Availability", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Text(
                            if (isOnline) "Receiving live customer orders from Solapur • Tap to toggle" else "Store offline • Tap card to go live",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
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

            // Shop Pickup Location Status Banner
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(18.dp))
                    .clickable { onNavigateSettings() },
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (sellerProfile?.address.isNullOrBlank()) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.surface
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                        Icon(
                            if (sellerProfile?.address.isNullOrBlank()) Icons.Default.Warning else Icons.Default.Storefront,
                            contentDescription = "Shop Location",
                            tint = if (sellerProfile?.address.isNullOrBlank()) MaterialTheme.colorScheme.error else VegitoPrimary,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = if (sellerProfile?.address.isNullOrBlank()) "⚠ Shop Location Required" else "✓ Shop Location Set",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                color = if (sellerProfile?.address.isNullOrBlank()) MaterialTheme.colorScheme.error else VegitoPrimary
                            )
                            Text(
                                text = sellerProfile?.address?.ifBlank { null } ?: "Tap to configure mandatory shop operating location",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1
                            )
                        }
                    }
                    Text("Change →", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = VegitoPrimary)
                }
            }

            // Metrics Grid (Both cards properly routed)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(16.dp))
                        .clickable { onNavigateAnalytics() },
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
                            Icon(Icons.Default.AttachMoney, contentDescription = "Sales", tint = VegitoPrimary)
                            Text("View →", fontSize = 10.sp, color = VegitoPrimary, fontWeight = FontWeight.Bold)
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("Today's Sales", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("₹$animatedSales", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(16.dp))
                        .clickable { onNavigateOrders() },
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
                            Icon(Icons.Default.Receipt, contentDescription = "Orders", tint = VegitoPrimary)
                            Text("View →", fontSize = 10.sp, color = VegitoPrimary, fontWeight = FontWeight.Bold)
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("Active Orders", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("$animatedOrders", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            // Quick Management Actions
            Text("Quick Management Actions", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

            // Action Cards Grid
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                QuickActionCard(
                    title = "Orders Pipeline",
                    subtitle = "Accept & Pack",
                    icon = Icons.Default.ReceiptLong,
                    badge = "${stats.activeOrdersCount} Pending",
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateOrders
                )

                QuickActionCard(
                    title = "Product Catalog",
                    subtitle = "Manage Produce",
                    icon = Icons.Default.Inventory,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateProducts
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                QuickActionCard(
                    title = "Stock Adjust (+/-)",
                    subtitle = "Instant +/- 10 kg",
                    icon = Icons.Default.AddBox,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateInventory
                )

                QuickActionCard(
                    title = "Store Analytics",
                    subtitle = "Sales & Top Produce",
                    icon = Icons.Default.Analytics,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateAnalytics
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                QuickActionCard(
                    title = "Bulk Orders (B2B)",
                    subtitle = "Hotel Quotes",
                    icon = Icons.Default.BusinessCenter,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateBulkOrders
                )

                QuickActionCard(
                    title = "Seller Profile",
                    subtitle = "Store Details & KYC",
                    icon = Icons.Default.Storefront,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateProfile
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                QuickActionCard(
                    title = "Add Produce (+)",
                    subtitle = "New Veg / Fruit",
                    icon = Icons.Default.AddCircle,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateAddProduct
                )

                QuickActionCard(
                    title = "Settings",
                    subtitle = "Language & Hours",
                    icon = Icons.Default.Settings,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateSettings
                )
            }

            // B2B Wholesale Banner
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .clickable { onNavigateB2B() },
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = VegitoSecondary.copy(alpha = 0.12f))
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.BusinessCenter,
                        contentDescription = "B2B",
                        tint = VegitoSecondary,
                        modifier = Modifier.size(32.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("B2B Wholesale & Bulk Orders", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = VegitoSecondary)
                        Text("Wholesale crate orders for hotels, caterers & supermarkets", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = "Go", tint = VegitoSecondary)
                }
            }

            Spacer(modifier = Modifier.height(60.dp))
        }
    }

    // Seller Drawer / More Menu Bottom Sheet
    if (showMenuSheet) {
        ModalBottomSheet(onDismissRequest = { showMenuSheet = false }) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 10.dp)
            ) {
                Text("Seller Workspace Navigation", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
                Spacer(modifier = Modifier.height(14.dp))

                DrawerMenuItem("Dashboard Home", Icons.Default.Dashboard) {
                    showMenuSheet = false
                }
                DrawerMenuItem("Customer Orders (${stats.activeOrdersCount})", Icons.Default.ReceiptLong) {
                    showMenuSheet = false
                    onNavigateOrders()
                }
                DrawerMenuItem("Product Catalog & Stock", Icons.Default.Inventory) {
                    showMenuSheet = false
                    onNavigateProducts()
                }
                DrawerMenuItem("Add New Produce (+)", Icons.Default.AddCircle) {
                    showMenuSheet = false
                    onNavigateAddProduct()
                }
                DrawerMenuItem("Stock Adjustment (+/- 10)", Icons.Default.AddBox) {
                    showMenuSheet = false
                    onNavigateInventory()
                }
                DrawerMenuItem("Store Analytics & Revenue", Icons.Default.Analytics) {
                    showMenuSheet = false
                    onNavigateAnalytics()
                }
                DrawerMenuItem("B2B Wholesale Portal", Icons.Default.BusinessCenter) {
                    showMenuSheet = false
                    onNavigateBulkOrders()
                }
                DrawerMenuItem("Notifications & Alerts", Icons.Default.Notifications) {
                    showMenuSheet = false
                    onNavigateNotifications()
                }
                DrawerMenuItem("Seller Profile & KYC", Icons.Default.Storefront) {
                    showMenuSheet = false
                    onNavigateProfile()
                }
                DrawerMenuItem("Settings & Preferences", Icons.Default.Settings) {
                    showMenuSheet = false
                    onNavigateSettings()
                }

                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                DrawerMenuItem("Logout & Exit Workspace", Icons.Default.ExitToApp, isDestructive = true) {
                    showMenuSheet = false
                    onLogout()
                }
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun QuickActionCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    badge: String? = null,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = CircleShape,
                    color = VegitoPrimary.copy(alpha = 0.12f),
                    modifier = Modifier.size(36.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(icon, contentDescription = title, tint = VegitoPrimary, modifier = Modifier.size(20.dp))
                    }
                }
                if (badge != null) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = VegitoPrimary
                    ) {
                        Text(
                            badge,
                            color = Color.White,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(10.dp))
            Text(title, fontWeight = FontWeight.Bold, fontSize = 13.sp)
            Text(subtitle, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun DrawerMenuItem(
    title: String,
    icon: ImageVector,
    isDestructive: Boolean = false,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable { onClick() }
            .padding(vertical = 12.dp, horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            icon,
            contentDescription = title,
            tint = if (isDestructive) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.size(22.dp)
        )
        Spacer(modifier = Modifier.width(16.dp))
        Text(
            text = title,
            fontWeight = if (isDestructive) FontWeight.Bold else FontWeight.Medium,
            fontSize = 15.sp,
            color = if (isDestructive) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
        )
    }
}
