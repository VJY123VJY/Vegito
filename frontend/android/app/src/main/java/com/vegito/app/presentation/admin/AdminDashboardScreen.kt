package com.vegito.app.presentation.admin

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Analytics
import androidx.compose.material.icons.filled.FactCheck
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Store
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.AdminAnalytics
import com.vegito.app.ui.theme.VegitoPrimary

@Composable
fun AdminDashboardScreen(analytics: AdminAnalytics) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text("Admin Control Center", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(16.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(18.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row {
                    Icon(Icons.Default.Analytics, contentDescription = "Analytics", tint = VegitoPrimary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Gross Revenue Today", fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text("₹${analytics.grossRevenueToday}", fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, color = VegitoPrimary)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Card(modifier = Modifier.weight(1f), shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Icon(Icons.Default.People, contentDescription = "Users", tint = VegitoPrimary)
                    Text("Customers", fontSize = 12.sp)
                    Text("${analytics.totalCustomers}", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                }
            }

            Card(modifier = Modifier.weight(1f), shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Icon(Icons.Default.Store, contentDescription = "Sellers", tint = VegitoPrimary)
                    Text("Sellers", fontSize = 12.sp)
                    Text("${analytics.totalSellers}", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row {
                    Icon(Icons.Default.FactCheck, contentDescription = "KYC", tint = VegitoPrimary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Pending KYC Approvals", fontWeight = FontWeight.Bold)
                }
                Text("${analytics.pendingKycCount}", fontWeight = FontWeight.Bold, color = VegitoPrimary)
            }
        }
    }
}
