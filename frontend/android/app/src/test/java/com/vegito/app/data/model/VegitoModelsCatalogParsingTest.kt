package com.vegito.app.data.model

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Test

class VegitoModelsCatalogParsingTest {
    @Test
    fun parsesBackendProductAndPaginationEnvelope() {
        val json = """
            {
              "success": true,
              "data": {
                "items": [{
                  "id": 5,
                  "name": "Fresh Tomato",
                  "category_id": 1,
                  "unit": "1 KG",
                  "is_active": true,
                  "images": [{
                    "id": 2,
                    "image_url": "https://images.example/tomato.jpg",
                    "is_primary": true
                  }],
                  "category": {"id": 1, "name": "Vegetables"},
                  "seller_products": [{
                    "seller_product_id": 42,
                    "seller_id": 9,
                    "seller_business_name": "Market Seller",
                    "price": 32.5,
                    "stock_quantity": 7.0,
                    "is_available": true
                  }]
                }],
                "meta": {
                  "total_items": 1,
                  "page": 1,
                  "page_size": 100,
                  "total_pages": 1,
                  "has_next": false,
                  "has_previous": false
                }
              }
            }
        """.trimIndent()
        val responseType = object : TypeToken<ApiResponse<PaginatedData<ProductDto>>>() {}.type

        val response: ApiResponse<PaginatedData<ProductDto>> = Gson().fromJson(json, responseType)

        assertEquals(true, response.success)
        assertNotNull(response.data)
        val page = requireNotNull(response.data)
        assertEquals(1, page.items.size)
        assertNotNull(page.meta)
        assertEquals(1, requireNotNull(page.meta).totalItems)
        assertEquals(1, requireNotNull(page.meta).totalPages)

        val product = page.items.single().toDomainProduct()
        assertEquals("Fresh Tomato", product.name)
        assertEquals("Vegetables", product.category)
        assertEquals(32.5, product.price, 0.0)
        assertEquals("9", product.sellerId)
        assertEquals("42", product.sellerProductId)
        assertFalse(product.imageUrl.isBlank())
    }

    @Test
    fun testRealBackendDecimalStringPayload() {
        val liveJson = """
            {
              "success": true,
              "message": "Success",
              "data": {
                "items": [
                  {
                    "name": "Organic Tomato",
                    "category_id": 1,
                    "description": "Juicy red tomatoes",
                    "unit": "1 KG",
                    "shelf_life_days": 7,
                    "freshness_category": null,
                    "is_active": true,
                    "id": 266,
                    "created_at": "2026-10-06T06:30:16.846948Z",
                    "updated_at": "2026-10-06T06:30:16.846948Z",
                    "category": {
                      "name": "Vegetables",
                      "description": "Fresh harvest",
                      "id": 1,
                      "created_at": "2026-10-01T00:00:00Z"
                    },
                    "images": [
                      {
                        "image_url": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb",
                        "is_primary": true,
                        "display_order": 1,
                        "id": 5,
                        "product_id": 266,
                        "created_at": "2026-10-06T06:30:16.846948Z"
                      }
                    ],
                    "min_price": "50.00",
                    "is_in_stock": true,
                    "seller_products": [
                      {
                        "seller_product_id": 369,
                        "seller_id": 1304,
                        "seller_business_name": "Shree Ganesh Store",
                        "seller_rating": "4.80",
                        "price": "50.00",
                        "stock_quantity": "100.000",
                        "minimum_order_quantity": "1.000",
                        "is_available": true
                      }
                    ],
                    "market_price": {
                      "reference_price": "32.00",
                      "suggested_range_min": "26.00",
                      "suggested_range_max": "38.00",
                      "unit": "1 KG",
                      "market": "Solapur APMC Mandi",
                      "trend": "STABLE",
                      "demand_signal": "NORMAL",
                      "source": "MSAMB / Solapur APMC",
                      "updated_date": "2026-10-06"
                    }
                  }
                ],
                "meta": {
                  "total_items": 1,
                  "page": 1,
                  "page_size": 20,
                  "total_pages": 1,
                  "has_next": false,
                  "has_previous": false
                }
              }
            }
        """.trimIndent()
        val responseType = object : TypeToken<ApiResponse<PaginatedData<ProductDto>>>() {}.type
        val response: ApiResponse<PaginatedData<ProductDto>> = Gson().fromJson(liveJson, responseType)

        assertEquals(true, response.success)
        val item = response.data!!.items.first()
        val domain = item.toDomainProduct()
        assertEquals("Organic Tomato", domain.name)
        assertEquals(50.0, domain.price, 0.001)
        assertEquals(100.0, domain.stockQuantity, 0.001)
        assertEquals("1304", domain.sellerId)
        assertEquals("369", domain.sellerProductId)
        assertEquals(true, domain.isPurchasable)
    }
}
