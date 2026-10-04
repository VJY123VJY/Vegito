package com.vegito.app.navigation

/**
 * Navigation routes across all Vegito workspaces (Customer, Seller, Delivery Partner, Admin, Auth)
 */
object Routes {
    const val ONBOARDING = "onboarding"
    const val LOGIN = "login"
    const val REGISTER = "register"
    const val OTP = "otp"
    const val LOCATION_SETUP = "location_setup"

    // Customer Workspace
    const val CUSTOMER_HOME = "customer_home"
    const val CUSTOMER_SEARCH = "customer_search"
    const val PRODUCT_DETAIL = "product_detail"
    const val CUSTOMER_CART = "customer_cart"
    const val CHECKOUT = "checkout"
    const val CUSTOMER_ORDERS = "customer_orders"
    const val ORDER_TRACKING = "order_tracking"
    const val CUSTOMER_FAVORITES = "customer_favorites"
    const val CUSTOMER_NOTIFICATIONS = "customer_notifications"
    const val CUSTOMER_PROFILE = "customer_profile"
    const val CUSTOMER_ADDRESSES = "customer_addresses"
    const val B2B_BULK = "b2b_bulk"

    // Seller Workspace
    const val SELLER_DASHBOARD = "seller_dashboard"
    const val SELLER_ORDERS = "seller_orders"
    const val SELLER_PRODUCTS = "seller_products"
    const val SELLER_ADD_PRODUCT = "seller_add_product"
    const val SELLER_INVENTORY = "seller_inventory"
    const val SELLER_ANALYTICS = "seller_analytics"
    const val SELLER_BULK_ORDERS = "seller_bulk_orders"
    const val SELLER_PROFILE = "seller_profile"
    const val SELLER_SETTINGS = "seller_settings"

    // Delivery Partner Workspace
    const val DELIVERY_DASHBOARD = "delivery_dashboard"
    const val DELIVERY_TASKS = "delivery_tasks"
    const val DELIVERY_EARNINGS = "delivery_earnings"
    const val DELIVERY_PROFILE = "delivery_profile"
    const val DELIVERY_MAP = "delivery_map"

    // Admin Workspace
    const val ADMIN_DASHBOARD = "admin_dashboard"
    const val ADMIN_SELLERS = "admin_sellers"
    const val ADMIN_DELIVERY = "admin_delivery"
    const val ADMIN_ORDERS = "admin_orders"
}
