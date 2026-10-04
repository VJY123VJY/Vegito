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

    @POST("/api/v1/auth/login")
    suspend fun loginWithPassword(@Body request: PasswordLoginRequestDto): Response<ApiResponse<TokenResponseDto>>

    @POST("/api/v1/auth/register")
    suspend fun registerUser(@Body request: UnifiedRegisterRequestDto): Response<ApiResponse<RegisterResponseDto>>

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

    @DELETE("/api/v1/addresses/{id}")
    suspend fun deleteAddress(@Path("id") addressId: Int): Response<ApiResponse<Boolean>>

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
    @GET("/api/v1/seller/dashboard/summary")
    suspend fun getSellerDashboard(): Response<ApiResponse<SellerDashboardStats>>

    @GET("/api/v1/seller/orders")
    suspend fun getSellerOrders(
        @Query("page") page: Int = 1,
        @Query("page_size") pageSize: Int = 50,
        @Query("status") status: String? = null
    ): Response<ApiResponse<PaginatedData<OrderResponseDto>>>

    @PATCH("/api/v1/seller/orders/{id}/status")
    suspend fun updateOrderStatus(
        @Path("id") orderId: Int,
        @Body payload: OrderStatusUpdateRequest
    ): Response<ApiResponse<OrderResponseDto>>

    @POST("/api/v1/seller/verify-pickup-otp")
    suspend fun verifyPickupOtp(
        @Query("order_id") orderId: Int,
        @Query("otp") otp: String
    ): Response<ApiResponse<Map<String, Any>>>

    @GET("/api/v1/seller/profile")
    suspend fun getSellerProfile(): Response<ApiResponse<SellerProfileDto>>

    @PATCH("/api/v1/seller/profile")
    suspend fun updateSellerProfile(@Body request: SellerProfileUpdateDto): Response<ApiResponse<SellerProfileDto>>

    @PATCH("/api/v1/seller/availability")
    suspend fun setSellerAvailability(@Body request: Map<String, Boolean>): Response<ApiResponse<SellerProfileDto>>

    // SELLER PRODUCTS & INVENTORY
    @POST("/api/v1/seller/products")
    suspend fun addSellerProduct(@Body request: SellerAddProductRequest): Response<ApiResponse<Map<String, Any>>>

    @PATCH("/api/v1/seller/products/{id}")
    suspend fun updateSellerProduct(
        @Path("id") sellerProductId: Int,
        @Body request: SellerProductUpdateRequest
    ): Response<ApiResponse<Map<String, Any>>>

    @DELETE("/api/v1/seller/products/{id}")
    suspend fun deleteSellerProduct(@Path("id") sellerProductId: Int): Response<ApiResponse<Boolean>>

    @GET("/api/v1/inventory")
    suspend fun getSellerInventory(
        @Query("low_stock_only") lowStockOnly: Boolean = false,
        @Query("page_size") pageSize: Int = 100
    ): Response<ApiResponse<PaginatedData<InventoryItem>>>

    @POST("/api/v1/inventory/{seller_product_id}/adjust")
    suspend fun adjustInventory(
        @Path("seller_product_id") sellerProductId: Int,
        @Body request: InventoryAdjustRequest
    ): Response<ApiResponse<InventoryItem>>

    // SELLER ANALYTICS
    @GET("/api/v1/seller/revenue-analytics")
    suspend fun getSellerRevenueAnalytics(@Query("range") range: String = "30d"): Response<ApiResponse<List<TimeSeriesPointDto>>>

    @GET("/api/v1/seller/product-analytics")
    suspend fun getSellerTopProductsAnalytics(@Query("limit") limit: Int = 10): Response<ApiResponse<List<TopProductAnalyticsDto>>>

    // SELLER B2B BULK ORDERS
    @GET("/api/v1/seller/bulk-orders")
    suspend fun getSellerBulkOrders(@Query("status") status: String? = null): Response<ApiResponse<List<BulkOrderSummary>>>

    @GET("/api/v1/seller/bulk-orders/{id}")
    suspend fun getSellerBulkOrderDetail(@Path("id") orderId: Int): Response<ApiResponse<BulkOrderDetail>>

    @POST("/api/v1/seller/bulk-orders/{id}/accept")
    suspend fun acceptSellerBulkOrder(@Path("id") orderId: Int): Response<ApiResponse<Map<String, Any>>>

    @POST("/api/v1/seller/bulk-orders/{id}/quote")
    suspend fun sendSellerBulkQuote(
        @Path("id") orderId: Int,
        @Body request: SendCustomQuoteRequest
    ): Response<ApiResponse<Map<String, Any>>>

    @POST("/api/v1/seller/bulk-orders/{id}/reject")
    suspend fun rejectSellerBulkOrder(
        @Path("id") orderId: Int,
        @Body request: Map<String, String>
    ): Response<ApiResponse<Map<String, Any>>>

    // DELIVERY WORKSPACE
    @GET("/api/v1/delivery/tasks")
    suspend fun getDeliveryTasksBackend(): Response<ApiResponse<List<DeliveryTaskBackendDto>>>

    @GET("/api/v1/delivery/tasks")
    suspend fun getDeliveryTasks(): Response<ApiResponse<List<DeliveryTask>>>

    @POST("/api/v1/delivery/orders/{id}/accept")
    suspend fun acceptDeliveryOrder(@Path("id") orderId: Int): Response<ApiResponse<Boolean>>

    @POST("/api/v1/delivery/tasks/{id}/accept")
    suspend fun acceptDeliveryTask(@Path("id") taskId: String): Response<ApiResponse<DeliveryTask>>

    @POST("/api/v1/delivery/tasks/{id}/verify-pickup")
    suspend fun verifyDeliveryTaskPickupOtp(
        @Path("id") taskId: Int,
        @Body payload: Map<String, String>
    ): Response<ApiResponse<Map<String, Any>>>

    @POST("/api/v1/delivery/tasks/{id}/verify-seller-otp")
    suspend fun verifyDeliverySellerOtp(
        @Path("id") taskId: String,
        @Query("otp") otp: String
    ): Response<ApiResponse<DeliveryTask>>

    @POST("/api/v1/delivery/tasks/{id}/verify-otp")
    suspend fun verifyDeliveryCustomerOtpDoorstep(
        @Path("id") taskId: Int,
        @Body payload: Map<String, String>
    ): Response<ApiResponse<Boolean>>

    @POST("/api/v1/delivery/tasks/{id}/verify-customer-otp")
    suspend fun verifyDeliveryCustomerOtp(
        @Path("id") taskId: String,
        @Query("otp") otp: String
    ): Response<ApiResponse<DeliveryTask>>

    @GET("/api/v1/delivery/profile")
    suspend fun getDeliveryProfile(): Response<ApiResponse<DeliveryPartnerProfileDto>>

    @PATCH("/api/v1/delivery/profile")
    suspend fun updateDeliveryProfile(@Body request: Map<String, Any>): Response<ApiResponse<DeliveryPartnerProfileDto>>

    @PATCH("/api/v1/delivery/availability")
    suspend fun setDeliveryAvailability(@Body request: DeliveryPartnerAvailabilityUpdate): Response<ApiResponse<DeliveryPartnerProfileDto>>

    @GET("/api/v1/delivery/earnings")
    suspend fun getDeliveryEarnings(): Response<ApiResponse<DeliveryEarningsData>>

    // B2B BULK (CUSTOMER)
    @POST("/api/v1/b2b/quote-request")
    suspend fun submitB2BQuote(@Body request: B2BBulkQuoteRequest): Response<ApiResponse<Map<String, Any>>>

    // FAVORITES
    @GET("/api/v1/favorites")
    suspend fun getFavorites(): Response<ApiResponse<List<FavoriteDto>>>

    @POST("/api/v1/favorites")
    suspend fun addFavorite(@Query("product_id") productId: Int): Response<ApiResponse<FavoriteDto>>

    @DELETE("/api/v1/favorites/{product_id}")
    suspend fun removeFavorite(@Path("product_id") productId: Int): Response<ApiResponse<Boolean>>

    // NOTIFICATIONS
    @GET("/api/v1/notifications")
    suspend fun getNotifications(@Query("limit") limit: Int = 50): Response<ApiResponse<List<NotificationDto>>>

    // REVIEWS & COMPLAINTS
    @POST("/api/v1/reviews")
    suspend fun submitReview(@Body review: ReviewCreateDto): Response<ApiResponse<Map<String, Any>>>

    @POST("/api/v1/complaints")
    suspend fun createComplaint(@Body complaint: ComplaintCreateDto): Response<ApiResponse<ComplaintDto>>

    @GET("/api/v1/complaints")
    suspend fun getComplaints(): Response<ApiResponse<List<ComplaintDto>>>

    // ADMIN WORKSPACE
    @GET("/api/v1/admin/analytics")
    suspend fun getAdminAnalytics(): Response<ApiResponse<AdminAnalytics>>

    @GET("/api/v1/admin/dashboard")
    suspend fun getAdminDashboardMetrics(): Response<ApiResponse<AdminDashboardMetricsDto>>

    @GET("/api/v1/admin/sellers")
    suspend fun getAdminSellers(
        @Query("q") search: String? = null,
        @Query("is_verified") isVerified: Boolean? = null
    ): Response<ApiResponse<PaginatedData<AdminSellerItemDto>>>

    @POST("/api/v1/admin/sellers/{id}/verify")
    suspend fun verifyAdminSeller(
        @Path("id") sellerId: Int,
        @Query("is_verified") isVerified: Boolean
    ): Response<ApiResponse<Map<String, Any>>>

    @GET("/api/v1/admin/delivery/partners")
    suspend fun getAdminDeliveryPartners(): Response<ApiResponse<List<AdminDeliveryPartnerItemDto>>>

    @POST("/api/v1/admin/delivery/partners/{id}/verify")
    suspend fun verifyAdminDeliveryPartner(
        @Path("id") partnerId: Int,
        @Query("is_verified") isVerified: Boolean
    ): Response<ApiResponse<Map<String, Any>>>
}
