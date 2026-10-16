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
}
