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
}
