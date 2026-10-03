package com.vegito.app.data.repository

import android.util.Log
import com.vegito.app.data.model.*
import com.vegito.app.data.remote.VegitoApiService

class VegitoRepository(private val apiService: VegitoApiService) {
    companion object {
        private const val TAG = "VegitoRepository"
    }

    // AUTHENTICATION
    suspend fun sendOtp(phone: String, role: String? = null): SendOtpResponseDto? {
        return try {
            val response = apiService.sendOtp(OtpRequest(phone = phone, role = role))
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "sendOtp error: ${e.message}")
            null
        }
    }

    suspend fun verifyOtp(phone: String, otp: String, role: String? = null, name: String? = null): TokenResponseDto? {
        return try {
            val response = apiService.verifyOtp(OtpVerifyRequest(phone = phone, otp = otp, role = role, name = name))
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "verifyOtp error: ${e.message}")
            null
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

    suspend fun getProfile(): UserProfile? {
        return try {
            val response = apiService.getProfile()
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "getProfile error: ${e.message}")
            null
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
                val list = response.body()?.data?.map { it.toDomainCategory() }
                if (!list.isNullOrEmpty()) list else defaultCategories
            } else {
                defaultCategories
            }
        } catch (e: Exception) {
            Log.w(TAG, "getCategories network failed, using default: ${e.message}")
            defaultCategories
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
                val items = response.body()?.data?.items?.map { it.toDomainProduct() }
                if (!items.isNullOrEmpty()) {
                    var filtered = items
                    if (!categoryName.isNullOrEmpty() && categoryName != "All Vegetables" && categoryName != "All Fruits") {
                        filtered = filtered.filter { it.category.contains(categoryName, ignoreCase = true) }
                    }
                    filtered
                } else {
                    filterCatalog(categoryName, search)
                }
            } else {
                filterCatalog(categoryName, search)
            }
        } catch (e: Exception) {
            Log.w(TAG, "getProducts network failed, using fallback: ${e.message}")
            filterCatalog(categoryName, search)
        }
    }

    private fun filterCatalog(category: String?, search: String?): List<Product> {
        var list = fullCatalog
        if (!category.isNullOrEmpty() && category != "All Vegetables" && category != "All Fruits") {
            val cat = category.trim()
            list = list.filter { it.category.contains(cat, ignoreCase = true) }
        }
        if (!search.isNullOrEmpty()) {
            val query = search.trim()
            list = list.filter {
                it.name.contains(query, ignoreCase = true) || it.category.contains(query, ignoreCase = true)
            }
        }
        return list
    }

    suspend fun getActiveOffers(): List<Offer> {
        return try {
            val res = apiService.getActiveOffers()
            if (res.isSuccessful && res.body()?.success == true) {
                val items = res.body()?.data?.map { it.toDomainOffer() }
                if (!items.isNullOrEmpty()) items else defaultOffers
            } else {
                defaultOffers
            }
        } catch (e: Exception) {
            Log.w(TAG, "getActiveOffers network failed, using fallback: ${e.message}")
            defaultOffers
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
}
