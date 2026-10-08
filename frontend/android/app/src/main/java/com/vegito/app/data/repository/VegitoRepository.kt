package com.vegito.app.data.repository

import android.util.Log
import com.google.gson.JsonParseException
import com.google.gson.JsonParser
import com.vegito.app.data.model.*
import com.vegito.app.data.remote.VegitoApiService
import java.io.IOException
import kotlinx.coroutines.CancellationException
import retrofit2.Response

class VegitoRepository(private val apiService: VegitoApiService) {
    companion object {
        private const val TAG = "VegitoRepository"
    }

    sealed interface AuthResult<out T> {
        data class Success<T>(val data: T) : AuthResult<T>
        data class Failure(val message: String) : AuthResult<Nothing>
    }

    sealed interface CartResult {
        data class Success(val cart: CartReadDto) : CartResult
        data class Failure(val message: String) : CartResult
    }

    sealed interface CatalogResult {
        data class Success(
            val products: List<Product>,
            val totalCount: Int,
            val pageCount: Int
        ) : CatalogResult

        data class Failure(val httpStatus: Int?, val message: String) : CatalogResult
    }

    sealed interface DemoSessionResult {
        data class Authenticated(val user: UserProfile) : DemoSessionResult
        data class Failure(val httpStatus: Int?, val message: String) : DemoSessionResult
    }

    suspend fun verifyDemoSession(): DemoSessionResult {
        return try {
            val response = apiService.getProfile()
            val body = response.body()
            if (response.isSuccessful && body?.success == true && body.data != null) {
                DemoSessionResult.Authenticated(body.data)
            } else {
                val backendMessage = body?.error?.message
                    ?: body?.message
                    ?: parseBackendMessage(response.errorBody()?.string())
                DemoSessionResult.Failure(
                    httpStatus = response.code(),
                    message = backendMessage ?: "Session verification failed (HTTP ${response.code()})."
                )
            }
        } catch (error: CancellationException) {
            throw error
        } catch (error: IOException) {
            Log.w(TAG, "Demo session verification failed (${error.javaClass.simpleName})")
            DemoSessionResult.Failure(null, "Unable to reach the configured Vegito API.")
        } catch (error: JsonParseException) {
            Log.e(TAG, "Demo session response parsing failed (${error.javaClass.simpleName})")
            DemoSessionResult.Failure(null, "The API returned an invalid session response.")
        }
    }

    private suspend fun <T : Any> authRequest(
        call: suspend () -> Response<ApiResponse<T>>
    ): AuthResult<T> {
        return try {
            val response = call()
            val body = response.body()
            if (response.isSuccessful && body?.success == true) {
                body.data?.let { AuthResult.Success(it) }
                    ?: AuthResult.Failure("Authentication service returned an invalid response.")
            } else {
                val errorBody = response.errorBody()?.string()
                AuthResult.Failure(authErrorMessage(response.code(), errorBody))
            }
        } catch (error: IOException) {
            Log.w(TAG, "Authentication request failed (${error.javaClass.simpleName})")
            AuthResult.Failure("Unable to reach Vegito. Check your internet connection.")
        } catch (error: JsonParseException) {
            Log.e(TAG, "Authentication response parsing failed (${error.javaClass.simpleName})")
            AuthResult.Failure("Vegito returned an unexpected response. Please try again.")
        }
    }

    private fun authErrorMessage(statusCode: Int, responseBody: String?): String {
        val backendMessage = parseBackendMessage(responseBody)
        if (!backendMessage.isNullOrBlank()) {
            return backendMessage
        }
        return when (statusCode) {
            400, 422 -> "Please check the entered information and try again."
            401 -> "Invalid credentials or verification code. Please try again."
            403 -> "You are not authorized for this account role."
            404 -> "Account not found with this mobile number. Please register first."
            409 -> "This mobile number is already registered. Please sign in."
            429 -> "Too many attempts. Please wait a minute before requesting another code."
            503 -> "Verification service is temporarily unavailable. Please try again."
            in 500..599 -> "Vegito server is temporarily busy. Please try again in a moment."
            else -> "Request failed (HTTP $statusCode). Please try again."
        }
    }

    private fun parseBackendMessage(responseBody: String?): String? {
        if (responseBody.isNullOrBlank()) return null
        return try {
            val root = JsonParser.parseString(responseBody)
            if (!root.isJsonObject) return null
            val json = root.asJsonObject

            // 1. Check "error.message"
            val error = json.get("error")
            if (error?.isJsonObject == true) {
                val message = error.asJsonObject.get("message")
                if (message?.isJsonPrimitive == true && message.asJsonPrimitive.isString) {
                    val str = message.asString.trim()
                    if (str.isNotEmpty()) return str
                }
            }

            // 2. Check root "message"
            val rootMsg = json.get("message")
            if (rootMsg?.isJsonPrimitive == true && rootMsg.asJsonPrimitive.isString) {
                val str = rootMsg.asString.trim()
                if (str.isNotEmpty()) return str
            }

            // 3. Check "detail" (string or array)
            val detail = json.get("detail")
            if (detail?.isJsonPrimitive == true && detail.asJsonPrimitive.isString) {
                val str = detail.asString.trim()
                if (str.isNotEmpty()) return str
            } else if (detail?.isJsonArray == true && detail.asJsonArray.size() > 0) {
                val firstErr = detail.asJsonArray.get(0)
                if (firstErr.isJsonObject) {
                    val msg = firstErr.asJsonObject.get("msg")
                    if (msg?.isJsonPrimitive == true && msg.asJsonPrimitive.isString) {
                        return msg.asString
                    }
                }
            }
            null
        } catch (error: Exception) {
            Log.w(TAG, "Authentication error response parsing failed (${error.javaClass.simpleName})")
            null
        }
    }

    // AUTHENTICATION
    suspend fun loginWithFirebase(
        firebaseIdToken: String,
        role: String? = null
    ): AuthResult<TokenResponseDto> {
        return authRequest {
            apiService.loginWithFirebase(
                bearerToken = "Bearer $firebaseIdToken",
                request = FirebaseLoginRequestDto(role = role)
            )
        }
    }

    suspend fun sendOtp(phone: String, role: String? = null): AuthResult<SendOtpResponseDto> {
        val req = OtpRequest(phone = phone, role = role)
        return authRequest {
            when (role?.uppercase()) {
                "CUSTOMER" -> apiService.sendCustomerOtp(req)
                "SELLER" -> apiService.sendSellerOtp(req)
                "DELIVERY_PARTNER", "DELIVERY" -> apiService.sendDeliveryOtp(req)
                else -> apiService.sendOtp(req)
            }
        }
    }

    suspend fun verifyOtp(
        phone: String,
        otp: String,
        role: String? = null,
        name: String? = null
    ): AuthResult<TokenResponseDto> {
        val req = OtpVerifyRequest(phone = phone, otp = otp, role = role, name = name)
        return authRequest {
            when (role?.uppercase()) {
                "CUSTOMER" -> apiService.verifyCustomerOtp(req)
                "SELLER" -> apiService.verifySellerOtp(req)
                "DELIVERY_PARTNER", "DELIVERY" -> apiService.verifyDeliveryOtp(req)
                else -> apiService.verifyOtp(req)
            }
        }
    }

    suspend fun switchWorkspace(targetRole: String): TokenResponseDto? {
        return try {
            val response = apiService.switchWorkspace(SwitchWorkspaceDto(targetRole = targetRole.uppercase()))
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "switchWorkspace error: ${e.message}")
            null
        }
    }

    suspend fun registerUser(dto: UnifiedRegisterRequestDto): AuthResult<RegisterResponseDto> =
        authRequest { apiService.registerUser(dto) }

    suspend fun loginWithPassword(
        phone: String,
        pass: String,
        role: String? = null
    ): AuthResult<TokenResponseDto> =
        authRequest { apiService.loginWithPassword(PasswordLoginRequestDto(phone = phone, password = pass, role = role)) }

    suspend fun getFavorites(): List<Int> {
        return try {
            val response = apiService.getFavorites()
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.map { it.productId } ?: emptyList()
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            Log.e(TAG, "getFavorites error: ${e.message}")
            emptyList()
        }
    }

    suspend fun toggleFavorite(productId: Int, isFav: Boolean): Boolean {
        return try {
            if (isFav) {
                apiService.removeFavorite(productId).isSuccessful
            } else {
                apiService.addFavorite(productId).isSuccessful
            }
        } catch (e: Exception) {
            Log.e(TAG, "toggleFavorite error: ${e.message}")
            false
        }
    }

    suspend fun getNotifications(): List<NotificationDto> {
        return try {
            val response = apiService.getNotifications()
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data ?: emptyList()
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            Log.e(TAG, "getNotifications error: ${e.message}")
            emptyList()
        }
    }

    suspend fun submitReview(dto: ReviewCreateDto): Boolean {
        return try {
            val response = apiService.submitReview(dto)
            response.isSuccessful
        } catch (e: Exception) {
            false
        }
    }

    suspend fun submitReview(orderId: Int, rating: Int, comment: String?): Boolean {
        return submitReview(ReviewCreateDto(orderId = orderId, rating = rating, comment = comment))
    }

    suspend fun createComplaint(dto: ComplaintCreateDto): Boolean {
        return try {
            val response = apiService.createComplaint(dto)
            response.isSuccessful
        } catch (e: Exception) {
            false
        }
    }



    suspend fun getCategories(): List<Category> {
        return try {
            val response = apiService.getCategories()
            if (response.isSuccessful && response.body()?.success == true) {
                val categories = response.body()?.data?.map { it.toDomainCategory() }.orEmpty()
                Log.d(TAG, "GET /api/v1/categories HTTP ${response.code()}: ${categories.size} parsed categories")
                categories
            } else {
                Log.w(TAG, "GET /api/v1/categories failed: HTTP ${response.code()}")
                emptyList()
            }
        } catch (e: Exception) {
            Log.e(TAG, "GET /api/v1/categories failed (${e.javaClass.simpleName})", e)
            emptyList()
        }
    }

    suspend fun getProductCatalog(
        categoryId: Int? = null,
        categoryName: String? = null,
        search: String? = null,
        latitude: Double? = null,
        longitude: Double? = null
    ): CatalogResult {
        return try {
            val items = mutableListOf<Product>()
            var page = 1
            var totalCount = 0
            var pageCount = 0
            do {
                val response = apiService.getProducts(
                    categoryId = categoryId,
                    search = search,
                    page = page,
                    pageSize = 100,
                    latitude = latitude,
                    longitude = longitude
                )
                val body = response.body()
                val pageData = body?.data
                if (!response.isSuccessful || body?.success != true || pageData == null) {
                    val backendMessage = body?.error?.message
                        ?: body?.message
                        ?: parseBackendMessage(response.errorBody()?.string())
                    Log.w(TAG, "GET /api/v1/products page=$page failed: HTTP ${response.code()}")
                    return CatalogResult.Failure(
                        httpStatus = response.code(),
                        message = backendMessage
                            ?: "Couldn't load products (HTTP ${response.code()}). Please try again."
                    )
                }
                val meta = pageData.meta
                if (meta == null) {
                    Log.e(TAG, "GET /api/v1/products page=$page returned no pagination metadata")
                    return CatalogResult.Failure(
                        httpStatus = response.code(),
                        message = "The product service returned an incomplete response."
                    )
                }
                items += pageData.items.map { it.toDomainProduct() }
                totalCount = meta.totalItems
                pageCount = meta.totalPages
                Log.d(
                    TAG,
                    "GET /api/v1/products page=$page HTTP ${response.code()}: " +
                        "${pageData.items.size} received, ${items.size} parsed of $totalCount"
                )
                page += 1
            } while (page <= pageCount)

            val filteredItems = if (!categoryName.isNullOrEmpty() &&
                categoryName != "All Vegetables" &&
                categoryName != "All Fruits"
            ) {
                items.filter { it.category.contains(categoryName, ignoreCase = true) }
            } else {
                items
            }
            CatalogResult.Success(filteredItems, totalCount, pageCount)
        } catch (error: CancellationException) {
            throw error
        } catch (error: IOException) {
            Log.w(TAG, "GET /api/v1/products network failure (${error.javaClass.simpleName})")
            CatalogResult.Failure(null, "Couldn't connect to Vegito to load products.")
        } catch (error: JsonParseException) {
            Log.e(TAG, "GET /api/v1/products response parsing failed (${error.javaClass.simpleName})")
            CatalogResult.Failure(null, "Vegito returned an unreadable product response.")
        } catch (e: Exception) {
            Log.e(TAG, "GET /api/v1/products failed (${e.javaClass.simpleName})", e)
            CatalogResult.Failure(null, "Couldn't load products. Please try again.")
        }
    }

    suspend fun getProducts(
        categoryId: Int? = null,
        categoryName: String? = null,
        search: String? = null,
        latitude: Double? = null,
        longitude: Double? = null
    ): List<Product> =
        when (
            val result = getProductCatalog(
                categoryId = categoryId,
                categoryName = categoryName,
                search = search,
                latitude = latitude,
                longitude = longitude
            )
        ) {
            is CatalogResult.Success -> result.products
            is CatalogResult.Failure -> emptyList()
        }

    suspend fun getActiveOffers(): List<Offer> {
        return try {
            val res = apiService.getActiveOffers()
            if (res.isSuccessful && res.body()?.success == true) {
                res.body()?.data?.map { it.toDomainOffer() }.orEmpty()
            } else {
                Log.w(TAG, "getActiveOffers failed: HTTP ${res.code()}")
                emptyList()
            }
        } catch (e: Exception) {
            Log.e(TAG, "getActiveOffers network failed: ${e.message}", e)
            emptyList()
        }
    }



    private suspend fun cartRequest(
        action: String,
        request: suspend () -> Response<ApiResponse<CartReadDto>>
    ): CartResult {
        return try {
            val response = request()
            val body = response.body()
            if (response.isSuccessful && body?.success == true && body.data != null) {
                CartResult.Success(body.data)
            } else {
                val backendMessage = parseBackendMessage(response.errorBody()?.string())
                    ?: body?.message?.takeIf(String::isNotBlank)
                CartResult.Failure(
                    backendMessage ?: "$action failed (HTTP ${response.code()}). Please try again."
                )
            }
        } catch (error: IOException) {
            Log.w(TAG, "$action failed (${error.javaClass.simpleName})")
            CartResult.Failure("Unable to reach Vegito. Check your internet connection.")
        } catch (error: JsonParseException) {
            Log.e(TAG, "$action response parsing failed (${error.javaClass.simpleName})")
            CartResult.Failure("Vegito returned an unexpected response. Please try again.")
        }
    }

    suspend fun getCart(): CartResult =
        cartRequest("Loading your basket") { apiService.getCart() }

    suspend fun addCartItem(sellerProductId: Int, quantity: Double): CartResult =
        cartRequest("Adding item to your basket") {
            apiService.addCartItem(CartItemAddRequest(sellerProductId, quantity))
        }

    suspend fun updateCartItem(itemId: Int, quantity: Double): CartResult =
        cartRequest("Updating your basket") {
            apiService.updateCartItem(itemId, CartItemUpdateRequest(quantity))
        }

    suspend fun removeCartItem(itemId: Int): CartResult =
        cartRequest("Removing item from your basket") {
            apiService.removeCartItem(itemId)
        }

    // ADDRESS MANAGEMENT
    suspend fun saveAddress(dto: AddressCreateDto): SavedAddress? {
        return try {
            val response = apiService.createAddress(dto)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.toSavedAddress()
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "saveAddress error: ${e.message}")
            null
        }
    }

    suspend fun getUserAddresses(): List<SavedAddress> {
        return try {
            val response = apiService.getAddresses()
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.map { it.toSavedAddress() } ?: emptyList()
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            Log.e(TAG, "getUserAddresses error: ${e.message}")
            emptyList()
        }
    }

    suspend fun checkDeliveryEligibility(addressId: Int, sellerId: Int? = null): DeliveryFeeResponse? {
        return try {
            val response = apiService.checkDeliveryFee(addressId, sellerId)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "checkDeliveryEligibility error: ${e.message}")
            null
        }
    }

    suspend fun createOrder(
        addressId: Int,
        paymentMethod: String = "COD",
        couponCode: String? = null,
        customerNote: String? = null
    ): OrderResponseDto? {
        return try {
            val req = OrderCreateRequest(
                addressId = addressId,
                paymentMethod = paymentMethod,
                couponCode = couponCode,
                customerNote = customerNote
            )
            val response = apiService.createOrder(req)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "createOrder error: ${e.message}")
            null
        }
    }

    // SELLER WORKSPACE
    suspend fun getSellerDashboardStats(): SellerDashboardStats? {
        return try {
            val response = apiService.getSellerDashboard()
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "getSellerDashboardStats error: ${e.message}")
            null
        }
    }

    suspend fun getSellerOrders(): List<Order> {
        return try {
            val response = apiService.getSellerOrders()
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.items?.map { it.toDomainOrder() } ?: emptyList()
            } else {
                Log.w(TAG, "getSellerOrders returned ${response.code()}: ${response.errorBody()?.string()}")
                emptyList()
            }
        } catch (e: Exception) {
            Log.e(TAG, "getSellerOrders error: ${e.message}")
            emptyList()
        }
    }

    suspend fun updateOrderStatus(orderId: Int, status: String): Boolean {
        return try {
            val response = apiService.updateOrderStatus(orderId, OrderStatusUpdateRequest(status = status))
            if (response.isSuccessful && response.body()?.success == true) {
                true
            } else {
                Log.w(TAG, "updateOrderStatus failed code=${response.code()}: ${response.errorBody()?.string()}")
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "updateOrderStatus error: ${e.message}")
            false
        }
    }

    suspend fun verifyPickupOtp(orderId: Int, otp: String): Boolean {
        return try {
            val response = apiService.verifyPickupOtp(orderId, otp)
            response.isSuccessful && response.body()?.success == true
        } catch (e: Exception) {
            Log.e(TAG, "verifyPickupOtp error: ${e.message}")
            false
        }
    }

    suspend fun getSellerProfile(): SellerProfileDto? {
        return try {
            val response = apiService.getSellerProfile()
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "getSellerProfile error: ${e.message}")
            null
        }
    }

    suspend fun updateSellerProfile(dto: SellerProfileUpdateDto): SellerProfileDto? {
        return try {
            val response = apiService.updateSellerProfile(dto)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "updateSellerProfile error: ${e.message}")
            null
        }
    }

    suspend fun setSellerAvailability(isAvailable: Boolean): Boolean {
        return try {
            val response = apiService.setSellerAvailability(mapOf("is_available" to isAvailable))
            response.isSuccessful
        } catch (e: Exception) {
            Log.e(TAG, "setSellerAvailability error: ${e.message}")
            false
        }
    }

    suspend fun deleteAddress(addressId: Int): Boolean {
        return try {
            val res = apiService.deleteAddress(addressId)
            res.isSuccessful && res.body()?.success == true
        } catch (e: Exception) {
            Log.e(TAG, "deleteAddress error: ${e.message}")
            false
        }
    }

    suspend fun getCustomerOrders(): List<OrderResponseDto> {
        return try {
            val res = apiService.getCustomerOrders()
            if (res.isSuccessful && res.body()?.success == true) {
                res.body()?.data?.items ?: emptyList()
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            Log.e(TAG, "getCustomerOrders error: ${e.message}")
            emptyList()
        }
    }

    // SELLER INVENTORY
    suspend fun getSellerInventory(lowStockOnly: Boolean = false): List<InventoryItem> {
        return try {
            val res = apiService.getSellerInventory(lowStockOnly)
            if (res.isSuccessful && res.body()?.success == true) {
                res.body()?.data?.items ?: emptyList()
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            Log.e(TAG, "getSellerInventory error: ${e.message}")
            emptyList()
        }
    }

    suspend fun adjustInventory(sellerProductId: Int, change: Double, type: String = "STOCK_IN", note: String? = null): Boolean {
        return try {
            val req = InventoryAdjustRequest(quantityChange = change, transactionType = type, note = note)
            val res = apiService.adjustInventory(sellerProductId, req)
            res.isSuccessful && res.body()?.success == true
        } catch (e: Exception) {
            Log.e(TAG, "adjustInventory error: ${e.message}")
            false
        }
    }

    // SELLER PRODUCTS MANAGEMENT
    suspend fun addSellerProduct(request: SellerAddProductRequest): Boolean {
        return try {
            val res = apiService.addSellerProduct(request)
            res.isSuccessful && res.body()?.success == true
        } catch (e: Exception) {
            Log.e(TAG, "addSellerProduct error: ${e.message}")
            false
        }
    }

    suspend fun updateSellerProductStock(sellerProductId: Int, newPrice: Double?, newStock: Double?): Boolean {
        return try {
            val req = SellerProductUpdateRequest(price = newPrice, stockQuantity = newStock)
            val res = apiService.updateSellerProduct(sellerProductId, req)
            res.isSuccessful && res.body()?.success == true
        } catch (e: Exception) {
            Log.e(TAG, "updateSellerProductStock error: ${e.message}")
            false
        }
    }

    suspend fun deleteSellerProduct(sellerProductId: Int): Boolean {
        return try {
            val res = apiService.deleteSellerProduct(sellerProductId)
            res.isSuccessful && res.body()?.success == true
        } catch (e: Exception) {
            Log.e(TAG, "deleteSellerProduct error: ${e.message}")
            false
        }
    }

    // SELLER ANALYTICS
    suspend fun getSellerRevenueAnalytics(range: String = "30d"): List<TimeSeriesPointDto> {
        return try {
            val res = apiService.getSellerRevenueAnalytics(range)
            if (res.isSuccessful && res.body()?.success == true) {
                res.body()?.data ?: emptyList()
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            Log.e(TAG, "getSellerRevenueAnalytics error: ${e.message}")
            emptyList()
        }
    }

    suspend fun getSellerTopProducts(): List<TopProductAnalyticsDto> {
        return try {
            val res = apiService.getSellerTopProductsAnalytics(10)
            if (res.isSuccessful && res.body()?.success == true) {
                res.body()?.data ?: emptyList()
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            Log.e(TAG, "getSellerTopProducts error: ${e.message}")
            emptyList()
        }
    }

    // SELLER B2B BULK ORDERS
    suspend fun getSellerBulkOrders(status: String? = null): List<BulkOrderSummary> {
        return try {
            val res = apiService.getSellerBulkOrders(status)
            if (res.isSuccessful && res.body()?.success == true) {
                res.body()?.data ?: emptyList()
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            Log.e(TAG, "getSellerBulkOrders error: ${e.message}")
            emptyList()
        }
    }

    suspend fun getSellerBulkOrderDetail(orderId: Int): BulkOrderDetail? {
        return try {
            val res = apiService.getSellerBulkOrderDetail(orderId)
            if (res.isSuccessful && res.body()?.success == true) {
                res.body()?.data
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "getSellerBulkOrderDetail error: ${e.message}")
            null
        }
    }

    suspend fun acceptSellerBulkOrder(orderId: Int): Boolean {
        return try {
            val res = apiService.acceptSellerBulkOrder(orderId)
            res.isSuccessful && res.body()?.success == true
        } catch (e: Exception) {
            Log.e(TAG, "acceptSellerBulkOrder error: ${e.message}")
            false
        }
    }

    suspend fun sendSellerBulkQuote(orderId: Int, request: SendCustomQuoteRequest): Boolean {
        return try {
            val res = apiService.sendSellerBulkQuote(orderId, request)
            res.isSuccessful && res.body()?.success == true
        } catch (e: Exception) {
            Log.e(TAG, "sendSellerBulkQuote error: ${e.message}")
            false
        }
    }

    suspend fun rejectSellerBulkOrder(orderId: Int, reason: String): Boolean {
        return try {
            val res = apiService.rejectSellerBulkOrder(orderId, mapOf("reason" to reason))
            res.isSuccessful && res.body()?.success == true
        } catch (e: Exception) {
            Log.e(TAG, "rejectSellerBulkOrder error: ${e.message}")
            false
        }
    }

    // DELIVERY WORKSPACE
    suspend fun getDeliveryTasks(): List<DeliveryTask> {
        return try {
            val response = apiService.getDeliveryTasksBackend()
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.map { it.toDomainTask() } ?: emptyList()
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            Log.e(TAG, "getDeliveryTasks error: ${e.message}")
            emptyList()
        }
    }

    suspend fun acceptDeliveryTask(taskId: String): Boolean {
        return try {
            val idInt = taskId.toIntOrNull()
            if (idInt != null) {
                val res = apiService.acceptDeliveryOrder(idInt)
                res.isSuccessful && res.body()?.success == true
            } else {
                val response = apiService.acceptDeliveryTask(taskId)
                response.isSuccessful && response.body()?.success == true
            }
        } catch (e: Exception) {
            Log.e(TAG, "acceptDeliveryTask error: ${e.message}")
            false
        }
    }

    suspend fun verifyDeliverySellerOtp(taskId: String, otp: String): Boolean {
        return try {
            val idInt = taskId.toIntOrNull()
            if (idInt != null) {
                val res = apiService.verifyDeliveryTaskPickupOtp(idInt, mapOf("otp" to otp))
                res.isSuccessful && res.body()?.success == true
            } else {
                val response = apiService.verifyDeliverySellerOtp(taskId, otp)
                response.isSuccessful && response.body()?.success == true
            }
        } catch (e: Exception) {
            Log.e(TAG, "verifyDeliverySellerOtp error: ${e.message}")
            false
        }
    }

    suspend fun verifyDeliveryCustomerOtp(taskId: String, otp: String): Boolean {
        return try {
            val idInt = taskId.toIntOrNull()
            if (idInt != null) {
                val res = apiService.verifyDeliveryCustomerOtpDoorstep(idInt, mapOf("delivery_otp" to otp))
                res.isSuccessful && res.body()?.success == true
            } else {
                val response = apiService.verifyDeliveryCustomerOtp(taskId, otp)
                response.isSuccessful && response.body()?.success == true
            }
        } catch (e: Exception) {
            Log.e(TAG, "verifyDeliveryCustomerOtp error: ${e.message}")
            false
        }
    }

    suspend fun getDeliveryProfile(): DeliveryPartnerProfileDto? {
        return try {
            val res = apiService.getDeliveryProfile()
            if (res.isSuccessful && res.body()?.success == true) {
                res.body()?.data
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "getDeliveryProfile error: ${e.message}")
            null
        }
    }

    suspend fun setDeliveryAvailability(isAvailable: Boolean): Boolean {
        return try {
            val res = apiService.setDeliveryAvailability(DeliveryPartnerAvailabilityUpdate(isAvailable))
            res.isSuccessful && res.body()?.success == true
        } catch (e: Exception) {
            Log.e(TAG, "setDeliveryAvailability error: ${e.message}")
            false
        }
    }

    suspend fun getDeliveryEarnings(period: String? = null): DeliveryEarningsData? {
        return try {
            val res = apiService.getDeliveryEarnings()
            if (res.isSuccessful && res.body()?.success == true) {
                res.body()?.data
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "getDeliveryEarnings error: ${e.message}")
            null
        }
    }

    // ADMIN WORKSPACE
    suspend fun getAdminDashboardMetrics(): AdminDashboardMetricsDto? {
        return try {
            val res = apiService.getAdminDashboardMetrics()
            if (res.isSuccessful && res.body()?.success == true) {
                res.body()?.data
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "getAdminDashboardMetrics error: ${e.message}")
            null
        }
    }

    suspend fun getAdminSellers(search: String? = null, isVerified: Boolean? = null): List<AdminSellerItemDto> {
        return try {
            val res = apiService.getAdminSellers(search, isVerified)
            if (res.isSuccessful && res.body()?.success == true) {
                res.body()?.data?.items ?: emptyList()
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            Log.e(TAG, "getAdminSellers error: ${e.message}")
            emptyList()
        }
    }

    suspend fun verifyAdminSeller(sellerId: Int, isVerified: Boolean = true): Boolean {
        return try {
            val res = apiService.verifyAdminSeller(sellerId, isVerified)
            res.isSuccessful && res.body()?.success == true
        } catch (e: Exception) {
            Log.e(TAG, "verifyAdminSeller error: ${e.message}")
            false
        }
    }

    suspend fun getAdminDeliveryPartners(): List<AdminDeliveryPartnerItemDto> {
        return try {
            val res = apiService.getAdminDeliveryPartners()
            if (res.isSuccessful && res.body()?.success == true) {
                res.body()?.data ?: emptyList()
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            Log.e(TAG, "getAdminDeliveryPartners error: ${e.message}")
            emptyList()
        }
    }

    suspend fun verifyAdminDeliveryPartner(partnerId: Int, isVerified: Boolean = true): Boolean {
        return try {
            val res = apiService.verifyAdminDeliveryPartner(partnerId, isVerified)
            res.isSuccessful && res.body()?.success == true
        } catch (e: Exception) {
            Log.e(TAG, "verifyAdminDeliveryPartner error: ${e.message}")
            false
        }
    }

    // ALIAS CONVENIENCE WRAPPERS
    suspend fun getSellerProductAnalytics(): List<TopProductAnalyticsDto> = getSellerTopProducts()
    suspend fun getDeliveryPartnerProfile(): DeliveryPartnerProfileDto? = getDeliveryProfile()
    suspend fun getAdminMetrics(): AdminAnalytics? {
        val m = getAdminDashboardMetrics() ?: return null
        return AdminAnalytics(
            totalCustomers = m.customers,
            totalSellers = m.sellers,
            totalDeliveryPartners = m.deliveryPartners,
            totalOrdersToday = m.orders,
            grossRevenueToday = m.revenue,
            pendingKycCount = m.pendingOrders
        )
    }
    suspend fun sellerAddProduct(request: SellerAddProductRequest): Boolean = addSellerProduct(request)
    suspend fun setDeliveryPartnerAvailability(isAvailable: Boolean): Boolean = setDeliveryAvailability(isAvailable)
    suspend fun verifyDeliveryPickup(taskId: String, otp: String): Boolean = verifyDeliverySellerOtp(taskId, otp)
    suspend fun verifyDeliveryOtp(taskId: String, otp: String): Boolean = verifyDeliveryCustomerOtp(taskId, otp)
}
