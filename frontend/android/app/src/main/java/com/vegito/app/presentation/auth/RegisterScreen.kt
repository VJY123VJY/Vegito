package com.vegito.app.presentation.auth

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.UnifiedRegisterRequestDto
import com.vegito.app.ui.components.SellerShopLocationPicker
import com.vegito.app.ui.theme.VegitoPrimary
import com.vegito.app.utils.LocationHelper
import com.vegito.app.utils.LocationResult
import kotlinx.coroutines.launch

enum class RegisterStep {
    ROLE_SELECTION,
    REGISTRATION_FORM
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    initialRole: String = "customer",
    isLoading: Boolean = false,
    errorMessage: String? = null,
    onContinueToOtp: (UnifiedRegisterRequestDto) -> Unit,
    onNavigateLogin: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    // Determine initial active step
    // If user clicked a specific role from outside (e.g. from seller/delivery button), start on that form, otherwise start at ROLE_SELECTION
    var selectedRole by remember(initialRole) {
        val r = initialRole.lowercase()
        mutableStateOf(
            when (r) {
                "seller" -> "SELLER"
                "delivery_partner", "delivery" -> "DELIVERY_PARTNER"
                else -> "CUSTOMER"
            }
        )
    }

    // Step state
    var currentStep by remember { mutableStateOf(RegisterStep.ROLE_SELECTION) }

    // Shared Form Fields
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    // Customer Specific Fields
    var customerAddress by remember { mutableStateOf("") }
    var customerCity by remember { mutableStateOf("Solapur") }
    var customerPincode by remember { mutableStateOf("413001") }
    var customerCurrentLocation by remember { mutableStateOf<LocationResult.Success?>(null) }
    var isDetectingCustomerLocation by remember { mutableStateOf(false) }
    var showCustomerManualAddress by remember { mutableStateOf(false) }

    // Seller Specific Fields
    var sellerBusinessName by remember { mutableStateOf("") }
    var sellerBusinessType by remember { mutableStateOf("Grocery / Fresh Produce Store") }
    var sellerBusinessTypeExpanded by remember { mutableStateOf(false) }
    var sellerShopAddress by remember { mutableStateOf("") }
    var sellerCity by remember { mutableStateOf("Solapur") }
    var sellerPincode by remember { mutableStateOf("413001") }
    var sellerGstNumber by remember { mutableStateOf("") }
    var sellerShopLocation by remember { mutableStateOf<Pair<Double, Double>?>(null) }
    var sellerLocationAccuracy by remember { mutableStateOf<Float?>(null) }
    var showSellerLocationPickerSheet by remember { mutableStateOf(false) }

    // Delivery Partner Specific Fields
    var deliveryVehicleType by remember { mutableStateOf("Motorcycle / Scooter") }
    var deliveryVehicleTypeExpanded by remember { mutableStateOf(false) }
    var deliveryVehicleNumber by remember { mutableStateOf("") }
    var deliveryCurrentLocation by remember { mutableStateOf<LocationResult.Success?>(null) }
    var isDetectingDeliveryLocation by remember { mutableStateOf(false) }

    // Validation error state
    var localError by remember { mutableStateOf<String?>(null) }

    // Location Permission Launchers
    val customerLocationLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { perms ->
        val fine = perms[Manifest.permission.ACCESS_FINE_LOCATION] == true
        val coarse = perms[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (fine || coarse) {
            isDetectingCustomerLocation = true
            localError = null
            scope.launch {
                when (val result = LocationHelper.getFreshLocation(context = context, allowApproximate = true)) {
                    is LocationResult.Success -> {
                        customerCurrentLocation = result
                        customerAddress = result.addressLine
                        if (result.city.isNotBlank()) customerCity = result.city
                        if (result.pincode.isNotBlank()) customerPincode = result.pincode
                    }
                    is LocationResult.GpsDisabled -> localError = "Please turn on device GPS/Location services."
                    is LocationResult.PreciseLocationRequired -> localError = result.message
                    is LocationResult.PermissionDenied -> localError = "Location permission denied."
                    is LocationResult.Timeout -> localError = "Location request timed out. You may enter address manually."
                    is LocationResult.Error -> localError = result.message
                }
                isDetectingCustomerLocation = false
            }
        } else {
            localError = "Location permission denied. You can enter your delivery address manually."
        }
    }

    val deliveryLocationLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { perms ->
        val fine = perms[Manifest.permission.ACCESS_FINE_LOCATION] == true
        val coarse = perms[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (fine || coarse) {
            isDetectingDeliveryLocation = true
            localError = null
            scope.launch {
                when (val result = LocationHelper.getFreshLocation(context = context, allowApproximate = true)) {
                    is LocationResult.Success -> {
                        deliveryCurrentLocation = result
                    }
                    is LocationResult.GpsDisabled -> localError = "Please turn on device GPS/Location services."
                    is LocationResult.PreciseLocationRequired -> localError = result.message
                    is LocationResult.PermissionDenied -> localError = "Location permission denied."
                    is LocationResult.Timeout -> localError = "Location request timed out."
                    is LocationResult.Error -> localError = result.message
                }
                isDetectingDeliveryLocation = false
            }
        } else {
            localError = "Location permission denied. Please allow location to detect your delivery fleet hub."
        }
    }

    // Modal Sheet for Seller Shop Location Picker
    if (showSellerLocationPickerSheet) {
        ModalBottomSheet(
            onDismissRequest = { showSellerLocationPickerSheet = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            SellerShopLocationPicker(
                initialAddress = sellerShopAddress.ifBlank { null },
                initialLat = sellerShopLocation?.first,
                initialLng = sellerShopLocation?.second,
                isMandatory = true,
                title = "🏪 Shop Location",
                subtitle = "Detect or pinpoint your exact store location on the map for deliveries.",
                onLocationConfirmed = { addr, cty, pin, lat, lng, acc, _ ->
                    sellerShopAddress = addr
                    if (cty.isNotBlank()) sellerCity = cty
                    if (pin.isNotBlank()) sellerPincode = pin
                    sellerShopLocation = Pair(lat, lng)
                    sellerLocationAccuracy = acc
                    showSellerLocationPickerSheet = false
                    localError = null
                },
                onCancel = { showSellerLocationPickerSheet = false }
            )
        }
    }

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
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header Bar with Back Button
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = {
                        if (currentStep == RegisterStep.REGISTRATION_FORM) {
                            localError = null
                            currentStep = RegisterStep.ROLE_SELECTION
                        } else {
                            onNavigateLogin()
                        }
                    }
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = VegitoPrimary
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "VEGITO",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = VegitoPrimary,
                    letterSpacing = 2.sp
                )
            }

            // ==============================================================
            // STEP 1 — ROLE SELECTION
            // ==============================================================
            if (currentStep == RegisterStep.ROLE_SELECTION) {
                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Create Your Account",
                    fontSize = 26.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Choose your account type",
                    fontSize = 15.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(32.dp))

                // Role Options List
                val roles = listOf(
                    Triple("CUSTOMER", "Customer", "Shop fresh vegetables, fruits & groceries with fast doorstep delivery."),
                    Triple("SELLER", "Seller", "Sell your farm produce, fruits and grocery inventory to local buyers."),
                    Triple("DELIVERY_PARTNER", "Delivery Partner", "Deliver orders safely to neighborhood customers and earn flexibly.")
                )

                roles.forEach { (roleKey, title, description) ->
                    val isSelected = selectedRole == roleKey
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                selectedRole = roleKey
                                localError = null
                            },
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isSelected) VegitoPrimary.copy(alpha = 0.08f) else MaterialTheme.colorScheme.surface
                        ),
                        border = BorderStroke(
                            width = if (isSelected) 2.dp else 1.dp,
                            color = if (isSelected) VegitoPrimary else MaterialTheme.colorScheme.outlineVariant
                        ),
                        elevation = CardDefaults.cardElevation(defaultElevation = if (isSelected) 3.dp else 1.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(18.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = if (isSelected) VegitoPrimary else VegitoPrimary.copy(alpha = 0.12f),
                                modifier = Modifier.size(46.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = when (roleKey) {
                                            "SELLER" -> Icons.Default.Store
                                            "DELIVERY_PARTNER" -> Icons.Default.DeliveryDining
                                            else -> Icons.Default.Person
                                        },
                                        contentDescription = null,
                                        tint = if (isSelected) Color.White else VegitoPrimary,
                                        modifier = Modifier.size(24.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.width(16.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = title,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Spacer(modifier = Modifier.height(3.dp))
                                Text(
                                    text = description,
                                    fontSize = 12.5.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    lineHeight = 17.sp
                                )
                            }

                            Spacer(modifier = Modifier.width(8.dp))

                            RadioButton(
                                selected = isSelected,
                                onClick = {
                                    selectedRole = roleKey
                                    localError = null
                                },
                                colors = RadioButtonDefaults.colors(selectedColor = VegitoPrimary)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))
                }

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = {
                        localError = null
                        currentStep = RegisterStep.REGISTRATION_FORM
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                ) {
                    Text("Continue", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.width(8.dp))
                    Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp))
                }

                Spacer(modifier = Modifier.height(20.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "Already have an account? ",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    TextButton(onClick = onNavigateLogin) {
                        Text("Login", color = VegitoPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }
            }

            // ==============================================================
            // STEP 2 — REGISTRATION FORM (ROLE SPECIFIC)
            // ==============================================================
            else if (currentStep == RegisterStep.REGISTRATION_FORM) {
                val formTitle = when (selectedRole) {
                    "SELLER" -> "Create Seller Account"
                    "DELIVERY_PARTNER" -> "Create Delivery Partner Account"
                    else -> "Create Customer Account"
                }

                val formSubtitle = when (selectedRole) {
                    "SELLER" -> "Register your store and produce catalog with Vegito"
                    "DELIVERY_PARTNER" -> "Join our delivery partner fleet to deliver local orders"
                    else -> "Join Vegito for fresh groceries and fast delivery"
                }

                Text(
                    text = formTitle,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = formSubtitle,
                    fontSize = 13.5.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(24.dp))

                // ──────────────────────────────────────────
                // ROLE 1: CUSTOMER FORM
                // ──────────────────────────────────────────
                if (selectedRole == "CUSTOMER") {
                    // Full Name
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it; localError = null },
                        label = { Text("Full Name") },
                        placeholder = { Text("Enter your full name") },
                        leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = VegitoPrimary) },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Mobile Number
                    OutlinedTextField(
                        value = phone,
                        onValueChange = {
                            val digits = it.filter(Char::isDigit).take(10)
                            phone = digits
                            localError = null
                        },
                        label = { Text("Mobile Number") },
                        placeholder = { Text("Enter 10-digit mobile number") },
                        prefix = { Text("+91 ", fontWeight = FontWeight.Bold, color = VegitoPrimary) },
                        leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null, tint = VegitoPrimary) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Email (Optional)
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it; localError = null },
                        label = { Text("Email (Optional)") },
                        placeholder = { Text("Enter email address") },
                        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = VegitoPrimary) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Password
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it; localError = null },
                        label = { Text("Create Password") },
                        placeholder = { Text("At least 4 characters") },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = VegitoPrimary) },
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = null,
                                    tint = Color.Gray
                                )
                            }
                        },
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(18.dp))

                    // Customer Location Selection Section
                    Text(
                        text = "Address / Delivery Location",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    if (customerCurrentLocation != null) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = VegitoPrimary)
                                Spacer(modifier = Modifier.width(10.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = customerCurrentLocation!!.addressLine,
                                        fontSize = 13.5.sp,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Text(
                                        text = "${customerCurrentLocation!!.city} (${customerCurrentLocation!!.pincode})",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                TextButton(onClick = {
                                    customerCurrentLocation = null
                                    customerAddress = ""
                                }) {
                                    Text("Change", color = VegitoPrimary, fontSize = 12.sp)
                                }
                            }
                        }
                    } else {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            // Button: Use Current Location
                            Button(
                                onClick = {
                                    customerLocationLauncher.launch(
                                        arrayOf(
                                            Manifest.permission.ACCESS_FINE_LOCATION,
                                            Manifest.permission.ACCESS_COARSE_LOCATION
                                        )
                                    )
                                },
                                enabled = !isDetectingCustomerLocation,
                                modifier = Modifier
                                    .weight(1f)
                                    .height(48.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                            ) {
                                if (isDetectingCustomerLocation) {
                                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                                } else {
                                    Icon(Icons.Default.MyLocation, contentDescription = null, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Use Current Location", fontSize = 12.5.sp, fontWeight = FontWeight.Bold)
                                }
                            }

                            // Button: Choose Location Manually
                            OutlinedButton(
                                onClick = { showCustomerManualAddress = !showCustomerManualAddress },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(48.dp),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Default.EditLocation, contentDescription = null, modifier = Modifier.size(18.dp), tint = VegitoPrimary)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Enter Manually", fontSize = 12.5.sp, color = MaterialTheme.colorScheme.onSurface)
                            }
                        }

                        if (showCustomerManualAddress) {
                            Spacer(modifier = Modifier.height(12.dp))
                            OutlinedTextField(
                                value = customerAddress,
                                onValueChange = { customerAddress = it; localError = null },
                                label = { Text("House / Flat / Street / Area") },
                                placeholder = { Text("Enter your complete delivery address") },
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = false,
                                maxLines = 3
                            )
                        }
                    }
                }

                // ──────────────────────────────────────────
                // ROLE 2: SELLER FORM
                // ──────────────────────────────────────────
                else if (selectedRole == "SELLER") {
                    // Business / Shop Name
                    OutlinedTextField(
                        value = sellerBusinessName,
                        onValueChange = { sellerBusinessName = it; localError = null },
                        label = { Text("Business / Shop Name *") },
                        placeholder = { Text("Enter shop name") },
                        leadingIcon = { Icon(Icons.Default.Store, contentDescription = null, tint = VegitoPrimary) },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Owner Name
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it; localError = null },
                        label = { Text("Owner Name *") },
                        placeholder = { Text("Enter owner name") },
                        leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = VegitoPrimary) },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Mobile Number
                    OutlinedTextField(
                        value = phone,
                        onValueChange = {
                            val digits = it.filter(Char::isDigit).take(10)
                            phone = digits
                            localError = null
                        },
                        label = { Text("Mobile Number *") },
                        placeholder = { Text("Enter 10-digit mobile number") },
                        prefix = { Text("+91 ", fontWeight = FontWeight.Bold, color = VegitoPrimary) },
                        leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null, tint = VegitoPrimary) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Email (Optional)
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it; localError = null },
                        label = { Text("Email (Optional)") },
                        placeholder = { Text("Enter email if supported") },
                        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = VegitoPrimary) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Business Type Dropdown
                    ExposedDropdownMenuBox(
                        expanded = sellerBusinessTypeExpanded,
                        onExpandedChange = { sellerBusinessTypeExpanded = !sellerBusinessTypeExpanded }
                    ) {
                        OutlinedTextField(
                            value = sellerBusinessType,
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Business Type *") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = sellerBusinessTypeExpanded) },
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier
                                .menuAnchor()
                                .fillMaxWidth()
                        )
                        ExposedDropdownMenu(
                            expanded = sellerBusinessTypeExpanded,
                            onDismissRequest = { sellerBusinessTypeExpanded = false }
                        ) {
                            listOf(
                                "Grocery / Fresh Produce Store",
                                "Organic Farm / Producer",
                                "Wholesale Vegetable Merchant",
                                "Fruit Orchard / Trader",
                                "Daily Essentials & Dairy"
                            ).forEach { bType ->
                                DropdownMenuItem(
                                    text = { Text(bType) },
                                    onClick = {
                                        sellerBusinessType = bType
                                        sellerBusinessTypeExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Password
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it; localError = null },
                        label = { Text("Create Password *") },
                        placeholder = { Text("At least 4 characters") },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = VegitoPrimary) },
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = null,
                                    tint = Color.Gray
                                )
                            }
                        },
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // GST Number (Optional)
                    OutlinedTextField(
                        value = sellerGstNumber,
                        onValueChange = { sellerGstNumber = it.uppercase(); localError = null },
                        label = { Text("GSTIN / Trade Licence (Optional)") },
                        placeholder = { Text("e.g. 27AAAAA0000A1Z5") },
                        leadingIcon = { Icon(Icons.Default.Badge, contentDescription = null, tint = VegitoPrimary) },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(18.dp))

                    // Shop Location Section
                    Text(
                        text = "Shop Location *",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    if (sellerShopLocation != null) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = VegitoPrimary)
                                Spacer(modifier = Modifier.width(10.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = sellerShopAddress.ifBlank { "Location coordinates saved" },
                                        fontSize = 13.5.sp,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Text(
                                        text = "Lat: ${sellerShopLocation!!.first.toString().take(7)}, Lng: ${sellerShopLocation!!.second.toString().take(7)}",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                TextButton(onClick = { showSellerLocationPickerSheet = true }) {
                                    Text("Change", color = VegitoPrimary, fontSize = 12.sp)
                                }
                            }
                        }
                    } else {
                        Button(
                            onClick = { showSellerLocationPickerSheet = true },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                        ) {
                            Icon(Icons.Default.LocationOn, contentDescription = null, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("📍 Pick Shop Location on Map / GPS", fontWeight = FontWeight.Bold)
                        }
                    }
                }

                // ──────────────────────────────────────────
                // ROLE 3: DELIVERY PARTNER FORM
                // ──────────────────────────────────────────
                else if (selectedRole == "DELIVERY_PARTNER") {
                    // Full Name
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it; localError = null },
                        label = { Text("Full Name *") },
                        placeholder = { Text("Enter full name") },
                        leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = VegitoPrimary) },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Mobile Number
                    OutlinedTextField(
                        value = phone,
                        onValueChange = {
                            val digits = it.filter(Char::isDigit).take(10)
                            phone = digits
                            localError = null
                        },
                        label = { Text("Mobile Number *") },
                        placeholder = { Text("Enter 10-digit mobile number") },
                        prefix = { Text("+91 ", fontWeight = FontWeight.Bold, color = VegitoPrimary) },
                        leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null, tint = VegitoPrimary) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Email (Optional)
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it; localError = null },
                        label = { Text("Email (Optional)") },
                        placeholder = { Text("Enter email address") },
                        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = VegitoPrimary) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Vehicle Type Dropdown
                    ExposedDropdownMenuBox(
                        expanded = deliveryVehicleTypeExpanded,
                        onExpandedChange = { deliveryVehicleTypeExpanded = !deliveryVehicleTypeExpanded }
                    ) {
                        OutlinedTextField(
                            value = deliveryVehicleType,
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Vehicle Type *") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = deliveryVehicleTypeExpanded) },
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier
                                .menuAnchor()
                                .fillMaxWidth()
                        )
                        ExposedDropdownMenu(
                            expanded = deliveryVehicleTypeExpanded,
                            onDismissRequest = { deliveryVehicleTypeExpanded = false }
                        ) {
                            listOf(
                                "Motorcycle / Scooter",
                                "Electric Bike / EV Scooter",
                                "Bicycle",
                                "Three Wheeler / Auto",
                                "Small Delivery Van"
                            ).forEach { vType ->
                                DropdownMenuItem(
                                    text = { Text(vType) },
                                    onClick = {
                                        deliveryVehicleType = vType
                                        deliveryVehicleTypeExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Vehicle Number
                    OutlinedTextField(
                        value = deliveryVehicleNumber,
                        onValueChange = { deliveryVehicleNumber = it.uppercase(); localError = null },
                        label = { Text("Vehicle Number *") },
                        placeholder = { Text("e.g. MH 13 AB 1234") },
                        leadingIcon = { Icon(Icons.Default.DirectionsCar, contentDescription = null, tint = VegitoPrimary) },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Password
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it; localError = null },
                        label = { Text("Create Password *") },
                        placeholder = { Text("At least 4 characters") },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = VegitoPrimary) },
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = null,
                                    tint = Color.Gray
                                )
                            }
                        },
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(18.dp))

                    // Delivery Partner Location Section
                    Text(
                        text = "Current Fleet Base Location *",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    if (deliveryCurrentLocation != null) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = VegitoPrimary)
                                Spacer(modifier = Modifier.width(10.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = deliveryCurrentLocation!!.addressLine,
                                        fontSize = 13.5.sp,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Text(
                                        text = "${deliveryCurrentLocation!!.city} (${deliveryCurrentLocation!!.pincode})",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                TextButton(onClick = { deliveryCurrentLocation = null }) {
                                    Text("Refresh", color = VegitoPrimary, fontSize = 12.sp)
                                }
                            }
                        }
                    } else {
                        Button(
                            onClick = {
                                deliveryLocationLauncher.launch(
                                    arrayOf(
                                        Manifest.permission.ACCESS_FINE_LOCATION,
                                        Manifest.permission.ACCESS_COARSE_LOCATION
                                    )
                                )
                            },
                            enabled = !isDetectingDeliveryLocation,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                        ) {
                            if (isDetectingDeliveryLocation) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                            } else {
                                Icon(Icons.Default.MyLocation, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("📍 Use Current Location", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                // Error alert display
                (errorMessage ?: localError)?.let { msg ->
                    Spacer(modifier = Modifier.height(16.dp))
                    Surface(
                        color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.7f),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = msg,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                fontSize = 13.sp
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Continue Button
                Button(
                    onClick = {
                        val cleanedName = name.trim()
                        val cleanedPhone = phone.trim()
                        val cleanedPass = password.trim()

                        // Validation checks
                        if (cleanedName.isBlank()) {
                            localError = "Please enter your name."
                            return@Button
                        }
                        if (cleanedPhone.length != 10) {
                            localError = "Enter a valid mobile number."
                            return@Button
                        }
                        if (cleanedPass.length < 4) {
                            localError = "Password must be at least 4 characters long."
                            return@Button
                        }

                        when (selectedRole) {
                            "CUSTOMER" -> {
                                val lat = customerCurrentLocation?.latitude
                                val lng = customerCurrentLocation?.longitude
                                val addr = customerAddress.ifBlank { customerCurrentLocation?.addressLine ?: "" }

                                localError = null
                                onContinueToOtp(
                                    UnifiedRegisterRequestDto(
                                        name = cleanedName,
                                        phone = cleanedPhone,
                                        password = cleanedPass,
                                        role = "CUSTOMER",
                                        email = email.trim().ifBlank { null },
                                        address = addr.ifBlank { null },
                                        city = customerCurrentLocation?.city ?: customerCity,
                                        pincode = customerCurrentLocation?.pincode ?: customerPincode,
                                        latitude = lat,
                                        longitude = lng
                                    )
                                )
                            }
                            "SELLER" -> {
                                if (sellerBusinessName.trim().isBlank()) {
                                    localError = "Please enter your shop name."
                                    return@Button
                                }
                                val shopLoc = sellerShopLocation
                                if (shopLoc == null) {
                                    localError = "Please select your location."
                                    return@Button
                                }
                                localError = null
                                onContinueToOtp(
                                    UnifiedRegisterRequestDto(
                                        name = cleanedName,
                                        phone = cleanedPhone,
                                        password = cleanedPass,
                                        role = "SELLER",
                                        email = email.trim().ifBlank { null },
                                        businessName = sellerBusinessName.trim(),
                                        businessAddress = sellerShopAddress.trim().ifBlank { null },
                                        city = sellerCity,
                                        pincode = sellerPincode,
                                        latitude = shopLoc.first,
                                        longitude = shopLoc.second,
                                        gstNumber = sellerGstNumber.trim().ifBlank { null },
                                        description = sellerBusinessType
                                    )
                                )
                            }
                            "DELIVERY_PARTNER" -> {
                                if (deliveryVehicleNumber.trim().length < 4) {
                                    localError = "Enter a valid vehicle number."
                                    return@Button
                                }
                                val dLoc = deliveryCurrentLocation
                                localError = null
                                onContinueToOtp(
                                    UnifiedRegisterRequestDto(
                                        name = cleanedName,
                                        phone = cleanedPhone,
                                        password = cleanedPass,
                                        role = "DELIVERY_PARTNER",
                                        email = email.trim().ifBlank { null },
                                        address = dLoc?.addressLine,
                                        city = dLoc?.city ?: "Solapur",
                                        pincode = dLoc?.pincode ?: "413001",
                                        latitude = dLoc?.latitude,
                                        longitude = dLoc?.longitude,
                                        vehicleType = deliveryVehicleType,
                                        vehicleNumber = deliveryVehicleNumber.trim()
                                    )
                                )
                            }
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary),
                    enabled = !isLoading
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(22.dp), strokeWidth = 2.dp)
                    } else {
                        Text("Continue", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.width(8.dp))
                        Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp))
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "Already have an account? ",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    TextButton(onClick = onNavigateLogin) {
                        Text("Login", color = VegitoPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }
            }
        }
    }
}
