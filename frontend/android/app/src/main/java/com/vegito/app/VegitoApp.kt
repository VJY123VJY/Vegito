package com.vegito.app

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.vegito.app.data.local.SessionManager
import com.vegito.app.data.model.*
import com.vegito.app.data.remote.RetrofitClient
import com.vegito.app.presentation.admin.AdminDashboardScreen
import com.vegito.app.presentation.auth.*
import com.vegito.app.presentation.b2b.B2BBulkScreen
import com.vegito.app.presentation.customer.*
import com.vegito.app.presentation.delivery.DeliveryDashboardScreen
import com.vegito.app.presentation.delivery.DeliveryTaskScreen
import com.vegito.app.presentation.seller.SellerDashboardScreen
import com.vegito.app.presentation.seller.SellerOrdersScreen
import com.vegito.app.presentation.seller.SellerProductsScreen
import com.vegito.app.ui.components.BottomNavBar
import com.vegito.app.ui.components.TopBar
import com.vegito.app.ui.theme.VegitoTheme

@Composable
fun VegitoApp() {
    val context = LocalContext.current
    val sessionManager = remember { SessionManager(context) }

    val token by sessionManager.tokenFlow.collectAsState()
    val activeRole by sessionManager.roleFlow.collectAsState()
    val lang by sessionManager.languageFlow.collectAsState()
    val themeMode by sessionManager.themeFlow.collectAsState()
    val selectedAddress by sessionManager.selectedAddressFlow.collectAsState()

    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: "onboarding"

    // Initial Mock & Live Data state
    val sampleProducts = remember {
        listOf(
            Product("1", "Fresh Solapur Tomato", "Vegetables", 38.0, "kg", 120.0, 98, "Ultra Fresh", "", "Organic red tomatoes directly harvested from Solapur farms."),
            Product("2", "Green Onion (Kanda)", "Vegetables", 28.0, "kg", 200.0, 95, "Ultra Fresh", "", "Crisp green onions with long shelf life."),
            Product("3", "Organic Palak (Spinach)", "Leafy Greens", 20.0, "bunch", 80.0, 92, "Fresh", "", "Fresh green spinach bunches harvested today morning."),
            Product("4", "Solapur Potato (Batata)", "Vegetables", 32.0, "kg", 500.0, 90, "Fresh", "", "High quality starch potatoes.")
        )
    }

    val sampleOffers = remember {
        listOf(
            Offer("o1", "Solapur Morning Special", "FRESH20", 20, 50.0, 199.0, "Get 20% off on first vegetable order"),
            Offer("o2", "Bulk Business Offer", "BULK50", 15, 200.0, 999.0, "Special discount for restaurants & bulk orders")
        )
    }

    val sampleCategories = remember {
        listOf(
            Category("c1", "Vegetables", "", 42),
            Category("c2", "Leafy Greens", "", 18),
            Category("c3", "Fruits", "", 25),
            Category("c4", "B2B Bulk", "", 10)
        )
    }

    var cartSummary by remember {
        mutableStateOf(
            CartSummary(
                items = listOf(
                    CartItem("ci1", sampleProducts[0], 2.0, 76.0),
                    CartItem("ci2", sampleProducts[2], 1.0, 20.0)
                ),
                subtotal = 96.0,
                deliveryFee = 25.0,
                discount = 10.0,
                grandTotal = 111.0
            )
        )
    }

    var pendingPhoneForOtp by remember { mutableStateOf("") }
    var pendingRoleForOtp by remember { mutableStateOf("customer") }
    var selectedProductForDetail by remember { mutableStateOf<Product?>(null) }
    var activeOrder by remember { mutableStateOf<Order?>(null) }

    VegitoTheme(themeMode = themeMode) {
        val showTopBar = currentRoute in listOf("customer_home", "customer_search", "customer_cart", "customer_profile")
        val showBottomBar = currentRoute in listOf(
            "customer_home", "customer_search", "customer_cart", "customer_orders", "customer_profile",
            "seller_dashboard", "seller_orders", "seller_products",
            "delivery_dashboard", "delivery_tasks",
            "admin_dashboard"
        )

        Scaffold(
            topBar = {
                if (showTopBar) {
                    TopBar(
                        currentAddress = selectedAddress,
                        selectedLang = lang,
                        themeMode = themeMode,
                        onLocationClick = {},
                        onLanguageChange = { sessionManager.setLanguage(it) },
                        onThemeToggle = {
                            val newMode = if (themeMode == "DARK") "LIGHT" else "DARK"
                            sessionManager.setThemeMode(newMode)
                        },
                        onSearchClick = { navController.navigate("customer_search") }
                    )
                }
            },
            bottomBar = {
                if (showBottomBar) {
                    BottomNavBar(
                        activeRole = activeRole,
                        currentRoute = currentRoute,
                        lang = lang,
                        onNavigate = { navController.navigate(it) }
                    )
                }
            }
        ) { paddingValues ->
            NavHost(
                navController = navController,
                startDestination = if (token != null) {
                    when (activeRole.lowercase()) {
                        "seller" -> "seller_dashboard"
                        "delivery_partner" -> "delivery_dashboard"
                        "admin" -> "admin_dashboard"
                        else -> "customer_home"
                    }
                } else "onboarding",
                modifier = Modifier.padding(paddingValues)
            ) {
                // AUTH & ONBOARDING
                composable("onboarding") {
                    OnboardingScreen(
                        lang = lang,
                        onStartShopping = { navController.navigate("customer_home") },
                        onLogin = { navController.navigate("login") },
                        onSellOnVegito = {
                            pendingRoleForOtp = "seller"
                            navController.navigate("login")
                        },
                        onDeliverWithVegito = {
                            pendingRoleForOtp = "delivery_partner"
                            navController.navigate("login")
                        }
                    )
                }

                composable("login") {
                    LoginScreen(
                        initialRole = pendingRoleForOtp,
                        onSendOtp = { phone, role ->
                            pendingPhoneForOtp = phone
                            pendingRoleForOtp = role
                            navController.navigate("otp")
                        }
                    )
                }

                composable("otp") {
                    OtpScreen(
                        phone = pendingPhoneForOtp,
                        role = pendingRoleForOtp,
                        onVerifyOtp = { otp ->
                            sessionManager.saveAuthToken("mock_token_${System.currentTimeMillis()}")
                            sessionManager.saveActiveRole(pendingRoleForOtp)
                            val target = when (pendingRoleForOtp.lowercase()) {
                                "seller" -> "seller_dashboard"
                                "delivery_partner" -> "delivery_dashboard"
                                "admin" -> "admin_dashboard"
                                else -> "customer_home"
                            }
                            navController.navigate(target) {
                                popUpTo("onboarding") { inclusive = true }
                            }
                        }
                    )
                }

                // CUSTOMER WORKSPACE
                composable("customer_home") {
                    CustomerHomeScreen(
                        lang = lang,
                        offers = sampleOffers,
                        categories = sampleCategories,
                        featuredProducts = sampleProducts,
                        smartBasketProducts = sampleProducts.take(2),
                        onCategoryClick = { navController.navigate("customer_search") },
                        onProductClick = {
                            selectedProductForDetail = it
                            navController.navigate("product_detail")
                        },
                        onAddToCart = { prod ->
                            // Add item to cart
                        },
                        onB2BClick = { navController.navigate("b2b_bulk") }
                    )
                }

                composable("product_detail") {
                    selectedProductForDetail?.let { prod ->
                        ProductDetailScreen(
                            product = prod,
                            onBack = { navController.popBackStack() },
                            onAddToCart = { p, qty -> navController.navigate("customer_cart") }
                        )
                    }
                }

                composable("customer_search") {
                    SearchScreen(
                        products = sampleProducts,
                        onProductClick = {
                            selectedProductForDetail = it
                            navController.navigate("product_detail")
                        },
                        onAddToCart = {}
                    )
                }

                composable("customer_cart") {
                    CartScreen(
                        cart = cartSummary,
                        onUpdateQuantity = { id, qty -> },
                        onRemoveItem = { id -> },
                        onProceedToCheckout = { navController.navigate("customer_checkout") }
                    )
                }

                composable("customer_checkout") {
                    CheckoutScreen(
                        cart = cartSummary,
                        selectedAddress = selectedAddress,
                        onBack = { navController.popBackStack() },
                        onSelectAddress = {},
                        onPlaceOrder = { method ->
                            val newOrd = Order(
                                id = "ord_${System.currentTimeMillis()}",
                                orderNumber = "VEG-${(1000..9999).random()}",
                                status = "NEW",
                                totalAmount = cartSummary.grandTotal,
                                customerOtp = "${(1000..9999).random()}"
                            )
                            activeOrder = newOrd
                            navController.navigate("customer_tracking") {
                                popUpTo("customer_home")
                            }
                        }
                    )
                }

                composable("customer_orders") {
                    if (activeOrder != null) {
                        OrderTrackingScreen(order = activeOrder!!)
                    } else {
                        OrderTrackingScreen(
                            order = Order(
                                id = "ord_sample",
                                orderNumber = "VEG-8821",
                                status = "OUT_FOR_DELIVERY",
                                totalAmount = 111.0,
                                customerOtp = "4829"
                            )
                        )
                    }
                }

                composable("customer_tracking") {
                    activeOrder?.let { ord ->
                        OrderTrackingScreen(order = ord)
                    }
                }

                composable("customer_profile") {
                    ProfileScreen(
                        user = sessionManager.getUser(),
                        activeRole = activeRole,
                        onSwitchRole = { newRole ->
                            sessionManager.saveActiveRole(newRole)
                            val dest = when (newRole.lowercase()) {
                                "seller" -> "seller_dashboard"
                                "delivery_partner" -> "delivery_dashboard"
                                "admin" -> "admin_dashboard"
                                else -> "customer_home"
                            }
                            navController.navigate(dest)
                        },
                        onLogout = {
                            sessionManager.clearSession()
                            navController.navigate("onboarding") {
                                popUpTo(0)
                            }
                        }
                    )
                }

                // SELLER WORKSPACE
                composable("seller_dashboard") {
                    SellerDashboardScreen(
                        stats = SellerDashboardStats(isOnline = true, todaySales = 1850.0, activeOrdersCount = 3),
                        onToggleOnline = {}
                    )
                }

                composable("seller_orders") {
                    SellerOrdersScreen(
                        orders = listOf(
                            Order("so1", "VEG-8821", "NEW", totalAmount = 350.0),
                            Order("so2", "VEG-8822", "PACKING", totalAmount = 420.0),
                            Order("so3", "VEG-8823", "READY", totalAmount = 190.0)
                        ),
                        onUpdateStatus = { id, st -> },
                        onVerifyPickupOtp = { id, otp -> }
                    )
                }

                composable("seller_products") {
                    SellerProductsScreen(
                        products = sampleProducts,
                        onAddProduct = {}
                    )
                }

                // DELIVERY WORKSPACE
                composable("delivery_dashboard") {
                    DeliveryDashboardScreen(
                        isOnline = true,
                        todayEarnings = 420.0,
                        activeTasksCount = 1,
                        onToggleOnline = {}
                    )
                }

                composable("delivery_tasks") {
                    DeliveryTaskScreen(
                        tasks = listOf(
                            DeliveryTask(
                                id = "dt1",
                                orderId = "so3",
                                orderNumber = "VEG-8823",
                                sellerName = "Solapur Veggie Mandi",
                                sellerAddress = "Shop 12, Main Mandi",
                                customerArea = "Solapur West",
                                distanceKm = 3.2,
                                status = "ACCEPTED",
                                isPickupVerified = false
                            )
                        ),
                        onAcceptTask = {},
                        onVerifyCustomerOtp = { id, otp -> }
                    )
                }

                // B2B BULK PORTAL
                composable("b2b_bulk") {
                    B2BBulkScreen(
                        onSubmitQuote = { quote ->
                            navController.navigate("customer_home")
                        }
                    )
                }

                // ADMIN CONTROL CENTER
                composable("admin_dashboard") {
                    AdminDashboardScreen(
                        analytics = AdminAnalytics(
                            totalCustomers = 450,
                            totalSellers = 32,
                            totalDeliveryPartners = 18,
                            totalOrdersToday = 84,
                            grossRevenueToday = 14200.0,
                            pendingKycCount = 4
                        )
                    )
                }
            }
        }
    }
}
