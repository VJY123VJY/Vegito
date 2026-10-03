package com.vegito.app.data.model

import com.google.gson.annotations.SerializedName

enum class UserRole {
    @SerializedName("customer") CUSTOMER,
    @SerializedName("seller") SELLER,
    @SerializedName("delivery_partner") DELIVERY_PARTNER,
    @SerializedName("admin") ADMIN
}

data class UserProfile(
    val id: String = "",
    val phone: String = "",
    val name: String? = null,
    val email: String? = null,
    val role: String = "customer",
    val roles: List<String> = listOf("customer"),
    val activeRole: String = "customer",
    val isVerified: Boolean = true,
    @SerializedName("authorized_roles") val authorizedRoles: List<String> = listOf("customer")
)

data class SendOtpResponseDto(
    val message: String = "",
    val phone: String = "",
    @SerializedName("dev_otp") val devOtp: String? = null
)

data class TokenResponseDto(
    @SerializedName("access_token") val accessToken: String = "",
    @SerializedName("token_type") val tokenType: String = "bearer",
    @SerializedName("expires_in") val expiresIn: Int = 86400,
    @SerializedName("user_id") val userId: Int = 0,
    val role: String = "customer",
    val phone: String = "",
    val name: String? = null,
    @SerializedName("is_new_user") val isNewUser: Boolean = false,
    @SerializedName("authorized_roles") val authorizedRoles: List<String> = listOf("customer")
)

data class SwitchWorkspaceDto(
    @SerializedName("target_role") val targetRole: String
)

data class AuthResponse(
    val accessToken: String? = null,
    val tokenType: String? = null,
    val user: UserProfile? = null,
    val message: String? = null
)

data class OtpRequest(
    val phone: String,
    val role: String? = null
)

data class OtpVerifyRequest(
    val phone: String,
    val otp: String,
    val role: String? = null,
    val name: String? = null
)

data class Category(
    val id: String = "",
    val name: String = "",
    val iconUrl: String? = null,
    val itemCount: Int = 0
)

data class Product(
    val id: String = "",
    val name: String = "",
    val category: String = "Vegetables",
    val price: Double = 0.0,
    val unit: String = "kg",
    val stockQuantity: Double = 0.0,
    val freshnessPercentage: Int = 95,
    val freshnessStatus: String = "Ultra Fresh",
    val imageUrl: String = "",
    val description: String = "",
    val sellerId: String = "",
    val sellerName: String = "",
    val harvestDate: String? = null,
    val isFavorite: Boolean = false
)

data class Offer(
    val id: String = "",
    val title: String = "",
    val code: String = "",
    val discountPercent: Int = 0,
    val maxDiscount: Double = 0.0,
    val minOrderAmount: Double = 0.0,
    val description: String = "",
    val imageUrl: String? = null,
    val validUntil: String? = null,
    val productId: String? = null,
    val offerPrice: Double? = null,
    val originalPrice: Double? = null,
    val unit: String? = null,
    val freshness: Int? = null,
    val isFamilyPack: Boolean = false
)

data class CartItem(
    val id: String = "",
    val product: Product,
    var quantity: Double = 1.0,
    val itemTotal: Double = product.price * quantity
)

data class CartSummary(
    val items: List<CartItem> = emptyList(),
    val subtotal: Double = 0.0,
    val deliveryFee: Double = 0.0,
    val discount: Double = 0.0,
    val grandTotal: Double = 0.0,
    val isServiceable: Boolean = true,
    val unserviceableReason: String? = null
)

data class SavedAddress(
    val id: String = "",
    val title: String = "Home",
    val addressLine: String = "",
    val landmark: String? = null,
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val isDefault: Boolean = false,
    val city: String = "Solapur",
    val pincode: String = "413001",
    val state: String = "Maharashtra"
)

enum class OrderStatus {
    NEW, ACCEPTED, PACKING, READY, OUT_FOR_DELIVERY, DELIVERED, CANCELLED
}

data class Order(
    val id: String = "",
    val orderNumber: String = "",
    val status: String = "NEW",
    val createdAt: String = "",
    val items: List<CartItem> = emptyList(),
    val totalAmount: Double = 0.0,
    val deliveryFee: Double = 0.0,
    val deliveryAddress: SavedAddress = SavedAddress(),
    val sellerName: String = "Vegito Hub",
    val sellerPhone: String = "",
    val sellerLat: Double = 17.6599,
    val sellerLng: Double = 75.9064,
    val customerOtp: String? = null,
    val pickupOtp: String? = null,
    val deliveryPartnerName: String? = null,
    val deliveryPartnerPhone: String? = null,
    val deliveryPartnerLat: Double? = null,
    val deliveryPartnerLng: Double? = null
)

data class SavedShoppingList(
    val id: String,
    val title: String,
    val itemsCount: Int
)

data class SupportComplaint(
    val id: String,
    val orderId: String,
    val issueType: String,
    val description: String,
    val status: String = "OPEN"
)

data class RestockSuggestion(
    val productId: String,
    val productName: String,
    val currentStock: Double,
    val suggestedRestockQty: Double
)

data class SellerDashboardStats(
    val isOnline: Boolean = true,
    val todaySales: Double = 0.0,
    val activeOrdersCount: Int = 0,
    val newOrdersCount: Int = 0,
    val lowStockCount: Int = 0
)

data class DeliveryTask(
    val id: String = "",
    val orderId: String = "",
    val orderNumber: String = "",
    val sellerName: String = "",
    val sellerAddress: String = "",
    val sellerLat: Double = 17.6599,
    val sellerLng: Double = 75.9064,
    val customerArea: String = "",
    val customerLat: Double? = null, // Hidden until pickup OTP verified!
    val customerLng: Double? = null, // Hidden until pickup OTP verified!
    val customerAddress: String? = null, // Hidden until pickup OTP verified!
    val distanceKm: Double = 2.5,
    val status: String = "PENDING", // PENDING, ACCEPTED, PICKED_UP, DELIVERED
    val isUrgent: Boolean = false,
    val isPickupVerified: Boolean = false,
    val earnings: Double = 45.0
)

data class B2BBulkQuoteRequest(
    val businessType: String = "Restaurant",
    val businessName: String = "",
    val weightKg: Double = 50.0,
    val productRequirements: String = "",
    val deliveryAddress: String = "",
    val distanceKm: Double = 5.0
)

data class AdminAnalytics(
    val totalCustomers: Int = 0,
    val totalSellers: Int = 0,
    val totalDeliveryPartners: Int = 0,
    val totalOrdersToday: Int = 0,
    val grossRevenueToday: Double = 0.0,
    val pendingKycCount: Int = 0
)

data class ApiResponse<T>(
    val success: Boolean = true,
    val message: String? = null,
    val data: T? = null,
    val error: ApiErrorDetail? = null
)

data class ApiErrorDetail(
    val code: String? = null,
    val message: String? = null,
    val details: Any? = null
)

data class PaginatedData<T>(
    val items: List<T> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    @SerializedName("page_size") val pageSize: Int = 20,
    val pages: Int = 1
)

data class AddressCreateDto(
    @SerializedName("address_line1") val addressLine1: String,
    @SerializedName("address_line2") val addressLine2: String? = null,
    val landmark: String? = null,
    val city: String,
    val state: String = "Maharashtra",
    val country: String = "India",
    val pincode: String = "413001",
    val latitude: Double? = null,
    val longitude: Double? = null,
    @SerializedName("address_type") val addressType: String = "HOME",
    @SerializedName("is_default") val isDefault: Boolean = true
)

data class AddressDto(
    val id: Int = 0,
    @SerializedName("user_id") val userId: Int = 0,
    @SerializedName("address_line1") val addressLine1: String = "",
    @SerializedName("address_line2") val addressLine2: String? = null,
    val landmark: String? = null,
    val city: String = "",
    val state: String = "",
    val pincode: String = "",
    val latitude: Double? = null,
    val longitude: Double? = null,
    @SerializedName("address_type") val addressType: String? = null,
    @SerializedName("is_default") val isDefault: Boolean = false
) {
    fun toSavedAddress(): SavedAddress {
        val fullLine = listOfNotNull(addressLine1, addressLine2, landmark, city, pincode)
            .filter { it.isNotBlank() }
            .joinToString(", ")
        return SavedAddress(
            id = id.toString(),
            title = addressType ?: "Home",
            addressLine = fullLine.ifBlank { addressLine1 },
            landmark = landmark,
            latitude = latitude ?: 0.0,
            longitude = longitude ?: 0.0,
            isDefault = isDefault,
            city = city.ifBlank { "Solapur" },
            pincode = pincode.ifBlank { "413001" },
            state = state.ifBlank { "Maharashtra" }
        )
    }
}

data class DeliveryFeeResponse(
    @SerializedName("address_id") val addressId: Int = 0,
    @SerializedName("distance_km") val distanceKm: Double = 0.0,
    @SerializedName("delivery_fee") val deliveryFee: Double = 0.0,
    @SerializedName("max_allowed_km") val maxAllowedKm: Double = 15.0,
    @SerializedName("seller_online") val sellerOnline: Boolean = true,
    @SerializedName("is_deliverable") val isDeliverable: Boolean = true
)

data class OrderCreateRequest(
    @SerializedName("address_id") val addressId: Int,
    @SerializedName("payment_method") val paymentMethod: String = "COD",
    @SerializedName("coupon_code") val couponCode: String? = null,
    @SerializedName("customer_note") val customerNote: String? = null
)

data class OrderResponseDto(
    val id: Int = 0,
    @SerializedName("order_number") val orderNumber: String = "",
    @SerializedName("total_amount") val totalAmount: Double = 0.0,
    @SerializedName("delivery_charge") val deliveryCharge: Double = 0.0,
    @SerializedName("status") val status: String = "NEW",
    @SerializedName("delivery_otp") val deliveryOtp: String? = null,
    @SerializedName("pickup_otp") val pickupOtp: String? = null,
    @SerializedName("customer_delivery_address") val customerDeliveryAddress: String? = null,
    @SerializedName("delivery_latitude") val deliveryLatitude: Double? = null,
    @SerializedName("delivery_longitude") val deliveryLongitude: Double? = null,
    @SerializedName("shop_name") val shopName: String? = null,
    @SerializedName("placed_at") val placedAt: String? = null
)

data class ProductDto(
    val id: Int = 0,
    val name: String = "",
    @SerializedName("category_id") val categoryId: Int = 0,
    val description: String? = null,
    val unit: String = "kg",
    @SerializedName("shelf_life_days") val shelfLifeDays: Int? = 7,
    @SerializedName("is_active") val isActive: Boolean = true,
    @SerializedName("min_price") val minPrice: Double? = null,
    @SerializedName("is_in_stock") val isInStock: Boolean = true,
    val images: List<ProductImageDto> = emptyList(),
    val category: CategoryDto? = null,
    @SerializedName("seller_products") val sellerProducts: List<SellerProductOfferDto> = emptyList()
) {
    fun toDomainProduct(): Product {
        val firstImg = images.firstOrNull()?.imageUrl ?: ""
        val effectivePrice = minPrice ?: (sellerProducts.firstOrNull()?.price ?: 35.0)
        val effectiveStock = sellerProducts.firstOrNull()?.stockQuantity ?: 50.0
        val catName = category?.name ?: if (categoryId == 2 || (categoryId in 56..60)) "Fruits" else "Vegetables"
        val freshScore = if ((shelfLifeDays ?: 5) >= 6) 96 else 92
        return Product(
            id = id.toString(),
            name = name,
            category = catName,
            price = effectivePrice,
            unit = unit.replace("1 ", "").trim(),
            stockQuantity = effectiveStock,
            freshnessPercentage = freshScore,
            freshnessStatus = if (freshScore >= 95) "Ultra Fresh" else "Fresh",
            imageUrl = firstImg,
            description = description ?: "Farm fresh $name",
            sellerId = sellerProducts.firstOrNull()?.sellerId?.toString() ?: "1",
            sellerName = sellerProducts.firstOrNull()?.sellerBusinessName ?: "Solapur Mandi"
        )
    }
}

data class ProductImageDto(
    val id: Int = 0,
    @SerializedName("image_url") val imageUrl: String = "",
    @SerializedName("is_primary") val isPrimary: Boolean = false
)

data class CategoryDto(
    val id: Int = 0,
    val name: String = "",
    val description: String? = null,
    @SerializedName("image_url") val imageUrl: String? = null,
    @SerializedName("is_active") val isActive: Boolean = true
) {
    fun toDomainCategory(): Category = Category(
        id = id.toString(),
        name = name,
        iconUrl = imageUrl,
        itemCount = 0
    )
}

data class SellerProductOfferDto(
    @SerializedName("seller_product_id") val sellerProductId: Int = 0,
    @SerializedName("seller_id") val sellerId: Int = 0,
    @SerializedName("seller_business_name") val sellerBusinessName: String? = null,
    val price: Double = 0.0,
    @SerializedName("stock_quantity") val stockQuantity: Double = 0.0,
    @SerializedName("is_available") val isAvailable: Boolean = true
)

data class PromotionDto(
    val id: Int = 0,
    val title: String = "",
    val description: String? = null,
    val price: Double = 0.0,
    val type: String = "BUNDLE",
    val status: String = "ACTIVE",
    val eligible: Boolean = true,
    @SerializedName("product_id") val productId: Int? = null,
    @SerializedName("product_name") val productName: String? = null,
    @SerializedName("image_url") val imageUrl: String? = null,
    @SerializedName("original_price") val originalPrice: Double? = null,
    @SerializedName("discount_percent") val discountPercent: Int? = null,
    val unit: String? = null,
    @SerializedName("freshness_percent") val freshnessPercent: Int? = null,
    @SerializedName("badge_text") val badgeText: String? = null
) {
    fun toDomainOffer(): Offer = Offer(
        id = id.toString(),
        title = title,
        code = "VEGITO${discountPercent ?: 20}",
        discountPercent = discountPercent ?: 15,
        maxDiscount = ((originalPrice ?: price) - price).coerceAtLeast(10.0),
        minOrderAmount = price,
        description = description ?: "Special fresh produce deal",
        imageUrl = imageUrl,
        productId = productId?.toString(),
        offerPrice = price,
        originalPrice = originalPrice ?: (price * 1.2),
        unit = unit ?: "kg",
        freshness = freshnessPercent ?: 95,
        isFamilyPack = type == "BUNDLE"
    )
}

