package com.vegito.app.presentation.auth

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DeliveryDining
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.Store
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.presentation.auth.components.VegitoBrandMark
import com.vegito.app.ui.theme.VegitoPrimary
import com.vegito.app.ui.theme.bounceClick

@Composable
fun OnboardingScreen(
    lang: String = "en",
    onCreateAccount: () -> Unit = {},
    onStartShopping: () -> Unit,
    onLogin: () -> Unit,
    onSellOnVegito: () -> Unit,
    onDeliverWithVegito: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding()
            .navigationBarsPadding(),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(26.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Spacer(modifier = Modifier.height(8.dp))

                // Brand Mark Logo
                VegitoBrandMark(sizeDp = 80)

                Spacer(modifier = Modifier.height(14.dp))

                Text(
                    text = "VEGITO",
                    fontSize = 30.sp,
                    fontWeight = FontWeight.Black,
                    color = VegitoPrimary,
                    letterSpacing = 2.5.sp
                )

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = "Freshness, delivered to you.",
                    fontSize = 13.5.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(26.dp))

                // Primary [ CREATE ACCOUNT ] button
                Button(
                    onClick = onCreateAccount,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .bounceClick(scaleDown = 0.96f) { },
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(20.dp), tint = Color.White)
                        Spacer(modifier = Modifier.width(10.dp))
                        Text("CREATE ACCOUNT", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }

                Spacer(modifier = Modifier.height(22.dp))

                Text(
                    text = "Or choose your role",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Customer Button
                OutlinedButton(
                    onClick = onStartShopping,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .bounceClick(scaleDown = 0.97f) { },
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.2.dp, VegitoPrimary)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.size(18.dp), tint = VegitoPrimary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("CUSTOMER", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = VegitoPrimary)
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Seller Button
                OutlinedButton(
                    onClick = onSellOnVegito,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .bounceClick(scaleDown = 0.97f) { },
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.2.dp, VegitoPrimary)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Store, contentDescription = null, modifier = Modifier.size(18.dp), tint = VegitoPrimary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("SELLER", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = VegitoPrimary)
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Delivery Partner Button
                OutlinedButton(
                    onClick = onDeliverWithVegito,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .bounceClick(scaleDown = 0.97f) { },
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.2.dp, VegitoPrimary)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.DeliveryDining, contentDescription = null, modifier = Modifier.size(18.dp), tint = VegitoPrimary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("DELIVERY PARTNER", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = VegitoPrimary)
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

                Spacer(modifier = Modifier.height(18.dp))

                Text(
                    text = "Already have an account?",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(8.dp))

                Button(
                    onClick = onLogin,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .bounceClick(scaleDown = 0.97f) { },
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp)
                ) {
                    Text("SIGN IN", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = VegitoPrimary)
                }

                Spacer(modifier = Modifier.height(8.dp))
            }
        }
    }
}
