package com.vegito.app.presentation.auth

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.ui.theme.*

@Composable
fun OtpScreen(
    phone: String,
    role: String,
    devOtp: String? = null,
    isLoading: Boolean = false,
    errorMessage: String? = null,
    onVerifyOtp: (otp: String) -> Unit,
    onResendOtp: () -> Unit = {}
) {
    var otp by remember { mutableStateOf(TextFieldValue(devOtp.orEmpty())) }

    LaunchedEffect(devOtp) {
        if (!devOtp.isNullOrEmpty()) {
            otp = TextFieldValue(devOtp)
        }
    }

    // Error shake animation
    var shakeTrigger by remember { mutableStateOf(false) }
    LaunchedEffect(errorMessage) {
        if (!errorMessage.isNullOrEmpty()) {
            shakeTrigger = true
        }
    }

    val shakeOffset by animateFloatAsState(
        targetValue = if (shakeTrigger) 0f else 0f,
        animationSpec = repeatable(
            iterations = 4,
            animation = tween(durationMillis = 60, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        finishedListener = { shakeTrigger = false },
        label = "shakeOffset"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Living Shield Icon
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = VegitoPrimary.copy(alpha = 0.12f),
            modifier = Modifier
                .size(70.dp)
                .organicFloating(rangeDp = 4.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    Icons.Default.Shield,
                    contentDescription = "OTP Verify",
                    tint = VegitoPrimary,
                    modifier = Modifier.size(38.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        Text(
            text = "ओटीपी पडताळणी / Verify OTP",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.ExtraBold,
            color = VegitoPrimary
        )

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = "+91 $phone ($role) साठी OTP प्रविष्ट करा",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(20.dp))

        // Visual 6-Digit Animated OTP Box Cluster
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            for (i in 0 until 6) {
                val digitChar = otp.text.getOrNull(i)?.toString() ?: ""
                val isFilled = digitChar.isNotEmpty()
                val isFocused = otp.text.length == i

                val boxScale by animateFloatAsState(
                    targetValue = if (isFilled) 1.05f else 1.0f,
                    animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
                    label = "digitScale"
                )

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (isFilled) VegitoPrimary.copy(alpha = 0.08f) else MaterialTheme.colorScheme.surface,
                    border = BorderStroke(
                        width = if (isFocused) 2.dp else 1.2.dp,
                        color = if (isFocused) VegitoPrimary else if (isFilled) VegitoPrimaryLight else Color.LightGray.copy(alpha = 0.6f)
                    ),
                    modifier = Modifier
                        .size(46.dp)
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
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = VegitoPrimary
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        // Development OTP Banner & 1-Tap Autofill Card
        if (!devOtp.isNullOrBlank()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9)),
                border = BorderStroke(1.2.dp, Color(0xFF81C784))
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Development OTP: $devOtp",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = Color(0xFF1B5E20)
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = VegitoPrimaryLight,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(40.dp)
                            .bounceClick(scaleDown = 0.96f) {
                                otp = TextFieldValue(devOtp)
                                onVerifyOtp(devOtp)
                            }
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                text = "Fill code and continue",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }

        // Hidden input for keyboard capture
        OutlinedTextField(
            value = otp,
            onValueChange = { if (it.text.length <= 6) otp = it },
            label = { Text("Enter OTP directly or edit above") },
            leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = VegitoPrimary) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp)
        )

        errorMessage?.let {
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        }

        Spacer(modifier = Modifier.height(18.dp))

        // Primary Verification Button
        VegitoButton(
            text = "सत्यापित करा (Verify & Continue) →",
            onClick = { if (otp.text.length >= 4) onVerifyOtp(otp.text.trim()) },
            isLoading = isLoading,
            enabled = !isLoading && otp.text.length >= 4,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(14.dp))

        TextButton(
            onClick = onResendOtp,
            enabled = !isLoading
        ) {
            Text("ओटीपी पुन्हा पाठवा / Resend OTP", color = VegitoPrimary, fontWeight = FontWeight.Medium)
        }
    }
}
