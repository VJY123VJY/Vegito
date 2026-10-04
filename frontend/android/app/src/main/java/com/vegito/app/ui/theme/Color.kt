package com.vegito.app.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

// Primary Living Emerald Palette
val VegitoPrimary = Color(0xFF0A4D3C)
val VegitoPrimaryDark = Color(0xFF052B21)
val VegitoPrimaryLight = Color(0xFF2E7D32)
val VegitoMint = Color(0xFF00C853)
val VegitoMintSoft = Color(0xFFE8F5E9)

// Accent & Harvest Sunburst Palette
val VegitoSecondary = Color(0xFFFF6D00)
val VegitoSecondaryLight = Color(0xFFFF9100)
val VegitoAccent = Color(0xFFFFAB00)

// Dynamic Produce Freshness Indicator Tokens
val FreshHigh = Color(0xFF1B5E20)
val FreshMid = Color(0xFFE65100)
val FreshLow = Color(0xFFC62828)

// Neutral Light Theme Surfaces
val BackgroundLight = Color(0xFFF8FAF6)
val SurfaceLight = Color(0xFFFFFFFF)
val SurfaceLightElevated = Color(0xFFF1F5EF)
val BorderLight = Color(0xFFE0E5DC)
val TextPrimaryLight = Color(0xFF181D19)
val TextSecondaryLight = Color(0xFF555F56)

// Neutral Dark Theme Surfaces (True OLED Forest Midnight)
val BackgroundDark = Color(0xFF0D120F)
val SurfaceDark = Color(0xFF171E19)
val SurfaceDarkElevated = Color(0xFF202923)
val BorderDark = Color(0xFF2D3830)
val TextPrimaryDark = Color(0xFFE2E7E1)
val TextSecondaryDark = Color(0xFF9BA49A)

// Signature Gradient Sets
object VegitoGradients {
    val EmeraldDawn = Brush.verticalGradient(
        colors = listOf(Color(0xFF0A4D3C), Color(0xFF1B5E20), Color(0xFF2E7D32))
    )
    val EmeraldGlass = Brush.horizontalGradient(
        colors = listOf(Color(0xFF0A4D3C), Color(0xFF1B5E20))
    )
    val HarvestSun = Brush.linearGradient(
        colors = listOf(Color(0xFFFF6D00), Color(0xFFFF9100))
    )
    val FreshMint = Brush.horizontalGradient(
        colors = listOf(Color(0xFF00C853), Color(0xFF69F0AE))
    )
    val CardGloss = Brush.verticalGradient(
        colors = listOf(Color.White.copy(alpha = 0.08f), Color.Transparent)
    )
}
