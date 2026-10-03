package com.vegito.app.presentation.customer

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.UserProfile
import com.vegito.app.ui.theme.VegitoPrimary

@Composable
fun ProfileScreen(
    user: UserProfile?,
    activeRole: String,
    onSwitchRole: (String) -> Unit,
    onLogout: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Person, contentDescription = "Profile", tint = VegitoPrimary, modifier = Modifier.size(40.dp))
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(user?.name ?: "Vegito Customer", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(user?.phone ?: "+91 9876543210", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Role Switcher for accounts with multiple authorized roles
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.SwapHoriz, contentDescription = "Role", tint = VegitoPrimary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Switch Workspace", fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(8.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = activeRole == "customer",
                        onClick = { onSwitchRole("customer") },
                        label = { Text("Customer") }
                    )
                    FilterChip(
                        selected = activeRole == "seller",
                        onClick = { onSwitchRole("seller") },
                        label = { Text("Seller") }
                    )
                    FilterChip(
                        selected = activeRole == "delivery_partner",
                        onClick = { onSwitchRole("delivery_partner") },
                        label = { Text("Delivery") }
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = onLogout,
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
            shape = RoundedCornerShape(14.dp)
        ) {
            Icon(Icons.Default.ExitToApp, contentDescription = "Logout")
            Spacer(modifier = Modifier.width(8.dp))
            Text("Logout & Clear Session", fontWeight = FontWeight.Bold)
        }
    }
}
