package com.vegito.app.presentation.b2b

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.B2BBulkQuoteRequest
import com.vegito.app.ui.theme.VegitoPrimary

@Composable
fun B2BBulkScreen(
    onSubmitQuote: (B2BBulkQuoteRequest) -> Unit
) {
    var businessName by remember { mutableStateOf(TextFieldValue("")) }
    var businessType by remember { mutableStateOf("Restaurant") }
    var weightKg by remember { mutableStateOf("50") }
    var requirements by remember { mutableStateOf(TextFieldValue("")) }
    var address by remember { mutableStateOf(TextFieldValue("")) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text("B2B & Bulk Ordering", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text("Special bulk pricing for Restaurants, Hotels & Caterers (>50kg)", color = MaterialTheme.colorScheme.onSurfaceVariant)

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = businessName,
            onValueChange = { businessName = it },
            label = { Text("Business Name") },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = weightKg,
            onValueChange = { weightKg = it },
            label = { Text("Order Weight (Min 50 kg)") },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = requirements,
            onValueChange = { requirements = it },
            label = { Text("Product Requirements (e.g. Tomatoes 30kg, Onions 20kg)") },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = address,
            onValueChange = { address = it },
            label = { Text("Delivery Address (Max 35km)") },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = {
                onSubmitQuote(
                    B2BBulkQuoteRequest(
                        businessType = businessType,
                        businessName = businessName.text,
                        weightKg = weightKg.toDoubleOrNull() ?: 50.0,
                        productRequirements = requirements.text,
                        deliveryAddress = address.text
                    )
                )
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
        ) {
            Text("Request Bulk Quote", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }
}
