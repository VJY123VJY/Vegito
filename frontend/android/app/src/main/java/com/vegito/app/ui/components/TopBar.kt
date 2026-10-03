package com.vegito.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.SavedAddress
import com.vegito.app.ui.theme.VegitoPrimary
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
    onSearchClick: () -> Unit
) {
    var showLangMenu by remember { mutableStateOf(false) }

    Surface(
        color = VegitoPrimary,
        contentColor = Color.White,
        shadowElevation = 4.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Location Selector
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onLocationClick() }
                ) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = "Location",
                        tint = Color.White
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Column {
                        Text(
                            text = currentAddress?.title ?: "Set Delivery Location",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = Color.White
                        )
                        Text(
                            text = currentAddress?.addressLine ?: "Tap to detect GPS location",
                            fontSize = 11.sp,
                            color = Color.White.copy(alpha = 0.8f),
                            maxLines = 1
                        )
                    }
                }

                // Controls: Language & Dark/Light Mode
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box {
                        IconButton(onClick = { showLangMenu = true }) {
                            Icon(Icons.Default.Language, contentDescription = "Language", tint = Color.White)
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

                    IconButton(onClick = { onThemeToggle() }) {
                        Icon(
                            imageVector = if (themeMode == "DARK") Icons.Default.LightMode else Icons.Default.DarkMode,
                            contentDescription = "Theme Mode",
                            tint = Color.White
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Search Bar Component
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp)
                    .clickable { onSearchClick() },
                shape = RoundedCornerShape(22.dp),
                color = Color.White
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(horizontal = 16.dp)
                ) {
                    Icon(Icons.Default.Search, contentDescription = "Search", tint = Color.Gray)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Search fresh vegetables, fruits & grocery...",
                        color = Color.Gray,
                        fontSize = 13.sp
                    )
                }
            }
        }
    }
}
