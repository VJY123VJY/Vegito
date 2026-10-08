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
import android.app.Activity
import android.util.Log
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.firebase.auth.PhoneAuthProvider
import com.vegito.app.BuildConfig
import com.vegito.app.data.auth.FirebaseAuthManager
import com.vegito.app.data.local.SessionManager
import com.vegito.app.data.demo.DemoOrderRunner
import com.vegito.app.data.model.*
import com.vegito.app.data.remote.RetrofitClient
import com.vegito.app.data.repository.VegitoRepository
import com.vegito.app.presentation.admin.*
import com.vegito.app.presentation.auth.*
import com.vegito.app.presentation.b2b.B2BBulkScreen
import com.vegito.app.presentation.customer.*
import com.vegito.app.presentation.delivery.*
import com.vegito.app.presentation.devtools.DemoOrderScreen
import com.vegito.app.presentation.devtools.DemoOrderViewModel
import com.vegito.app.presentation.devtools.DemoOrderViewModelFactory
import com.vegito.app.navigation.Routes
import com.vegito.app.navigation.RoleNavigation
import com.vegito.app.utils.LocationHelper
import com.vegito.app.utils.LocationResult
import com.vegito.app.presentation.seller.*
import com.vegito.app.ui.components.BottomNavBar
import com.vegito.app.ui.components.LocationSelectionBottomSheet
import com.vegito.app.ui.components.TopBar
import com.vegito.app.ui.theme.VegitoPrimary
import com.vegito.app.ui.theme.VegitoTheme
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import kotlin.math.abs

@Composable
fun VegitoApp() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }
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
    var searchProductsList by remember { mutableStateOf<List<Product>?>(null) }
    var searchCatalogError by remember { mutableStateOf<String?>(null) }
    var isCatalogLoading by remember { mutableStateOf(true) }
    var catalogError by remember { mutableStateOf<String?>(null) }
    var catalogEmptyMessage by remember { mutableStateOf<String?>(null) }
    var pendingProductForCart by remember { mutableStateOf<Product?>(null) }
    var pendingQuantityForCart by remember { mutableStateOf(1.0) }

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

    val catalogLocation = selectedAddress?.takeIf {
        LocationHelper.isValidCoordinates(it.latitude, it.longitude)
    }

    LaunchedEffect(token, activeRole, catalogLocation) {
        isCatalogLoading = true
        catalogError = null
        catalogEmptyMessage = null
        val lat = catalogLocation?.latitude
        val lon = catalogLocation?.longitude
        when (val result = repository.getProductCatalog(latitude = lat, longitude = lon)) {
            is VegitoRepository.CatalogResult.Success -> {
                productsList = result.products
                catalogEmptyMessage = if (result.totalCount == 0) {
                    if (lat != null && lon != null) {
                        "No Vegito sellers are currently within your 20 KM delivery area. Try selecting another address."
                    } else {
                        "Vegito's product API currently has no products. Vegetables and fruits will appear here when sellers publish their real catalog."
                    }
                } else {
                    null
                }
                Log.i(
                    "VegitoCatalog",
                    "Loaded ${result.products.size} parsed products for location ($lat, $lon) (${result.totalCount} total across ${result.pageCount} pages)"
                )
            }
            is VegitoRepository.CatalogResult.Failure -> {
                productsList = emptyList()
                catalogError = result.message
                Log.w(
                    "VegitoCatalog",
                    "Catalog fetch failed: HTTP ${result.httpStatus ?: "unavailable"}"
                )
            }
        }
        isCatalogLoading = false
    }

    // Load shared catalog data and refresh every user-scoped cache on account changes.
    LaunchedEffect(token, activeRole) {
        favoriteProductIds = emptySet()
        notificationsList = emptyList()
        savedAddressesList = emptyList()
        customerOrdersList = emptyList()

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
            customerOrdersList = cOrders

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
        } else {
            sessionManager.clearSelectedAddress()
        }
    }

    fun handleToggleFavorite(product: Product) {
        val prodIdInt = product.id.toIntOrNull() ?: return
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
        return CartSummary(
            items = items,
            subtotal = sub,
            grandTotal = sub
        )
    }

    var cartSummary by remember { mutableStateOf(recalculateCart(emptyList())) }
    var cartOwnerId by remember { mutableStateOf(sessionManager.getUser()?.id) }

    fun applyServerCart(serverCart: CartReadDto) {
        val summary = serverCart.toDomainSummary(productsList)
        cartItems = summary.items
        cartSummary = summary
    }

    LaunchedEffect(token, activeRole, productsList) {
        val currentOwnerId = sessionManager.getUser()?.id
        if (currentOwnerId != cartOwnerId) {
            cartItems = emptyList()
            cartSummary = CartSummary()
            cartOwnerId = currentOwnerId
        }
        if (token != null && activeRole.equals("customer", ignoreCase = true)) {
            when (val result = repository.getCart()) {
                is VegitoRepository.CartResult.Success -> applyServerCart(result.cart)
                is VegitoRepository.CartResult.Failure -> snackbarHostState.showSnackbar(result.message)
            }
        } else if (token == null) {
            cartItems = emptyList()
            cartSummary = CartSummary()
        }
    }

    fun addProductToCart(product: Product, qty: Double = 1.0) {
        val sellerProductId = product.sellerProductId.toIntOrNull()
        if (sellerProductId == null || product.price <= 0.0 || product.stockQuantity <= 0.0) {
            scope.launch {
                snackbarHostState.showSnackbar("${product.name} is currently unavailable.")
            }
            return
        }
        scope.launch {
            when (val result = repository.addCartItem(sellerProductId, qty)) {
                is VegitoRepository.CartResult.Success -> {
                    applyServerCart(result.cart)
                    snackbarHostState.showSnackbar("${product.name} added to your basket.")
                }
                is VegitoRepository.CartResult.Failure -> snackbarHostState.showSnackbar(result.message)
            }
        }
    }

    fun updateCartItemQuantity(cartItemId: String, newQty: Double) {
        val itemId = cartItemId.toIntOrNull()
        if (itemId == null) {
            scope.launch { snackbarHostState.showSnackbar("This basket item could not be updated. Please refresh your basket.") }
            return
        }
        scope.launch {
            val result = if (newQty <= 0.0) {
                repository.removeCartItem(itemId)
            } else {
                repository.updateCartItem(itemId, newQty)
            }
            when (result) {
                is VegitoRepository.CartResult.Success -> applyServerCart(result.cart)
                is VegitoRepository.CartResult.Failure -> snackbarHostState.showSnackbar(result.message)
            }
        }
    }

    fun updateProductQuantity(productId: String, newQty: Double) {
        val item = cartItems.firstOrNull { it.product.id == productId } ?: return
        updateCartItemQuantity(item.id, newQty)
    }

    var pendingPhoneForOtp by remember { mutableStateOf("") }
    var pendingRoleForOtp by remember { mutableStateOf("customer") }
    var pendingVerificationId by remember { mutableStateOf<String?>(null) }
    var pendingResendToken by remember { mutableStateOf<PhoneAuthProvider.ForceResendingToken?>(null) }
    var pendingRegistrationData by remember { mutableStateOf<UnifiedRegisterRequestDto?>(null) }
    var authDevOtp by remember { mutableStateOf<String?>(null) }
    var isAuthLoading by remember { mutableStateOf(false) }
    var authErrorMessage by remember { mutableStateOf<String?>(null) }
    var selectedProductForDetail by remember { mutableStateOf<Product?>(null) }
    var selectedCategoryForSearch by remember { mutableStateOf<String?>(null) }
    var activeOrder by remember { mutableStateOf<Order?>(null) }
    var previousCustomerId by remember { mutableStateOf(sessionManager.getUser()?.id) }

    fun completeFirebaseBackendLogin(firebaseIdToken: String, desiredRole: String?) {
        scope.launch {
            isAuthLoading = true
            authErrorMessage = null
            when (val loginRes = repository.loginWithFirebase(firebaseIdToken, desiredRole)) {
                is VegitoRepository.AuthResult.Success -> {
                    isAuthLoading = false
                    val tokenData = loginRes.data
                    sessionManager.saveTokenResponse(tokenData)
                    pendingRegistrationData = null
                    pendingVerificationId = null
                    pendingResendToken = null

                    val resolvedRole = tokenData.role.lowercase()
                    if (pendingProductForCart != null && resolvedRole == "customer") {
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
                    authErrorMessage = loginRes.message
                }
            }
        }
    }

    fun completeBackendOtpLogin(tokenData: TokenResponseDto) {
        isAuthLoading = false
        sessionManager.saveTokenResponse(tokenData)
        pendingRegistrationData = null
        pendingVerificationId = null
        pendingResendToken = null

        val resolvedRole = tokenData.role.lowercase()
        if (pendingProductForCart != null && resolvedRole == "customer") {
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

    fun triggerFirebaseSendOtp(phone: String, role: String, isResend: Boolean = false) {
        val act = context as? Activity
        if (act == null) {
            authErrorMessage = "Activity context is unavailable. Please restart app."
            return
        }
        val normalized = FirebaseAuthManager.normalizePhoneNumber(phone)
        if (normalized == null) {
            authErrorMessage = "Enter a valid 10-digit mobile number."
            return
        }
        isAuthLoading = true
        authErrorMessage = null
        pendingPhoneForOtp = phone
        pendingRoleForOtp = role

        FirebaseAuthManager.sendVerificationCode(
            activity = act,
            phoneNumberE164 = normalized,
            resendToken = if (isResend) pendingResendToken else null,
            onCodeSent = { verificationId, token ->
                isAuthLoading = false
                pendingVerificationId = verificationId
                pendingResendToken = token
                if (!isResend) {
                    navController.navigate("otp")
                }
            },
            onInstantVerified = { idToken ->
                completeFirebaseBackendLogin(idToken, role)
            },
            onError = { firebaseErrorMsg ->
                isAuthLoading = false
                authErrorMessage = firebaseErrorMsg
            }
        )
    }

    LaunchedEffect(token, activeRole) {
        val currentCustomerId = sessionManager.getUser()?.id
        if (currentCustomerId != previousCustomerId || token == null) {
            activeOrder = null
            customerOrdersList = emptyList()
            searchProductsList = null
            previousCustomerId = currentCustomerId
        }
    }

    var showAuthPromptDialog by remember { mutableStateOf(false) }

    fun handleAddToCart(product: Product, qty: Double = 1.0) {
        if (token != null) {
            addProductToCart(product, qty)
        } else {
            pendingProductForCart = product
            pendingQuantityForCart = qty
            showAuthPromptDialog = true
        }
    }

    fun performLogout() {
        FirebaseAuthManager.signOut()
        sessionManager.clearSession()
        sessionManager.clearSelectedAddress()
        cartItems = emptyList()
        cartSummary = CartSummary()
        customerOrdersList = emptyList()
        savedAddressesList = emptyList()
        favoriteProductIds = emptySet()
        notificationsList = emptyList()
        activeOrder = null
        sellerProfile = null
        sellerOrdersList = emptyList()
        sellerRevenueData = emptyList()
        sellerTopProducts = emptyList()
        sellerBulkOrdersList = emptyList()
        deliveryTasksList = emptyList()
        deliveryProfileDto = null
        activeDeliveryTaskForMap = null
        adminSellersList = emptyList()
        adminDeliveryPartnersList = emptyList()
        pendingVerificationId = null
        pendingResendToken = null
        navController.navigate("login") {
            popUpTo(0) { inclusive = true }
        }
    }

    fun handleSwitchWorkspace(targetRole: String) {
        scope.launch {
            val tokenRes = repository.switchWorkspace(targetRole)
            if (tokenRes != null) {
                sessionManager.saveTokenResponse(tokenRes)
            } else {
                sessionManager.saveActiveRole(targetRole.lowercase())
            }
            sellerProfile = null
            sellerOrdersList = emptyList()
            sellerRevenueData = emptyList()
            sellerTopProducts = emptyList()
            sellerBulkOrdersList = emptyList()
            deliveryTasksList = emptyList()
            deliveryProfileDto = null
            activeDeliveryTaskForMap = null

            val dest = RoleNavigation.getDestinationForRole(targetRole)
            navController.navigate(dest) {
                popUpTo(0) { inclusive = true }
            }
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
            snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
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
                startDestination = if (token != null && FirebaseAuthManager.auth.currentUser != null) {
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
                        onCreateAccount = {
                            pendingRoleForOtp = "customer"
                            navController.navigate("register")
                        },
                        onStartShopping = {
                            pendingRoleForOtp = "customer"
                            navController.navigate("register")
                        },
                        onLogin = { navController.navigate("login") },
                        onSellOnVegito = {
                            pendingRoleForOtp = "seller"
                            navController.navigate("register")
                        },
                        onDeliverWithVegito = {
                            pendingRoleForOtp = "delivery_partner"
                            navController.navigate("register")
                        }
                    )
                }

                composable("location_setup") {
                    LocationSetupScreen(
                        onLocationConfirmed = { savedAddress ->
                            val saved = repository.saveAddress(
                                AddressCreateDto(
                                    addressLine1 = savedAddress.addressLine,
                                    city = savedAddress.city,
                                    state = savedAddress.state,
                                    pincode = savedAddress.pincode,
                                    latitude = savedAddress.latitude,
                                    longitude = savedAddress.longitude,
                                    landmark = savedAddress.landmark,
                                    isDefault = true
                                )
                            )
                            val selected = saved?.copy(
                                capturedAsCurrentLocation = savedAddress.capturedAsCurrentLocation
                            )
                            if (selected != null) {
                                sessionManager.saveSelectedAddress(selected)
                                savedAddressesList = repository.getUserAddresses()
                                navController.navigate("customer_home") {
                                    popUpTo("onboarding") { inclusive = true }
                                 }
                            }
                            selected
                        },
                        onSkip = {
                            navController.navigate("customer_home") {
                                popUpTo("onboarding") { inclusive = true }
                            }
                        }
                    )
                }

                val handleRegisterFormSubmitted: (UnifiedRegisterRequestDto) -> Unit = { reqDto ->
                    authErrorMessage = null
                    pendingRegistrationData = reqDto
                    pendingPhoneForOtp = reqDto.phone
                    pendingRoleForOtp = reqDto.role.lowercase()
                    triggerFirebaseSendOtp(reqDto.phone, reqDto.role.lowercase())
                }

                composable("login") {
                    LoginScreen(
                        initialRole = pendingRoleForOtp,
                        isLoading = isAuthLoading,
                        errorMessage = authErrorMessage,
                        onSendOtp = { phone, role ->
                            pendingPhoneForOtp = phone
                            pendingRoleForOtp = role
                            pendingRegistrationData = null
                            authErrorMessage = null
                            triggerFirebaseSendOtp(phone, role)
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
                            authErrorMessage = null
                            navController.navigate("register")
                        },
                        onNavigateRegisterWithRole = { role ->
                            authErrorMessage = null
                            pendingRoleForOtp = role
                            navController.navigate("register")
                        }
                    )
                }

                composable("register") {
                    RegisterScreen(
                        initialRole = pendingRoleForOtp,
                        isLoading = isAuthLoading,
                        errorMessage = authErrorMessage,
                        onContinueToOtp = handleRegisterFormSubmitted,
                        onNavigateLogin = {
                            authErrorMessage = null
                            navController.navigate("login") {
                                popUpTo("register") { inclusive = true }
                            }
                        }
                    )
                }

                composable("otp") {
                    OtpScreen(
                        phone = pendingPhoneForOtp,
                        role = pendingRoleForOtp,
                        isLoading = isAuthLoading,
                        errorMessage = authErrorMessage,
                        onChangeNumber = {
                            authErrorMessage = null
                            navController.popBackStack()
                        },
                        onResendOtp = {
                            authErrorMessage = null
                            triggerFirebaseSendOtp(pendingPhoneForOtp, pendingRoleForOtp, isResend = true)
                        },
                        onVerifyOtp = { otpCode ->
                            val vId = pendingVerificationId
                            if (vId.isNullOrBlank()) {
                                authErrorMessage = "Verification session expired. Please request a new OTP."
                                return@OtpScreen
                            }
                            isAuthLoading = true
                            authErrorMessage = null
                            scope.launch {
                                if (vId == "BACKEND_OTP_FALLBACK") {
                                    when (val verifyRes = repository.verifyOtp(pendingPhoneForOtp, otpCode, pendingRoleForOtp)) {
                                        is VegitoRepository.AuthResult.Success -> {
                                            completeBackendOtpLogin(verifyRes.data)
                                        }
                                        is VegitoRepository.AuthResult.Failure -> {
                                            isAuthLoading = false
                                            authErrorMessage = verifyRes.message
                                        }
                                    }
                                } else {
                                    when (val verifyResult = FirebaseAuthManager.verifyOtpAndGetIdToken(vId, otpCode)) {
                                        is FirebaseAuthManager.VerifyOtpResult.Success -> {
                                            val regData = pendingRegistrationData
                                            if (regData != null) {
                                                when (val regRes = repository.registerUser(regData)) {
                                                    is VegitoRepository.AuthResult.Success -> {
                                                        completeFirebaseBackendLogin(verifyResult.firebaseIdToken, pendingRoleForOtp)
                                                    }
                                                    is VegitoRepository.AuthResult.Failure -> {
                                                        if (regRes.message.contains("already registered", ignoreCase = true)) {
                                                            completeFirebaseBackendLogin(verifyResult.firebaseIdToken, pendingRoleForOtp)
                                                        } else {
                                                            isAuthLoading = false
                                                            authErrorMessage = regRes.message
                                                        }
                                                    }
                                                }
                                            } else {
                                                completeFirebaseBackendLogin(verifyResult.firebaseIdToken, pendingRoleForOtp)
                                            }
                                        }
                                        is FirebaseAuthManager.VerifyOtpResult.Error -> {
                                            isAuthLoading = false
                                            authErrorMessage = verifyResult.message
                                        }
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
                        isLoadingCatalog = isCatalogLoading,
                        catalogError = catalogError,
                        catalogEmptyMessage = catalogEmptyMessage,
                        cartItemQuantities = cartItems.associate { it.product.id to it.quantity },
                        onRetryCatalog = {
                            scope.launch {
                                isCatalogLoading = true
                                catalogError = null
                                catalogEmptyMessage = null
                                val lat = catalogLocation?.latitude
                                val lon = catalogLocation?.longitude
                                when (val result = repository.getProductCatalog(latitude = lat, longitude = lon)) {
                                    is VegitoRepository.CatalogResult.Success -> {
                                        productsList = result.products
                                        catalogEmptyMessage = if (result.totalCount == 0) {
                                            if (lat != null && lon != null) {
                                                "No Vegito sellers are currently within your 20 KM delivery area. Try selecting another address."
                                            } else {
                                                "Vegito's product API currently has no products. Vegetables and fruits will appear here when sellers publish their real catalog."
                                            }
                                        } else {
                                            null
                                        }
                                        Log.i(
                                            "VegitoCatalog",
                                            "Retry loaded ${result.products.size} parsed products " +
                                                "(${result.totalCount} total)"
                                        )
                                    }
                                    is VegitoRepository.CatalogResult.Failure -> {
                                        productsList = emptyList()
                                        catalogError = result.message
                                        Log.w(
                                            "VegitoCatalog",
                                            "Retry failed: HTTP ${result.httpStatus ?: "unavailable"}"
                                        )
                                    }
                                }
                                isCatalogLoading = false
                            }
                        },
                        onCategoryClick = {
                            selectedCategoryForSearch = it.name
                            searchProductsList = emptyList()
                            searchCatalogError = null
                            scope.launch {
                                val categoryId = it.id.toIntOrNull()
                                when (val result = repository.getProductCatalog(
                                    categoryId = categoryId,
                                    categoryName = it.name.takeIf { category -> categoryId == null },
                                    latitude = catalogLocation?.latitude,
                                    longitude = catalogLocation?.longitude
                                )) {
                                    is VegitoRepository.CatalogResult.Success -> {
                                        searchProductsList = result.products
                                    }
                                    is VegitoRepository.CatalogResult.Failure -> {
                                        searchProductsList = emptyList()
                                        searchCatalogError = result.message
                                    }
                                }
                            }
                            navController.navigate("customer_search")
                        },
                        onProductClick = { prod ->
                            selectedProductForDetail = prod
                            navController.navigate("product_detail")
                        },
                        onAddToCart = { prod ->
                            handleAddToCart(prod, 1.0)
                        },
                        onUpdateQuantity = { prod, newQty ->
                            updateProductQuantity(prod.id, newQty)
                        },
                        onToggleFavorite = { prod ->
                            handleToggleFavorite(prod)
                        },
                        onOfferClick = { offer ->
                            val matched = availableProducts.find { it.id == offer.productId }
                            if (matched != null) {
                                selectedProductForDetail = matched
                                navController.navigate("product_detail")
                            } else {
                                scope.launch {
                                    snackbarHostState.showSnackbar("This offer is not linked to an available product.")
                                }
                            }
                        },
                        onQuickAddOffer = { offer ->
                            val matched = availableProducts.find { it.id == offer.productId }
                            if (matched?.isPurchasable == true) {
                                handleAddToCart(matched, 1.0)
                            } else {
                                scope.launch {
                                    snackbarHostState.showSnackbar("This offer is not linked to an available product.")
                                }
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
                        products = searchProductsList ?: productsList,
                        initialCategory = selectedCategoryForSearch,
                        onProductClick = {
                            selectedProductForDetail = it
                            navController.navigate("product_detail")
                        },
                        onAddToCart = { prod -> handleAddToCart(prod, 1.0) },
                        onToggleFavorite = { prod -> handleToggleFavorite(prod) },
                        onSearchQueryChange = { query ->
                            scope.launch {
                                val categoryId = categoriesList
                                    .firstOrNull { it.name.equals(selectedCategoryForSearch, ignoreCase = true) }
                                    ?.id
                                    ?.toIntOrNull()
                                when (val result = repository.getProductCatalog(
                                    categoryId = categoryId,
                                    categoryName = selectedCategoryForSearch.takeIf {
                                        !it.isNullOrBlank() && categoryId == null
                                    },
                                    search = query.takeIf(String::isNotBlank)
                                )) {
                                    is VegitoRepository.CatalogResult.Success -> {
                                        searchProductsList = result.products
                                        searchCatalogError = null
                                    }
                                    is VegitoRepository.CatalogResult.Failure -> {
                                        searchProductsList = emptyList()
                                        searchCatalogError = result.message
                                    }
                                }
                            }
                        },
                        searchError = searchCatalogError
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
                        onUpdateQuantity = { prod, qty -> updateProductQuantity(prod.id, qty) },
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
                        onUpdateQuantity = { id, qty -> updateCartItemQuantity(id, qty) },
                        onRemoveItem = { id -> updateCartItemQuantity(id, 0.0) },
                        onProceedToCheckout = { navController.navigate("customer_checkout") },
                        onBrowseProducts = { navController.navigate("customer_home") }
                    )
                }

                composable("customer_checkout") {
                    CheckoutScreen(
                        cart = cartSummary,
                        selectedAddress = selectedAddress,
                        savedAddresses = savedAddressesList,
                        onBack = { navController.popBackStack() },
                        onSavedAddressSelected = { address ->
                            sessionManager.saveSelectedAddress(address)
                        },
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
                            val selected = saved?.copy(
                                capturedAsCurrentLocation = updatedAddress.capturedAsCurrentLocation
                            )
                            if (selected != null) {
                                sessionManager.saveSelectedAddress(selected)
                                savedAddressesList = repository.getUserAddresses()
                            }
                            selected
                        },
                        onRefreshCurrentLocation = {
                            when (val result = LocationHelper.getFreshLocation(
                                context = context,
                                allowApproximate = true
                            )) {
                                is LocationResult.Success -> {
                                    val saved = repository.saveAddress(
                                        AddressCreateDto(
                                            addressLine1 = result.addressLine,
                                            city = result.city,
                                            state = result.state,
                                            pincode = result.pincode,
                                            latitude = result.latitude,
                                            longitude = result.longitude,
                                            isDefault = true
                                        )
                                    )
                                    val selected = saved?.copy(capturedAsCurrentLocation = true)
                                    if (selected != null) {
                                        sessionManager.saveSelectedAddress(selected)
                                        savedAddressesList = repository.getUserAddresses()
                                    }
                                    selected
                                }
                                else -> null
                            }
                        },
                        onCheckDeliveryEligibility = { addr ->
                            val addrId = addr.id.toIntOrNull()
                            if (addrId == null) null else repository.checkDeliveryEligibility(addrId)
                        },
                        onPlaceOrder = { method, checkoutAddress ->
                            val addrId = checkoutAddress.id.toIntOrNull()
                            if (addrId == null ||
                                !LocationHelper.isValidCoordinates(checkoutAddress.latitude, checkoutAddress.longitude)
                            ) {
                                false
                            } else {
                                val serverOrder = repository.createOrder(
                                    addressId = addrId,
                                    paymentMethod = method
                                )
                                if (serverOrder == null) {
                                    false
                                } else {
                                    activeOrder = Order(
                                        id = serverOrder.id.toString(),
                                        orderNumber = serverOrder.orderNumber,
                                        status = serverOrder.status,
                                        totalAmount = serverOrder.totalAmount,
                                        deliveryFee = serverOrder.deliveryCharge,
                                        deliveryAddress = checkoutAddress,
                                        sellerName = serverOrder.shopName.orEmpty(),
                                        sellerLat = serverOrder.shopLatitude,
                                        sellerLng = serverOrder.shopLongitude,
                                        customerOtp = serverOrder.deliveryOtp.orEmpty(),
                                        pickupOtp = serverOrder.pickupOtp
                                    )
                                    cartItems = emptyList()
                                    cartSummary = CartSummary()
                                    customerOrdersList = repository.getCustomerOrders().map { it.toDomainOrder() }
                                    navController.navigate("customer_tracking") {
                                        popUpTo("customer_home")
                                    }
                                    true
                                }
                            }
                        }
                    )
                }

                composable("customer_orders") {
                    val ordersToShow = customerOrdersList.ifEmpty { listOfNotNull(activeOrder) }

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
                                customerOrdersList = refreshed
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
                    val ordToTrack = activeOrder ?: customerOrdersList.firstOrNull()
                    if (ordToTrack == null) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("No genuine order is available to track.")
                        }
                    } else OrderTrackingScreen(
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
                        onNavigateDeveloperTools = { navController.navigate(Routes.DEVELOPER_TOOLS) },
                        onSwitchRole = { newRole -> handleSwitchWorkspace(newRole) },
                        onLogout = { performLogout() }
                    )
                }

                composable(Routes.DEVELOPER_TOOLS) {
                    if (BuildConfig.DEBUG) {
                        val demoRunner = remember(repository, sessionManager) {
                            DemoOrderRunner(repository, sessionManager)
                        }
                        val factory = remember(demoRunner) { DemoOrderViewModelFactory(demoRunner) }
                        val demoViewModel: DemoOrderViewModel = viewModel(factory = factory)
                        DemoOrderScreen(viewModel = demoViewModel)
                    } else {
                        Text("Developer tools are available only in debug builds.")
                    }
                }

                // SELLER WORKSPACE
                composable("seller_dashboard") {
                    LaunchedEffect(token, currentRoute) {
                        if (token != null) {
                            val st = repository.getSellerDashboardStats()
                            if (st != null) sellerStats = st
                            val sOrders = repository.getSellerOrders()
                            sellerOrdersList = sOrders
                        }
                    }
                    SellerDashboardScreen(
                        stats = sellerStats,
                        storeName = sellerProfile?.businessName ?: "Shree Ganesh Store",
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
                        onLogout = { performLogout() }
                    )
                }

                composable("seller_orders") {
                    LaunchedEffect(token, currentRoute) {
                        if (token != null) {
                            sellerOrdersList = repository.getSellerOrders()
                            while (currentRoute == "seller_orders") {
                                delay(10_000L)
                                sellerOrdersList = repository.getSellerOrders()
                            }
                        }
                    }
                    SellerOrdersScreen(
                        orders = sellerOrdersList,
                        onBack = {
                            if (!navController.popBackStack()) {
                                navController.navigate("seller_dashboard")
                            }
                        },
                        onUpdateStatus = { id, st ->
                            val idInt = id.toIntOrNull()
                            if (idInt == null) {
                                scope.launch { snackbarHostState.showSnackbar("This order could not be updated. Please refresh and try again.") }
                            } else {
                                scope.launch {
                                    val ok = repository.updateOrderStatus(idInt, st)
                                    if (ok) {
                                        sellerOrdersList = repository.getSellerOrders()
                                        val statsRes = repository.getSellerDashboardStats()
                                        if (statsRes != null) sellerStats = statsRes
                                    }
                                }
                            }
                        },
                        onVerifyPickupOtp = { id, otp ->
                            val idInt = id.toIntOrNull()
                            if (idInt == null) {
                                scope.launch { snackbarHostState.showSnackbar("This order could not be verified. Please refresh and try again.") }
                            } else {
                                scope.launch {
                                    val ok = repository.verifyPickupOtp(idInt, otp)
                                    if (ok) {
                                        sellerOrdersList = repository.getSellerOrders()
                                        val statsRes = repository.getSellerDashboardStats()
                                        if (statsRes != null) sellerStats = statsRes
                                    }
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
                        onSwitchRole = { newRole -> handleSwitchWorkspace(newRole) },
                        onLogout = { performLogout() }
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
                                if (updatedDto == null) {
                                    repository.getSellerProfile()?.let { sellerProfile = it }
                                    snackbarHostState.showSnackbar("Couldn't save the shop location. Please try again.")
                                    return@launch
                                }

                                val verifiedDto = repository.getSellerProfile()
                                sellerProfile = verifiedDto ?: updatedDto
                                if (verifiedDto == null) {
                                    snackbarHostState.showSnackbar(
                                        "Location was submitted, but the saved coordinates could not be rechecked."
                                    )
                                    return@launch
                                }

                                val coordinatesMatch =
                                    verifiedDto.latitude != null &&
                                        verifiedDto.longitude != null &&
                                        abs(verifiedDto.latitude - lat) <= 0.000001 &&
                                        abs(verifiedDto.longitude - lng) <= 0.000001
                                snackbarHostState.showSnackbar(
                                    if (coordinatesMatch) {
                                        "Shop location saved and verified."
                                    } else {
                                        "The server returned different shop coordinates. Review the saved location before taking orders."
                                    }
                                )
                            }
                        },
                        onLogout = { performLogout() }
                    )
                }

                // DELIVERY WORKSPACE
                composable("delivery_dashboard") {
                    LaunchedEffect(token, currentRoute) {
                        if (token != null) {
                            deliveryTasksList = repository.getDeliveryTasks()
                            val earn = repository.getDeliveryEarnings()
                            if (earn != null) deliveryEarningsData = earn
                        }
                    }
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
                    LaunchedEffect(token, currentRoute) {
                        if (token != null) {
                            deliveryTasksList = repository.getDeliveryTasks()
                        }
                    }
                    DeliveryTaskScreen(
                        tasks = deliveryTasksList,
                        onAcceptTask = { taskId ->
                            scope.launch {
                                repository.acceptDeliveryTask(taskId)
                                deliveryTasksList = repository.getDeliveryTasks()
                            }
                        },
                        onVerifyPickupOtp = { taskId, otp ->
                            scope.launch {
                                repository.verifyDeliverySellerOtp(taskId, otp)
                                deliveryTasksList = repository.getDeliveryTasks()
                            }
                        },
                        onVerifyCustomerOtp = { taskId, otp ->
                            scope.launch {
                                repository.verifyDeliveryCustomerOtp(taskId, otp)
                                deliveryTasksList = repository.getDeliveryTasks()
                            }
                        },
                        onNavigateMap = { taskId ->
                            activeDeliveryTaskForMap = deliveryTasksList.find { it.id == taskId }
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
                        onSwitchRole = { newRole -> handleSwitchWorkspace(newRole) },
                        onLogout = { performLogout() }
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
                        onLogout = { performLogout() }
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
                        orders = customerOrdersList,
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
                    scope.launch {
                        val saved = repository.saveAddress(
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
                        if (saved != null) {
                            sessionManager.saveSelectedAddress(saved)
                            savedAddressesList = repository.getUserAddresses()
                        }
                    }
                    showGlobalLocationSheet = false
                }
            )
        }
    }
}
