package com.vegito.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = VegitoPrimaryLight,
    onPrimary = Color.White,
    primaryContainer = Color(0xFF0F3B2E),
    onPrimaryContainer = Color(0xFFA5D6A7),
    secondary = VegitoSecondaryLight,
    onSecondary = Color.Black,
    secondaryContainer = Color(0xFF4E2600),
    onSecondaryContainer = Color(0xFFFFCC80),
    background = BackgroundDark,
    onBackground = TextPrimaryDark,
    surface = SurfaceDark,
    onSurface = TextPrimaryDark,
    surfaceVariant = SurfaceDarkElevated,
    onSurfaceVariant = TextSecondaryDark,
    outline = BorderDark,
    outlineVariant = Color(0xFF1E2620)
)

private val LightColorScheme = lightColorScheme(
    primary = VegitoPrimary,
    onPrimary = Color.White,
    primaryContainer = VegitoMintSoft,
    onPrimaryContainer = VegitoPrimaryDark,
    secondary = VegitoSecondary,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFFFF3E0),
    onSecondaryContainer = Color(0xFFE65100),
    background = BackgroundLight,
    onBackground = TextPrimaryLight,
    surface = SurfaceLight,
    onSurface = TextPrimaryLight,
    surfaceVariant = SurfaceLightElevated,
    onSurfaceVariant = TextSecondaryLight,
    outline = BorderLight,
    outlineVariant = Color(0xFFECEFEA)
)

@Composable
fun VegitoTheme(
    themeMode: String = "LIGHT", // LIGHT, DARK, SYSTEM
    content: @Composable () -> Unit
) {
    val darkTheme = when (themeMode) {
        "DARK" -> true
        "LIGHT" -> false
        else -> isSystemInDarkTheme()
    }

    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
