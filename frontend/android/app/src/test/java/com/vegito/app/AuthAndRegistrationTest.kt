package com.vegito.app

import com.vegito.app.data.model.AddressCreateDto
import com.vegito.app.data.model.UnifiedRegisterRequestDto
import com.vegito.app.data.model.UserProfile
import com.vegito.app.utils.PhoneUtils
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthAndRegistrationTest {

    @Test
    fun testIndianPhoneNumberNormalization() {
        // Valid 10-digit Indian numbers starting with 6, 7, 8, 9
        assertEquals("+919876543210", PhoneUtils.normalizePhoneNumber("9876543210"))
        assertEquals("+918765432109", PhoneUtils.normalizePhoneNumber("8765432109"))
        assertEquals("+917654321098", PhoneUtils.normalizePhoneNumber("7654321098"))
        assertEquals("+916543210987", PhoneUtils.normalizePhoneNumber("6543210987"))

        // Already with 91 prefix
        assertEquals("+919876543210", PhoneUtils.normalizePhoneNumber("919876543210"))

        // Clean formatting with spaces, dashes, parentheses
        assertEquals("+919876543210", PhoneUtils.normalizePhoneNumber("+91 (98765) 43210"))

        // Invalid numbers
        assertNull("Invalid leading digit 5", PhoneUtils.normalizePhoneNumber("5876543210"))
        assertNull("Too short", PhoneUtils.normalizePhoneNumber("987654321"))
        assertNull("Too long", PhoneUtils.normalizePhoneNumber("987654321000"))
        assertNull("Non-numeric", PhoneUtils.normalizePhoneNumber("abcdefghij"))
    }

    @Test
    fun testNoHardcodedDefaultsInRegistrationDtos() {
        // Ensure no hidden fallback to Solapur or 413001
        val registerReq = UnifiedRegisterRequestDto(
            name = "Test User",
            phone = "9876543210",
            password = "SecretPassword123"
        )
        assertEquals("", registerReq.city)
        assertEquals("", registerReq.pincode)

        val addressCreate = AddressCreateDto(
            addressLine1 = "Flat 101, Test Street",
            city = "Pune"
        )
        assertEquals("", addressCreate.pincode)

        val userProfile = UserProfile(
            name = "Test",
            phone = "9876543210"
        )
        assertEquals("Test", userProfile.name)
        assertEquals("9876543210", userProfile.phone)
    }

    @Test
    fun testOtpCodeValidation() {
        val validOtp = "123456"
        assertTrue(validOtp.length == 6 && validOtp.all { it.isDigit() })

        val tooShortOtp = "12345"
        assertFalse(tooShortOtp.length == 6 && tooShortOtp.all { it.isDigit() })

        val alphaOtp = "12345A"
        assertFalse(alphaOtp.length == 6 && alphaOtp.all { it.isDigit() })
    }

    @Test
    fun testOtpRequestAndResponseDtos() {
        val otpReq = com.vegito.app.data.model.OtpRequest(phone = "9876543210", role = "customer")
        assertEquals("9876543210", otpReq.phone)
        assertEquals("customer", otpReq.role)

        val otpVerifyReq = com.vegito.app.data.model.OtpVerifyRequest(
            phone = "9876543210",
            otp = "123456",
            role = "customer",
            name = "Test User"
        )
        assertEquals("9876543210", otpVerifyReq.phone)
        assertEquals("123456", otpVerifyReq.otp)
        assertEquals("customer", otpVerifyReq.role)
        assertEquals("Test User", otpVerifyReq.name)

        val json = com.google.gson.Gson().toJson(otpVerifyReq)
        assertTrue(json.contains("\"otp\":\"123456\""))
        assertTrue(json.contains("\"phone\":\"9876543210\""))
    }

    @Test
    fun testPhoneUtilsMasking() {
        assertEquals("******4359", PhoneUtils.maskPhoneNumber("9309424359"))
        assertEquals("******3210", PhoneUtils.maskPhoneNumber("+919876543210"))
        assertEquals("******", PhoneUtils.maskPhoneNumber("123"))
    }

    @Test
    fun testIndianPhoneNumberE164Formatting() {
        // Specifically verify formatting for 9309424359
        val normalized = PhoneUtils.normalizePhoneNumber("9309424359")
        assertEquals("+919309424359", normalized)

        val normalizedWithCountryCode = PhoneUtils.normalizePhoneNumber("+919309424359")
        assertEquals("+919309424359", normalizedWithCountryCode)
    }

    @Test
    fun testNetworkErrorClassification() {
        val connectErr = java.net.ConnectException("Failed to connect to /127.0.0.1:8000")
        val (catConnect, msgConnect) = com.vegito.app.data.repository.VegitoRepository.classifyNetworkError(connectErr)
        assertEquals("CONNECTION_REFUSED", catConnect)
        assertTrue(msgConnect.contains("Cannot connect to Vegito server"))

        val dnsErr = java.net.UnknownHostException("api.vegito.com")
        val (catDns, msgDns) = com.vegito.app.data.repository.VegitoRepository.classifyNetworkError(dnsErr)
        assertEquals("DNS_FAILURE", catDns)
        assertTrue(msgDns.contains("Unable to resolve"))

        val timeoutErr = java.net.SocketTimeoutException("timeout")
        val (catTimeout, msgTimeout) = com.vegito.app.data.repository.VegitoRepository.classifyNetworkError(timeoutErr)
        assertEquals("TIMEOUT", catTimeout)
        assertTrue(msgTimeout.contains("timed out"))

        val sslErr = javax.net.ssl.SSLHandshakeException("handshake failed")
        val (catSsl, msgSsl) = com.vegito.app.data.repository.VegitoRepository.classifyNetworkError(sslErr)
        assertEquals("TLS_ERROR", catSsl)
        assertTrue(msgSsl.contains("Secure connection to Vegito failed"))

        val noRouteErr = java.net.NoRouteToHostException("no route")
        val (catRoute, msgRoute) = com.vegito.app.data.repository.VegitoRepository.classifyNetworkError(noRouteErr)
        assertEquals("NO_ROUTE", catRoute)
        assertTrue(msgRoute.contains("No network route"))
    }

    @Test
    fun testAuthErrorMessageMapping() {
        // Status code fallbacks when body has no custom message
        assertTrue(com.vegito.app.data.repository.VegitoRepository.authErrorMessage(400, null).contains("check the entered information"))
        assertTrue(com.vegito.app.data.repository.VegitoRepository.authErrorMessage(401, null).contains("Invalid credentials"))
        assertTrue(com.vegito.app.data.repository.VegitoRepository.authErrorMessage(403, null).contains("not authorized"))
        assertTrue(com.vegito.app.data.repository.VegitoRepository.authErrorMessage(404, null).contains("endpoint was not found"))
        assertTrue(com.vegito.app.data.repository.VegitoRepository.authErrorMessage(422, null).contains("Invalid request parameters"))
        assertTrue(com.vegito.app.data.repository.VegitoRepository.authErrorMessage(429, null).contains("Too many attempts"))
        assertTrue(com.vegito.app.data.repository.VegitoRepository.authErrorMessage(500, null).contains("internal error"))
        assertTrue(com.vegito.app.data.repository.VegitoRepository.authErrorMessage(503, null).contains("temporarily unavailable"))
    }

    @Test
    fun testBackendMessageParsing() {
        // Backend error response format: {"error": {"message": "Invalid mobile number format."}}
        val json1 = "{\"success\":false,\"error\":{\"code\":\"BAD_REQUEST\",\"message\":\"Invalid mobile number format.\"},\"detail\":\"Invalid mobile number format.\"}"
        assertEquals("Invalid mobile number format.", com.vegito.app.data.repository.VegitoRepository.parseBackendMessage(json1))

        // Backend detail string: {"detail": "SMS delivery to this number is restricted."}
        val json2 = "{\"detail\":\"SMS delivery to this number is restricted.\"}"
        assertEquals("SMS delivery to this number is restricted.", com.vegito.app.data.repository.VegitoRepository.parseBackendMessage(json2))

        // FastAPI validation details: {"detail":[{"loc":["body","phone"],"msg":"Phone field is required"}]}
        val json3 = "{\"detail\":[{\"loc\":[\"body\",\"phone\"],\"msg\":\"Phone field is required\"}]}"
        assertEquals("Phone field is required", com.vegito.app.data.repository.VegitoRepository.parseBackendMessage(json3))

        // Custom error with details array: {"error":{"message":"Validation error","details":[{"msg":"Invalid 10-digit number"}]}}
        val json4 = "{\"error\":{\"message\":\"Validation error\",\"details\":[{\"msg\":\"Invalid 10-digit number\"}]}}"
        assertEquals("Invalid 10-digit number", com.vegito.app.data.repository.VegitoRepository.parseBackendMessage(json4))
    }

    @Test
    fun testSanitizeLogMessage() {
        val sensitive = "{\"phone\":\"9309424359\",\"otp\":\"123456\",\"token\":\"jwt.abc.xyz\"}"
        val sanitized = com.vegito.app.data.repository.VegitoRepository.sanitizeLogMessage(sensitive)
        assertFalse(sanitized!!.contains("123456"))
        assertFalse(sanitized.contains("jwt.abc.xyz"))
        assertFalse(sanitized.contains("9309424359"))
    }
}
