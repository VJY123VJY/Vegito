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
    fun testFirebaseAuthManagerNormalizePhoneNumber() {
        // Test registered test number formatting
        assertEquals("+919876543210", com.vegito.app.data.auth.FirebaseAuthManager.normalizePhoneNumber("9876543210"))
        assertEquals("+919876543210", com.vegito.app.data.auth.FirebaseAuthManager.normalizePhoneNumber("+919876543210"))
        assertEquals("+919876543210", com.vegito.app.data.auth.FirebaseAuthManager.normalizePhoneNumber("919876543210"))

        // Malformed / invalid numbers
        assertNull(com.vegito.app.data.auth.FirebaseAuthManager.normalizePhoneNumber("12345"))
        assertNull(com.vegito.app.data.auth.FirebaseAuthManager.normalizePhoneNumber("5999999999"))
    }

    @Test
    fun testFirebaseAuthManagerErrorMappingNoIndiscriminateBlazeWarning() {
        // BILLING_NOT_ENABLED error mapping
        val billingError = Exception("An internal error has occurred. [ BILLING_NOT_ENABLED ]")
        val billingMsg = com.vegito.app.data.auth.FirebaseAuthManager.mapFirebaseError(billingError)
        assertEquals("Real SMS delivery is not enabled. Please use a registered Firebase test phone number to log in.", billingMsg)
        assertFalse("Must not show Blaze warning banner", billingMsg.contains("Firebase Blaze plan required"))

        // QUOTA_EXCEEDED error mapping
        val quotaError = Exception("QUOTA_EXCEEDED : Exceeded quota.")
        val quotaMsg = com.vegito.app.data.auth.FirebaseAuthManager.mapFirebaseError(quotaError)
        assertEquals("SMS quota exceeded. Please use a registered Firebase test phone number or try again later.", quotaMsg)

        // Invalid code mapping
        val codeError = Exception("The verification code is invalid")
        val codeMsg = com.vegito.app.data.auth.FirebaseAuthManager.mapFirebaseError(codeError)
        assertEquals("Authentication error. Please try again.", codeMsg)

        // Network error mapping
        val netError = Exception("A network error occurred. Please check your internet connection.")
        val netMsg = com.vegito.app.data.auth.FirebaseAuthManager.mapFirebaseError(netError)
        assertEquals("Network connection unavailable. Please check your internet connection.", netMsg)

        // Session expired error mapping
        val expireError = Exception("The sms code session has expired")
        val expireMsg = com.vegito.app.data.auth.FirebaseAuthManager.mapFirebaseError(expireError)
        assertEquals("OTP session expired. Please request a new OTP.", expireMsg)
    }
}
