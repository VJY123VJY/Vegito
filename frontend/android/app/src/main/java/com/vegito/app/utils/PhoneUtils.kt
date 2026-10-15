package com.vegito.app.utils

object PhoneUtils {
    /**
     * Normalizes an Indian phone number to strict E.164 (+91XXXXXXXXXX) format.
     * Rejects invalid or malformed numbers.
     */
    fun normalizePhoneNumber(rawPhone: String): String? {
        val digits = rawPhone.filter { it.isDigit() }
        return when {
            digits.length == 10 && digits.matches(Regex("^[6-9]\\d{9}$")) -> {
                "+91$digits"
            }
            digits.length == 12 && digits.startsWith("91") && digits.substring(2).matches(Regex("^[6-9]\\d{9}$")) -> {
                "+$digits"
            }
            else -> null
        }
    }

    /**
     * Masks a phone number for privacy display (e.g., +91 ••••• •1234 or ******1234).
     */
    fun maskPhoneNumber(phone: String): String {
        val clean = phone.trim()
        return if (clean.length >= 4) {
            "******" + clean.takeLast(4)
        } else {
            "******"
        }
    }
}
