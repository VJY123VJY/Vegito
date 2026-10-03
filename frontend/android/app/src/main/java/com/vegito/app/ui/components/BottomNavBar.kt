package com.vegito.app.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.vector.ImageVector
import com.vegito.app.ui.theme.VegitoPrimary
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
            NavItem("seller_products", "categories", Icons.Default.Inventory)
        )
        "delivery_partner" -> listOf(
            NavItem("delivery_dashboard", "delivery_workspace", Icons.Default.LocalShipping),
            NavItem("delivery_tasks", "orders", Icons.Default.Task)
        )
        "admin" -> listOf(
            NavItem("admin_dashboard", "admin_workspace", Icons.Default.AdminPanelSettings),
            NavItem("admin_kyc", "orders", Icons.Default.FactCheck)
        )
        else -> listOf( // CUSTOMER
            NavItem("customer_home", "home", Icons.Default.Home),
            NavItem("customer_search", "search", Icons.Default.Search),
            NavItem("customer_cart", "cart", Icons.Default.ShoppingCart),
            NavItem("customer_orders", "orders", Icons.Default.Receipt),
            NavItem("customer_profile", "profile", Icons.Default.Person)
        )
    }

    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surface,
        contentColor = VegitoPrimary
    ) {
        items.forEach { item ->
            val selected = currentRoute == item.route
            NavigationBarItem(
                selected = selected,
                onClick = { onNavigate(item.route) },
                icon = { Icon(item.icon, contentDescription = item.labelKey) },
                label = { Text(Localization.getString(item.labelKey, lang)) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = VegitoPrimary,
                    selectedTextColor = VegitoPrimary,
                    indicatorColor = VegitoPrimary.copy(alpha = 0.15f)
                )
            )
        }
    }
}
