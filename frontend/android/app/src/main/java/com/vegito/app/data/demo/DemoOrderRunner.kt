package com.vegito.app.data.demo

import com.vegito.app.data.local.SessionManager
import com.vegito.app.data.repository.VegitoRepository
import kotlinx.coroutines.withTimeout

class DemoOrderRunner(
    private val repository: VegitoRepository,
    private val sessionManager: SessionManager
) {
    sealed interface PreflightResult {
        data class Authenticated(val customerName: String?, val customerId: String) : PreflightResult
        data class Failed(
            val stepId: String,
            val httpStatus: Int?,
            val message: String
        ) : PreflightResult
    }

    suspend fun verifyPreflight(): PreflightResult {
        val token = sessionManager.getToken()
        if (token.isNullOrBlank()) {
            return PreflightResult.Failed(
                "customer-auth",
                null,
                "No authenticated Android session is available."
            )
        }
        if (token.startsWith("vegito_offline_token_")) {
            return PreflightResult.Failed(
                "customer-auth",
                null,
                "The current session is an offline mock token, not a backend-authenticated session."
            )
        }

        return when (val result = withTimeout(15_000L) { repository.verifyDemoSession() }) {
            is VegitoRepository.DemoSessionResult.Authenticated -> {
                if (!result.user.role.equals("customer", ignoreCase = true)) {
                    PreflightResult.Failed(
                        "customer-auth",
                        null,
                        "The authenticated backend role is ${result.user.role}; sign in with a customer test account."
                    )
                } else {
                    PreflightResult.Authenticated(
                        customerName = result.user.name,
                        customerId = result.user.id
                    )
                }
            }
            is VegitoRepository.DemoSessionResult.Failure ->
                PreflightResult.Failed("customer-auth", result.httpStatus, result.message)
        }
    }
}
