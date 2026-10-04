package com.vegito.app.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.ui.theme.VegitoPrimary
import com.vegito.app.ui.theme.VegitoPrimaryLight
import com.vegito.app.utils.Localization

data class NavItem(val route: String, val labelKey: String, val icon: ImageVector)

@Composable
fun BottomNavBar(
    activeRole: String,
    currentRoute: String,
    lang: String,
    onNavigate: (String) -> Unit
) {
    val items = when (activeRole.lowercase()) {
        "seller" -> listOf(
            NavItem("seller_dashboard", "seller_dashboard", Icons.Default.Dashboard),
            NavItem("seller_orders", "orders", Icons.Default.ReceiptLong),
            NavItem("seller_products", "categories", Icons.Default.Inventory),
            NavItem("seller_profile", "profile", Icons.Default.Person)
        )
        "delivery_partner" -> listOf(
            NavItem("delivery_dashboard", "delivery_workspace", Icons.Default.LocalShipping),
            NavItem("delivery_tasks", "orders", Icons.Default.Task),
            NavItem("delivery_earnings", "total", Icons.Default.AccountBalanceWallet),
            NavItem("delivery_profile", "profile", Icons.Default.Person)
        )
        "admin" -> listOf(
            NavItem("admin_dashboard", "admin_workspace", Icons.Default.AdminPanelSettings),
            NavItem("admin_sellers", "sell_on_vegito", Icons.Default.Store),
            NavItem("admin_delivery", "deliver_with_vegito", Icons.Default.TwoWheeler),
            NavItem("admin_orders", "orders", Icons.Default.ReceiptLong)
        )
        else -> listOf( // CUSTOMER
            NavItem("customer_home", "home", Icons.Default.Home),
            NavItem("customer_search", "search", Icons.Default.Search),
            NavItem("customer_cart", "cart", Icons.Default.ShoppingCart),
            NavItem("customer_orders", "orders", Icons.Default.Receipt),
            NavItem("customer_profile", "profile", Icons.Default.Person)
        )
    }

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding(),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 8.dp,
        tonalElevation = 3.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            items.forEach { item ->
                val isSelected = currentRoute == item.route
                val iconScale by animateFloatAsState(
                    targetValue = if (isSelected) 1.15f else 1.0f,
                    animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMediumLow),
                    label = "navScale"
                )
                val activeBgColor by animateColorAsState(
                    targetValue = if (isSelected) VegitoPrimary.copy(alpha = 0.12f) else Color.Transparent,
                    label = "navBg"
                )
                val activeTintColor by animateColorAsState(
                    targetValue = if (isSelected) VegitoPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                    label = "navTint"
                )

                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) {
                            if (!isSelected) onNavigate(item.route)
                        }
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(16.dp))
                            .background(activeBgColor)
                            .padding(horizontal = 14.dp, vertical = 4.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = item.icon,
                            contentDescription = item.labelKey,
                            tint = activeTintColor,
                            modifier = Modifier
                                .size(22.dp)
                                .scale(iconScale)
                        )
                    }

                    Spacer(modifier = Modifier.height(2.dp))

                    Text(
                        text = Localization.getString(item.labelKey, lang),
                        fontSize = 10.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        color = activeTintColor,
                        maxLines = 1
                    )
                }
            }
        }
    }
}
