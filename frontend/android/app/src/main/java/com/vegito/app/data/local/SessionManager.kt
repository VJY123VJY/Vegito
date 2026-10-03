package com.vegito.app.data.local

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.vegito.app.data.model.SavedAddress
import com.vegito.app.data.model.UserProfile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class SessionManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("vegito_secure_session", Context.MODE_PRIVATE)
    private val gson = Gson()

    val tokenFlow = MutableStateFlow<String?>(getToken())
    val userFlow = MutableStateFlow<UserProfile?>(getUser())
    val roleFlow = MutableStateFlow<String>(getActiveRole())
    val languageFlow = MutableStateFlow<String>(getLanguage())
    val themeFlow = MutableStateFlow<String>(getThemeMode())
    val selectedAddressFlow = MutableStateFlow<SavedAddress?>(getSelectedAddress())

    fun saveAuthToken(token: String) {
        prefs.edit().putString(KEY_TOKEN, token).apply()
        tokenFlow.value = token
    }

    fun getToken(): String? = prefs.getString(KEY_TOKEN, null)

    fun saveUser(user: UserProfile) {
        val json = gson.toJson(user)
        prefs.edit().putString(KEY_USER, json).apply()
        userFlow.value = user
        saveActiveRole(user.activeRole)
    }

    fun getUser(): UserProfile? {
        val json = prefs.getString(KEY_USER, null) ?: return null
        return try {
            gson.fromJson(json, UserProfile::class.java)
        } catch (e: Exception) {
            null
        }
    }

    fun saveActiveRole(role: String) {
        prefs.edit().putString(KEY_ROLE, role).apply()
        roleFlow.value = role
    }

    fun getActiveRole(): String = prefs.getString(KEY_ROLE, "customer") ?: "customer"

    fun setLanguage(langCode: String) { // "en", "mr", "hi"
        prefs.edit().putString(KEY_LANGUAGE, langCode).apply()
        languageFlow.value = langCode
    }

    fun getLanguage(): String = prefs.getString(KEY_LANGUAGE, "en") ?: "en"

    fun setThemeMode(mode: String) { // "LIGHT", "DARK", "SYSTEM"
        prefs.edit().putString(KEY_THEME, mode).apply()
        themeFlow.value = mode
    }

    fun getThemeMode(): String = prefs.getString(KEY_THEME, "LIGHT") ?: "LIGHT"

    fun saveSelectedAddress(address: SavedAddress) {
        val json = gson.toJson(address)
        prefs.edit().putString(KEY_ADDRESS, json).apply()
        selectedAddressFlow.value = address
    }

    fun getSelectedAddress(): SavedAddress? {
        val json = prefs.getString(KEY_ADDRESS, null) ?: return null
        return try {
            gson.fromJson(json, SavedAddress::class.java)
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Customer Data Isolation rule: On logout, clear token, user profile, cart,
     * and cached user data so a new login starts with a fresh user state.
     */
    fun clearSession() {
        prefs.edit().clear().apply()
        tokenFlow.value = null
        userFlow.value = null
        roleFlow.value = "customer"
        selectedAddressFlow.value = null
    }

    companion object {
        private const val KEY_TOKEN = "auth_token"
        private const val KEY_USER = "user_profile"
        private const val KEY_ROLE = "active_role"
        private const val KEY_LANGUAGE = "app_language"
        private const val KEY_THEME = "app_theme"
        private const val KEY_ADDRESS = "selected_address"
    }
}
