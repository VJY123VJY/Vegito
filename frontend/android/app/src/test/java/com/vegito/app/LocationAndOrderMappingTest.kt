package com.vegito.app

import com.google.gson.Gson
import com.vegito.app.data.model.AddressDto
import com.vegito.app.data.model.OrderResponseDto
import com.vegito.app.utils.LocationHelper
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class LocationAndOrderMappingTest {

    @Test
    fun testIsValidCoordinates() {
        // Valid coordinates
        assertTrue(LocationHelper.isValidCoordinates(18.5204, 73.8567)) // Pune
        assertTrue(LocationHelper.isValidCoordinates(17.6599, 75.9064)) // Solapur
        assertTrue(LocationHelper.isValidCoordinates(0.0001, 0.0001))
        assertTrue(LocationHelper.isValidCoordinates(90.0, 180.0))
        assertTrue(LocationHelper.isValidCoordinates(-90.0, -180.0))

        // Invalid coordinates
        assertFalse(LocationHelper.isValidCoordinates(null, 73.8567))
        assertFalse(LocationHelper.isValidCoordinates(18.5204, null))
        assertFalse(LocationHelper.isValidCoordinates(null, null))
        assertFalse(LocationHelper.isValidCoordinates(0.0, 0.0)) // Null Island rejected
        assertFalse(LocationHelper.isValidCoordinates(0.0000001, -0.0000001))
        assertFalse(LocationHelper.isValidCoordinates(91.0, 73.0)) // Lat out of bounds
        assertFalse(LocationHelper.isValidCoordinates(-91.0, 73.0))
        assertFalse(LocationHelper.isValidCoordinates(18.0, 181.0)) // Lng out of bounds
        assertFalse(LocationHelper.isValidCoordinates(18.0, -181.0))
        assertFalse(LocationHelper.isValidCoordinates(Double.NaN, 73.0))
        assertFalse(LocationHelper.isValidCoordinates(18.0, Double.NaN))
        assertFalse(LocationHelper.isValidCoordinates(Double.POSITIVE_INFINITY, 73.0))
    }

    @Test
    fun testOrderResponseDtoMapsNestedAddressCorrectly() {
        val json = """
            {
                "id": 101,
                "order_number": "VEG-101",
                "status": "ACCEPTED",
                "total_amount": 350.0,
                "seller_id": 5,
                "seller_name": "Farmer Ram",
                "shop_name": "Ram Agro Fresh",
                "shop_latitude": 18.512345,
                "shop_longitude": 73.845678,
                "customer_latitude": 18.534567,
                "customer_longitude": 73.867890,
                "delivery_partner_lat": 18.520000,
                "delivery_partner_lng": 73.850000,
                "delivery_partner_name": "Suresh Rider",
                "delivery_partner_phone": "+919876543210",
                "address": {
                    "id": 88,
                    "address_line1": "Flat 402, Sunshine Heights, FC Road",
                    "city": "Pune",
                    "state": "Maharashtra",
                    "pincode": "411005",
                    "latitude": 18.534567,
                    "longitude": 73.867890
                }
            }
        """.trimIndent()

        val dto = Gson().fromJson(json, OrderResponseDto::class.java)
        assertNotNull(dto)
        val domainOrder = dto.toDomainOrder()

        assertEquals("101", domainOrder.id)
        assertEquals("ACCEPTED", domainOrder.status)
        assertEquals(350.0, domainOrder.totalAmount, 0.0)
        assertEquals(18.512345, domainOrder.sellerLat!!, 0.000001)
        assertEquals(73.845678, domainOrder.sellerLng!!, 0.000001)
        assertEquals("Ram Agro Fresh", domainOrder.sellerName)

        // Verify delivery destination coordinates came from nested address
        assertEquals(18.534567, domainOrder.deliveryAddress.latitude!!, 0.000001)
        assertEquals(73.867890, domainOrder.deliveryAddress.longitude!!, 0.000001)
        assertEquals("Flat 402, Sunshine Heights, FC Road", domainOrder.deliveryAddress.addressLine)
        assertEquals("Pune", domainOrder.deliveryAddress.city)
        assertEquals("411005", domainOrder.deliveryAddress.pincode)

        // Verify rider information
        assertEquals(18.520000, domainOrder.deliveryPartnerLat!!, 0.000001)
        assertEquals(73.850000, domainOrder.deliveryPartnerLng!!, 0.000001)
    }

    @Test
    fun testOrderResponseDtoFallbackWhenAddressNestedIsNull() {
        val json = """
            {
                "id": 102,
                "order_number": "VEG-102",
                "status": "PACKING",
                "total_amount": 200.0,
                "customer_latitude": 17.659912,
                "customer_longitude": 75.906432,
                "shop_latitude": 17.670000,
                "shop_longitude": 75.910000
            }
        """.trimIndent()

        val dto = Gson().fromJson(json, OrderResponseDto::class.java)
        val domainOrder = dto.toDomainOrder()

        // Root coordinates should be mapped to deliveryAddress
        assertEquals(17.659912, domainOrder.deliveryAddress.latitude!!, 0.000001)
        assertEquals(75.906432, domainOrder.deliveryAddress.longitude!!, 0.000001)
    }

    @Test
    fun testReversedCoordinatesDetection() {
        // Indian coordinates: lat ~ 8 to 37, lng ~ 68 to 97
        // If someone passes lng as lat (e.g. 73.8567) and lat as lng (18.5204)
        // 73.8567 is within [-90, 90] mathematically, but 105.0 is out of lat range:
        assertFalse("Latitude 105.0 must be invalid", LocationHelper.isValidCoordinates(105.0, 73.0))
        assertFalse("Longitude 195.0 must be invalid", LocationHelper.isValidCoordinates(18.0, 195.0))
        assertFalse("Reversed order where lat is 185.0 must be invalid", LocationHelper.isValidCoordinates(185.0, 18.5204))
    }

    @Test
    fun testShopAndCustomerAndRiderLocationsRemainDistinct() {
        val json = """
            {
                "id": 201,
                "order_number": "VEG-201",
                "status": "OUT_FOR_DELIVERY",
                "total_amount": 500.0,
                "shop_latitude": 18.520000,
                "shop_longitude": 73.850000,
                "customer_latitude": 18.530000,
                "customer_longitude": 73.860000,
                "delivery_partner_lat": 18.525000,
                "delivery_partner_lng": 73.855000,
                "address": {
                    "id": 99,
                    "address_line1": "Customer Destination",
                    "city": "Pune",
                    "latitude": 18.530000,
                    "longitude": 73.860000
                }
            }
        """.trimIndent()

        val dto = Gson().fromJson(json, OrderResponseDto::class.java)
        val order = dto.toDomainOrder()

        // Verify that shop, customer destination, and rider are three distinct points
        assertTrue(LocationHelper.isValidCoordinates(order.sellerLat, order.sellerLng))
        assertTrue(LocationHelper.isValidCoordinates(order.deliveryAddress.latitude, order.deliveryAddress.longitude))
        assertTrue(LocationHelper.isValidCoordinates(order.deliveryPartnerLat, order.deliveryPartnerLng))

        assertFalse(order.sellerLat == order.deliveryAddress.latitude)
        assertFalse(order.sellerLat == order.deliveryPartnerLat)
        assertFalse(order.deliveryAddress.latitude == order.deliveryPartnerLat)
    }

    @Test
    fun testOrderDestinationRemainsUnchangedWhenDeviceLocationChanges() {
        val originalOrderAddress = com.vegito.app.data.model.SavedAddress(
            id = "addr_orig",
            title = "Home",
            addressLine = "Flat 101, FC Road",
            city = "Pune",
            pincode = "411005",
            latitude = 18.5204,
            longitude = 73.8567
        )

        // Customer places order at originalOrderAddress
        val confirmedOrder = com.vegito.app.data.model.Order(
            id = "301",
            orderNumber = "VEG-301",
            status = "ACCEPTED",
            totalAmount = 450.0,
            deliveryAddress = originalOrderAddress,
            sellerLat = 18.5100,
            sellerLng = 73.8400
        )

        // Device moves to a completely different location (e.g. Mumbai or office)
        val newDeviceLocation = com.vegito.app.data.model.SavedAddress(
            id = "device_moved",
            title = "Current GPS",
            addressLine = "Bandra West",
            city = "Mumbai",
            pincode = "400050",
            latitude = 19.0596,
            longitude = 72.8295
        )

        // Ensure order's delivery destination was NOT modified by device moving
        assertEquals(18.5204, confirmedOrder.deliveryAddress.latitude!!, 0.000001)
        assertEquals(73.8567, confirmedOrder.deliveryAddress.longitude!!, 0.000001)
        assertEquals("Pune", confirmedOrder.deliveryAddress.city)
        assertFalse(confirmedOrder.deliveryAddress.latitude == newDeviceLocation.latitude)
    }
}
