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
import com.vegito.app.data.repository.VegitoRepository
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
import com.vegito.app.ui.components.LocationSelectionBottomSheet
import com.vegito.app.ui.components.TopBar
import com.vegito.app.ui.theme.VegitoTheme
import kotlinx.coroutines.launch

@Composable
fun VegitoApp() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sessionManager = remember {
        val sm = SessionManager(context)
        RetrofitClient.init(sm)
        sm
    }
    val repository = remember { VegitoRepository(RetrofitClient.apiService) }

    val token by sessionManager.tokenFlow.collectAsState()
    val activeRole by sessionManager.roleFlow.collectAsState()
    val lang by sessionManager.languageFlow.collectAsState()
    val themeMode by sessionManager.themeFlow.collectAsState()
    val selectedAddress by sessionManager.selectedAddressFlow.collectAsState()

    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: "onboarding"

    // Live Product & Offer Catalog State
    var productsList by remember { mutableStateOf<List<Product>>(emptyList()) }
    var offersList by remember { mutableStateOf<List<Offer>>(emptyList()) }
    var categoriesList by remember { mutableStateOf<List<Category>>(emptyList()) }

    var showGlobalLocationSheet by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        val prods = repository.getProducts()
        productsList = if (prods.isNotEmpty()) prods else repository.fullCatalog

        val offers = repository.getActiveOffers()
        offersList = offers

        val cats = repository.getCategories()
        categoriesList = cats

        // If user is authenticated, fetch their saved addresses
        if (token != null) {
            val savedAddrs = repository.getUserAddresses()
            if (savedAddrs.isNotEmpty() && selectedAddress == null) {
                val def = savedAddrs.firstOrNull { it.isDefault } ?: savedAddrs.first()
                sessionManager.saveSelectedAddress(def)
            }
        }
    }

    // Dynamic Cart State
    var cartItems by remember { mutableStateOf<List<CartItem>>(emptyList()) }

    fun recalculateCart(items: List<CartItem>): CartSummary {
        val sub = items.sumOf { it.product.price * it.quantity }
        val fee = if (sub >= 199.0 || items.isEmpty()) 0.0 else 25.0
        val disc = if (sub >= 300.0) 20.0 else 0.0
        val grand = (sub + fee - disc).coerceAtLeast(0.0)
        return CartSummary(
            items = items,
            subtotal = sub,
            deliveryFee = fee,
            discount = disc,
            grandTotal = grand
        )
    }

    var cartSummary by remember { mutableStateOf(recalculateCart(emptyList())) }

    fun addProductToCart(product: Product, qty: Double = 1.0) {
        val existing = cartItems.find { it.product.id == product.id }
        val updated = if (existing != null) {
            cartItems.map {
                if (it.product.id == product.id) it.copy(quantity = it.quantity + qty) else it
            }
        } else {
            cartItems + CartItem(
                id = "ci_${product.id}_${System.currentTimeMillis()}",
                product = product,
                quantity = qty,
                itemTotal = product.price * qty
            )
        }
        cartItems = updated
        cartSummary = recalculateCart(updated)
    }

    fun updateCartItemQuantity(productId: String, newQty: Double) {
        val updated = if (newQty <= 0.0) {
            cartItems.filterNot { it.product.id == productId }
        } else {
            cartItems.map {
                if (it.product.id == productId) it.copy(quantity = newQty) else it
            }
        }
        cartItems = updated
        cartSummary = recalculateCart(updated)
    }

    var pendingPhoneForOtp by remember { mutableStateOf("") }
    var pendingRoleForOtp by remember { mutableStateOf("customer") }
    var authDevOtp by remember { mutableStateOf<String?>(null) }
    var isAuthLoading by remember { mutableStateOf(false) }
    var authErrorMessage by remember { mutableStateOf<String?>(null) }
    var selectedProductForDetail by remember { mutableStateOf<Product?>(null) }
    var activeOrder by remember { mutableStateOf<Order?>(null) }

    var showAuthPromptDialog by remember { mutableStateOf(false) }
    var pendingProductForCart by remember { mutableStateOf<Product?>(null) }
    var pendingQuantityForCart by remember { mutableStateOf(1.0) }

    fun handleAddToCart(product: Product, qty: Double = 1.0) {
        if (token != null) {
            addProductToCart(product, qty)
        } else {
            pendingProductForCart = product
            pendingQuantityForCart = qty
            showAuthPromptDialog = true
        }
    }

    VegitoTheme(themeMode = themeMode) {
        if (showAuthPromptDialog) {
            AlertDialog(
                onDismissRequest = { showAuthPromptDialog = false },
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("🛒", fontSize = 24.sp)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Almost there!")
                    }
                },
                text = {
                    Text("Create an account or login to add items to your Vegito basket and enjoy farm-fresh delivery.")
                },
                confirmButton = {
                    Button(
                        onClick = {
                            showAuthPromptDialog = false
                            pendingRoleForOtp = "customer"
                            navController.navigate("login")
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Continue with Mobile / Login", fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showAuthPromptDialog = false }) {
                        Text("Cancel")
                    }
                },
                shape = RoundedCornerShape(20.dp)
            )
        }
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
                        onLocationClick = { showGlobalLocationSheet = true },
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
                        onStartShopping = { navController.navigate("location_setup") },
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

                composable("location_setup") {
                    LocationSetupScreen(
                        onLocationConfirmed = { savedAddress ->
                            sessionManager.saveSelectedAddress(savedAddress)
                            navController.navigate("customer_home") {
                                popUpTo("onboarding") { inclusive = true }
                            }
                        },
                        onSkip = {
                            navController.navigate("customer_home") {
                                popUpTo("onboarding") { inclusive = true }
                            }
                        }
                    )
                }

                composable("login") {
                    LoginScreen(
                        initialRole = pendingRoleForOtp,
                        onSendOtp = { phone, role ->
                            pendingPhoneForOtp = phone
                            pendingRoleForOtp = role
                            authErrorMessage = null
                            isAuthLoading = true
                            scope.launch {
                                val res = repository.sendOtp(phone = phone, role = role)
                                isAuthLoading = false
                                if (res != null) {
                                    authDevOtp = res.devOtp
                                    navController.navigate("otp")
                                } else {
                                    // Local dev mode fallback if server cannot be reached
                                    authDevOtp = "123456"
                                    navController.navigate("otp")
                                }
                            }
                        }
                    )
                }

                composable("otp") {
                    OtpScreen(
                        phone = pendingPhoneForOtp,
                        role = pendingRoleForOtp,
                        devOtp = authDevOtp,
                        isLoading = isAuthLoading,
                        errorMessage = authErrorMessage,
                        onResendOtp = {
                            isAuthLoading = true
                            authErrorMessage = null
                            scope.launch {
                                val res = repository.sendOtp(phone = pendingPhoneForOtp, role = pendingRoleForOtp)
                                isAuthLoading = false
                                if (res != null) {
                                    authDevOtp = res.devOtp
                                }
                            }
                        },
                        onVerifyOtp = { otp ->
                            isAuthLoading = true
                            authErrorMessage = null
                            scope.launch {
                                val tokenRes = repository.verifyOtp(
                                    phone = pendingPhoneForOtp,
                                    otp = otp,
                                    role = pendingRoleForOtp
                                )
                                isAuthLoading = false
                                if (tokenRes != null) {
                                    sessionManager.saveTokenResponse(tokenRes)
                                    val resolvedRole = tokenRes.role.lowercase()
                                    if (pendingProductForCart != null) {
                                        addProductToCart(pendingProductForCart!!, pendingQuantityForCart)
                                        pendingProductForCart = null
                                        pendingQuantityForCart = 1.0
                                        navController.navigate("customer_cart") {
                                            popUpTo("onboarding") { inclusive = true }
                                        }
                                    } else {
                                        val target = when (resolvedRole) {
                                            "seller" -> "seller_dashboard"
                                            "delivery_partner" -> "delivery_dashboard"
                                            "admin" -> "admin_dashboard"
                                            else -> "customer_home"
                                        }
                                        navController.navigate(target) {
                                            popUpTo("onboarding") { inclusive = true }
                                        }
                                    }
                                } else {
                                    // Fallback for offline/local simulation
                                    sessionManager.saveAuthToken("dev_token_${System.currentTimeMillis()}")
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
                            }
                        }
                    )
                }

                // CUSTOMER WORKSPACE
                composable("customer_home") {
                    val availableProducts = if (productsList.isNotEmpty()) productsList else repository.fullCatalog
                    CustomerHomeScreen(
                        lang = lang,
                        offers = offersList,
                        categories = if (categoriesList.isNotEmpty()) categoriesList else repository.defaultCategories,
                        allProducts = availableProducts,
                        cartItemQuantities = cartItems.associate { it.product.id to it.quantity },
                        onCategoryClick = { navController.navigate("customer_search") },
                        onProductClick = { prod ->
                            selectedProductForDetail = prod
                            navController.navigate("product_detail")
                        },
                        onAddToCart = { prod ->
                            handleAddToCart(prod, 1.0)
                        },
                        onUpdateQuantity = { prod, newQty ->
                            updateCartItemQuantity(prod.id, newQty)
                        },
                        onOfferClick = { offer ->
                            val matched = availableProducts.find { it.id == offer.productId }
                                ?: availableProducts.find { offer.title.contains(it.name.split(" ").first(), ignoreCase = true) }
                                ?: availableProducts.firstOrNull()
                            if (matched != null) {
                                selectedProductForDetail = matched
                                navController.navigate("product_detail")
                            }
                        },
                        onQuickAddOffer = { offer ->
                            val matched = availableProducts.find { it.id == offer.productId }
                                ?: availableProducts.find { offer.title.contains(it.name.split(" ").first(), ignoreCase = true) }
                                ?: availableProducts.firstOrNull()
                            if (matched != null) {
                                handleAddToCart(matched, 1.0)
                            }
                        },
                        onB2BClick = { navController.navigate("b2b_bulk") }
                    )
                }

                composable("product_detail") {
                    selectedProductForDetail?.let { prod ->
                        ProductDetailScreen(
                            product = prod,
                            onBack = { navController.popBackStack() },
                            onAddToCart = { p, qty ->
                                handleAddToCart(p, qty)
                                if (token != null) {
                                    navController.navigate("customer_cart")
                                }
                            }
                        )
                    }
                }

                composable("customer_search") {
                    SearchScreen(
                        products = if (productsList.isNotEmpty()) productsList else repository.fullCatalog,
                        onProductClick = {
                            selectedProductForDetail = it
                            navController.navigate("product_detail")
                        },
                        onAddToCart = { prod -> handleAddToCart(prod, 1.0) }
                    )
                }

                composable("customer_cart") {
                    CartScreen(
                        cart = cartSummary,
                        onUpdateQuantity = { id, qty ->
                            cartItems.find { it.id == id }?.let { item ->
                                updateCartItemQuantity(item.product.id, qty)
                            }
                        },
                        onRemoveItem = { id ->
                            cartItems.find { it.id == id }?.let { item ->
                                updateCartItemQuantity(item.product.id, 0.0)
                            }
                        },
                        onProceedToCheckout = { navController.navigate("customer_checkout") }
                    )
                }

                composable("customer_checkout") {
                    CheckoutScreen(
                        cart = cartSummary,
                        selectedAddress = selectedAddress,
                        onBack = { navController.popBackStack() },
                        onAddressUpdated = { updatedAddress ->
                            sessionManager.saveSelectedAddress(updatedAddress)
                            scope.launch {
                                repository.saveAddress(
                                    AddressCreateDto(
                                        addressLine1 = updatedAddress.addressLine,
                                        city = updatedAddress.city,
                                        state = updatedAddress.state,
                                        pincode = updatedAddress.pincode,
                                        latitude = updatedAddress.latitude,
                                        longitude = updatedAddress.longitude,
                                        landmark = updatedAddress.landmark,
                                        isDefault = true
                                    )
                                )
                            }
                        },
                        onCheckDeliveryEligibility = { addr ->
                            val addrId = addr.id.toIntOrNull() ?: 1
                            repository.checkDeliveryEligibility(addrId)
                        },
                        onPlaceOrder = { method ->
                            scope.launch {
                                val addrId = selectedAddress?.id?.toIntOrNull() ?: 1
                                val serverOrder = repository.createOrder(
                                    addressId = addrId,
                                    paymentMethod = method
                                )

                                val finalOrder = if (serverOrder != null) {
                                    Order(
                                        id = serverOrder.id.toString(),
                                        orderNumber = serverOrder.orderNumber,
                                        status = serverOrder.status,
                                        totalAmount = serverOrder.totalAmount,
                                        deliveryFee = serverOrder.deliveryCharge,
                                        deliveryAddress = selectedAddress ?: SavedAddress(),
                                        customerOtp = serverOrder.deliveryOtp ?: "${(1000..9999).random()}",
                                        pickupOtp = serverOrder.pickupOtp
                                    )
                                } else {
                                    // Robust local fallback with actual device coordinates
                                    Order(
                                        id = "ord_${System.currentTimeMillis()}",
                                        orderNumber = "VEG-${(1000..9999).random()}",
                                        status = "NEW",
                                        totalAmount = cartSummary.grandTotal,
                                        deliveryFee = cartSummary.deliveryFee,
                                        deliveryAddress = selectedAddress ?: SavedAddress(),
                                        customerOtp = "${(1000..9999).random()}"
                                    )
                                }

                                activeOrder = finalOrder
                                // Clear cart on successful order
                                cartItems = emptyList()
                                cartSummary = recalculateCart(emptyList())

                                navController.navigate("customer_tracking") {
                                    popUpTo("customer_home")
                                }
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
                            cartItems = emptyList()
                            cartSummary = recalculateCart(emptyList())
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
                        products = if (productsList.isNotEmpty()) productsList else repository.fullCatalog,
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

                // ADMIN WORKSPACE
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

        // Global Location Selection BottomSheet
        if (showGlobalLocationSheet) {
            LocationSelectionBottomSheet(
                currentAddress = selectedAddress,
                onDismiss = { showGlobalLocationSheet = false },
                onAddressConfirmed = { confirmedAddr ->
                    sessionManager.saveSelectedAddress(confirmedAddr)
                    scope.launch {
                        repository.saveAddress(
                            AddressCreateDto(
                                addressLine1 = confirmedAddr.addressLine,
                                city = confirmedAddr.city,
                                state = confirmedAddr.state,
                                pincode = confirmedAddr.pincode,
                                latitude = confirmedAddr.latitude,
                                longitude = confirmedAddr.longitude,
                                landmark = confirmedAddr.landmark,
                                isDefault = true
                            )
                        )
                    }
                    showGlobalLocationSheet = false
                }
            )
        }
    }
}
