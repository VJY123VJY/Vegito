package com.vegito.app.presentation.auth.components

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.ui.theme.VegitoPrimary
import com.vegito.app.ui.theme.bounceClick

/**
 * Custom vector logo mark for Vegito:
 * Deep emerald circular badge containing an organic twin-leaf seedling
 * with a harvest basket arc, representing "Fresh Market Meets Modern Technology".
 */
@Composable
fun VegitoBrandMark(
    modifier: Modifier = Modifier,
    sizeDp: Int = 76,
    animated: Boolean = true
) {
    val infiniteTransition = rememberInfiniteTransition(label = "vegitoLogoPulse")
    val pulseScale by if (animated) {
        infiniteTransition.animateFloat(
            initialValue = 0.98f,
            targetValue = 1.03f,
            animationSpec = infiniteRepeatable(
                animation = tween(2200, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "logoPulse"
        )
    } else {
        remember { mutableFloatStateOf(1.0f) }
    }

    Box(
        modifier = modifier
            .size(sizeDp.dp)
            .scale(pulseScale),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val w = size.width
            val h = size.height

            // 1. Soft emerald glow background
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFF2E7D32).copy(alpha = 0.22f),
                        Color(0xFF81C784).copy(alpha = 0.08f),
                        Color.Transparent
                    )
                ),
                radius = w * 0.48f,
                center = center
            )

            // 2. Deep forest green base disc
            drawCircle(
                brush = Brush.verticalGradient(
                    colors = listOf(Color(0xFF0F3822), Color(0xFF1B5E20))
                ),
                radius = w * 0.40f,
                center = center
            )

            // 3. Subtle rim stroke
            drawCircle(
                color = Color(0xFFA3E635).copy(alpha = 0.45f),
                radius = w * 0.40f,
                center = center,
                style = Stroke(width = w * 0.025f)
            )

            // 4. Primary fresh leaf (pointed upward right)
            val leafPath1 = Path().apply {
                moveTo(w * 0.50f, h * 0.65f)
                cubicTo(
                    w * 0.35f, h * 0.50f,
                    w * 0.38f, h * 0.30f,
                    w * 0.60f, h * 0.28f
                )
                cubicTo(
                    w * 0.68f, h * 0.45f,
                    w * 0.60f, h * 0.60f,
                    w * 0.50f, h * 0.65f
                )
                close()
            }
            drawPath(
                path = leafPath1,
                brush = Brush.verticalGradient(
                    colors = listOf(Color(0xFFA3E635), Color(0xFF4CAF50))
                ),
                style = Fill
            )

            // 5. Secondary sprout leaf (pointing upward left)
            val leafPath2 = Path().apply {
                moveTo(w * 0.48f, h * 0.63f)
                cubicTo(
                    w * 0.32f, h * 0.58f,
                    w * 0.30f, h * 0.42f,
                    w * 0.42f, h * 0.38f
                )
                cubicTo(
                    w * 0.50f, h * 0.48f,
                    w * 0.50f, h * 0.58f,
                    w * 0.48f, h * 0.63f
                )
                close()
            }
            drawPath(
                path = leafPath2,
                brush = Brush.verticalGradient(
                    colors = listOf(Color(0xFF81C784), Color(0xFF2E7D32))
                ),
                style = Fill
            )

            // 6. Harvest cradle arc underneath the leaves
            drawArc(
                brush = Brush.horizontalGradient(
                    colors = listOf(Color(0xFFFF9100), Color(0xFFFFB300))
                ),
                startAngle = 25f,
                sweepAngle = 130f,
                useCenter = false,
                topLeft = Offset(w * 0.28f, h * 0.42f),
                size = Size(w * 0.44f, h * 0.35f),
                style = Stroke(width = w * 0.045f)
            )
        }
    }
}

/**
 * Top brand section for Auth & Registration screens.
 */
@Composable
fun VegitoAuthHeader(
    modifier: Modifier = Modifier,
    title: String = "Fresh groceries start here.",
    subtitle: String = "Sign in to discover farm-fresh vegetables and daily essentials.",
    showLogo: Boolean = true
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        if (showLogo) {
            VegitoBrandMark(sizeDp = 80)
            Spacer(modifier = Modifier.height(14.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "VEGITO",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 3.sp,
                    color = VegitoPrimary
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Freshness, delivered to you.",
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(28.dp))
        }

        Text(
            text = title,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = subtitle,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 12.dp)
        )
    }
}

/**
 * Distinct role selector for Customer, Seller, and Delivery Partner.
 */
@Composable
fun RoleSelectorTabs(
    selectedRole: String,
    onRoleSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val roles = listOf(
        Triple("customer", "Customer", Icons.Default.Person),
        Triple("seller", "Seller", Icons.Default.Store),
        Triple("delivery_partner", "Delivery", Icons.Default.DeliveryDining)
    )

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
        modifier = modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(4.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            roles.forEach { (roleKey, label, icon) ->
                val isSelected = selectedRole.lowercase() == roleKey
                val animatedBg by animateColorAsState(
                    targetValue = if (isSelected) VegitoPrimary else Color.Transparent,
                    animationSpec = tween(220),
                    label = "roleTabBg"
                )
                val contentColor by animateColorAsState(
                    targetValue = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                    animationSpec = tween(220),
                    label = "roleTabColor"
                )

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = animatedBg,
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .clickable { onRoleSelected(roleKey) }
                ) {
                    Row(
                        modifier = Modifier.fillMaxSize(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = label,
                            tint = contentColor,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = label,
                            fontSize = 13.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            color = contentColor
                        )
                    }
                }
            }
        }
    }
}

/**
 * Mobile Number Input component with Country Code Badge (+91 India)
 * and active validation states.
 */
@Composable
fun PhoneNumberInput(
    phone: String,
    onPhoneChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isError: Boolean = false,
    errorMessage: String? = null,
    onImeAction: () -> Unit = {}
) {
    val isValid = phone.length == 10 && phone.matches(Regex("^[6-9]\\d{9}$"))

    Column(modifier = modifier.fillMaxWidth()) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(
                width = if (isError) 1.6.dp else if (isValid) 1.4.dp else 1.dp,
                color = if (isError) MaterialTheme.colorScheme.error
                else if (isValid) Color(0xFF2E7D32)
                else MaterialTheme.colorScheme.outlineVariant
            ),
            shadowElevation = 1.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Country Code Badge
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f),
                    modifier = Modifier.padding(vertical = 4.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = "🇮🇳", fontSize = 16.sp)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "+91",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }

                Spacer(modifier = Modifier.width(10.dp))

                // Input Field
                OutlinedTextField(
                    value = phone,
                    onValueChange = { input ->
                        val digits = input.filter(Char::isDigit).take(10)
                        onPhoneChange(digits)
                    },
                    placeholder = {
                        Text(
                            "Enter 10-digit mobile number",
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                        )
                    },
                    singleLine = true,
                    enabled = enabled,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Phone,
                        imeAction = ImeAction.Done
                    ),
                    keyboardActions = KeyboardActions(onDone = { onImeAction() }),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color.Transparent,
                        unfocusedBorderColor = Color.Transparent,
                        disabledBorderColor = Color.Transparent,
                        errorBorderColor = Color.Transparent
                    ),
                    trailingIcon = {
                        if (isValid) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = "Valid",
                                tint = Color(0xFF2E7D32),
                                modifier = Modifier.size(20.dp)
                            )
                        } else if (phone.isNotEmpty()) {
                            IconButton(
                                onClick = { onPhoneChange("") },
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Close,
                                    contentDescription = "Clear",
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        if (errorMessage != null || (phone.isNotEmpty() && phone.length < 10)) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = errorMessage ?: "${10 - phone.length} more digits needed",
                fontSize = 12.sp,
                color = if (errorMessage != null) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 12.dp)
            )
        }
    }
}

/**
 * Primary action button with tactile spring bounce and integrated loading spinner.
 */
@Composable
fun PrimaryAuthButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isLoading: Boolean = false,
    leadingIcon: ImageVector? = null,
    trailingIcon: ImageVector? = Icons.AutoMirrored.Filled.ArrowForward
) {
    Button(
        onClick = onClick,
        enabled = enabled && !isLoading,
        shape = RoundedCornerShape(16.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = VegitoPrimary,
            disabledContainerColor = VegitoPrimary.copy(alpha = 0.45f)
        ),
        elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp, pressedElevation = 0.dp),
        modifier = modifier
            .fillMaxWidth()
            .height(54.dp)
            .bounceClick(scaleDown = 0.96f) { }
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(22.dp),
                color = Color.White,
                strokeWidth = 2.4.dp
            )
            Spacer(modifier = Modifier.width(10.dp))
            Text("Please wait...", fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Color.White)
        } else {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                if (leadingIcon != null) {
                    Icon(leadingIcon, contentDescription = null, modifier = Modifier.size(18.dp), tint = Color.White)
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text(text, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                if (trailingIcon != null) {
                    Spacer(modifier = Modifier.width(8.dp))
                    Icon(trailingIcon, contentDescription = null, modifier = Modifier.size(18.dp), tint = Color.White)
                }
            }
        }
    }
}

/**
 * Standardized Error Banner with explicit guidance for common Auth errors.
 */
@Composable
fun AuthErrorMessage(
    message: String,
    modifier: Modifier = Modifier,
    onDismiss: (() -> Unit)? = null
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.85f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.35f)),
        modifier = modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            Icon(
                imageVector = Icons.Default.Warning,
                contentDescription = "Error",
                tint = MaterialTheme.colorScheme.error,
                modifier = Modifier
                    .size(20.dp)
                    .padding(top = 1.dp)
            )
            Spacer(modifier = Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = message,
                    color = MaterialTheme.colorScheme.onErrorContainer,
                    fontSize = 13.sp,
                    lineHeight = 18.sp,
                    fontWeight = FontWeight.Medium
                )
            }
            if (onDismiss != null) {
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier.size(20.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Dismiss",
                        tint = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.size(14.dp)
                    )
                }
            }
        }
    }
}
