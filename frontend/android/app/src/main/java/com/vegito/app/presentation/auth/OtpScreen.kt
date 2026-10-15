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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.presentation.auth.components.AuthErrorMessage
import com.vegito.app.presentation.auth.components.PrimaryAuthButton
import com.vegito.app.presentation.auth.components.VegitoBrandMark
import com.vegito.app.ui.theme.VegitoPrimary
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
    val focusRequester = remember { FocusRequester() }

    // Countdown Timer for OTP resend
    LaunchedEffect(key1 = timerSeconds) {
        if (timerSeconds > 0) {
            delay(1000L)
            timerSeconds--
        }
    }

    // Mask phone number: e.g. +91 98765 *****
    val maskedPhone = remember(phone) {
        if (phone.length == 10) {
            "${phone.take(5)} •••••"
        } else {
            phone
        }
    }

    val roleLabel = remember(role) {
        when (role.lowercase()) {
            "seller" -> "Seller"
            "delivery_partner", "delivery" -> "Delivery Partner"
            else -> "Customer"
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
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(Modifier.height(16.dp))

            // Logo & Shield Header
            VegitoBrandMark(sizeDp = 72)

            Spacer(modifier = Modifier.height(20.dp))

            Text(
                text = "Verify your number",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = "Enter the 6-digit verification code sent to",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(6.dp))

            // Phone badge with edit option
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                modifier = Modifier.padding(horizontal = 8.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "🇮🇳 +91 $maskedPhone",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = VegitoPrimary.copy(alpha = 0.15f)
                    ) {
                        Text(
                            text = roleLabel,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = VegitoPrimary,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                    if (onChangeNumber != null) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Edit",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = VegitoPrimary,
                            modifier = Modifier.clickable { onChangeNumber() }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            // 6-digit Visual OTP Input Cells
            val boxCount = 6
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally)
            ) {
                for (i in 0 until boxCount) {
                    val digitChar = otp.text.getOrNull(i)?.toString() ?: ""
                    val isFilled = digitChar.isNotEmpty()
                    val isCurrentFocus = otp.text.length == i

                    val boxScale by animateFloatAsState(
                        targetValue = if (isFilled) 1.04f else 1.0f,
                        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
                        label = "digitScale"
                    )

                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = if (isFilled) VegitoPrimary.copy(alpha = 0.08f) else MaterialTheme.colorScheme.surface,
                        border = BorderStroke(
                            width = if (isCurrentFocus) 2.dp else if (isFilled) 1.5.dp else 1.dp,
                            color = if (isCurrentFocus) VegitoPrimary else if (isFilled) VegitoPrimary.copy(alpha = 0.7f) else MaterialTheme.colorScheme.outlineVariant
                        ),
                        modifier = Modifier
                            .size(width = 46.dp, height = 54.dp)
                            .scale(boxScale),
                        shadowElevation = if (isCurrentFocus) 2.dp else 0.dp
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
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = VegitoPrimary
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Hidden / Transparent Native OutlinedTextField to capture native keyboard, autofill, and paste
            OutlinedTextField(
                value = otp,
                onValueChange = { input ->
                    val digits = input.text.filter(Char::isDigit).take(6)
                    otp = TextFieldValue(digits, selection = TextRange(digits.length))
                    if (digits.length == 6) {
                        onVerifyOtp(digits)
                    }
                },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                singleLine = true,
                placeholder = {
                    Text(
                        "Tap here to type verification code",
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .focusRequester(focusRequester),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                    unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f)
                )
            )

            // Error Display
            if (errorMessage != null) {
                Spacer(modifier = Modifier.height(14.dp))
                AuthErrorMessage(message = errorMessage)
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Verify Button
            PrimaryAuthButton(
                text = "Verify & Continue",
                onClick = {
                    if (otp.text.length == 6) {
                        onVerifyOtp(otp.text)
                    }
                },
                enabled = otp.text.length == 6,
                isLoading = isLoading
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Resend Code Countdown
            if (timerSeconds > 0) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "Resend code in ",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "${timerSeconds}s",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = VegitoPrimary
                    )
                }
            } else {
                TextButton(
                    onClick = {
                        timerSeconds = 30
                        onResendOtp()
                    },
                    enabled = !isLoading
                ) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = "Resend",
                        tint = VegitoPrimary,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Resend Code",
                        color = VegitoPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Security note
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Lock,
                    contentDescription = "Secure",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "Vegito will never ask for your code over a phone call.",
                    fontSize = 11.5.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                )
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}
