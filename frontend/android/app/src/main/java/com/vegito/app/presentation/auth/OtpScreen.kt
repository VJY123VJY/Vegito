package com.vegito.app.presentation.auth

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.ui.theme.*
import kotlinx.coroutines.delay

@Composable
fun OtpScreen(
    phone: String,
    role: String,
    isLoading: Boolean = false,
    errorMessage: String? = null,
    onVerifyOtp: (otp: String) -> Unit,
    onResendOtp: () -> Unit = {},
    onChangeNumber: (() -> Unit)? = null
) {
    var otp by remember { mutableStateOf(TextFieldValue("")) }
    var timerSeconds by remember { mutableIntStateOf(30) }

    // Countdown Timer
    LaunchedEffect(key1 = timerSeconds) {
        if (timerSeconds > 0) {
            delay(1000L)
            timerSeconds--
        }
    }

    val maskedPhone = remember(phone) {
        if (phone.length == 10) {
            "${phone.take(3)} ***** ${phone.takeLast(2)}"
        } else {
            phone
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
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Shield Icon Header
            Surface(
                shape = CircleShape,
                color = VegitoPrimary.copy(alpha = 0.12f),
                modifier = Modifier
                    .size(76.dp)
                    .organicFloating(rangeDp = 4.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.Shield,
                        contentDescription = "OTP Verify",
                        tint = VegitoPrimary,
                        modifier = Modifier.size(42.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            Text(
                text = "Verify your number",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onBackground
            )

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = "We sent a 6-digit verification code to",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(2.dp))

            Text(
                text = "🇮🇳 +91 $maskedPhone (${role.replaceFirstChar { it.uppercase() }})",
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = VegitoPrimary
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Animated 4/6 Box OTP Display Row
            val boxCount = 6
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally)
            ) {
                for (i in 0 until boxCount) {
                    val digitChar = otp.text.getOrNull(i)?.toString() ?: ""
                    val isFilled = digitChar.isNotEmpty()
                    val isFocused = otp.text.length == i

                    val boxScale by animateFloatAsState(
                        targetValue = if (isFilled) 1.05f else 1.0f,
                        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
                        label = "digitScale"
                    )

                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = if (isFilled) VegitoPrimary.copy(alpha = 0.08f) else MaterialTheme.colorScheme.surface,
                        border = BorderStroke(
                            width = if (isFocused) 2.dp else 1.2.dp,
                            color = if (isFocused) VegitoPrimary else if (isFilled) VegitoPrimary else MaterialTheme.colorScheme.outlineVariant
                        ),
                        modifier = Modifier
                            .size(48.dp)
                            .scale(boxScale),
                        shadowElevation = if (isFocused) 3.dp else 0.dp
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            AnimatedContent(
                                targetState = digitChar,
                                transitionSpec = {
                                    (slideInVertically { height -> -height } + fadeIn()) togetherWith
                                            (slideOutVertically { height -> height } + fadeOut())
                                },
                                label = "digitAnim"
                            ) { char ->
                                Text(
                                    text = char,
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = VegitoPrimary
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Number Input Field
            OutlinedTextField(
                value = otp,
                onValueChange = { if (it.text.length <= 6) otp = it },
                label = { Text("Enter 6-digit verification code") },
                placeholder = { Text("e.g. 123456") },
                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = VegitoPrimary) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = VegitoPrimary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant
                )
            )

            errorMessage?.let { err ->
                Spacer(modifier = Modifier.height(10.dp))
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = MaterialTheme.colorScheme.errorContainer,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.ErrorOutline,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = err,
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Primary Verify Button
            Button(
                onClick = { if (otp.text.length >= 4) onVerifyOtp(otp.text.trim()) },
                enabled = !isLoading && otp.text.length >= 4,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .bounceClick(scaleDown = 0.96f) { },
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White, strokeWidth = 2.dp)
                } else {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Verify & Continue", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.width(8.dp))
                        Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp))
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Timer & Resend Option
            if (timerSeconds > 0) {
                Text(
                    text = "Resend code in ${timerSeconds}s",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Medium
                )
            } else {
                TextButton(
                    onClick = {
                        timerSeconds = 30
                        onResendOtp()
                    },
                    enabled = !isLoading
                ) {
                    Text("Resend Code", color = VegitoPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                }
            }

            if (onChangeNumber != null) {
                TextButton(onClick = onChangeNumber) {
                    Text("← Change mobile number", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
                }
            }
        }
    }
}
