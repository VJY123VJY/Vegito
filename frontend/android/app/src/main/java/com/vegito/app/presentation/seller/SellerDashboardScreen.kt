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
    storeName: String = "Shree Ganesh Store",
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
    onLogout: () -> Unit,
    onSwitchWorkspace: ((String) -> Unit)? = null,
    onNavigateDeliveryTasks: (() -> Unit)? = null
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
        targetValue = stats.todayOrdersCount,
        animationSpec = tween(durationMillis = 600, easing = FastOutSlowInEasing),
        label = "ordersAnim"
    )

    val hourOfDay = remember { java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY) }
    val greetingWord = remember(hourOfDay) {
        when {
            hourOfDay < 12 -> "GOOD MORNING"
            hourOfDay < 17 -> "GOOD AFTERNOON"
            else -> "GOOD EVENING"
        }
    }
    val resolvedStoreName = sellerProfile?.businessName?.takeIf { it.isNotBlank() } ?: storeName

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(resolvedStoreName, fontWeight = FontWeight.Bold, fontSize = 16.sp)
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
                    Button(
                        onClick = { /* Already in seller mode */ },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = VegitoPrimary,
                            contentColor = Color.White
                        ),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(vertical = 10.dp)
                    ) {
                        Icon(Icons.Default.Storefront, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Seller Mode", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }

                    OutlinedButton(
                        onClick = { onSwitchWorkspace?.invoke("delivery_partner") },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = MaterialTheme.colorScheme.onSurface
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

            // Command Center Header Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "$greetingWord, ROHIT 👋",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = VegitoPrimary,
                                letterSpacing = 0.8.sp
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = resolvedStoreName,
                                fontSize = 19.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = if (isOnline) Color(0xFFE8F5E9) else Color(0xFFFFEBEE),
                            modifier = Modifier
                                .clip(RoundedCornerShape(16.dp))
                                .clickable {
                                    val newState = !isOnline
                                    isOnline = newState
                                    onToggleOnline(newState)
                                }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(9.dp)
                                        .clip(CircleShape)
                                        .background(if (isOnline) Color(0xFF2E7D32) else Color(0xFFC62828))
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    if (isOnline) "STORE ONLINE" else "STORE OFFLINE",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isOnline) Color(0xFF2E7D32) else Color(0xFFC62828)
                                )
                            }
                        }
                    }
                }
            }

            // Priority Center ("NEEDS ATTENTION")
            if (stats.urgentCount > 0 || stats.newOrdersCount > 0 || stats.readyOrdersCount > 0 || stats.lowStockCount > 0) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF8E1)),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.NotificationImportant, contentDescription = "Attention", tint = Color(0xFFF57F17), modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("NEEDS ATTENTION", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color(0xFFF57F17), letterSpacing = 0.5.sp)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            if (stats.urgentCount > 0) {
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = Color(0xFFFFEBEE),
                                    modifier = Modifier.clickable { onNavigateOrders() }
                                ) {
                                    Text(
                                        "⚡ ${stats.urgentCount} Urgent",
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFFC62828)
                                    )
                                }
                            }
                            if (stats.newOrdersCount > 0) {
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = Color(0xFFFFF3E0),
                                    modifier = Modifier.clickable { onNavigateOrders() }
                                ) {
                                    Text(
                                        "📥 ${stats.newOrdersCount} New Orders",
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFFE65100)
                                    )
                                }
                            }
                            if (stats.readyOrdersCount > 0) {
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = Color(0xFFE8F5E9),
                                    modifier = Modifier.clickable { onNavigateOrders() }
                                ) {
                                    Text(
                                        "✓ ${stats.readyOrdersCount} Ready",
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF2E7D32)
                                    )
                                }
                            }
                            if (stats.lowStockCount > 0) {
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = Color(0xFFEDE7F6),
                                    modifier = Modifier.clickable { onNavigateInventory() }
                                ) {
                                    Text(
                                        "⚠️ ${stats.lowStockCount} Low Stock",
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF512DA8)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // TODAY'S OVERVIEW (All 8 Metrics Clickable)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "TODAY'S OVERVIEW",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    letterSpacing = 0.8.sp
                )
                Text(
                    "Tap metric to view",
                    fontSize = 11.sp,
                    color = Color.Gray
                )
            }

            // Row 1: Orders & Revenue
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                DashboardMetricCard(
                    title = "Orders",
                    value = "${stats.todayOrdersCount}",
                    icon = Icons.Default.Receipt,
                    iconTint = VegitoPrimary,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateOrders
                )
                DashboardMetricCard(
                    title = "Revenue",
                    value = "₹$animatedSales",
                    icon = Icons.Default.CurrencyRupee,
                    iconTint = Color(0xFF2E7D32),
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateAnalytics
                )
            }

            // Row 2: Pending & Packing
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                DashboardMetricCard(
                    title = "Pending",
                    value = "${stats.newOrdersCount}",
                    icon = Icons.Default.HourglassTop,
                    iconTint = Color(0xFFE65100),
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateOrders
                )
                DashboardMetricCard(
                    title = "Packing",
                    value = "${stats.activeOrdersCount}",
                    icon = Icons.Default.Inventory2,
                    iconTint = Color(0xFF7B1FA2),
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateOrders
                )
            }

            // Row 3: Ready & Deliveries
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                DashboardMetricCard(
                    title = "Ready",
                    value = "${stats.readyOrdersCount}",
                    icon = Icons.Default.CheckCircle,
                    iconTint = Color(0xFF2E7D32),
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateOrders
                )
                DashboardMetricCard(
                    title = "Deliveries",
                    value = "${stats.outForDeliveryCount}",
                    icon = Icons.Default.LocalShipping,
                    iconTint = Color(0xFF00695C),
                    modifier = Modifier.weight(1f),
                    onClick = {
                        if (onNavigateDeliveryTasks != null) onNavigateDeliveryTasks()
                        else onNavigateOrders()
                    }
                )
            }

            // Row 4: Urgent & Low Stock
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                DashboardMetricCard(
                    title = "Urgent",
                    value = "${stats.urgentCount}",
                    icon = Icons.Default.Bolt,
                    iconTint = Color(0xFFC62828),
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateOrders
                )
                DashboardMetricCard(
                    title = "Low Stock",
                    value = "${stats.lowStockCount}",
                    icon = Icons.Default.Warning,
                    iconTint = Color(0xFFF57F17),
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateInventory
                )
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

@Composable
private fun DashboardMetricCard(
    title: String,
    value: String,
    icon: ImageVector,
    iconTint: Color = VegitoPrimary,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .clickable { onClick() },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(icon, contentDescription = title, tint = iconTint, modifier = Modifier.size(20.dp))
                Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = Color.Gray.copy(alpha = 0.6f), modifier = Modifier.size(14.dp))
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(value, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold)
            Text(title, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
        }
    }
}

