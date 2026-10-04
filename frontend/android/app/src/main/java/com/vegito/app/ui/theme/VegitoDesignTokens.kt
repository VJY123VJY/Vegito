package com.vegito.app.ui.theme

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.waitForUpOrCancellation
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * VEGITO CENTRAL MOTION & DESIGN TOKENS
 * Standardizes micro-interactions, durations, easing curves and dimensions.
 */
object VegitoMotion {
    // Duration Tokens (ms)
    const val DurationInstant = 100
    const val DurationMicro = 150
    const val DurationSmall = 220
    const val DurationNormal = 300
    const val DurationScreen = 380
    const val DurationHero = 500

    // Easing Curves
    val OrganicDecelerate = CubicBezierEasing(0.05f, 0.7f, 0.1f, 1.0f)
    val OrganicSpring = spring<Float>(
        dampingRatio = Spring.DampingRatioMediumBouncy,
        stiffness = Spring.StiffnessLow
    )
    val TactileSpring = spring<Float>(
        dampingRatio = 0.75f,
        stiffness = Spring.StiffnessMedium
    )
}

object VegitoRadius {
    val Badge = 6.dp
    val Chip = 10.dp
    val CompactCard = 14.dp
    val Card = 18.dp
    val Modal = 24.dp
    val Hero = 28.dp
}

object VegitoSpacing {
    val xxs = 2.dp
    val xs = 4.dp
    val s = 8.dp
    val m = 12.dp
    val l = 16.dp
    val xl = 20.dp
    val xxl = 24.dp
    val xxxl = 32.dp
}

/**
 * Tactile spring scale micro-interaction modifier.
 * Scales element down slightly on pointer touch-down and springs back smoothly on release.
 */
fun Modifier.bounceClick(
    scaleDown: Float = 0.94f,
    onClick: () -> Unit
): Modifier = composed {
    var isPressed by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (isPressed) scaleDown else 1.0f,
        animationSpec = spring(
            dampingRatio = 0.65f,
            stiffness = Spring.StiffnessMediumLow
        ),
        label = "bounceScale"
    )

    this
        .graphicsLayer {
            scaleX = scale
            scaleY = scale
        }
        .pointerInput(Unit) {
            while (true) {
                awaitPointerEventScope {
                    awaitFirstDown(false)
                    isPressed = true
                    val upOrCancel = waitForUpOrCancellation()
                    isPressed = false
                    if (upOrCancel != null) {
                        onClick()
                    }
                }
            }
        }
}

/**
 * GPU-accelerated Shimmer sweep brush for skeleton loading states.
 */
fun Modifier.vegitoShimmer(): Modifier = composed {
    val transition = rememberInfiniteTransition(label = "shimmerTransition")
    val translateAnim by transition.animateFloat(
        initialValue = -500f,
        targetValue = 1200f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1100, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmerTranslate"
    )

    val shimmerColors = listOf(
        Color.LightGray.copy(alpha = 0.22f),
        Color.White.copy(alpha = 0.55f),
        Color.LightGray.copy(alpha = 0.22f)
    )

    val brush = Brush.linearGradient(
        colors = shimmerColors,
        start = Offset(translateAnim, translateAnim),
        end = Offset(translateAnim + 250f, translateAnim + 250f)
    )

    this.background(brush)
}

/**
 * Subtle organic floating animation for produce elements and badges.
 */
fun Modifier.organicFloating(rangeDp: Dp = 5.dp): Modifier = composed {
    val transition = rememberInfiniteTransition(label = "organicFloatingTransition")
    val offsetY by transition.animateFloat(
        initialValue = -rangeDp.value,
        targetValue = rangeDp.value,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "floatAnim"
    )

    this.offset(y = offsetY.dp)
}

/**
 * Reusable Next-Gen Vegito Button with state transitions (Idle, Loading, Success, Disabled).
 */
@Composable
fun VegitoButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    isLoading: Boolean = false,
    isSuccess: Boolean = false,
    enabled: Boolean = true,
    containerColor: Color = VegitoPrimary,
    contentColor: Color = Color.White,
    shape: Shape = RoundedCornerShape(VegitoRadius.Card)
) {
    Surface(
        modifier = modifier
            .bounceClick(scaleDown = if (enabled && !isLoading) 0.96f else 1.0f) {
                if (enabled && !isLoading) onClick()
            },
        shape = shape,
        color = if (isSuccess) VegitoMint else if (enabled) containerColor else containerColor.copy(alpha = 0.45f),
        shadowElevation = if (enabled) 3.dp else 0.dp
    ) {
        Box(
            modifier = Modifier
                .padding(vertical = 14.dp, horizontal = 20.dp),
            contentAlignment = Alignment.Center
        ) {
            when {
                isLoading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = contentColor,
                        strokeWidth = 2.dp
                    )
                }
                isSuccess -> {
                    Text(
                        text = "✓ Success",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp
                    )
                }
                else -> {
                    Text(
                        text = text,
                        color = contentColor,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp
                    )
                }
            }
        }
    }
}
