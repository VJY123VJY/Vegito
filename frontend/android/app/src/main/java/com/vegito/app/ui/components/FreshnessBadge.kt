package com.vegito.app.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Eco
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.ui.theme.FreshHigh
import com.vegito.app.ui.theme.FreshLow
import com.vegito.app.ui.theme.FreshMid
import com.vegito.app.ui.theme.VegitoPrimaryLight
import com.vegito.app.ui.theme.VegitoRadius

@Composable
fun FreshnessBadge(
    percentage: Int,
    modifier: Modifier = Modifier,
    showProgressBar: Boolean = false
) {
    // Dynamic color coding based on authentic produce freshness score
    val (badgeColor, statusText) = when {
        percentage >= 88 -> FreshHigh to "$percentage% Ultra Fresh"
        percentage >= 75 -> VegitoPrimaryLight to "$percentage% Crisp Fresh"
        percentage >= 60 -> FreshMid to "$percentage% Mandi Fresh"
        else -> FreshLow to "$percentage% Clearance"
    }

    // Animated fill value
    var triggered by remember { mutableStateOf(false) }
    LaunchedEffect(percentage) {
        triggered = true
    }

    val animatedFill by animateFloatAsState(
        targetValue = if (triggered) (percentage.coerceIn(0, 100) / 100f) else 0f,
        animationSpec = tween(durationMillis = 650, easing = FastOutSlowInEasing),
        label = "freshnessFill"
    )

    Column(modifier = modifier) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .background(badgeColor.copy(alpha = 0.14f), shape = RoundedCornerShape(VegitoRadius.Badge))
                .padding(horizontal = 7.dp, vertical = 3.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Eco,
                contentDescription = "Freshness Index",
                tint = badgeColor,
                modifier = Modifier.size(12.dp)
            )
            Spacer(modifier = Modifier.width(3.dp))
            Text(
                text = statusText,
                color = badgeColor,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.2.sp
            )
        }

        if (showProgressBar) {
            Spacer(modifier = Modifier.height(3.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(Color.LightGray.copy(alpha = 0.3f))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(animatedFill)
                        .fillMaxHeight()
                        .background(badgeColor)
                )
            }
        }
    }
}
