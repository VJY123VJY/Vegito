package com.vegito.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Eco
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.ui.theme.FreshHigh
import com.vegito.app.ui.theme.FreshLow
import com.vegito.app.ui.theme.FreshMid

@Composable
fun FreshnessBadge(percentage: Int, modifier: Modifier = Modifier) {
    val (badgeColor, statusText) = when {
        percentage >= 90 -> FreshHigh to "$percentage% Ultra Fresh"
        percentage >= 75 -> FreshMid to "$percentage% Fresh"
        else -> FreshLow to "$percentage% Standard"
    }

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .background(badgeColor.copy(alpha = 0.15f), shape = RoundedCornerShape(12.dp))
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Icon(
            imageVector = Icons.Default.Eco,
            contentDescription = "Freshness",
            tint = badgeColor,
            modifier = Modifier.size(14.dp)
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = statusText,
            color = badgeColor,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold
        )
    }
}
