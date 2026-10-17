package com.vegito.app.presentation.auth

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.UnifiedRegisterRequestDto
import com.vegito.app.presentation.auth.components.AuthErrorMessage
import com.vegito.app.presentation.auth.components.PhoneNumberInput
import com.vegito.app.presentation.auth.components.PrimaryAuthButton
import com.vegito.app.presentation.auth.components.RoleSelectorTabs
import com.vegito.app.presentation.auth.components.VegitoBrandMark
import com.vegito.app.ui.theme.VegitoPrimary
import com.vegito.app.ui.theme.bounceClick

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
            .imePadding(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(Modifier.height(12.dp))

            // Brand Header with Vegito Icon Mark
            VegitoBrandMark(sizeDp = 80)

            Spacer(Modifier.height(14.dp))

            Text(
                text = "Welcome to Vegito",
                fontSize = 26.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onBackground
            )

            Spacer(Modifier.height(4.dp))

            Text(
                text = "Log in with mobile OTP to order or manage fresh produce",
                fontSize = 13.5.sp,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(Modifier.height(24.dp))

            // Main Glassmorphic Card Container
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp)
                ) {
                    // Role Selector: Customer, Seller, Delivery Partner
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "CONTINUE AS",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.2.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = when (selectedRole) {
                                "seller" -> "🏪 Seller Store"
                                "delivery_partner" -> "🛵 Delivery Fleet"
                                else -> "🛍️ Customer"
                            },
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = VegitoPrimary
                        )
                    }

                    Spacer(Modifier.height(10.dp))

                    RoleSelectorTabs(
                        selectedRole = selectedRole,
                        onRoleSelected = {
                            selectedRole = it
                            localError = null
                        }
                    )

                    Spacer(Modifier.height(20.dp))

                    // Phone Number Input with +91 Country Badge and instant validation
                    Text(
                        text = "MOBILE PHONE NUMBER",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.2.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(Modifier.height(8.dp))

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
                                localError = "Please enter a valid 10-digit mobile number."
                            }
                        }
                    )

                    // Error Display (API or local)
                    val activeError = errorMessage ?: localError
                    if (activeError != null) {
                        Spacer(Modifier.height(12.dp))
                        AuthErrorMessage(
                            message = activeError,
                            onDismiss = { localError = null }
                        )
                    }

                    Spacer(Modifier.height(22.dp))

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

                    Spacer(Modifier.height(16.dp))

                    // Quick benefits strip
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(VegitoPrimary.copy(alpha = 0.06f))
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = VegitoPrimary, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Fast Delivery", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = VegitoPrimary)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = VegitoPrimary, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Mandi Fresh", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = VegitoPrimary)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = VegitoPrimary, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Live Rates", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = VegitoPrimary)
                        }
                    }
                }
            }

            Spacer(Modifier.height(20.dp))

            // Registration Navigation
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Don't have an account?",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 14.sp
                )
                Spacer(Modifier.width(6.dp))
                Text(
                    text = "Register Now",
                    color = VegitoPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .clickable {
                            onNavigateRegisterWithRole?.invoke(selectedRole) ?: onNavigateRegister()
                        }
                        .padding(horizontal = 6.dp, vertical = 4.dp)
                )
            }

            Spacer(Modifier.height(16.dp))

            // Trust & Security Notice
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
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
                        text = "Secured phone verification • No password needed",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(Modifier.height(20.dp))
        }
    }
}
