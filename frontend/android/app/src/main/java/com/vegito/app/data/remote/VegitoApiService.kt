package com.vegito.app.data.remote

import com.vegito.app.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface VegitoApiService {

    // AUTH
    @POST("/api/v1/auth/send-otp")
    suspend fun sendOtp(@Body request: OtpRequest): Response<Map<String, Any>>

    @POST("/api/v1/auth/verify-otp")
    suspend fun verifyOtp(@Body request: OtpVerifyRequest): Response<AuthResponse>

    @GET("/api/v1/auth/me")
    suspend fun getProfile(): Response<UserProfile>

    // CATALOGUE & PRODUCTS
    @GET("/api/v1/categories")
    suspend fun getCategories(): Response<List<Category>>

    @GET("/api/v1/products")
    suspend fun getProducts(
        @Query("category") category: String? = null,
        @Query("search") search: String? = null,
        @Query("freshness_min") freshnessMin: Int? = null
    ): Response<List<Product>>

    @GET("/api/v1/products/{id}")
    suspend fun getProductDetail(@Path("id") productId: String): Response<Product>

    @GET("/api/v1/products/smart-basket")
    suspend fun getSmartBasket(): Response<List<Product>>

    // OFFERS & PROMOTIONS
    @GET("/api/v1/promotions/active")
    suspend fun getActiveOffers(): Response<List<Offer>>

    // CART
    @GET("/api/v1/cart")
    suspend fun getCart(): Response<CartSummary>

    @POST("/api/v1/cart/items")
    suspend fun addToCart(
        @Query("product_id") productId: String,
        @Query("quantity") quantity: Double
    ): Response<CartSummary>

    @DELETE("/api/v1/cart/items/{id}")
    suspend fun removeFromCart(@Path("id") itemId: String): Response<CartSummary>

    // ORDERS & CHECKOUT
    @POST("/api/v1/orders")
    suspend fun createOrder(@Body order: Map<String, Any>): Response<Order>

    @GET("/api/v1/orders")
    suspend fun getCustomerOrders(): Response<List<Order>>

    @GET("/api/v1/orders/{id}")
    suspend fun getOrderDetail(@Path("id") orderId: String): Response<Order>

    // SELLER WORKSPACE
    @GET("/api/v1/seller/dashboard")
    suspend fun getSellerDashboard(): Response<SellerDashboardStats>

    @GET("/api/v1/seller/orders")
    suspend fun getSellerOrders(): Response<List<Order>>

    @PUT("/api/v1/seller/orders/{id}/status")
    suspend fun updateOrderStatus(
        @Path("id") orderId: String,
        @Query("status") status: String
    ): Response<Order>

    @POST("/api/v1/seller/verify-pickup-otp")
    suspend fun verifyPickupOtp(
        @Query("order_id") orderId: String,
        @Query("otp") otp: String
    ): Response<Map<String, Any>>

    // DELIVERY WORKSPACE
    @GET("/api/v1/delivery/tasks")
    suspend fun getDeliveryTasks(): Response<List<DeliveryTask>>

    @POST("/api/v1/delivery/tasks/{id}/accept")
    suspend fun acceptDeliveryTask(@Path("id") taskId: String): Response<DeliveryTask>

    @POST("/api/v1/delivery/tasks/{id}/verify-seller-otp")
    suspend fun verifyDeliverySellerOtp(
        @Path("id") taskId: String,
        @Query("otp") otp: String
    ): Response<DeliveryTask>

    @POST("/api/v1/delivery/tasks/{id}/verify-customer-otp")
    suspend fun verifyDeliveryCustomerOtp(
        @Path("id") taskId: String,
        @Query("otp") otp: String
    ): Response<DeliveryTask>

    // B2B BULK
    @POST("/api/v1/b2b/quote-request")
    suspend fun submitB2BQuote(@Body request: B2BBulkQuoteRequest): Response<Map<String, Any>>

    // ADMIN WORKSPACE
    @GET("/api/v1/admin/analytics")
    suspend fun getAdminAnalytics(): Response<AdminAnalytics>
}
