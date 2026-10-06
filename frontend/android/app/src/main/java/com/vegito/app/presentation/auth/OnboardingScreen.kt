package com.vegito.app.presentation.auth

import androidx.compose.animation.*
import androidx.compose.animation.core.*
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.ui.components.VegitoGroceryHeroVisual
import com.vegito.app.ui.theme.*
import com.vegito.app.utils.Localization

@Composable
fun OnboardingScreen(
    lang: String,
    onStartShopping: () -> Unit,
    onLogin: () -> Unit,
    onSellOnVegito: () -> Unit,
    onDeliverWithVegito: () -> Unit
) {
    var isVisible by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        isVisible = true
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF7FAF8))
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        // Gradient Hero Header Backdrop
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(260.dp)
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

            // Animated Header Title
            AnimatedVisibility(
                visible = isVisible,
                enter = fadeIn(tween(400)) + slideInVertically(tween(400)) { -20 }
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "VEGITO",
                        fontSize = 32.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color.White,
                        letterSpacing = 2.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Fresh groceries. Fast delivery.",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White.copy(alpha = 0.95f),
                        textAlign = TextAlign.Center
                    )
                    Text(
                        text = "Freshness you can trust • Direct APMC Mandi Sourcing",
                        fontSize = 12.sp,
                        color = Color.White.copy(alpha = 0.8f),
                        textAlign = TextAlign.Center
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Interactive Hero Visual Container
            VegitoGroceryHeroVisual(
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Main CTA Section Card
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
                    modifier = Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Primary CTA: START SHOPPING
                    Button(
                        onClick = onStartShopping,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                            .bounceClick(scaleDown = 0.96f) { onStartShopping() },
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("START SHOPPING", fontSize = 16.sp, fontWeight = FontWeight.ExtraBold)
                            Spacer(modifier = Modifier.width(8.dp))
                            Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp))
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Secondary CTAs: LOGIN & REGISTER
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(
                            onClick = onLogin,
                            modifier = Modifier
                                .weight(1f)
                                .height(46.dp)
                                .bounceClick(scaleDown = 0.95f) { onLogin() },
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(1.2.dp, VegitoPrimary),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = VegitoPrimary)
                        ) {
                            Icon(Icons.Default.AccountCircle, contentDescription = "Login", modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Login", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        }

                        OutlinedButton(
                            onClick = onLogin,
                            modifier = Modifier
                                .weight(1f)
                                .height(46.dp)
                                .bounceClick(scaleDown = 0.95f) { onLogin() },
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(1.2.dp, Color(0xFF2E7D32)),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF2E7D32))
                        ) {
                            Icon(Icons.Default.PersonAdd, contentDescription = "Register", modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Register", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Zig-Zag Feature Highlights Section
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Text(
                    text = "Why Solapur Chooses Vegito",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF063C32)
                )

                // Feature 1: Left Image/Badge, Right Text
                ZigZagCard(
                    icon = "🥬",
                    title = "Direct Farm & APMC Mandi Sourcing",
                    subtitle = "Harvested at 4 AM every morning directly from Solapur APMC farmers for peak freshness.",
                    isLeftIcon = true
                )

                // Feature 2: Right Image/Badge, Left Text
                ZigZagCard(
                    icon = "⚡",
                    title = "Express Hyperlocal Delivery",
                    subtitle = "15-minute doorstep delivery with live GPS route map tracking.",
                    isLeftIcon = false
                )

                // Feature 3: Left Image/Badge, Right Text
                ZigZagCard(
                    icon = "🍎",
                    title = "Dew-Point Tested Produce",
                    subtitle = "Real-time quality scores and weight guarantees on all fruits and vegetables.",
                    isLeftIcon = true
                )
            }

            Spacer(modifier = Modifier.height(28.dp))

            // Partner with Vegito Section
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
            ) {
                Text(
                    text = "Partner with Vegito",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF063C32)
                )
                Text(
                    text = "Join our ecosystem as a seller or delivery partner",
                    fontSize = 12.sp,
                    color = Color(0xFF64748B)
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Partner Card 1: Sell on Vegito
                    Card(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(18.dp))
                            .bounceClick(scaleDown = 0.95f) { onSellOnVegito() },
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(containerColor = VegitoPrimary.copy(alpha = 0.1f)),
                        border = BorderStroke(1.dp, VegitoPrimary.copy(alpha = 0.25f))
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            horizontalAlignment = Alignment.Start
                        ) {
                            Surface(
                                shape = CircleShape,
                                color = VegitoPrimary,
                                modifier = Modifier.size(38.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.Storefront, contentDescription = "Sell", tint = Color.White, modifier = Modifier.size(20.dp))
                                }
                            }
                            Spacer(modifier = Modifier.height(10.dp))
                            Text("Sell on Vegito", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = VegitoPrimary)
                            Text("Grow your farm or shop business in Solapur", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }

                    // Partner Card 2: Deliver with Vegito
                    Card(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(18.dp))
                            .bounceClick(scaleDown = 0.95f) { onDeliverWithVegito() },
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(containerColor = VegitoSecondary.copy(alpha = 0.1f)),
                        border = BorderStroke(1.dp, VegitoSecondary.copy(alpha = 0.25f))
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            horizontalAlignment = Alignment.Start
                        ) {
                            Surface(
                                shape = CircleShape,
                                color = VegitoSecondary,
                                modifier = Modifier.size(38.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.LocalShipping, contentDescription = "Deliver", tint = Color.White, modifier = Modifier.size(20.dp))
                                }
                            }
                            Spacer(modifier = Modifier.height(10.dp))
                            Text("Deliver with Vegito", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = VegitoSecondary)
                            Text("Earn daily with flexible delivery tasks", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
private fun ZigZagCard(
    icon: String,
    title: String,
    subtitle: String,
    isLeftIcon: Boolean
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (isLeftIcon) {
                Surface(
                    shape = CircleShape,
                    color = Color(0xFFE8F5E9),
                    modifier = Modifier.size(46.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(icon, fontSize = 24.sp)
                    }
                }
                Spacer(modifier = Modifier.width(14.dp))
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF063C32))
                Spacer(modifier = Modifier.height(2.dp))
                Text(subtitle, fontSize = 12.sp, color = Color(0xFF64748B))
            }

            if (!isLeftIcon) {
                Spacer(modifier = Modifier.width(14.dp))
                Surface(
                    shape = CircleShape,
                    color = Color(0xFFE8F5E9),
                    modifier = Modifier.size(46.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(icon, fontSize = 24.sp)
                    }
                }
            }
        }
    }
}
