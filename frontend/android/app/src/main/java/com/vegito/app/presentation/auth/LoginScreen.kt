package com.vegito.app.presentation.auth

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.R
import com.vegito.app.ui.theme.VegitoPrimary
import com.vegito.app.ui.theme.bounceClick

@Composable
fun LoginScreen(
    initialRole: String = "customer",
    isLoading: Boolean = false,
    errorMessage: String? = null,
    onSendOtp: (phone: String, role: String) -> Unit,
    onPasswordLogin: ((phone: String, pass: String, role: String) -> Unit)? = null,
    onNavigateRegister: () -> Unit
) {
    var phone by remember { mutableStateOf(TextFieldValue("")) }
    var password by remember { mutableStateOf(TextFieldValue("")) }
    var showPassword by remember { mutableStateOf(false) }
    var selectedRole by remember { mutableStateOf(initialRole.lowercase()) }
    var authMode by remember { mutableStateOf("OTP") } // "OTP" or "PASSWORD"
    var localError by remember { mutableStateOf<String?>(null) }
    var showRoleHelpDialog by remember { mutableStateOf(false) }

    // Entrance Animation State
    var animateEntrance by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        animateEntrance = true
    }

    val logoScale by animateFloatAsState(
        targetValue = if (animateEntrance) 1.0f else 0.92f,
        animationSpec = spring(dampingRatio = 0.75f, stiffness = Spring.StiffnessMediumLow),
        label = "logoScale"
    )

    // Role Explanation Dialog
    if (showRoleHelpDialog) {
        AlertDialog(
            onDismissRequest = { showRoleHelpDialog = false },
            title = {
                Text(
                    text = "Vegito Roles Guide / भूमिका माहिती",
                    fontWeight = FontWeight.Bold,
                    fontSize = 17.sp,
                    color = Color(0xFF063C32)
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    RoleInfoRow("🛍️", "Customer (ग्राहक)", "Browse farm-fresh fruits & vegetables and place doorstep orders in Solapur.")
                    RoleInfoRow("🏪", "Seller (विक्रेता / शेतकरी)", "Manage products, real-time inventory, pricing, and B2B bulk orders.")
                    RoleInfoRow("🛵", "Delivery Partner (रायडर)", "Accept delivery tasks, verify pickup/doorstep OTPs, and track earnings.")
                    RoleInfoRow("⚙️", "Admin (प्रशासक)", "Monitor marketplace transactions, fleet operations, and seller verification.")
                }
            },
            confirmButton = {
                Button(
                    onClick = { showRoleHelpDialog = false },
                    colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text("Got it / समजले")
                }
            },
            shape = RoundedCornerShape(18.dp)
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF7FAF8))
            .statusBarsPadding()
            .navigationBarsPadding()
            .imePadding()
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
            Spacer(modifier = Modifier.height(24.dp))

            // Animated Entrance Logo
            Surface(
                shape = CircleShape,
                color = Color.White,
                shadowElevation = 8.dp,
                border = BorderStroke(1.5.dp, Color(0xFFC8E6C9)),
                modifier = Modifier
                    .size(72.dp)
                    .scale(logoScale)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Image(
                        painter = painterResource(id = R.drawable.ic_vegito_logo),
                        contentDescription = "Vegito Logo",
                        modifier = Modifier.size(56.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = "VEGITO",
                fontSize = 24.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = 2.sp,
                color = Color.White
            )

            Spacer(modifier = Modifier.height(2.dp))

            Text(
                text = "Welcome Back 👋",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )

            Text(
                text = "Fresh groceries are waiting for you",
                fontSize = 13.sp,
                color = Color.White.copy(alpha = 0.88f)
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Main Input & Auth Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .shadow(12.dp, RoundedCornerShape(24.dp)),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = BorderStroke(1.dp, Color(0xFFE2ECE5))
            ) {
                Column(
                    modifier = Modifier.padding(22.dp)
                ) {
                    // Segmented Role Selector
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Select Account Role:",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF063C32)
                        )
                        TextButton(
                            onClick = { showRoleHelpDialog = true },
                            contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp)
                        ) {
                            Text("ℹ️ Help", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = VegitoPrimary)
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFFF1F6F3))
                            .padding(3.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        RoleTabItem("🛍️ Buyer", selectedRole == "customer", Modifier.weight(1f)) { selectedRole = "customer" }
                        RoleTabItem("🏪 Seller", selectedRole == "seller", Modifier.weight(1f)) { selectedRole = "seller" }
                        RoleTabItem("🛵 Rider", selectedRole == "delivery_partner", Modifier.weight(1f)) { selectedRole = "delivery_partner" }
                        RoleTabItem("⚙️ Admin", selectedRole == "admin", Modifier.weight(1f)) { selectedRole = "admin" }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Auth Method Tabs (OTP vs Password)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color(0xFFF1F6F3))
                            .padding(2.dp)
                    ) {
                        AuthMethodTab("📱 Mobile OTP", authMode == "OTP", Modifier.weight(1f)) { authMode = "OTP" }
                        AuthMethodTab("🔑 Password", authMode == "PASSWORD", Modifier.weight(1f)) { authMode = "PASSWORD" }
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    // Mobile Number Input Field with 🇮🇳 +91 Badge
                    Text(
                        text = "Mobile Number",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF334155)
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    OutlinedTextField(
                        value = phone,
                        onValueChange = { if (it.text.length <= 10) phone = it },
                        placeholder = { Text("Enter 10-digit mobile number", color = Color(0xFF94A3B8), fontSize = 15.sp) },
                        prefix = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("🇮🇳 +91", fontWeight = FontWeight.Bold, color = VegitoPrimary, fontSize = 15.sp)
                                Spacer(modifier = Modifier.width(8.dp))
                                Box(
                                    modifier = Modifier
                                        .height(18.dp)
                                        .width(1.dp)
                                        .background(Color.Gray.copy(alpha = 0.4f))
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                            }
                        },
                        leadingIcon = { Icon(Icons.Default.Phone, contentDescription = "Phone", tint = VegitoPrimary, modifier = Modifier.size(20.dp)) },
                        trailingIcon = {
                            if (phone.text.isNotEmpty()) {
                                IconButton(onClick = { phone = TextFieldValue("") }) {
                                    Icon(Icons.Default.Clear, contentDescription = "Clear", tint = Color.Gray, modifier = Modifier.size(16.dp))
                                }
                            }
                        },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 52.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = VegitoPrimary,
                            unfocusedBorderColor = Color(0xFFD2E3D8)
                        )
                    )

                    // Password Input (Animated Slide-in)
                    AnimatedVisibility(
                        visible = authMode == "PASSWORD",
                        enter = fadeIn(tween(180)) + expandVertically(tween(180)),
                        exit = fadeOut(tween(180)) + shrinkVertically(tween(180))
                    ) {
                        Column {
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Password",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFF334155)
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            OutlinedTextField(
                                value = password,
                                onValueChange = { password = it },
                                placeholder = { Text("Enter your password", color = Color(0xFF94A3B8), fontSize = 15.sp) },
                                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = "Password", tint = VegitoPrimary, modifier = Modifier.size(20.dp)) },
                                trailingIcon = {
                                    IconButton(onClick = { showPassword = !showPassword }) {
                                        Icon(
                                            if (showPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                            contentDescription = "Toggle password",
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                },
                                visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                                singleLine = true,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(min = 52.dp),
                                shape = RoundedCornerShape(14.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = VegitoPrimary,
                                    unfocusedBorderColor = Color(0xFFD2E3D8)
                                )
                            )
                        }
                    }

                    // Error Message
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

                    // Primary Action Button [ Continue with OTP / Sign In ]
                    Button(
                        onClick = {
                            val cleanPhone = phone.text.trim()
                            if (cleanPhone.length != 10) {
                                localError = "Please enter a valid 10-digit mobile number"
                                return@Button
                            }
                            localError = null

                            if (authMode == "OTP") {
                                onSendOtp(cleanPhone, selectedRole)
                            } else {
                                if (password.text.isEmpty()) {
                                    localError = "Please enter your password"
                                    return@Button
                                }
                                onPasswordLogin?.invoke(cleanPhone, password.text, selectedRole)
                            }
                        },
                        enabled = !isLoading,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                            .bounceClick(scaleDown = 0.96f) { },
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
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = if (authMode == "OTP") "Continue with OTP" else "Sign In",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp))
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    // 1-Tap Demo Quick Fill Section
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("⚡", fontSize = 13.sp)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "1-Tap Demo Quick Fill:",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1B5E20)
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        DemoChip(
                            label = "🛍️ Buyer",
                            isSelected = selectedRole == "customer" && phone.text == "9876543210"
                        ) {
                            selectedRole = "customer"
                            phone = TextFieldValue("9876543210")
                            password = TextFieldValue("password")
                            localError = null
                        }

                        DemoChip(
                            label = "🏪 Seller",
                            isSelected = selectedRole == "seller" && phone.text == "9876543211"
                        ) {
                            selectedRole = "seller"
                            phone = TextFieldValue("9876543211")
                            password = TextFieldValue("password")
                            localError = null
                        }

                        DemoChip(
                            label = "🛵 Rider",
                            isSelected = selectedRole == "delivery_partner" && phone.text == "9876543212"
                        ) {
                            selectedRole = "delivery_partner"
                            phone = TextFieldValue("9876543212")
                            password = TextFieldValue("password")
                            localError = null
                        }

                        DemoChip(
                            label = "⚙️ Admin",
                            isSelected = selectedRole == "admin" && phone.text == "9999999999"
                        ) {
                            selectedRole = "admin"
                            phone = TextFieldValue("9999999999")
                            password = TextFieldValue("password")
                            localError = null
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Divider: New to Vegito?
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFFD2E3D8))
                Text(
                    text = "  New to Vegito?  ",
                    fontSize = 12.sp,
                    color = Color(0xFF64748B),
                    fontWeight = FontWeight.Medium
                )
                HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFFD2E3D8))
            }

            Spacer(modifier = Modifier.height(12.dp))

            // [ Create Account ] Button
            OutlinedButton(
                onClick = onNavigateRegister,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .height(48.dp)
                    .bounceClick(scaleDown = 0.96f) { onNavigateRegister() },
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.2.dp, VegitoPrimary),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = VegitoPrimary)
            ) {
                Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Create Account / Register", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }

            Spacer(modifier = Modifier.height(20.dp))
        }
    }
}

@Composable
private fun DemoChip(
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = if (isSelected) VegitoPrimary else Color(0xFFE8F5E9),
        border = BorderStroke(1.dp, if (isSelected) VegitoPrimary else Color(0xFFC8E6C9)),
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .clickable { onClick() }
    ) {
        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = if (isSelected) Color.White else Color(0xFF1B5E20),
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp)
        )
    }
}

@Composable
private fun RoleTabItem(
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
            modifier = Modifier.padding(vertical = 7.dp, horizontal = 2.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = title,
                fontSize = 10.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                color = if (isSelected) Color(0xFF063C32) else Color(0xFF5F7267)
            )
        }
    }
}

@Composable
private fun AuthMethodTab(
    title: String,
    isSelected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = if (isSelected) Color.White else Color.Transparent,
        shadowElevation = if (isSelected) 1.dp else 0.dp,
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .clickable { onClick() }
    ) {
        Box(
            modifier = Modifier.padding(vertical = 6.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = title,
                fontSize = 12.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                color = if (isSelected) VegitoPrimary else Color(0xFF6F7D74)
            )
        }
    }
}

@Composable
private fun RoleInfoRow(
    icon: String,
    title: String,
    desc: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top
    ) {
        Text(text = icon, fontSize = 20.sp)
        Spacer(modifier = Modifier.width(8.dp))
        Column {
            Text(text = title, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF063C32))
            Text(text = desc, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
