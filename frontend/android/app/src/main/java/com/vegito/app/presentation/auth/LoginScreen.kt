package com.vegito.app.presentation.auth

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.UnifiedRegisterRequestDto
import com.vegito.app.presentation.auth.components.AuthErrorMessage
import com.vegito.app.presentation.auth.components.PhoneNumberInput
import com.vegito.app.presentation.auth.components.PrimaryAuthButton
import com.vegito.app.presentation.auth.components.RoleSelectorTabs
import com.vegito.app.presentation.auth.components.VegitoAuthHeader
import com.vegito.app.ui.theme.VegitoPrimary

@Composable
fun LoginScreen(
    initialRole: String = "customer",
    isLoading: Boolean = false,
    errorMessage: String? = null,
    onSendOtp: (phone: String, role: String) -> Unit,
    onPasswordLogin: ((phone: String, pass: String, role: String) -> Unit)? = null,
    onRegister: ((UnifiedRegisterRequestDto) -> Unit)? = null,
    onNavigateRegister: () -> Unit = {},
    onNavigateRegisterWithRole: ((role: String) -> Unit)? = null
) {
    val initialRoleKey = remember(initialRole) {
        when (initialRole.lowercase()) {
            "seller" -> "seller"
            "delivery_partner", "delivery" -> "delivery_partner"
            else -> "customer"
        }
    }
    var selectedRole by remember(initialRoleKey) { mutableStateOf(initialRoleKey) }
    var phone by remember { mutableStateOf("") }
    var localError by remember { mutableStateOf<String?>(null) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding()
            .navigationBarsPadding()
            .imePadding()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(Modifier.height(16.dp))

            // Brand Section & Welcome Headline
            VegitoAuthHeader(
                title = "Fresh groceries start here.",
                subtitle = "Sign in with your mobile number to discover farm-fresh produce and daily essentials.",
                showLogo = true
            )

            Spacer(Modifier.height(28.dp))

            // Role Selector: Customer, Seller, Delivery Partner
            Text(
                text = "CONTINUE AS",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.2.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp)
            )

            RoleSelectorTabs(
                selectedRole = selectedRole,
                onRoleSelected = {
                    selectedRole = it
                    localError = null
                }
            )

            Spacer(Modifier.height(24.dp))

            // Phone Number Input with +91 Country Badge and instant validation
            Text(
                text = "MOBILE NUMBER",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.2.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp)
            )

            PhoneNumberInput(
                phone = phone,
                onPhoneChange = {
                    phone = it
                    localError = null
                },
                enabled = !isLoading,
                isError = localError != null || errorMessage != null,
                errorMessage = localError,
                onImeAction = {
                    if (phone.length == 10 && phone.matches(Regex("^[6-9]\\d{9}$"))) {
                        onSendOtp(phone, selectedRole)
                    } else {
                        localError = "Please enter a valid 10-digit mobile number starting with 6-9."
                    }
                }
            )

            // Error Display (API/Firebase or local)
            val activeError = errorMessage ?: localError
            if (activeError != null) {
                Spacer(Modifier.height(14.dp))
                AuthErrorMessage(
                    message = activeError,
                    onDismiss = { localError = null }
                )
            }

            Spacer(Modifier.height(24.dp))

            // Primary Action Button
            val isPhoneValid = phone.length == 10 && phone.matches(Regex("^[6-9]\\d{9}$"))
            PrimaryAuthButton(
                text = "Continue with OTP",
                onClick = {
                    if (isPhoneValid) {
                        localError = null
                        onSendOtp(phone, selectedRole)
                    } else {
                        localError = "Please enter a valid 10-digit mobile number."
                    }
                },
                enabled = isPhoneValid,
                isLoading = isLoading
            )

            Spacer(Modifier.height(20.dp))

            // Registration Navigation
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "New to Vegito?",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 14.sp
                )
                TextButton(
                    onClick = {
                        onNavigateRegisterWithRole?.invoke(selectedRole) ?: onNavigateRegister()
                    },
                    enabled = !isLoading
                ) {
                    Text(
                        text = "Create Account",
                        color = VegitoPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            // Trust & Security Notice
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Shield,
                        contentDescription = "Secure",
                        tint = VegitoPrimary,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Secured with phone verification • No password required",
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}
