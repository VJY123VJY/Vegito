package com.vegito.app.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.SavedAddress
import com.vegito.app.ui.theme.*
import com.vegito.app.utils.Localization

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TopBar(
    currentAddress: SavedAddress?,
    selectedLang: String,
    themeMode: String,
    onLocationClick: () -> Unit,
    onLanguageChange: (String) -> Unit,
    onThemeToggle: () -> Unit,
    onSearchClick: () -> Unit,
    onFavoritesClick: () -> Unit = {},
    onNotificationsClick: () -> Unit = {}
) {
    var showLangMenu by remember { mutableStateOf(false) }

    // Pulsing live Mandi indicator dot
    val pulseTransition = rememberInfiniteTransition(label = "mandiPulse")
    val pulseAlpha by pulseTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(900, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseAlpha"
    )

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = VegitoPrimary,
        shadowElevation = 6.dp
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(VegitoGradients.EmeraldDawn)
                .statusBarsPadding()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 10.dp)
            ) {
                // Row 1: Location Badge + Quick Actions
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Tactile Location Badge
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .weight(1f)
                            .bounceClick(scaleDown = 0.96f) { onLocationClick() }
                            .padding(vertical = 4.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.LocationOn,
                                contentDescription = "Delivery Location",
                                tint = VegitoMint,
                                modifier = Modifier.size(19.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(8.dp))

                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = currentAddress?.title ?: "Select Mandi Location",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = Color.White
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Icon(
                                    Icons.Default.KeyboardArrowDown,
                                    contentDescription = "Expand",
                                    tint = Color.White.copy(alpha = 0.8f),
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                // Live Mandi Active Indicator
                                Box(
                                    modifier = Modifier
                                        .size(7.dp)
                                        .clip(CircleShape)
                                        .background(VegitoMint.copy(alpha = pulseAlpha))
                                )
                            }
                            Text(
                                text = currentAddress?.addressLine ?: "Tap to detect nearby mandi GPS",
                                fontSize = 11.sp,
                                color = Color.White.copy(alpha = 0.82f),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }

                    // Action Icons Row: Favorites, Notifications, Lang, Theme
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(
                            onClick = onFavoritesClick,
                            modifier = Modifier.size(34.dp)
                        ) {
                            Icon(Icons.Default.Favorite, contentDescription = "Favorites", tint = Color.White, modifier = Modifier.size(18.dp))
                        }

                        IconButton(
                            onClick = onNotificationsClick,
                            modifier = Modifier.size(34.dp)
                        ) {
                            Icon(Icons.Default.Notifications, contentDescription = "Notifications", tint = Color.White, modifier = Modifier.size(18.dp))
                        }

                        Box {
                            IconButton(
                                onClick = { showLangMenu = true },
                                modifier = Modifier.size(34.dp)
                            ) {
                                Icon(Icons.Default.Language, contentDescription = "Language", tint = Color.White, modifier = Modifier.size(18.dp))
                            }
                            DropdownMenu(
                                expanded = showLangMenu,
                                onDismissRequest = { showLangMenu = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text("English") },
                                    onClick = { onLanguageChange("en"); showLangMenu = false }
                                )
                                DropdownMenuItem(
                                    text = { Text("मराठी (Marathi)") },
                                    onClick = { onLanguageChange("mr"); showLangMenu = false }
                                )
                                DropdownMenuItem(
                                    text = { Text("हिंदी (Hindi)") },
                                    onClick = { onLanguageChange("hi"); showLangMenu = false }
                                )
                            }
                        }

                        IconButton(
                            onClick = onThemeToggle,
                            modifier = Modifier.size(34.dp)
                        ) {
                            Icon(
                                imageVector = if (themeMode == "DARK") Icons.Default.LightMode else Icons.Default.DarkMode,
                                contentDescription = "Theme",
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Row 2: Search Capsule with Organic Glass Surface
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp)
                        .bounceClick(scaleDown = 0.98f) { onSearchClick() },
                    shape = RoundedCornerShape(22.dp),
                    color = Color.White,
                    shadowElevation = 2.dp
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 14.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = "Search",
                            tint = VegitoPrimaryLight,
                            modifier = Modifier.size(19.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Search fresh veggies, fruits & Mandai deals...",
                            color = Color.Gray,
                            fontSize = 12.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Spacer(modifier = Modifier.weight(1f))
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = VegitoPrimary.copy(alpha = 0.08f),
                            modifier = Modifier.padding(2.dp)
                        ) {
                            Text(
                                text = "MANDAI",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = VegitoPrimary,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
