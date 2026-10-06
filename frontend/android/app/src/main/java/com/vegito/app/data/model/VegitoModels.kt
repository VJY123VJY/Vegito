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

data class SellerProfileDto(
    val id: Int = 0,
    @SerializedName("user_id") val userId: Int = 0,
    @SerializedName("business_name") val businessName: String = "",
    val description: String? = null,
    @SerializedName("is_verified") val isVerified: Boolean = true,
    @SerializedName("is_available") val isAvailable: Boolean = true,
    @SerializedName("is_active") val isActive: Boolean = true,
    val phone: String? = null,
    val email: String? = null,
    val address: String? = null,
    val city: String? = "Solapur",
    val pincode: String? = "413001",
    val latitude: Double? = null,
    val longitude: Double? = null,
    @SerializedName("updated_at") val updatedAt: String? = null
)

data class SellerProfileUpdateDto(
    @SerializedName("business_name") val businessName: String? = null,
    val description: String? = null,
    @SerializedName("is_available") val isAvailable: Boolean? = null,
    val address: String? = null,
    val city: String? = null,
    val pincode: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null
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

data class UnifiedRegisterRequestDto(
    val name: String,
    val phone: String,
    val password: String,
    val role: String = "CUSTOMER",
    val email: String? = null,
    val address: String? = null,
    val city: String = "Solapur",
    val pincode: String = "413001",
    val latitude: Double? = null,
    val longitude: Double? = null,
    @SerializedName("business_name") val businessName: String? = null,
    @SerializedName("business_address") val businessAddress: String? = null,
    @SerializedName("gst_number") val gstNumber: String? = null,
    val description: String? = null,
    @SerializedName("vehicle_type") val vehicleType: String? = null,
    @SerializedName("vehicle_number") val vehicleNumber: String? = null
)

data class RegisterResponseDto(
    val message: String = "",
    @SerializedName("user_id") val userId: Int = 0,
    val phone: String = "",
    val role: String = "CUSTOMER"
)

data class PasswordLoginRequestDto(
    val phone: String,
    val password: String,
    val role: String? = null
)

data class FavoriteDto(
    val id: Int = 0,
    @SerializedName("user_id") val userId: Int = 0,
    @SerializedName("product_id") val productId: Int = 0,
    @SerializedName("created_at") val createdAt: String? = null
)

data class NotificationDto(
    val id: Int = 0,
    @SerializedName("user_id") val userId: Int = 0,
    @SerializedName("notification_type") val notificationType: String = "ORDER_UPDATE",
    val title: String = "",
    val message: String = "",
    val channel: String = "IN_APP",
    @SerializedName("is_sent") val isSent: Boolean = true,
    @SerializedName("created_at") val createdAt: String = ""
)

data class ReviewCreateDto(
    @SerializedName("order_id") val orderId: Int,
    @SerializedName("product_id") val productId: Int? = null,
    @SerializedName("rating") val rating: Int = 5,
    @SerializedName("product_rating") val productRating: Int? = null,
    @SerializedName("seller_rating") val sellerRating: Int? = null,
    @SerializedName("delivery_rating") val deliveryRating: Int? = null,
    val comment: String? = null,
    @SerializedName("target_type") val targetType: String = "ALL"
)

data class ComplaintCreateDto(
    @SerializedName("order_id") val orderId: Int,
    @SerializedName("complaint_type") val complaintType: String = "QUALITY_ISSUE",
    val description: String
)

data class ComplaintDto(
    val id: Int = 0,
    @SerializedName("order_id") val orderId: Int = 0,
    @SerializedName("complaint_type") val complaintType: String = "",
    val description: String = "",
    val status: String = "PENDING",
    val resolution: String? = null,
    @SerializedName("created_at") val createdAt: String = ""
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
    val latitude: Double? = null,
    val longitude: Double? = null,
    val isDefault: Boolean = false,
    val city: String = "",
    val pincode: String = "",
    val state: String = ""
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
    val sellerLat: Double? = null,
    val sellerLng: Double? = null,
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
    @SerializedName(value = "is_online", alternate = ["is_available"]) val isOnline: Boolean = true,
    @SerializedName(value = "today_sales", alternate = ["today_revenue"]) val todaySales: Double = 0.0,
    @SerializedName(value = "active_orders_count", alternate = ["live_orders"]) val activeOrdersCount: Int = 0,
    @SerializedName(value = "new_orders_count", alternate = ["pending_orders"]) val newOrdersCount: Int = 0,
    @SerializedName(value = "low_stock_count") val lowStockCount: Int = 0,
    @SerializedName(value = "ready_orders") val readyOrdersCount: Int = 0,
    @SerializedName(value = "today_orders") val todayOrdersCount: Int = 0,
    @SerializedName(value = "total_products") val totalProducts: Int = 0
)

data class DeliveryTask(
    val id: String = "",
    val orderId: String = "",
    val orderNumber: String = "",
    val sellerName: String = "",
    val sellerAddress: String = "",
    val sellerLat: Double? = null,
    val sellerLng: Double? = null,
    val customerArea: String = "",
    val customerLat: Double? = null, // Hidden until pickup OTP verified!
    val customerLng: Double? = null, // Hidden until pickup OTP verified!
    val customerAddress: String? = null, // Hidden until pickup OTP verified!
    val distanceKm: Double? = null,
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
            latitude = latitude,
            longitude = longitude,
            isDefault = isDefault,
            city = city,
            pincode = pincode,
            state = state
        )
    }
}

data class DeliveryFeeResponse(
    @SerializedName("address_id") val addressId: Int = 0,
    @SerializedName("distance_km") val distanceKm: Double = 0.0,
    @SerializedName("delivery_fee") val deliveryFee: Double = 0.0,
    @SerializedName("max_allowed_km") val maxAllowedKm: Double = 20.0,
    @SerializedName("seller_online") val sellerOnline: Boolean = true,
    @SerializedName("is_deliverable") val isDeliverable: Boolean = false
)

data class OrderCreateRequest(
    @SerializedName("address_id") val addressId: Int,
    @SerializedName("payment_method") val paymentMethod: String = "COD",
    @SerializedName("coupon_code") val couponCode: String? = null,
    @SerializedName("customer_note") val customerNote: String? = null
)

data class OrderStatusUpdateRequest(
    @SerializedName("status") val status: String,
    @SerializedName("note") val note: String? = null
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
    @SerializedName("shop_latitude") val shopLatitude: Double? = null,
    @SerializedName("shop_longitude") val shopLongitude: Double? = null,
    @SerializedName("customer_latitude") val customerLatitude: Double? = null,
    @SerializedName("customer_longitude") val customerLongitude: Double? = null,
    @SerializedName("shop_name") val shopName: String? = null,
    @SerializedName("customer_name") val customerName: String? = null,
    @SerializedName("items_count") val itemsCount: Int? = null,
    @SerializedName("placed_at") val placedAt: String? = null
) {
    fun toDomainOrder(): Order = Order(
        id = id.toString(),
        orderNumber = orderNumber.ifEmpty { "VEG-$id" },
        status = status,
        totalAmount = totalAmount,
        deliveryFee = deliveryCharge,
        deliveryAddress = SavedAddress(
            addressLine = customerDeliveryAddress.orEmpty(),
            latitude = customerLatitude ?: deliveryLatitude,
            longitude = customerLongitude ?: deliveryLongitude
        ),
        sellerName = shopName ?: "Vegito Hub",
        sellerLat = shopLatitude,
        sellerLng = shopLongitude,
        customerOtp = deliveryOtp,
        pickupOtp = pickupOtp
    )
}

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
        val rawImg = images.firstOrNull()?.imageUrl?.trim() ?: ""
        val catName = category?.name ?: if (categoryId == 2 || (categoryId in 56..60)) "Fruits" else "Vegetables"
        val normalizedImg = when {
            rawImg.startsWith("http://") || rawImg.startsWith("https://") -> rawImg
            rawImg.startsWith("data:image/") -> rawImg
            rawImg.isNotBlank() && rawImg.startsWith("/") -> "http://127.0.0.1:8000" + rawImg
            rawImg.isNotBlank() -> "http://127.0.0.1:8000/" + rawImg
            catName.contains("Fruit", ignoreCase = true) -> "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600"
            catName.contains("Leafy", ignoreCase = true) || catName.contains("Herbs", ignoreCase = true) -> "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600"
            catName.contains("Root", ignoreCase = true) || catName.contains("Tubers", ignoreCase = true) -> "https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=600"
            else -> "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=600"
        }
        val effectivePrice = minPrice ?: (sellerProducts.firstOrNull()?.price ?: 35.0)
        val effectiveStock = sellerProducts.firstOrNull()?.stockQuantity ?: 50.0
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
            imageUrl = normalizedImg,
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
    fun toDomainOffer(): Offer {
        val normImg = when {
            imageUrl.isNullOrBlank() -> "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600"
            imageUrl.startsWith("http://") || imageUrl.startsWith("https://") -> imageUrl
            imageUrl.startsWith("/") -> "http://127.0.0.1:8000" + imageUrl
            else -> "http://127.0.0.1:8000/" + imageUrl
        }
        return Offer(
            id = id.toString(),
            title = title,
            code = "VEGITO${discountPercent ?: 20}",
            discountPercent = discountPercent ?: 15,
            maxDiscount = ((originalPrice ?: price) - price).coerceAtLeast(10.0),
            minOrderAmount = price,
            description = description ?: "Special fresh produce deal",
            imageUrl = normImg,
            productId = productId?.toString(),
            offerPrice = price,
            originalPrice = originalPrice ?: (price * 1.2),
            unit = unit ?: "kg",
            freshness = freshnessPercent ?: 95,
            isFamilyPack = type == "BUNDLE"
        )
    }
}

// ---------------------------------------------------------------------------
// INVENTORY & STOCK MODELS
// ---------------------------------------------------------------------------

data class InventoryItem(
    val id: Int = 0,
    @SerializedName("seller_product_id") val sellerProductId: Int = 0,
    @SerializedName("product_id") val productId: Int? = null,
    @SerializedName("product_name") val productName: String = "",
    val unit: String? = "1 KG",
    val quantity: Double = 0.0,
    @SerializedName("reserved_quantity") val reservedQuantity: Double = 0.0,
    @SerializedName("available_quantity") val availableQuantity: Double = 0.0,
    @SerializedName("low_stock_threshold") val lowStockThreshold: Double = 10.0,
    @SerializedName("is_low_stock") val isLowStock: Boolean = false,
    @SerializedName("updated_at") val updatedAt: String? = null
)

data class InventoryAdjustRequest(
    @SerializedName("quantity_change") val quantityChange: Double,
    @SerializedName("transaction_type") val transactionType: String = "STOCK_IN",
    val note: String? = null
)

// ---------------------------------------------------------------------------
// SELLER PRODUCT MANAGEMENT & ANALYTICS
// ---------------------------------------------------------------------------

data class SellerAddProductRequest(
    @SerializedName("product_name") val productName: String,
    @SerializedName("category_id") val categoryId: Int,
    val unit: String = "1 KG",
    val price: Double,
    @SerializedName("stock_quantity") val stockQuantity: Double,
    @SerializedName("minimum_order_quantity") val minimumOrderQuantity: Double = 1.0,
    @SerializedName("is_available") val isAvailable: Boolean = true,
    val description: String? = null,
    @SerializedName("image_url") val imageUrl: String? = null
)

data class SellerProductUpdateRequest(
    val price: Double? = null,
    @SerializedName("stock_quantity") val stockQuantity: Double? = null,
    @SerializedName("minimum_order_quantity") val minimumOrderQuantity: Double? = null,
    @SerializedName("is_available") val isAvailable: Boolean? = null
)

data class TimeSeriesPointDto(
    val date: String = "",
    val value: Double = 0.0,
    @SerializedName("orders_count") val ordersCount: Int? = null
)

data class TopProductAnalyticsDto(
    @SerializedName("product_id") val productId: Int = 0,
    @SerializedName("product_name") val productName: String = "",
    @SerializedName("total_quantity_sold") val totalQuantitySold: Double = 0.0,
    @SerializedName("total_revenue") val totalRevenue: Double = 0.0,
    @SerializedName("in_stock") val inStock: Double = 0.0
)

// ---------------------------------------------------------------------------
// SELLER B2B BULK ORDERS MODELS
// ---------------------------------------------------------------------------

data class BulkOrderSummary(
    val id: Int = 0,
    @SerializedName("order_number") val orderNumber: String = "",
    val status: String = "BULK_REQUESTED",
    @SerializedName("business_name") val businessName: String? = null,
    @SerializedName("business_type") val businessType: String? = null,
    @SerializedName("delivery_address") val deliveryAddress: String? = null,
    @SerializedName("requested_delivery_date") val requestedDeliveryDate: String? = null,
    @SerializedName("requested_delivery_window") val requestedDeliveryWindow: String? = null,
    @SerializedName("total_amount") val totalAmount: Double = 0.0,
    @SerializedName("quote_total") val quoteTotal: Double? = null,
    @SerializedName("items_count") val itemsCount: Int = 0,
    @SerializedName("items_summary") val itemsSummary: List<BulkOrderItemSummary>? = null,
    val weightKg: Double = 50.0,
    val quotedAmount: Double? = null
)

data class BulkOrderItemSummary(
    @SerializedName("product_name") val productName: String = "",
    val quantity: Double = 0.0,
    val unit: String = "KG"
)

data class BulkOrderDetail(
    val id: Int = 0,
    @SerializedName("order_number") val orderNumber: String = "",
    val status: String = "BULK_REQUESTED",
    @SerializedName("total_amount") val totalAmount: Double = 0.0,
    val business: BusinessSummaryDto? = null,
    val items: List<BulkOrderItemDetail> = emptyList()
)

data class BusinessSummaryDto(
    @SerializedName("business_name") val businessName: String? = null,
    @SerializedName("business_type") val businessType: String? = null,
    val phone: String? = null
)

data class BulkOrderItemDetail(
    val id: Int = 0,
    @SerializedName("product_name") val productName: String = "",
    val quantity: Double = 0.0,
    val unit: String = "KG",
    @SerializedName("unit_price") val unitPrice: Double = 0.0,
    val subtotal: Double = 0.0,
    @SerializedName("available_stock") val availableStock: Double = 0.0,
    @SerializedName("is_sufficient_stock") val isSufficientStock: Boolean = true
)

data class QuotedLineItem(
    @SerializedName("order_item_id") val orderItemId: Int,
    @SerializedName("quoted_unit_price") val quotedUnitPrice: Double,
    @SerializedName("seller_notes") val sellerNotes: String? = null
)

data class SendCustomQuoteRequest(
    val items: List<QuotedLineItem>,
    @SerializedName("delivery_fee") val deliveryFee: Double = 0.0,
    val notes: String? = null,
    @SerializedName("expires_in_hours") val expiresInHours: Int = 24
)

// ---------------------------------------------------------------------------
// DELIVERY PARTNER MODELS
// ---------------------------------------------------------------------------

data class DeliveryTripSummary(
    val orderId: Int = 0,
    val orderNumber: String = "",
    val payout: Double = 0.0,
    val tip: Double = 0.0,
    val distanceKm: Double = 0.0,
    val status: String = "DELIVERED"
)

data class DeliveryEarningsPeriod(
    val deliveries: Int = 0,
    @SerializedName("base_earnings") val baseEarnings: Double = 0.0,
    val failed: Int = 0
)

data class DeliveryEarningsData(
    val today: DeliveryEarningsPeriod = DeliveryEarningsPeriod(),
    @SerializedName("this_week") val thisWeek: DeliveryEarningsPeriod = DeliveryEarningsPeriod(),
    @SerializedName("this_month") val thisMonth: DeliveryEarningsPeriod = DeliveryEarningsPeriod(),
    @SerializedName("total_lifetime") val totalLifetime: DeliveryEarningsPeriod = DeliveryEarningsPeriod(),
    val totalEarnings: Double = 420.0,
    val tips: Double = 35.0,
    val surgeBonus: Double = 25.0,
    val completedOrdersCount: Int = 6,
    val basePay: Double = 360.0,
    val recentTrips: List<DeliveryTripSummary> = emptyList()
)

data class DeliveryPartnerProfileDto(
    val id: Int = 0,
    @SerializedName("user_id") val userId: Int = 0,
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    @SerializedName("vehicle_type") val vehicleType: String? = null,
    @SerializedName("vehicle_number") val vehicleNumber: String? = null,
    @SerializedName("license_number") val licenseNumber: String? = null,
    @SerializedName("is_available") val isAvailable: Boolean = true,
    @SerializedName("is_verified") val isVerified: Boolean = true,
    val rating: Double = 5.0,
    @SerializedName("total_deliveries") val totalDeliveries: Int = 0
)

data class DeliveryPartnerAvailabilityUpdate(
    @SerializedName("is_available") val isAvailable: Boolean
)

data class DeliveryTaskBackendDto(
    val id: Int = 0,
    @SerializedName("order_id") val orderId: Int = 0,
    @SerializedName("order_number") val orderNumber: String? = null,
    @SerializedName("customer_name") val customerName: String? = null,
    @SerializedName("customer_phone") val customerPhone: String? = null,
    @SerializedName("delivery_address") val deliveryAddress: AddressDto? = null,
    val status: String = "ASSIGNED",
    @SerializedName("order_status") val orderStatus: String? = null,
    @SerializedName("shop_name") val shopName: String? = null,
    @SerializedName("shop_address") val shopAddress: String? = null,
    @SerializedName("shop_latitude") val shopLatitude: Double? = null,
    @SerializedName("shop_longitude") val shopLongitude: Double? = null,
    @SerializedName("customer_latitude") val customerLatitude: Double? = null,
    @SerializedName("customer_longitude") val customerLongitude: Double? = null,
    @SerializedName("pickup_verified") val pickupVerified: Boolean = false,
    @SerializedName("is_urgent") val isUrgent: Boolean = false
) {
    fun toDomainTask(): DeliveryTask {
        val addrStr = listOfNotNull(
            deliveryAddress?.addressLine1,
            deliveryAddress?.city,
            deliveryAddress?.pincode
        ).filter { it.isNotBlank() }.joinToString(", ")

        return DeliveryTask(
            id = id.toString(),
            orderId = orderId.toString(),
            orderNumber = orderNumber ?: "VEG-$orderId",
            sellerName = shopName.orEmpty(),
            sellerAddress = shopAddress.orEmpty(),
            sellerLat = shopLatitude,
            sellerLng = shopLongitude,
            customerArea = deliveryAddress?.city.orEmpty(),
            customerAddress = if (pickupVerified) addrStr else null,
            customerLat = if (pickupVerified) (customerLatitude ?: deliveryAddress?.latitude) else null,
            customerLng = if (pickupVerified) (customerLongitude ?: deliveryAddress?.longitude) else null,
            status = status,
            isUrgent = isUrgent,
            isPickupVerified = pickupVerified,
            earnings = 35.0
        )
    }
}

// ---------------------------------------------------------------------------
// ADMIN OPERATIONS MODELS
// ---------------------------------------------------------------------------

data class AdminDashboardMetricsDto(
    val customers: Int = 0,
    val sellers: Int = 0,
    @SerializedName("delivery_partners") val deliveryPartners: Int = 0,
    val orders: Int = 0,
    val revenue: Double = 0.0,
    @SerializedName("pending_orders") val pendingOrders: Int = 0,
    @SerializedName("low_stock") val lowStock: Int = 0,
    @SerializedName("failed_deliveries") val failedDeliveries: Int = 0
)

data class AdminSellerItemDto(
    val id: Int = 0,
    @SerializedName("user_id") val userId: Int = 0,
    @SerializedName("business_name") val businessName: String = "",
    @SerializedName("is_verified") val isVerified: Boolean = false,
    @SerializedName("is_available") val isAvailable: Boolean = true,
    val phone: String? = null,
    val rating: Double = 0.0,
    @SerializedName("total_orders") val totalOrders: Int = 0,
    val city: String? = "Solapur"
)

data class AdminDeliveryPartnerItemDto(
    val id: Int = 0,
    @SerializedName("user_id") val userId: Int = 0,
    val name: String? = null,
    val phone: String? = null,
    @SerializedName("vehicle_type") val vehicleType: String? = null,
    @SerializedName("vehicle_number") val vehicleNumber: String? = null,
    @SerializedName("is_available") val isAvailable: Boolean = false,
    @SerializedName("is_verified") val isVerified: Boolean = false,
    val rating: Double = 5.0,
    @SerializedName("total_deliveries") val totalDeliveries: Int = 0
)
