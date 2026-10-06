package com.vegito.app.data.repository

import android.util.Log
import com.google.gson.JsonParseException
import com.google.gson.JsonParser
import com.vegito.app.data.model.*
import com.vegito.app.data.remote.VegitoApiService
import java.io.IOException
import retrofit2.Response

class VegitoRepository(private val apiService: VegitoApiService) {
    companion object {
        private const val TAG = "VegitoRepository"
    }

    sealed interface AuthResult<out T> {
        data class Success<T>(val data: T) : AuthResult<T>
        data class Failure(val message: String) : AuthResult<Nothing>
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
        return when (statusCode) {
            400, 422 -> backendMessage ?: "Please check the information and try again."
            401 -> "Your authentication request was not accepted. Please try again."
            403 -> backendMessage ?: "You are not authorized to use this account."
            404 -> "Authentication service unavailable."
            409 -> backendMessage ?: "This mobile number is already registered. Please sign in."
            429 -> "Too many attempts. Please wait before requesting another code."
            503 -> "Verification service is temporarily unavailable. Please try again."
            in 500..599 -> "Vegito server is temporarily unavailable. Please try again."
            else -> backendMessage ?: "Request failed (HTTP $statusCode). Please try again."
        }
    }

    private fun parseBackendMessage(responseBody: String?): String? {
        if (responseBody.isNullOrBlank()) return null
        return try {
            val root = JsonParser.parseString(responseBody)
            if (!root.isJsonObject) return null
            val json = root.asJsonObject
            val error = json.get("error")
            if (error?.isJsonObject == true) {
                val message = error.asJsonObject.get("message")
                if (message?.isJsonPrimitive == true && message.asJsonPrimitive.isString) {
                    return message.asString
                }
            }
            val detail = json.get("detail")
            if (detail?.isJsonPrimitive == true && detail.asJsonPrimitive.isString) {
                detail.asString
            } else {
                null
            }
        } catch (error: JsonParseException) {
            Log.w(TAG, "Authentication error response parsing failed (${error.javaClass.simpleName})")
            null
        }
    }

    // AUTHENTICATION
    suspend fun sendOtp(phone: String, role: String? = null): AuthResult<SendOtpResponseDto> =
        authRequest { apiService.sendOtp(OtpRequest(phone = phone, role = role)) }

    suspend fun verifyOtp(
        phone: String,
        otp: String,
        role: String? = null,
        name: String? = null
    ): AuthResult<TokenResponseDto> =
        authRequest { apiService.verifyOtp(OtpVerifyRequest(phone = phone, otp = otp, role = role, name = name)) }

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

    // Default Fallback Categories
    val defaultCategories = listOf(
        Category("1", "Vegetables", "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300", 35),
        Category("2", "Fruits", "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=300", 28),
        Category("3", "Leafy Vegetables", "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=300", 12),
        Category("4", "Root Vegetables", "https://images.unsplash.com/photo-1598170845058-12ef4a457939?w=300", 8),
        Category("50", "Fruit Vegetables", "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300", 14),
        Category("51", "Gourds", "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=300", 7),
        Category("52", "Beans & Peas", "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=300", 6),
        Category("53", "Cruciferous", "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=300", 5),
        Category("56", "Citrus Fruits", "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=300", 6),
        Category("57", "Tropical Fruits", "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300", 8),
        Category("58", "Melons", "https://images.unsplash.com/photo-1587049352847-81a56d773cae?w=300", 4),
        Category("59", "Berries & Stone", "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=300", 7),
        Category("60", "Exotic Fruits", "https://images.unsplash.com/photo-1585059819970-31398467b243?w=300", 5)
    )

    // Comprehensive Vegetable & Fruit Catalog
    val fullCatalog = listOf(
        // VEGETABLES - Root & Tubers
        Product("v1", "Solapur Potato (Batata)", "Vegetables", 32.0, "kg", 500.0, 94, "Ultra Fresh", "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500", "Fresh starch potatoes directly sourced from Solapur mandi.", "1", "Solapur Mandi"),
        Product("v2", "Red Onion (Kanda)", "Vegetables", 28.0, "kg", 450.0, 96, "Ultra Fresh", "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cf?w=500", "Pungent red onions, farm harvested.", "1", "Solapur Mandi"),
        Product("v3", "Fresh Carrot (Gajar)", "Vegetables", 40.0, "kg", 180.0, 91, "Fresh", "https://images.unsplash.com/photo-1598170845058-12ef4a457939?w=500", "Sweet crunchy red carrots.", "1", "Solapur Mandi"),
        Product("v4", "Beetroot", "Vegetables", 35.0, "kg", 120.0, 92, "Fresh", "https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?w=500", "Nutrient rich dark red beetroots.", "1", "Solapur Mandi"),
        Product("v5", "Garlic (Lahsuna)", "Vegetables", 140.0, "kg", 90.0, 95, "Ultra Fresh", "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?w=500", "Organic white garlic cloves.", "1", "Solapur Mandi"),
        Product("v6", "Fresh Ginger (Adrak)", "Vegetables", 80.0, "kg", 110.0, 93, "Fresh", "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500", "Aromatic ginger roots.", "1", "Solapur Mandi"),

        // LEAFY GREENS
        Product("vl1", "Organic Palak (Spinach)", "Leafy Greens", 20.0, "bunch", 100.0, 98, "Ultra Fresh", "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500", "Fresh green spinach leaves harvested this morning.", "1", "Solapur Mandi"),
        Product("vl2", "Fresh Methi (Fenugreek)", "Leafy Greens", 22.0, "bunch", 85.0, 97, "Ultra Fresh", "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500", "Tender green methi bunches.", "1", "Solapur Mandi"),
        Product("vl3", "Coriander (Kothimbir)", "Leafy Greens", 15.0, "bunch", 150.0, 99, "Ultra Fresh", "https://images.unsplash.com/photo-1588879460405-5211d13f9c63?w=500", "Fresh aromatic coriander herbs.", "1", "Solapur Mandi"),
        Product("vl4", "Pudina (Mint)", "Leafy Greens", 12.0, "bunch", 90.0, 95, "Fresh", "https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=500", "Cool fragrant mint leaves.", "1", "Solapur Mandi"),

        // FRUIT VEGETABLES & GOURDS
        Product("vf1", "Solapur Tomato (Tamatar)", "Vegetables", 38.0, "kg", 300.0, 98, "Ultra Fresh", "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500", "Juicy ripe red tomatoes.", "1", "Solapur Mandi"),
        Product("vf2", "Brinjal (Vangi)", "Vegetables", 36.0, "kg", 140.0, 93, "Fresh", "https://images.unsplash.com/photo-1613743983387-0131497918f6?w=500", "Glossy purple Solapur brinjals.", "1", "Solapur Mandi"),
        Product("vf3", "Capsicum (Green Shimla)", "Vegetables", 48.0, "kg", 160.0, 95, "Ultra Fresh", "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=500", "Crisp green bell peppers.", "1", "Solapur Mandi"),
        Product("vf4", "Green Chilli (Hirvi Mirchi)", "Vegetables", 40.0, "kg", 90.0, 96, "Ultra Fresh", "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=500", "Spicy farm-fresh green chillies.", "1", "Solapur Mandi"),
        Product("vf5", "Bhindi (Lady Finger / Okra)", "Vegetables", 42.0, "kg", 130.0, 94, "Fresh", "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=500", "Tender green bhindi pods.", "1", "Solapur Mandi"),
        Product("vf6", "Cucumber (Kakdi)", "Vegetables", 30.0, "kg", 210.0, 97, "Ultra Fresh", "https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=500", "Cool hydrating cucumbers.", "1", "Solapur Mandi"),
        Product("vf7", "Bottle Gourd (Dudhi)", "Vegetables", 25.0, "piece", 110.0, 92, "Fresh", "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=500", "Fresh bottle gourds.", "1", "Solapur Mandi"),
        Product("vf8", "Cauliflower (Gobi)", "Vegetables", 34.0, "piece", 95.0, 95, "Ultra Fresh", "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=500", "Crisp white fresh cauliflower heads.", "1", "Solapur Mandi"),
        Product("vf9", "Green Cabbage (Patta Gobi)", "Vegetables", 26.0, "kg", 120.0, 96, "Ultra Fresh", "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=500", "Solid green farm cabbage.", "1", "Solapur Mandi"),
        Product("vf10", "Green Peas (Matar)", "Vegetables", 55.0, "kg", 140.0, 97, "Ultra Fresh", "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=500", "Fresh green peas pods.", "1", "Solapur Mandi"),
        Product("v11", "Fresh Green Chana (Hira Chana)", "Beans & Peas", 60.0, "kg", 180.0, 97, "Ultra Fresh", "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=500", "Fresh green chana pods direct from farm.", "1", "Solapur Mandi"),
        Product("v12", "Kala Chana (Black Chickpeas)", "Beans & Peas", 75.0, "kg", 220.0, 99, "Ultra Fresh", "https://images.unsplash.com/photo-1585998066891-63f58e7c9397?w=500", "Nutritious organic black chana.", "1", "Solapur Mandi"),
        Product("v13", "Kabuli Chana (White Chickpeas)", "Beans & Peas", 90.0, "kg", 190.0, 98, "Ultra Fresh", "https://images.unsplash.com/photo-1585998066891-63f58e7c9397?w=500", "Large premium white kabuli chana.", "1", "Solapur Mandi"),

        // FRUITS CATALOG - Citrus, Tropical, Exotic, Berries & Melons
        Product("fr1", "Nagpur Orange (Santra)", "Fruits", 75.0, "kg", 200.0, 96, "Ultra Fresh", "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=500", "Sweet juicy Nagpur oranges.", "1", "Solapur Mandi"),
        Product("fr2", "Robusta Banana (Kela)", "Fruits", 40.0, "dozen", 350.0, 98, "Ultra Fresh", "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500", "Naturally ripened sweet yellow bananas.", "1", "Solapur Mandi"),
        Product("fr3", "Alphonso Mango (Hapus)", "Fruits", 320.0, "dozen", 80.0, 99, "Ultra Fresh", "https://images.unsplash.com/photo-1553279768-865429fa0078?w=500", "Premium Konkan Alphonso Hapus mangoes.", "1", "Solapur Mandi"),
        Product("fr4", "Pomegranate (Anar)", "Fruits", 110.0, "kg", 160.0, 95, "Ultra Fresh", "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500", "Ruby red Solapur Bhagwa pomegranates.", "1", "Solapur Mandi"),
        Product("fr5", "Papaya (Papai)", "Fruits", 45.0, "kg", 140.0, 93, "Fresh", "https://images.unsplash.com/photo-1517260739337-6799d239ce83?w=500", "Sweet orange papayas.", "1", "Solapur Mandi"),
        Product("fr6", "Watermelon (Kalingad)", "Fruits", 25.0, "kg", 300.0, 97, "Ultra Fresh", "https://images.unsplash.com/photo-1587049352847-81a56d773cae?w=500", "Juicy red watermelons.", "1", "Solapur Mandi"),
        Product("fr7", "Green Grapes (Drakshe)", "Fruits", 85.0, "kg", 170.0, 96, "Ultra Fresh", "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=500", "Seedless sweet green grapes.", "1", "Solapur Mandi"),
        Product("fr8", "Fresh Guava (Peru)", "Fruits", 60.0, "kg", 120.0, 94, "Fresh", "https://images.unsplash.com/photo-1536511135882-84a1e94443a7?w=500", "Crisp pink guava fruits.", "1", "Solapur Mandi"),
        Product("fr9", "Apple (Kashmiri)", "Fruits", 160.0, "kg", 150.0, 95, "Ultra Fresh", "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500", "Crisp red Kashmiri apples.", "1", "Solapur Mandi"),
        Product("fr10", "Kiwi Fruit (Imported)", "Fruits", 120.0, "pack", 60.0, 98, "Ultra Fresh", "https://images.unsplash.com/photo-1585059819970-31398467b243?w=500", "Vitamin C rich green kiwis.", "1", "Solapur Mandi")
    )

    suspend fun getCategories(): List<Category> {
        return try {
            val response = apiService.getCategories()
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.map { it.toDomainCategory() }.orEmpty()
            } else {
                Log.w(TAG, "getCategories failed: HTTP ${response.code()}")
                emptyList()
            }
        } catch (e: Exception) {
            Log.e(TAG, "getCategories network failed: ${e.message}", e)
            emptyList()
        }
    }

    suspend fun getProducts(
        categoryId: Int? = null,
        categoryName: String? = null,
        search: String? = null
    ): List<Product> {
        return try {
            val response = apiService.getProducts(categoryId = categoryId, search = search)
            if (response.isSuccessful && response.body()?.success == true) {
                val items = response.body()?.data?.items?.map { it.toDomainProduct() }.orEmpty()
                if (!categoryName.isNullOrEmpty() && categoryName != "All Vegetables" && categoryName != "All Fruits") {
                    items.filter { it.category.contains(categoryName, ignoreCase = true) }
                } else {
                    items
                }
            } else {
                Log.w(TAG, "getProducts failed: HTTP ${response.code()}")
                emptyList()
            }
        } catch (e: Exception) {
            Log.e(TAG, "getProducts network failed: ${e.message}", e)
            emptyList()
        }
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

    private val defaultOffers = listOf(
        Offer(
            id = "o1",
            title = "Kashmiri Apple Special",
            code = "APPLE20",
            discountPercent = 20,
            maxDiscount = 40.0,
            minOrderAmount = 120.0,
            description = "Crisp and sweet fresh Kashmiri apples with guaranteed 95% freshness.",
            imageUrl = "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600",
            offerPrice = 128.0,
            originalPrice = 160.0,
            unit = "kg",
            freshness = 95
        ),
        Offer(
            id = "o2",
            title = "Nagpur Sweet Oranges",
            code = "CITRUS15",
            discountPercent = 15,
            maxDiscount = 25.0,
            minOrderAmount = 60.0,
            description = "Juicy Vitamin-C packed Nagpur oranges freshly handpicked from farm orchards.",
            imageUrl = "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600",
            offerPrice = 64.0,
            originalPrice = 75.0,
            unit = "kg",
            freshness = 96
        ),
        Offer(
            id = "o3",
            title = "Solapur Ruby Pomegranates",
            code = "ANAR25",
            discountPercent = 25,
            maxDiscount = 50.0,
            minOrderAmount = 100.0,
            description = "GI-tagged Solapur Bhagwa variety ruby red pomegranates direct from growers.",
            imageUrl = "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600",
            offerPrice = 82.0,
            originalPrice = 110.0,
            unit = "kg",
            freshness = 98
        ),
        Offer(
            id = "o4",
            title = "Fresh Banana Super Bundle",
            code = "KELA10",
            discountPercent = 15,
            maxDiscount = 15.0,
            minOrderAmount = 40.0,
            description = "Naturally ripened Robusta bananas, high potassium energy booster.",
            imageUrl = "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600",
            offerPrice = 34.0,
            originalPrice = 40.0,
            unit = "dozen",
            freshness = 98
        )
    )

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
