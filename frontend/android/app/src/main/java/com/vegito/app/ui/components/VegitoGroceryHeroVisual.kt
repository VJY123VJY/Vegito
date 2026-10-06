package com.vegito.app.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.R
import com.vegito.app.ui.theme.VegitoPrimary
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun VegitoGroceryHeroVisual(
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "heroVisualTransition")

    // Rotation angle for tech-ring around produce
    val rotationAngle by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 12000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "ringRotation"
    )

    // Breathing pulse scale
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.96f,
        targetValue = 1.04f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 2400, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )

    // Vertical floating offsets for produce
    val floatY1 by infiniteTransition.animateFloat(
        initialValue = -6f,
        targetValue = 6f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "float1"
    )

    val floatY2 by infiniteTransition.animateFloat(
        initialValue = 6f,
        targetValue = -6f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 2200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "float2"
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(210.dp),
        contentAlignment = Alignment.Center
    ) {
        // Glowing ring canvas
        Canvas(
            modifier = Modifier
                .size(190.dp)
                .rotate(rotationAngle)
        ) {
            val centerOffset = Offset(size.width / 2f, size.height / 2f)
            val radius = size.minDimension / 2.2f

            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFF2E7D32).copy(alpha = 0.25f),
                        Color(0xFF81C784).copy(alpha = 0.08f),
                        Color.Transparent
                    ),
                    center = centerOffset,
                    radius = radius * 1.3f
                ),
                radius = radius * 1.3f,
                center = centerOffset
            )

            // Dashed Tech/Fresh Ring
            drawCircle(
                color = Color(0xFF81C784).copy(alpha = 0.45f),
                radius = radius,
                center = centerOffset,
                style = Stroke(
                    width = 2.dp.toPx(),
                    pathEffect = PathEffect.dashPathEffect(
                        floatArrayOf(16f, 16f), 0f
                    )
                )
            )

            // Glowing Dots on Ring
            for (i in 0 until 4) {
                val angleRad = Math.toRadians((i * 90.0))
                val x = centerOffset.x + radius * cos(angleRad).toFloat()
                val y = centerOffset.y + radius * sin(angleRad).toFloat()
                drawCircle(
                    color = Color(0xFF4CAF50),
                    radius = 4.dp.toPx(),
                    center = Offset(x, y)
                )
            }
        }

        // Central Elevated Brand Logo Sphere
        Surface(
            shape = CircleShape,
            color = Color.White,
            shadowElevation = 12.dp,
            modifier = Modifier
                .size(86.dp)
                .scale(pulseScale)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Image(
                    painter = painterResource(id = R.drawable.ic_vegito_logo),
                    contentDescription = "Vegito Logo",
                    modifier = Modifier.size(68.dp)
                )
            }
        }

        // Floating Fresh Produce Badges around Hero Logo
        Box(
            modifier = Modifier
                .size(200.dp)
        ) {
            FloatingProduceBadge("🥬", Modifier.align(Alignment.TopStart).offset(y = floatY1.dp, x = 4.dp))
            FloatingProduceBadge("🍅", Modifier.align(Alignment.TopEnd).offset(y = floatY2.dp, x = (-4).dp))
            FloatingProduceBadge("🥕", Modifier.align(Alignment.CenterStart).offset(y = floatY2.dp, x = (-8).dp))
            FloatingProduceBadge("🍎", Modifier.align(Alignment.CenterEnd).offset(y = floatY1.dp, x = 8.dp))
            FloatingProduceBadge("⚡", Modifier.align(Alignment.BottomStart).offset(y = floatY1.dp, x = 12.dp))
            FloatingProduceBadge("🛵", Modifier.align(Alignment.BottomEnd).offset(y = floatY2.dp, x = (-12).dp))
        }
    }
}

@Composable
private fun FloatingProduceBadge(
    emoji: String,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = CircleShape,
        color = Color.White,
        shadowElevation = 6.dp,
        modifier = modifier.size(36.dp)
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(emoji, fontSize = 18.sp)
        }
    }
}
