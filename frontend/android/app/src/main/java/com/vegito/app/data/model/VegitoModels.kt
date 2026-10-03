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
    val isVerified: Boolean = true
)

data class AuthResponse(
    val accessToken: String? = null,
    val tokenType: String? = null,
    val user: UserProfile? = null,
    val message: String? = null
)

data class OtpRequest(
    val phone: String,
    val role: String = "customer"
)

data class OtpVerifyRequest(
    val phone: String,
    val otp: String,
    val role: String = "customer"
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
    val isDefault: Boolean = false
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
