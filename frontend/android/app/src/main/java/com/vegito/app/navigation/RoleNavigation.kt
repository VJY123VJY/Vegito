package com.vegito.app.navigation

/**
 * Role-aware navigation helper functions to route users to their default workspace
 */
object RoleNavigation {
    fun getStartDestination(token: String?, activeRole: String): String {
        if (token == null) return Routes.ONBOARDING
        return when (activeRole.lowercase()) {
            "seller" -> Routes.SELLER_DASHBOARD
            "delivery_partner" -> Routes.DELIVERY_DASHBOARD
            "admin" -> Routes.ADMIN_DASHBOARD
            else -> Routes.CUSTOMER_HOME
        }
    }

    fun getDestinationForRole(role: String): String {
        return when (role.lowercase()) {
            "seller" -> Routes.SELLER_DASHBOARD
            "delivery_partner" -> Routes.DELIVERY_DASHBOARD
            "admin" -> Routes.ADMIN_DASHBOARD
            else -> Routes.CUSTOMER_HOME
        }
    }
}
