package com.vegito.app

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import android.util.Log
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.vegito.app.data.local.SessionManager
import com.vegito.app.data.model.*
import com.vegito.app.data.remote.RetrofitClient
import com.vegito.app.data.repository.VegitoRepository
import com.vegito.app.presentation.admin.*
import com.vegito.app.presentation.auth.*
import com.vegito.app.presentation.b2b.B2BBulkScreen
import com.vegito.app.presentation.customer.*
import com.vegito.app.presentation.delivery.*
import com.vegito.app.utils.LocationHelper
import com.vegito.app.presentation.seller.*
import com.vegito.app.ui.components.BottomNavBar
import com.vegito.app.ui.components.LocationSelectionBottomSheet
import com.vegito.app.ui.components.TopBar
import com.vegito.app.ui.theme.VegitoPrimary
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
    var favoriteProductIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var notificationsList by remember { mutableStateOf<List<NotificationDto>>(emptyList()) }
    var savedAddressesList by remember { mutableStateOf<List<SavedAddress>>(emptyList()) }
    var customerOrdersList by remember { mutableStateOf<List<Order>>(emptyList()) }

    // Live Seller Workspace State
    var sellerProfile by remember { mutableStateOf<SellerProfileDto?>(null) }
    var sellerStats by remember { mutableStateOf(SellerDashboardStats(isOnline = false)) }
    var sellerOrdersList by remember { mutableStateOf<List<Order>>(emptyList()) }
    var sellerRevenueData by remember { mutableStateOf<List<TimeSeriesPointDto>>(emptyList()) }
    var sellerTopProducts by remember { mutableStateOf<List<TopProductAnalyticsDto>>(emptyList()) }
    var sellerBulkOrdersList by remember { mutableStateOf<List<BulkOrderSummary>>(emptyList()) }

    // Live Delivery Workspace State
    var deliveryTasksList by remember { mutableStateOf<List<DeliveryTask>>(emptyList()) }
    var deliveryEarningsData by remember { mutableStateOf(DeliveryEarningsData()) }
    var deliveryProfileDto by remember { mutableStateOf<DeliveryPartnerProfileDto?>(null) }
    var activeDeliveryTaskForMap by remember { mutableStateOf<DeliveryTask?>(null) }
    var isDeliveryOnline by remember { mutableStateOf(false) }

    // Live Admin Workspace State
    var adminMetrics by remember { mutableStateOf(AdminAnalytics()) }
    var adminSellersList by remember { mutableStateOf<List<AdminSellerItemDto>>(emptyList()) }
    var adminDeliveryPartnersList by remember { mutableStateOf<List<AdminDeliveryPartnerItemDto>>(emptyList()) }

    var showGlobalLocationSheet by remember { mutableStateOf(false) }

    // Load initial data
    LaunchedEffect(token, activeRole) {
        val prods = repository.getProducts()
        productsList = prods

        val offers = repository.getActiveOffers()
        offersList = offers

        val cats = repository.getCategories()
        categoriesList = cats

        if (token != null) {
            val savedAddrs = repository.getUserAddresses()
            savedAddressesList = savedAddrs
            if (savedAddrs.isNotEmpty() && selectedAddress == null) {
                val def = savedAddrs.firstOrNull { it.isDefault } ?: savedAddrs.first()
                sessionManager.saveSelectedAddress(def)
            }
            val favs = repository.getFavorites()
            favoriteProductIds = favs.map { it.toString() }.toSet()
            notificationsList = repository.getNotifications()

            val cOrders = repository.getCustomerOrders().map { it.toDomainOrder() }
            if (cOrders.isNotEmpty()) customerOrdersList = cOrders

            when (activeRole.lowercase()) {
                "seller" -> {
                    val sp = repository.getSellerProfile()
                    if (sp != null) sellerProfile = sp

                    val st = repository.getSellerDashboardStats()
                    if (st != null) sellerStats = st

                    val sOrders = repository.getSellerOrders()
                    sellerOrdersList = sOrders

                    val rev = repository.getSellerRevenueAnalytics("today")
                    sellerRevenueData = rev

                    val topP = repository.getSellerTopProducts()
                    sellerTopProducts = topP

                    val bulk = repository.getSellerBulkOrders()
                    sellerBulkOrdersList = bulk
                }
                "delivery_partner" -> {
                    val tasks = repository.getDeliveryTasks()
                    if (tasks.isNotEmpty()) deliveryTasksList = tasks

                    val earn = repository.getDeliveryEarnings()
                    if (earn != null) deliveryEarningsData = earn

                    val dProf = repository.getDeliveryProfile()
                    if (dProf != null) deliveryProfileDto = dProf
                }
                "admin" -> {
                    val metrics = repository.getAdminDashboardMetrics()
                    if (metrics != null) {
                        adminMetrics = AdminAnalytics(
                            totalCustomers = metrics.customers,
                            totalSellers = metrics.sellers,
                            totalDeliveryPartners = metrics.deliveryPartners,
                            totalOrdersToday = metrics.orders,
                            grossRevenueToday = metrics.revenue,
                            pendingKycCount = metrics.pendingOrders
                        )
                    }

                    val sellers = repository.getAdminSellers()
                    if (sellers.isNotEmpty()) adminSellersList = sellers

                    val partners = repository.getAdminDeliveryPartners()
                    if (partners.isNotEmpty()) adminDeliveryPartnersList = partners
                }
            }
        }
    }

    fun handleToggleFavorite(product: Product) {
        val prodIdInt = product.id.toIntOrNull() ?: 1
        val isCurrentlyFav = favoriteProductIds.contains(product.id)
        val newFavState = !isCurrentlyFav
        favoriteProductIds = if (newFavState) {
            favoriteProductIds + product.id
        } else {
            favoriteProductIds - product.id
        }
        scope.launch {
            repository.toggleFavorite(prodIdInt, newFavState)
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
            "seller_dashboard", "seller_orders", "seller_products", "seller_profile",
            "delivery_dashboard", "delivery_tasks", "delivery_earnings", "delivery_profile",
            "admin_dashboard", "admin_sellers", "admin_delivery", "admin_orders"
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
                        onSearchClick = { navController.navigate("customer_search") },
                        onFavoritesClick = { navController.navigate("customer_favorites") },
                        onNotificationsClick = { navController.navigate("customer_notifications") }
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
                        isLoading = isAuthLoading,
                        errorMessage = authErrorMessage,
                        onSendOtp = { phone, role ->
                            pendingPhoneForOtp = phone
                            pendingRoleForOtp = role
                            authErrorMessage = null
                            isAuthLoading = true
                            scope.launch {
                                when (val res = repository.sendOtp(phone = phone, role = role)) {
                                    is VegitoRepository.AuthResult.Success -> {
                                        isAuthLoading = false
                                        authDevOtp = res.data.devOtp
                                        navController.navigate("otp")
                                    }
                                    is VegitoRepository.AuthResult.Failure -> {
                                        isAuthLoading = false
                                        authErrorMessage = res.message
                                    }
                                }
                            }
                        },
                        onPasswordLogin = { phone, pass, role ->
                            isAuthLoading = true
                            authErrorMessage = null
                            scope.launch {
                                when (val res = repository.loginWithPassword(phone = phone, pass = pass, role = role)) {
                                    is VegitoRepository.AuthResult.Success -> {
                                        isAuthLoading = false
                                        val tokenRes = res.data
                                        sessionManager.saveTokenResponse(tokenRes)
                                        val target = when (tokenRes.role.lowercase()) {
                                            "seller" -> "seller_dashboard"
                                            "delivery_partner" -> "delivery_dashboard"
                                            "admin" -> "admin_dashboard"
                                            else -> "customer_home"
                                        }
                                        navController.navigate(target) {
                                            popUpTo("onboarding") { inclusive = true }
                                        }
                                    }
                                    is VegitoRepository.AuthResult.Failure -> {
                                        isAuthLoading = false
                                        authErrorMessage = res.message
                                    }
                                }
                            }
                        },
                        onNavigateRegister = {
                            navController.navigate("register")
                        }
                    )
                }

                composable("register") {
                    RegisterScreen(
                        initialRole = pendingRoleForOtp,
                        isLoading = isAuthLoading,
                        errorMessage = authErrorMessage,
                        onRegister = { reqDto ->
                            isAuthLoading = true
                            authErrorMessage = null
                            scope.launch {
                                when (val regRes = repository.registerUser(reqDto)) {
                                    is VegitoRepository.AuthResult.Success -> {
                                        pendingPhoneForOtp = reqDto.phone
                                        pendingRoleForOtp = reqDto.role.lowercase()
                                        when (val otpRes = repository.sendOtp(reqDto.phone, reqDto.role.lowercase())) {
                                            is VegitoRepository.AuthResult.Success -> {
                                                authDevOtp = otpRes.data.devOtp
                                            }
                                            is VegitoRepository.AuthResult.Failure -> {
                                                authDevOtp = null
                                            }
                                        }
                                        isAuthLoading = false
                                        navController.navigate("otp")
                                    }
                                    is VegitoRepository.AuthResult.Failure -> {
                                        isAuthLoading = false
                                        authErrorMessage = regRes.message
                                    }
                                }
                            }
                        },
                        onNavigateLogin = {
                            navController.popBackStack()
                        }
                    )
                }

                composable("otp") {
                    OtpScreen(
                        phone = pendingPhoneForOtp,
                        role = pendingRoleForOtp,
                        isLoading = isAuthLoading,
                        errorMessage = authErrorMessage,
                        onResendOtp = {
                            isAuthLoading = true
                            authErrorMessage = null
                            authDevOtp = null
                            scope.launch {
                                when (val res = repository.sendOtp(phone = pendingPhoneForOtp, role = pendingRoleForOtp)) {
                                    is VegitoRepository.AuthResult.Success -> {
                                        isAuthLoading = false
                                        authDevOtp = res.data.devOtp
                                    }
                                    is VegitoRepository.AuthResult.Failure -> {
                                        isAuthLoading = false
                                        authErrorMessage = res.message
                                    }
                                }
                            }
                        },
                        onVerifyOtp = { otp ->
                            isAuthLoading = true
                            authErrorMessage = null
                            scope.launch {
                                when (val res = repository.verifyOtp(phone = pendingPhoneForOtp, otp = otp, role = pendingRoleForOtp)) {
                                    is VegitoRepository.AuthResult.Success -> {
                                        isAuthLoading = false
                                        val tokenData = res.data
                                        sessionManager.saveTokenResponse(tokenData)
                                        val resolvedRole = tokenData.role.lowercase()
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
                                    }
                                    is VegitoRepository.AuthResult.Failure -> {
                                        isAuthLoading = false
                                        authErrorMessage = res.message
                                    }
                                }
                            }
                        }
                    )
                }

                // CUSTOMER WORKSPACE
                composable("customer_home") {
                    val availableProducts = productsList
                    CustomerHomeScreen(
                        lang = lang,
                        offers = offersList,
                        categories = categoriesList,
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
                        onToggleFavorite = { prod ->
                            handleToggleFavorite(prod)
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
                        products = productsList,
                        onProductClick = {
                            selectedProductForDetail = it
                            navController.navigate("product_detail")
                        },
                        onAddToCart = { prod -> handleAddToCart(prod, 1.0) },
                        onToggleFavorite = { prod -> handleToggleFavorite(prod) }
                    )
                }

                composable("customer_favorites") {
                    val availableProducts = productsList
                    val favProds = availableProducts.filter { favoriteProductIds.contains(it.id) }
                    FavoritesScreen(
                        favoriteProducts = favProds,
                        cartItemQuantities = cartItems.associate { it.product.id to it.quantity },
                        onBack = { navController.popBackStack() },
                        onProductClick = { prod ->
                            selectedProductForDetail = prod
                            navController.navigate("product_detail")
                        },
                        onAddToCart = { prod -> handleAddToCart(prod, 1.0) },
                        onUpdateQuantity = { prod, qty -> updateCartItemQuantity(prod.id, qty) },
                        onToggleFavorite = { prod -> handleToggleFavorite(prod) }
                    )
                }

                composable("customer_notifications") {
                    NotificationsScreen(
                        notifications = notificationsList,
                        onBack = { navController.popBackStack() }
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
                            val saved = repository.saveAddress(
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
                            if (saved != null) {
                                sessionManager.saveSelectedAddress(saved)
                                savedAddressesList = repository.getUserAddresses()
                            }
                            saved
                        },
                        onCheckDeliveryEligibility = { addr ->
                            val addrId = addr.id.toIntOrNull()
                            if (addrId == null) null else repository.checkDeliveryEligibility(addrId)
                        },
                        onPlaceOrder = { method ->
                            val currentAddr = selectedAddress
                            if (currentAddr == null || !LocationHelper.isValidCoordinates(currentAddr.latitude, currentAddr.longitude)) {
                                Log.e("VegitoLocation", "[CHECKOUT] deliveryLatitude: null/invalid, deliveryLongitude: null/invalid")
                                Log.e("VegitoOrder", "[ORDER] Order placement blocked: Missing or invalid delivery location coordinates")
                                showGlobalLocationSheet = true
                                false
                            } else {
                                Log.i("VegitoLocation", "[LOCATION] latitude: ${currentAddr.latitude}, longitude: ${currentAddr.longitude}")
                                Log.i("VegitoLocation", "[CHECKOUT] deliveryLocationSource: selected_address_gps")
                                Log.i("VegitoLocation", "[CHECKOUT] deliveryLatitude: ${currentAddr.latitude}")
                                Log.i("VegitoLocation", "[CHECKOUT] deliveryLongitude: ${currentAddr.longitude}")

                                var addrId = currentAddr.id.toIntOrNull() ?: 0
                                if (addrId <= 0) {
                                    Log.i("VegitoCheckout", "[CHECKOUT] Address ID missing locally, saving address to backend first...")
                                    val saved = repository.saveAddress(
                                        AddressCreateDto(
                                            addressLine1 = currentAddr.addressLine,
                                            addressLine2 = currentAddr.landmark,
                                            city = currentAddr.city.ifBlank { "Solapur" },
                                            state = currentAddr.state.ifBlank { "Maharashtra" },
                                            pincode = currentAddr.pincode.ifBlank { "413001" },
                                            latitude = currentAddr.latitude,
                                            longitude = currentAddr.longitude,
                                            landmark = currentAddr.landmark,
                                            isDefault = true
                                        )
                                    )
                                    if (saved != null && saved.id.toIntOrNull() != null) {
                                        addrId = saved.id.toInt()
                                        sessionManager.saveSelectedAddress(saved)
                                    } else {
                                        val addrs = repository.getUserAddresses()
                                        if (addrs.isNotEmpty()) {
                                            val matched = addrs.find {
                                                it.latitude != null && it.longitude != null &&
                                                Math.abs(it.latitude - currentAddr.latitude!!) < 0.0001 &&
                                                Math.abs(it.longitude - currentAddr.longitude!!) < 0.0001
                                            } ?: addrs.first()
                                            addrId = matched.id.toIntOrNull() ?: 1
                                            sessionManager.saveSelectedAddress(matched)
                                        } else {
                                            addrId = 1
                                        }
                                    }
                                }

                                Log.i("VegitoOrder", "[ORDER] sending delivery location: addressId=$addrId, lat=${currentAddr.latitude}, lng=${currentAddr.longitude}")
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
                                        deliveryAddress = currentAddr,
                                        customerOtp = serverOrder.deliveryOtp ?: "${(1000..9999).random()}",
                                        pickupOtp = serverOrder.pickupOtp
                                    )
                                } else {
                                    Log.w("VegitoOrder", "[ORDER] Server order creation returned null, falling back to local order")
                                    Order(
                                        id = "ord_${System.currentTimeMillis()}",
                                        orderNumber = "VEG-${(1000..9999).random()}",
                                        status = "NEW",
                                        totalAmount = cartSummary.grandTotal,
                                        deliveryFee = cartSummary.deliveryFee,
                                        deliveryAddress = currentAddr,
                                        customerOtp = "${(1000..9999).random()}"
                                    )
                                }

                                activeOrder = finalOrder
                                cartItems = emptyList()
                                cartSummary = recalculateCart(emptyList())

                                val updatedOrders = repository.getCustomerOrders().map { it.toDomainOrder() }
                                if (updatedOrders.isNotEmpty()) customerOrdersList = updatedOrders

                                navController.navigate("customer_tracking") {
                                    popUpTo("customer_home")
                                }
                                true
                            }
                        }
                    )
                }

                composable("customer_orders") {
                    val ordersToShow = if (customerOrdersList.isNotEmpty()) customerOrdersList
                    else listOfNotNull(activeOrder).ifEmpty {
                        listOf(
                            Order(id = "o1", orderNumber = "VEG-8821", status = "OUT_FOR_DELIVERY", totalAmount = 111.0, customerOtp = "4829"),
                            Order(id = "o2", orderNumber = "VEG-8815", status = "DELIVERED", totalAmount = 240.0)
                        )
                    }

                    CustomerOrdersScreen(
                        orders = ordersToShow,
                        onBack = {
                            if (!navController.popBackStack()) {
                                navController.navigate("customer_home")
                            }
                        },
                        onTrackOrder = { ord ->
                            activeOrder = ord
                            navController.navigate("customer_tracking")
                        },
                        onRefresh = {
                            scope.launch {
                                val refreshed = repository.getCustomerOrders().map { it.toDomainOrder() }
                                if (refreshed.isNotEmpty()) customerOrdersList = refreshed
                            }
                        }
                    )
                }

                composable("customer_addresses") {
                    AddressesScreen(
                        addresses = savedAddressesList,
                        selectedAddressId = selectedAddress?.id,
                        onBack = { navController.popBackStack() },
                        onSelectAddress = { addr ->
                            sessionManager.saveSelectedAddress(addr)
                            navController.popBackStack()
                        },
                        onAddAddress = { dto ->
                            scope.launch {
                                repository.saveAddress(dto)
                                val addrs = repository.getUserAddresses()
                                savedAddressesList = addrs
                                if (addrs.isNotEmpty() && dto.isDefault) {
                                    sessionManager.saveSelectedAddress(addrs.first())
                                }
                            }
                        },
                        onDeleteAddress = { id ->
                            scope.launch {
                                repository.deleteAddress(id)
                                savedAddressesList = repository.getUserAddresses()
                            }
                        }
                    )
                }

                composable("customer_tracking") {
                    val ordToTrack = activeOrder ?: customerOrdersList.firstOrNull() ?: Order(
                        id = "ord_sample",
                        orderNumber = "VEG-8821",
                        status = "OUT_FOR_DELIVERY",
                        totalAmount = 111.0,
                        customerOtp = "4829"
                    )
                    OrderTrackingScreen(
                        order = ordToTrack,
                        onSubmitReview = { rating, comment ->
                            val ordId = ordToTrack.id.toIntOrNull() ?: 1
                            val prodId = productsList.firstOrNull()?.id?.toIntOrNull() ?: 1
                            scope.launch {
                                repository.submitReview(
                                    ReviewCreateDto(
                                        orderId = ordId,
                                        productId = prodId,
                                        rating = rating,
                                        comment = comment
                                    )
                                )
                            }
                        },
                        onSubmitComplaint = { cat, desc ->
                            val ordId = ordToTrack.id.toIntOrNull() ?: 1
                            scope.launch {
                                repository.createComplaint(
                                    ComplaintCreateDto(
                                        orderId = ordId,
                                        complaintType = cat,
                                        description = desc
                                    )
                                )
                            }
                        }
                    )
                }

                composable("customer_profile") {
                    ProfileScreen(
                        user = sessionManager.getUser(),
                        activeRole = activeRole,
                        onNavigateAddresses = { navController.navigate("customer_addresses") },
                        onNavigateOrders = { navController.navigate("customer_orders") },
                        onNavigateFavorites = { navController.navigate("customer_favorites") },
                        onNavigateNotifications = { navController.navigate("customer_notifications") },
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
                        stats = sellerStats,
                        storeName = sellerProfile?.businessName ?: "Solapur Mandi Store",
                        sellerProfile = sellerProfile,
                        onToggleOnline = { isOnline ->
                            sellerStats = sellerStats.copy(isOnline = isOnline)
                            scope.launch { repository.setSellerAvailability(isOnline) }
                        },
                        onNavigateOrders = { navController.navigate("seller_orders") },
                        onNavigateProducts = { navController.navigate("seller_products") },
                        onNavigateAddProduct = { navController.navigate("seller_add_product") },
                        onNavigateInventory = { navController.navigate("seller_inventory") },
                        onNavigateAnalytics = { navController.navigate("seller_analytics") },
                        onNavigateBulkOrders = { navController.navigate("seller_bulk_orders") },
                        onNavigateProfile = { navController.navigate("seller_profile") },
                        onNavigateSettings = { navController.navigate("seller_settings") },
                        onNavigateNotifications = { navController.navigate("customer_notifications") },
                        onNavigateB2B = { navController.navigate("seller_bulk_orders") },
                        onLogout = {
                            sessionManager.clearSession()
                            cartItems = emptyList()
                            cartSummary = recalculateCart(emptyList())
                            navController.navigate("onboarding") {
                                popUpTo(0) { inclusive = true }
                            }
                        }
                    )
                }

                composable("seller_orders") {
                    LaunchedEffect(Unit) {
                        val realOrders = repository.getSellerOrders()
                        sellerOrdersList = realOrders
                    }
                    SellerOrdersScreen(
                        orders = sellerOrdersList,
                        onBack = {
                            if (!navController.popBackStack()) {
                                navController.navigate("seller_dashboard")
                            }
                        },
                        onUpdateStatus = { id, st ->
                            val idInt = id.toIntOrNull() ?: id.replace("so", "").toIntOrNull() ?: 1
                            scope.launch {
                                val ok = repository.updateOrderStatus(idInt, st)
                                if (ok) {
                                    val refreshed = repository.getSellerOrders()
                                    sellerOrdersList = refreshed
                                    val st = repository.getSellerDashboardStats()
                                    if (st != null) sellerStats = st
                                }
                            }
                        },
                        onVerifyPickupOtp = { id, otp ->
                            val idInt = id.toIntOrNull() ?: id.replace("so", "").toIntOrNull() ?: 1
                            scope.launch {
                                val ok = repository.verifyPickupOtp(idInt, otp)
                                if (ok) {
                                    val refreshed = repository.getSellerOrders()
                                    sellerOrdersList = refreshed
                                    val st = repository.getSellerDashboardStats()
                                    if (st != null) sellerStats = st
                                }
                            }
                        }
                    )
                }

                composable("seller_products") {
                    SellerProductsScreen(
                        products = productsList,
                        onBack = {
                            if (!navController.popBackStack()) {
                                navController.navigate("seller_dashboard")
                            }
                        },
                        onAddProduct = { navController.navigate("seller_add_product") },
                        onEditStock = { prodId, change, isAdd ->
                            scope.launch {
                                val changeType = if (isAdd) "ADD" else "SUBTRACT"
                                repository.adjustInventory(prodId, change, changeType)
                                val updatedProds = repository.getProducts()
                                if (updatedProds.isNotEmpty()) productsList = updatedProds
                            }
                        }
                    )
                }

                composable("seller_add_product") {
                    SellerAddProductScreen(
                        onBack = { navController.popBackStack() },
                        onSubmitProduct = { req ->
                            scope.launch {
                                repository.addSellerProduct(req)
                                val updatedProds = repository.getProducts()
                                if (updatedProds.isNotEmpty()) productsList = updatedProds
                                navController.popBackStack()
                            }
                        }
                    )
                }

                composable("seller_inventory") {
                    SellerInventoryScreen(
                        products = productsList,
                        onBack = { navController.popBackStack() },
                        onAdjustStock = { prodId, change, isAdd ->
                            scope.launch {
                                val changeType = if (isAdd) "ADD" else "SUBTRACT"
                                repository.adjustInventory(prodId, change, changeType)
                                val updatedProds = repository.getProducts()
                                if (updatedProds.isNotEmpty()) productsList = updatedProds
                            }
                        },
                        onNavigateAddProduct = { navController.navigate("seller_add_product") }
                    )
                }

                composable("seller_analytics") {
                    SellerAnalyticsScreen(
                        revenueData = sellerRevenueData,
                        topProducts = sellerTopProducts,
                        onBack = { navController.popBackStack() },
                        onPeriodChange = { period ->
                            scope.launch {
                                val rev = repository.getSellerRevenueAnalytics(period)
                                sellerRevenueData = rev
                            }
                        }
                    )
                }

                composable("seller_bulk_orders") {
                    SellerBulkOrdersScreen(
                        orders = sellerBulkOrdersList,
                        onBack = { navController.popBackStack() },
                        onSubmitQuote = { orderId, pricePerKg, remarks ->
                            scope.launch {
                                val quoteReq = SendCustomQuoteRequest(
                                    items = listOf(QuotedLineItem(orderItemId = 1, quotedUnitPrice = pricePerKg, sellerNotes = remarks)),
                                    deliveryFee = 50.0,
                                    notes = remarks
                                )
                                repository.sendSellerBulkQuote(orderId, quoteReq)
                                val refreshed = repository.getSellerBulkOrders()
                                if (refreshed.isNotEmpty()) sellerBulkOrdersList = refreshed
                            }
                        }
                    )
                }

                composable("seller_profile") {
                    SellerProfileScreen(
                        user = sessionManager.getUser(),
                        sellerProfile = sellerProfile,
                        onBack = {
                            if (!navController.popBackStack()) {
                                navController.navigate("seller_dashboard")
                            }
                        },
                        onNavigateSettings = { navController.navigate("seller_settings") },
                        onSwitchRole = { newRole: String ->
                            sessionManager.saveActiveRole(newRole)
                            val dest = when (newRole.lowercase()) {
                                "seller" -> "seller_dashboard"
                                "delivery_partner" -> "delivery_dashboard"
                                "admin" -> "admin_dashboard"
                                else -> "customer_home"
                            }
                            navController.navigate(dest) {
                                popUpTo("seller_dashboard") { inclusive = true }
                            }
                        },
                        onLogout = {
                            sessionManager.clearSession()
                            cartItems = emptyList()
                            cartSummary = recalculateCart(emptyList())
                            navController.navigate("onboarding") {
                                popUpTo(0) { inclusive = true }
                            }
                        }
                    )
                }

                composable("seller_settings") {
                    SellerSettingsScreen(
                        sellerProfile = sellerProfile,
                        currentLang = lang,
                        currentTheme = themeMode,
                        isStoreOnline = sellerStats.isOnline,
                        onBack = {
                            if (!navController.popBackStack()) {
                                navController.navigate("seller_dashboard")
                            }
                        },
                        onLanguageChange = { langStr: String -> sessionManager.setLanguage(langStr) },
                        onThemeToggle = {
                            val newMode = if (themeMode == "DARK") "LIGHT" else "DARK"
                            sessionManager.setThemeMode(newMode)
                        },
                        onToggleOnline = { isOnline: Boolean ->
                            sellerStats = sellerStats.copy(isOnline = isOnline)
                            scope.launch { repository.setSellerAvailability(isOnline) }
                        },
                        onUpdateShopLocation = { address, city, pincode, lat, lng ->
                            scope.launch {
                                val updatedDto = repository.updateSellerProfile(
                                    SellerProfileUpdateDto(
                                        address = address,
                                        city = city,
                                        pincode = pincode,
                                        latitude = lat,
                                        longitude = lng
                                    )
                                )
                                if (updatedDto != null) {
                                    sellerProfile = updatedDto
                                } else {
                                    sellerProfile = (sellerProfile ?: SellerProfileDto()).copy(
                                        address = address,
                                        city = city,
                                        pincode = pincode,
                                        latitude = lat,
                                        longitude = lng
                                    )
                                }
                            }
                        },
                        onLogout = {
                            sessionManager.clearSession()
                            cartItems = emptyList()
                            cartSummary = recalculateCart(emptyList())
                            navController.navigate("onboarding") {
                                popUpTo(0) { inclusive = true }
                            }
                        }
                    )
                }

                // DELIVERY WORKSPACE
                composable("delivery_dashboard") {
                    DeliveryDashboardScreen(
                        isOnline = isDeliveryOnline,
                        todayEarnings = deliveryEarningsData.totalEarnings,
                        activeTasksCount = deliveryTasksList.count { it.status != "DELIVERED" },
                        onToggleOnline = { online ->
                            isDeliveryOnline = online
                            scope.launch { repository.setDeliveryAvailability(online) }
                        },
                        onNavigateTasks = { navController.navigate("delivery_tasks") },
                        onNavigateEarnings = { navController.navigate("delivery_earnings") },
                        onNavigateProfile = { navController.navigate("delivery_profile") },
                        onNavigateMap = {
                            activeDeliveryTaskForMap = deliveryTasksList.firstOrNull()
                            navController.navigate("delivery_map")
                        }
                    )
                }

                composable("delivery_tasks") {
                    val displayedTasks = if (deliveryTasksList.isNotEmpty()) deliveryTasksList else listOf(
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
                    )
                    DeliveryTaskScreen(
                        tasks = displayedTasks,
                        onAcceptTask = { taskId ->
                            scope.launch {
                                repository.acceptDeliveryTask(taskId)
                                val refreshed = repository.getDeliveryTasks()
                                if (refreshed.isNotEmpty()) deliveryTasksList = refreshed
                            }
                        },
                        onVerifyPickupOtp = { taskId, otp ->
                            scope.launch {
                                repository.verifyDeliverySellerOtp(taskId, otp)
                                val refreshed = repository.getDeliveryTasks()
                                if (refreshed.isNotEmpty()) deliveryTasksList = refreshed
                            }
                        },
                        onVerifyCustomerOtp = { taskId, otp ->
                            scope.launch {
                                repository.verifyDeliveryCustomerOtp(taskId, otp)
                                val refreshed = repository.getDeliveryTasks()
                                if (refreshed.isNotEmpty()) deliveryTasksList = refreshed
                            }
                        },
                        onNavigateMap = { taskId ->
                            activeDeliveryTaskForMap = displayedTasks.find { it.id == taskId }
                            navController.navigate("delivery_map")
                        }
                    )
                }

                composable("delivery_earnings") {
                    DeliveryEarningsScreen(
                        earningsData = deliveryEarningsData,
                        onBack = { navController.popBackStack() },
                        onPeriodChange = { _ ->
                            scope.launch {
                                val earn = repository.getDeliveryEarnings()
                                if (earn != null) deliveryEarningsData = earn
                            }
                        }
                    )
                }

                composable("delivery_profile") {
                    DeliveryProfileScreen(
                        user = sessionManager.getUser(),
                        partnerProfile = deliveryProfileDto,
                        onBack = { navController.popBackStack() },
                        onLogout = {
                            sessionManager.clearSession()
                            navController.navigate("onboarding") { popUpTo(0) }
                        }
                    )
                }

                composable("delivery_map") {
                    DeliveryMapScreen(
                        task = activeDeliveryTaskForMap ?: deliveryTasksList.firstOrNull(),
                        onBack = { navController.popBackStack() },
                        onVerifyPickupOtp = { taskId, otp ->
                            scope.launch {
                                repository.verifyDeliverySellerOtp(taskId, otp)
                                val refreshed = repository.getDeliveryTasks()
                                if (refreshed.isNotEmpty()) {
                                    deliveryTasksList = refreshed
                                    activeDeliveryTaskForMap = refreshed.find { it.id == taskId }
                                }
                            }
                        },
                        onVerifyCustomerOtp = { taskId, otp ->
                            scope.launch {
                                repository.verifyDeliveryCustomerOtp(taskId, otp)
                                val refreshed = repository.getDeliveryTasks()
                                if (refreshed.isNotEmpty()) {
                                    deliveryTasksList = refreshed
                                    activeDeliveryTaskForMap = refreshed.find { it.id == taskId }
                                }
                            }
                        }
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
                        analytics = adminMetrics,
                        onNavigateSellers = { navController.navigate("admin_sellers") },
                        onNavigateDelivery = { navController.navigate("admin_delivery") },
                        onNavigateOrders = { navController.navigate("admin_orders") },
                        onLogout = {
                            sessionManager.clearSession()
                            navController.navigate("onboarding") { popUpTo(0) }
                        }
                    )
                }

                composable("admin_sellers") {
                    AdminSellersScreen(
                        sellers = adminSellersList,
                        onBack = { navController.popBackStack() },
                        onVerifySeller = { sellerId ->
                            scope.launch {
                                repository.verifyAdminSeller(sellerId, isVerified = true)
                                val refreshed = repository.getAdminSellers()
                                adminSellersList = refreshed
                            }
                        }
                    )
                }

                composable("admin_delivery") {
                    AdminDeliveryScreen(
                        partners = adminDeliveryPartnersList,
                        onBack = { navController.popBackStack() },
                        onVerifyPartner = { partnerId ->
                            scope.launch {
                                repository.verifyAdminDeliveryPartner(partnerId, isVerified = true)
                                val refreshed = repository.getAdminDeliveryPartners()
                                adminDeliveryPartnersList = refreshed
                            }
                        }
                    )
                }

                composable("admin_orders") {
                    AdminOrdersScreen(
                        orders = customerOrdersList.ifEmpty {
                            listOf(
                                Order(id = "ao1", orderNumber = "VEG-8821", status = "NEW", totalAmount = 450.0, deliveryAddress = SavedAddress(city = "Solapur", pincode = "413001")),
                                Order(id = "ao2", orderNumber = "VEG-8822", status = "PACKING", totalAmount = 320.0, deliveryAddress = SavedAddress(city = "Solapur", pincode = "413002")),
                                Order(id = "ao3", orderNumber = "VEG-8823", status = "DELIVERED", totalAmount = 190.0, deliveryAddress = SavedAddress(city = "Solapur", pincode = "413003"))
                            )
                        },
                        onBack = { navController.popBackStack() }
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
                        val refreshed = repository.getUserAddresses()
                        if (refreshed.isNotEmpty()) savedAddressesList = refreshed
                    }
                    showGlobalLocationSheet = false
                }
            )
        }
    }
}
