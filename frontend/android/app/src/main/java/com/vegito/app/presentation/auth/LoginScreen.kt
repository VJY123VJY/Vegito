package com.vegito.app.presentation.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DeliveryDining
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Store
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.UnifiedRegisterRequestDto
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
            .imePadding(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "VEGITO",
                fontSize = 30.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = 2.sp,
                color = VegitoPrimary
            )
            Spacer(Modifier.height(6.dp))
            Text(
                text = "Fresh groceries. Fast delivery.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 14.sp
            )
            Spacer(Modifier.height(34.dp))
            Text(
                text = "Welcome back",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = "Select your role",
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(18.dp))

            listOf(
                Triple("customer", "Customer", Icons.Default.Person),
                Triple("seller", "Seller", Icons.Default.Store),
                Triple("delivery_partner", "Delivery Partner", Icons.Default.DeliveryDining)
            ).forEach { (role, label, icon) ->
                val selected = selectedRole == role
                if (selected) {
                    Button(
                        onClick = { selectedRole = role; localError = null },
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            androidx.compose.material3.Icon(
                                icon,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                                tint = Color.White
                            )
                            Spacer(Modifier.size(10.dp))
                            Text(label, fontWeight = FontWeight.SemiBold)
                        }
                    }
                } else {
                    OutlinedButton(
                        onClick = { selectedRole = role; localError = null },
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            androidx.compose.material3.Icon(
                                icon,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                                tint = VegitoPrimary
                            )
                            Spacer(Modifier.size(10.dp))
                            Text(label, color = MaterialTheme.colorScheme.onSurface)
                        }
                    }
                }
                Spacer(Modifier.height(10.dp))
            }

            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = phone,
                onValueChange = { value ->
                    val digits = value.filter(Char::isDigit).take(10)
                    phone = digits
                    localError = null
                },
                label = { Text("Mobile number") },
                prefix = { Text("+91 ") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth()
            )

            (errorMessage ?: localError)?.let { message ->
                Spacer(Modifier.height(12.dp))
                Text(
                    text = message,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            Spacer(Modifier.height(18.dp))
            Button(
                onClick = {
                    if (phone.length != 10 || !phone.matches(Regex("^[6-9]\\d{9}$"))) {
                        localError = "Enter a valid mobile number"
                    } else {
                        localError = null
                        onSendOtp(phone, selectedRole)
                    }
                },
                enabled = !isLoading,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Continue with OTP", fontWeight = FontWeight.Bold)
                }
            }

            Spacer(Modifier.height(18.dp))
            TextButton(
                onClick = {
                    onNavigateRegisterWithRole?.invoke(selectedRole) ?: onNavigateRegister()
                },
                enabled = !isLoading
            ) {
                Text("New to Vegito? Register", color = VegitoPrimary)
            }
        }
    }
}
