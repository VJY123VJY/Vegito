package com.vegito.app.data.remote

import com.vegito.app.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface VegitoApiService {

    // AUTH
    @POST("/api/v1/auth/send-otp")
    suspend fun sendOtp(@Body request: OtpRequest): Response<ApiResponse<SendOtpResponseDto>>

    @POST("/api/v1/auth/verify-otp")
    suspend fun verifyOtp(@Body request: OtpVerifyRequest): Response<ApiResponse<TokenResponseDto>>

    @GET("/api/v1/auth/me")
    suspend fun getProfile(): Response<ApiResponse<UserProfile>>

    @POST("/api/v1/auth/switch-workspace")
    suspend fun switchWorkspace(@Body request: SwitchWorkspaceDto): Response<ApiResponse<TokenResponseDto>>

    // CATALOGUE & PRODUCTS
    @GET("/api/v1/categories")
    suspend fun getCategories(): Response<ApiResponse<List<CategoryDto>>>

    @GET("/api/v1/products")
    suspend fun getProducts(
        @Query("category_id") categoryId: Int? = null,
        @Query("search") search: String? = null,
        @Query("page_size") pageSize: Int = 100
    ): Response<ApiResponse<PaginatedData<ProductDto>>>

    @GET("/api/v1/products/{id}")
    suspend fun getProductDetail(@Path("id") productId: Int): Response<ApiResponse<ProductDto>>

    // OFFERS & PROMOTIONS
    @GET("/api/v1/promotions")
    suspend fun getActiveOffers(): Response<ApiResponse<List<PromotionDto>>>

    // ADDRESSES
    @GET("/api/v1/addresses")
    suspend fun getAddresses(): Response<ApiResponse<List<AddressDto>>>

    @POST("/api/v1/addresses")
    suspend fun createAddress(@Body address: AddressCreateDto): Response<ApiResponse<AddressDto>>

    // DELIVERY ELIGIBILITY & PRICING
    @GET("/api/v1/orders/delivery-fee")
    suspend fun checkDeliveryFee(
        @Query("address_id") addressId: Int,
        @Query("seller_id") sellerId: Int? = null
    ): Response<ApiResponse<DeliveryFeeResponse>>

    // ORDERS & CHECKOUT
    @POST("/api/v1/orders")
    suspend fun createOrder(@Body order: OrderCreateRequest): Response<ApiResponse<OrderResponseDto>>

    @GET("/api/v1/orders")
    suspend fun getCustomerOrders(): Response<ApiResponse<PaginatedData<OrderResponseDto>>>

    @GET("/api/v1/orders/{id}")
    suspend fun getOrderDetail(@Path("id") orderId: Int): Response<ApiResponse<OrderResponseDto>>

    // SELLER WORKSPACE
    @GET("/api/v1/seller/dashboard")
    suspend fun getSellerDashboard(): Response<ApiResponse<SellerDashboardStats>>

    @GET("/api/v1/seller/orders")
    suspend fun getSellerOrders(): Response<ApiResponse<List<OrderResponseDto>>>

    @PUT("/api/v1/seller/orders/{id}/status")
    suspend fun updateOrderStatus(
        @Path("id") orderId: Int,
        @Query("status") status: String
    ): Response<ApiResponse<OrderResponseDto>>

    @POST("/api/v1/seller/verify-pickup-otp")
    suspend fun verifyPickupOtp(
        @Query("order_id") orderId: Int,
        @Query("otp") otp: String
    ): Response<ApiResponse<Map<String, Any>>>

    // DELIVERY WORKSPACE
    @GET("/api/v1/delivery/tasks")
    suspend fun getDeliveryTasks(): Response<ApiResponse<List<DeliveryTask>>>

    @POST("/api/v1/delivery/tasks/{id}/accept")
    suspend fun acceptDeliveryTask(@Path("id") taskId: String): Response<ApiResponse<DeliveryTask>>

    @POST("/api/v1/delivery/tasks/{id}/verify-seller-otp")
    suspend fun verifyDeliverySellerOtp(
        @Path("id") taskId: String,
        @Query("otp") otp: String
    ): Response<ApiResponse<DeliveryTask>>

    @POST("/api/v1/delivery/tasks/{id}/verify-customer-otp")
    suspend fun verifyDeliveryCustomerOtp(
        @Path("id") taskId: String,
        @Query("otp") otp: String
    ): Response<ApiResponse<DeliveryTask>>

    // B2B BULK
    @POST("/api/v1/b2b/quote-request")
    suspend fun submitB2BQuote(@Body request: B2BBulkQuoteRequest): Response<ApiResponse<Map<String, Any>>>

    // ADMIN WORKSPACE
    @GET("/api/v1/admin/analytics")
    suspend fun getAdminAnalytics(): Response<ApiResponse<AdminAnalytics>>
}
