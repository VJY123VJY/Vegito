package com.vegito.app.presentation.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.ui.theme.VegitoPrimary

@Composable
fun LoginScreen(
    initialRole: String = "customer",
    onSendOtp: (phone: String, role: String) -> Unit
) {
    var phone by remember { mutableStateOf(TextFieldValue("")) }
    var selectedRole by remember { mutableStateOf(initialRole) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Enter Mobile Number",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "We will send an OTP verification code",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(24.dp))

        OutlinedTextField(
            value = phone,
            onValueChange = { phone = it },
            label = { Text("Mobile Number (+91)") },
            leadingIcon = { Icon(Icons.Default.Phone, contentDescription = "Phone") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp)
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Select Account Role:",
            style = MaterialTheme.typography.labelMedium
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            FilterChip(
                selected = selectedRole == "customer",
                onClick = { selectedRole = "customer" },
                label = { Text("Customer") }
            )
            FilterChip(
                selected = selectedRole == "seller",
                onClick = { selectedRole = "seller" },
                label = { Text("Seller") }
            )
            FilterChip(
                selected = selectedRole == "delivery_partner",
                onClick = { selectedRole = "delivery_partner" },
                label = { Text("Delivery") }
            )
        }

        errorMessage?.let {
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
        }

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = {
                if (phone.text.trim().length >= 10) {
                    onSendOtp(phone.text.trim(), selectedRole)
                } else {
                    errorMessage = "Please enter a valid 10-digit mobile number"
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
        ) {
            Text("Send OTP", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }
}
