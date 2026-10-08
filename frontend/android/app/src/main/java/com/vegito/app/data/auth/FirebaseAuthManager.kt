package com.vegito.app.data.auth

import android.app.Activity
import android.util.Log
import com.google.android.gms.tasks.Tasks
import com.google.firebase.FirebaseException
import com.google.firebase.FirebaseTooManyRequestsException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthInvalidCredentialsException
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

object FirebaseAuthManager {

    private const val TAG = "VegitoAuth"
    private const val TIMEOUT_SECONDS = 60L

    val auth: FirebaseAuth
        get() = FirebaseAuth.getInstance()

    sealed interface SendOtpResult {
        data class CodeSent(
            val verificationId: String,
            val resendToken: PhoneAuthProvider.ForceResendingToken?
        ) : SendOtpResult

        data class InstantVerification(
            val firebaseIdToken: String
        ) : SendOtpResult

        data class Error(val message: String) : SendOtpResult
    }

    sealed interface VerifyOtpResult {
        data class Success(val firebaseIdToken: String) : VerifyOtpResult
        data class Error(val message: String) : VerifyOtpResult
    }

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
     * Initiates Firebase phone number verification using PhoneAuthProvider.
     */
    fun sendVerificationCode(
        activity: Activity,
        phoneNumberE164: String,
        resendToken: PhoneAuthProvider.ForceResendingToken? = null,
        onCodeSent: (verificationId: String, token: PhoneAuthProvider.ForceResendingToken?) -> Unit,
        onInstantVerified: (firebaseIdToken: String) -> Unit,
        onError: (errorMessage: String) -> Unit
    ) {
        val callbacks = object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
            override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                Log.i(TAG, "Firebase instant verification completed")
                // Sign in immediately using the credential and extract Firebase ID token
                auth.signInWithCredential(credential)
                    .addOnCompleteListener(activity) { signInTask ->
                        if (signInTask.isSuccessful) {
                            val user = auth.currentUser
                            if (user != null) {
                                user.getIdToken(true).addOnCompleteListener(activity) { tokenTask ->
                                    if (tokenTask.isSuccessful && tokenTask.result?.token != null) {
                                        Log.i(TAG, "Firebase authentication successful")
                                        onInstantVerified(tokenTask.result.token!!)
                                    } else {
                                        onError("Failed to obtain secure authentication token. Please try again.")
                                    }
                                }
                            } else {
                                onError("Authentication failed. Please try again.")
                            }
                        } else {
                            val msg = mapFirebaseError(signInTask.exception)
                            onError(msg)
                        }
                    }
            }

            override fun onVerificationFailed(exception: FirebaseException) {
                val errorCode = (exception as? com.google.firebase.auth.FirebaseAuthException)?.errorCode ?: "UNKNOWN_CODE"
                val errorMsg = exception.message ?: "No error message"
                Log.e(TAG, "EXCEPT_CLASS: ${exception.javaClass.name}, CODE: $errorCode, MESSAGE: $errorMsg", exception)
                val message = mapFirebaseError(exception)
                onError(message)
            }

            override fun onCodeSent(
                verificationId: String,
                token: PhoneAuthProvider.ForceResendingToken
            ) {
                Log.i(TAG, "OTP sent successfully via Firebase")
                onCodeSent(verificationId, token)
            }

            override fun onCodeAutoRetrievalTimeOut(verificationId: String) {
                Log.d(TAG, "Firebase SMS auto-retrieval timed out")
            }
        }

        val optionsBuilder = PhoneAuthOptions.newBuilder(auth)
            .setPhoneNumber(phoneNumberE164)
            .setTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .setActivity(activity)
            .setCallbacks(callbacks)

        if (resendToken != null) {
            optionsBuilder.setForceResendingToken(resendToken)
        }

        Log.i(TAG, "OTP verification started")
        PhoneAuthProvider.verifyPhoneNumber(optionsBuilder.build())
    }

    /**
     * Signs in with the verification ID and user-entered 6-digit OTP code,
     * and fetches the verified Firebase ID Token.
     */
    suspend fun verifyOtpAndGetIdToken(
        verificationId: String,
        otpCode: String
    ): VerifyOtpResult = withContext(Dispatchers.IO) {
        try {
            val credential = PhoneAuthProvider.getCredential(verificationId, otpCode.trim())
            val signInResult = Tasks.await(auth.signInWithCredential(credential), 20, TimeUnit.SECONDS)
            val user = signInResult.user
                ?: return@withContext VerifyOtpResult.Error("Authentication failed: User profile missing.")

            Log.i(TAG, "Firebase authentication successful")
            val tokenResult = Tasks.await(user.getIdToken(true), 20, TimeUnit.SECONDS)
            val idToken = tokenResult.token
                ?: return@withContext VerifyOtpResult.Error("Unable to obtain secure token. Please try again.")

            VerifyOtpResult.Success(idToken)
        } catch (e: FirebaseAuthInvalidCredentialsException) {
            Log.w(TAG, "Invalid OTP code entered")
            VerifyOtpResult.Error("Invalid OTP. Please check the code and try again.")
        } catch (e: FirebaseTooManyRequestsException) {
            Log.w(TAG, "Too many verification requests")
            VerifyOtpResult.Error("Too many attempts. Please try again later.")
        } catch (e: Exception) {
            Log.w(TAG, "Firebase OTP verification failed: ${e.javaClass.simpleName}")
            val msg = mapFirebaseError(e)
            VerifyOtpResult.Error(msg)
        }
    }

    /**
     * Safe sign out clearing Firebase Auth state.
     */
    fun signOut() {
        try {
            auth.signOut()
            Log.i(TAG, "Firebase signed out")
        } catch (e: Exception) {
            Log.w(TAG, "Firebase sign out error: ${e.message}")
        }
    }

    /**
     * Converts Firebase exceptions into safe, user-friendly messages.
     * Never exposes raw exception messages, tokens, or credentials.
     */
    fun mapFirebaseError(exception: Exception?): String {
        if (exception == null) return "Authentication error. Please try again."
        val message = exception.message ?: ""
        val errorCode = if (exception is FirebaseAuthException) exception.errorCode else ""

        return when {
            exception is FirebaseAuthInvalidCredentialsException -> {
                if (message.contains("code", ignoreCase = true) || message.contains("sms", ignoreCase = true) || errorCode == "ERROR_INVALID_VERIFICATION_CODE") {
                    "Invalid OTP. Please check the 6-digit code and try again."
                } else if (errorCode == "ERROR_INVALID_APP_CREDENTIAL" || message.contains("app credential", ignoreCase = true)) {
                    "App verification failed. Please verify SHA-256 fingerprint in Firebase Console (vegito-e35a1)."
                } else {
                    "Please enter a valid 10-digit Indian mobile number."
                }
            }
            exception is FirebaseTooManyRequestsException || errorCode == "ERROR_TOO_MANY_REQUESTS" -> {
                "Too many verification attempts. Please wait a few minutes before trying again."
            }
            message.contains("quota", ignoreCase = true) || message.contains("billing", ignoreCase = true) || errorCode == "ERROR_QUOTA_EXCEEDED" -> {
                "Firebase SMS quota reached for project vegito-e35a1. Please verify SMS limit/billing in Firebase Console."
            }
            message.contains("play integrity", ignoreCase = true) || message.contains("safety_net", ignoreCase = true) || message.contains("recaptcha", ignoreCase = true) -> {
                "Device verification required. Ensure Google Play Services are updated and enabled."
            }
            message.contains("network", ignoreCase = true) || errorCode == "ERROR_NETWORK_REQUEST_FAILED" -> {
                "Network connection unavailable. Please check your internet connection."
            }
            message.contains("expired", ignoreCase = true) || errorCode == "ERROR_SESSION_EXPIRED" -> {
                "OTP session expired. Please request a new OTP."
            }
            errorCode.isNotBlank() -> {
                "Firebase Auth error [$errorCode]: ${message.take(120)}"
            }
            message.isNotBlank() -> {
                "Authentication error: ${message.take(120)}"
            }
            else -> {
                "Authentication error (${exception.javaClass.simpleName}). Please try again."
            }
        }
    }
}
