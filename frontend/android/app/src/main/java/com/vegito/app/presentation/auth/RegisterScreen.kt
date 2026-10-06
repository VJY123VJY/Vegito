package com.vegito.app.presentation.auth

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.UnifiedRegisterRequestDto
import com.vegito.app.ui.components.SellerShopLocationPicker
import com.vegito.app.ui.theme.VegitoPrimary
import java.util.Locale

@Composable
fun RegisterScreen(
    initialRole: String = "customer",
    isLoading: Boolean = false,
    errorMessage: String? = null,
    onRegister: (UnifiedRegisterRequestDto) -> Unit,
    onNavigateLogin: () -> Unit
) {
    var selectedRole by remember {
        val r = initialRole.uppercase()
        mutableStateOf(if (r == "CUSTOMER" || r == "SELLER" || r == "DELIVERY_PARTNER") r else "CUSTOMER")
    }

    // Step state for Seller: 1 = Basic Info, 2 = Mandatory Location Capture, 3 = Confirmation
    var sellerStep by remember { mutableIntStateOf(1) }

    var name by remember { mutableStateOf(TextFieldValue("")) }
    var phone by remember { mutableStateOf(TextFieldValue("")) }
    var password by remember { mutableStateOf(TextFieldValue("")) }
    var showPassword by remember { mutableStateOf(false) }
    var address by remember { mutableStateOf(TextFieldValue("")) }
    var businessName by remember { mutableStateOf(TextFieldValue("")) }
    var vehicleNumber by remember { mutableStateOf(TextFieldValue("")) }
    var vehicleType by remember { mutableStateOf("Motorcycle") }
    var localError by remember { mutableStateOf<String?>(null) }

    // Captured Seller Shop Location
    var sellerAddressLine by remember { mutableStateOf("") }
    var sellerCity by remember { mutableStateOf("") }
    var sellerPincode by remember { mutableStateOf("") }
    var sellerLat by remember { mutableStateOf<Double?>(null) }
    var sellerLng by remember { mutableStateOf<Double?>(null) }

    fun fillSampleData(role: String) {
        val randSuffix = (1000..9999).random()
        when (role) {
            "CUSTOMER" -> {
                name = TextFieldValue("Ramesh Patil")
                phone = TextFieldValue("98${randSuffix}1234".take(10))
                password = TextFieldValue("password123")
                address = TextFieldValue("Flat 402, Green Meadows, Jule Solapur")
            }
            "SELLER" -> {
                name = TextFieldValue("Sahyadri Organic Store")
                phone = TextFieldValue("94${randSuffix}2345".take(10))
                password = TextFieldValue("password123")
                businessName = TextFieldValue("Sahyadri Organic Mandi")
                address = TextFieldValue("Shop No 18, APMC Market Yard, Solapur")
            }
            "DELIVERY_PARTNER" -> {
                name = TextFieldValue("Kiran Shinde")
                phone = TextFieldValue("98${randSuffix}3456".take(10))
                password = TextFieldValue("password123")
                vehicleNumber = TextFieldValue("MH 13 AB ${randSuffix}")
                vehicleType = "Motorcycle"
            }
        }
        localError = null
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF7FBF8))
    ) {
        // Gradient Hero Header
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color(0xFF0A4D3C),
                            Color(0xFF1B6B52),
                            Color(0xFF2E7D32)
                        )
                    )
                )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(36.dp))

            Text(
                text = "Join Vegito",
                fontSize = 24.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Color.White
            )

            Text(
                text = if (selectedRole == "SELLER") "Seller Registration • Mandi & Shop Onboarding" else "Sign up for fresh groceries, seller store or delivery fleet",
                fontSize = 12.sp,
                color = Color.White.copy(alpha = 0.85f)
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Seller Step 2: Mandatory Shop Location Screen
            if (selectedRole == "SELLER" && sellerStep == 2) {
                Box(modifier = Modifier.padding(horizontal = 20.dp)) {
                    SellerShopLocationPicker(
                        isMandatory = true,
                        title = "🏪 Shop Location Required",
                        subtitle = "Your shop location is compulsory for pickup, delivery eligibility and customer orders. Skip or Later is not permitted.",
                        onLocationConfirmed = { addr, city, pincode, lat, lng, _ ->
                            sellerAddressLine = addr
                            sellerCity = city
                            sellerPincode = pincode
                            sellerLat = lat
                            sellerLng = lng
                            sellerStep = 3
                        }
                    )
                }
            } else if (selectedRole == "SELLER" && sellerStep == 3) {
                // Seller Step 3: Confirmation Before Registration
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp)
                        .shadow(12.dp, RoundedCornerShape(24.dp)),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(modifier = Modifier.padding(22.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Store, contentDescription = "Shop", tint = VegitoPrimary, modifier = Modifier.size(28.dp))
                            Spacer(modifier = Modifier.width(10.dp))
                            Text("Confirm Shop Location", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("🏪 Shop Name:", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = VegitoPrimary)
                                Text(businessName.text.ifBlank { name.text }, fontWeight = FontWeight.Bold, fontSize = 15.sp)

                                HorizontalDivider()

                                Text("📍 Operating Address:", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = VegitoPrimary)
                                Text(sellerAddressLine, fontSize = 14.sp)

                                HorizontalDivider()

                                Text("🧭 Coordinates:", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = VegitoPrimary)
                                Text(
                                    if (sellerLat != null && sellerLng != null) {
                                        "${String.format(Locale.US, "%.5f", sellerLat)}, ${String.format(Locale.US, "%.5f", sellerLng)}"
                                    } else {
                                        "Shop GPS location not captured"
                                    },
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Text(
                            text = "This location will be saved as your permanent operating/pickup location for customer order delivery.",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        val err = errorMessage ?: localError
                        if (!err.isNullOrEmpty()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(text = err, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                        }

                        Spacer(modifier = Modifier.height(20.dp))

                        Button(
                            onClick = {
                                localError = null
                                onRegister(
                                    UnifiedRegisterRequestDto(
                                        name = name.text.trim(),
                                        phone = phone.text.trim(),
                                        password = password.text.trim(),
                                        role = "SELLER",
                                        address = sellerAddressLine,
                                        city = sellerCity,
                                        pincode = sellerPincode,
                                        latitude = sellerLat,
                                        longitude = sellerLng,
                                        businessName = businessName.text.trim(),
                                        businessAddress = sellerAddressLine
                                    )
                                )
                            },
                            enabled = !isLoading &&
                                sellerLat != null &&
                                sellerLng != null &&
                                sellerAddressLine.isNotBlank(),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                            } else {
                                Text("Confirm & Register Seller Account", fontSize = 15.sp, fontWeight = FontWeight.Bold)
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        TextButton(
                            onClick = { sellerStep = 2 },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Change Shop Location", color = VegitoPrimary)
                        }
                    }
                }
            } else {
                // Step 1: Basic Account & Information Card
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp)
                        .shadow(12.dp, RoundedCornerShape(24.dp)),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    border = BorderStroke(1.dp, Color(0xFFE0EFE6))
                ) {
                    Column(
                        modifier = Modifier.padding(22.dp)
                    ) {
                        // Header with Quick Fill Chip
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Choose Your Role:",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF063C32)
                            )

                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFFE8F5E9),
                                border = BorderStroke(1.dp, Color(0xFFC8E6C9)),
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .clickable { fillSampleData(selectedRole) }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("⚡", fontSize = 11.sp)
                                    Spacer(modifier = Modifier.width(3.dp))
                                    Text(
                                        text = "Auto-Fill Sample",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF1B5E20)
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Role Picker Segmented Row
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0xFFF1F6F3))
                                .padding(3.dp),
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            RegisterRoleTab("🛍️ Customer", selectedRole == "CUSTOMER", Modifier.weight(1f)) {
                                selectedRole = "CUSTOMER"
                                sellerStep = 1
                            }
                            RegisterRoleTab("🏪 Seller", selectedRole == "SELLER", Modifier.weight(1f)) {
                                selectedRole = "SELLER"
                                sellerStep = 1
                            }
                            RegisterRoleTab("🛵 Rider", selectedRole == "DELIVERY_PARTNER", Modifier.weight(1f)) {
                                selectedRole = "DELIVERY_PARTNER"
                                sellerStep = 1
                            }
                        }

                        Spacer(modifier = Modifier.height(18.dp))

                        // Full Name
                        OutlinedTextField(
                            value = name,
                            onValueChange = { name = it },
                            label = { Text("Full Name *") },
                            leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = VegitoPrimary) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = VegitoPrimary,
                                unfocusedBorderColor = Color(0xFFD2E3D8)
                            )
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        // Mobile
                        OutlinedTextField(
                            value = phone,
                            onValueChange = { if (it.text.length <= 10) phone = it },
                            label = { Text("Mobile Number *") },
                            prefix = {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("+91", fontWeight = FontWeight.Bold, color = VegitoPrimary)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Box(modifier = Modifier.height(16.dp).width(1.dp).background(Color.Gray.copy(alpha = 0.5f)))
                                    Spacer(modifier = Modifier.width(6.dp))
                                }
                            },
                            leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null, tint = VegitoPrimary) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = VegitoPrimary,
                                unfocusedBorderColor = Color(0xFFD2E3D8)
                            )
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        // Password
                        OutlinedTextField(
                            value = password,
                            onValueChange = { password = it },
                            label = { Text("Password * (Min 4 chars)") },
                            leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = VegitoPrimary) },
                            trailingIcon = {
                                IconButton(onClick = { showPassword = !showPassword }) {
                                    Icon(
                                        if (showPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                        contentDescription = null
                                    )
                                }
                            },
                            visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = VegitoPrimary,
                                unfocusedBorderColor = Color(0xFFD2E3D8)
                            )
                        )

                        // Role-Specific Dynamic Fields
                        AnimatedVisibility(visible = selectedRole == "CUSTOMER") {
                            Column {
                                Spacer(modifier = Modifier.height(12.dp))
                                OutlinedTextField(
                                    value = address,
                                    onValueChange = { address = it },
                                    label = { Text("Delivery Address (Solapur)") },
                                    leadingIcon = { Icon(Icons.Default.Home, contentDescription = null, tint = VegitoPrimary) },
                                    singleLine = true,
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(14.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = VegitoPrimary,
                                        unfocusedBorderColor = Color(0xFFD2E3D8)
                                    )
                                )
                            }
                        }

                        AnimatedVisibility(visible = selectedRole == "SELLER") {
                            Column {
                                Spacer(modifier = Modifier.height(12.dp))
                                OutlinedTextField(
                                    value = businessName,
                                    onValueChange = { businessName = it },
                                    label = { Text("Shop / Farm Name *") },
                                    leadingIcon = { Icon(Icons.Default.Store, contentDescription = null, tint = VegitoPrimary) },
                                    singleLine = true,
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(14.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = VegitoPrimary,
                                        unfocusedBorderColor = Color(0xFFD2E3D8)
                                    )
                                )
                            }
                        }

                        AnimatedVisibility(visible = selectedRole == "DELIVERY_PARTNER") {
                            Column {
                                Spacer(modifier = Modifier.height(12.dp))
                                OutlinedTextField(
                                    value = vehicleNumber,
                                    onValueChange = { vehicleNumber = it },
                                    label = { Text("Vehicle Registration No. (e.g. MH 13 AB 1234) *") },
                                    leadingIcon = { Icon(Icons.Default.TwoWheeler, contentDescription = null, tint = VegitoPrimary) },
                                    singleLine = true,
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(14.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = VegitoPrimary,
                                        unfocusedBorderColor = Color(0xFFD2E3D8)
                                    )
                                )
                            }
                        }

                        val err = errorMessage ?: localError
                        if (!err.isNullOrEmpty()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = err,
                                color = MaterialTheme.colorScheme.error,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }

                        Spacer(modifier = Modifier.height(20.dp))

                        Button(
                            onClick = {
                                val cleanName = name.text.trim()
                                val cleanPhone = phone.text.trim()
                                val cleanPass = password.text.trim()

                                if (cleanName.length < 2) {
                                    localError = "Please enter your full name"
                                    return@Button
                                }
                                if (cleanPhone.length != 10) {
                                    localError = "Please enter a valid 10-digit mobile number"
                                    return@Button
                                }
                                if (cleanPass.length < 4) {
                                    localError = "Password must be at least 4 characters"
                                    return@Button
                                }
                                if (selectedRole == "SELLER") {
                                    if (businessName.text.trim().isEmpty()) {
                                        localError = "Please enter your store or farm name"
                                        return@Button
                                    }
                                    localError = null
                                    sellerStep = 2
                                    return@Button
                                }

                                localError = null
                                onRegister(
                                    UnifiedRegisterRequestDto(
                                        name = cleanName,
                                        phone = cleanPhone,
                                        password = cleanPass,
                                        role = selectedRole,
                                        address = address.text.trim().ifEmpty { null },
                                        businessName = businessName.text.trim().ifEmpty { null },
                                        vehicleNumber = vehicleNumber.text.trim().ifEmpty { null },
                                        vehicleType = if (selectedRole == "DELIVERY_PARTNER") vehicleType else null
                                    )
                                )
                            },
                            enabled = !isLoading,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                            } else {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = if (selectedRole == "SELLER") "Next: Capture Shop Location 📍" else "Create Account",
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, modifier = Modifier.size(16.dp))
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                Text("Already have an account? ", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
                TextButton(onClick = onNavigateLogin) {
                    Text("Sign In", color = VegitoPrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            }

            Spacer(modifier = Modifier.height(28.dp))
        }
    }
}

@Composable
private fun RegisterRoleTab(
    title: String,
    isSelected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = if (isSelected) Color.White else Color.Transparent,
        shadowElevation = if (isSelected) 2.dp else 0.dp,
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .clickable { onClick() }
    ) {
        Box(
            modifier = Modifier.padding(vertical = 8.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = title,
                fontSize = 11.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                color = if (isSelected) Color(0xFF063C32) else Color(0xFF5F7267)
            )
        }
    }
}
