package com.vegito.app.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

// Primary Living Emerald & Fresh Produce Palette
val VegitoPrimary = Color(0xFF064E3B)
val VegitoPrimaryDark = Color(0xFF022C22)
val VegitoPrimaryLight = Color(0xFF10B981)
val VegitoMint = Color(0xFF00E676)
val VegitoMintSoft = Color(0xFFD1FAE5)

// Accent & Harvest Sunburst Palette
val VegitoSecondary = Color(0xFF00C853)
val VegitoSecondaryLight = Color(0xFF34D399)
val VegitoAccent = Color(0xFF6EE7B7)

// Dynamic Produce Freshness Indicator Tokens
val FreshHigh = Color(0xFF047857)
val FreshMid = Color(0xFF059669)
val FreshLow = Color(0xFF022C22)

// Neutral Light Theme Surfaces (Clean Agricultural Green Tint)
val BackgroundLight = Color(0xFFF4FBF7)
val SurfaceLight = Color(0xFFFFFFFF)
val SurfaceLightElevated = Color(0xFFE6F4ED)
val BorderLight = Color(0xFFC6E7D5)
val TextPrimaryLight = Color(0xFF0B2117)
val TextSecondaryLight = Color(0xFF3B5347)

// Neutral Dark Theme Surfaces (True OLED Forest Midnight)
val BackgroundDark = Color(0xFF021710)
val SurfaceDark = Color(0xFF06281E)
val SurfaceDarkElevated = Color(0xFF0B3A2C)
val BorderDark = Color(0xFF13523F)
val TextPrimaryDark = Color(0xFFECFDF5)
val TextSecondaryDark = Color(0xFFA7F3D0)

// Signature Gradient Sets
object VegitoGradients {
    val EmeraldDawn = Brush.verticalGradient(
        colors = listOf(Color(0xFF022C22), Color(0xFF064E3B), Color(0xFF047857))
    )
    val EmeraldGlass = Brush.horizontalGradient(
        colors = listOf(Color(0xFF064E3B), Color(0xFF059669))
    )
    val HarvestSun = Brush.linearGradient(
        colors = listOf(Color(0xFF00E676), Color(0xFF10B981))
    )
    val FreshMint = Brush.horizontalGradient(
        colors = listOf(Color(0xFF34D399), Color(0xFF6EE7B7))
    )
    val CardGloss = Brush.verticalGradient(
        colors = listOf(Color.White.copy(alpha = 0.12f), Color.Transparent)
    )
}
