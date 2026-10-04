package com.vegito.app.presentation.seller

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.BulkOrderSummary
import com.vegito.app.ui.theme.VegitoPrimary
import com.vegito.app.ui.theme.VegitoSecondary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SellerBulkOrdersScreen(
    orders: List<BulkOrderSummary>,
    onBack: () -> Unit,
    onSubmitQuote: (orderId: Int, pricePerKg: Double, remarks: String) -> Unit
) {
    var selectedOrderForQuote by remember { mutableStateOf<BulkOrderSummary?>(null) }
    var quotePriceStr by remember { mutableStateOf("32.0") }
    var quoteRemarks by remember { mutableStateOf("A-Grade mandi sorted produce ready for pickup") }

    if (selectedOrderForQuote != null) {
        val o = selectedOrderForQuote!!
        AlertDialog(
            onDismissRequest = { selectedOrderForQuote = null },
            title = { Text("Send Custom Quote: #${o.orderNumber}", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Business: ${o.businessName ?: "Restaurant Client"} (${o.businessType ?: "Bulk"})", fontWeight = FontWeight.SemiBold)
                    Text("Total Requested Items: ${o.itemsCount} crate(s)")
                    OutlinedTextField(
                        value = quotePriceStr,
                        onValueChange = { quotePriceStr = it },
                        label = { Text("Price per kg (₹)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = quoteRemarks,
                        onValueChange = { quoteRemarks = it },
                        label = { Text("Terms / Remarks") },
                        maxLines = 3,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val price = quotePriceStr.toDoubleOrNull() ?: 30.0
                        onSubmitQuote(o.id, price, quoteRemarks)
                        selectedOrderForQuote = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = VegitoSecondary)
                ) {
                    Text("Send Quote")
                }
            },
            dismissButton = {
                TextButton(onClick = { selectedOrderForQuote = null }) {
                    Text("Cancel")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("B2B Wholesale & Bulk Orders", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { paddingValues ->
        if (orders.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        Icons.Default.BusinessCenter,
                        contentDescription = "No B2B",
                        tint = Color.Gray,
                        modifier = Modifier.size(56.dp)
                    )
                    Text("No B2B bulk inquiries right now", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text(
                        "Inquiries from restaurants and hotels (>50kg) will show here",
                        color = Color.Gray,
                        fontSize = 13.sp
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(orders, key = { it.id }) { item ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(item.businessName ?: "Restaurant Client", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                    Text(
                                        "${item.businessType ?: "B2B Buyer"} • Order #${item.orderNumber}",
                                        fontSize = 12.sp,
                                        color = Color.Gray
                                    )
                                }

                                Surface(
                                    color = VegitoSecondary.copy(alpha = 0.15f),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text(
                                        item.status,
                                        color = VegitoSecondary,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 11.sp,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            Text(
                                "Items: ${item.itemsCount} crate(s) requested",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 14.sp
                            )
                            if (item.quoteTotal != null) {
                                Text(
                                    "Quoted Amount: ₹${item.quoteTotal}",
                                    fontWeight = FontWeight.Bold,
                                    color = VegitoPrimary,
                                    fontSize = 15.sp
                                )
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.End
                            ) {
                                Button(
                                    onClick = { selectedOrderForQuote = item },
                                    colors = ButtonDefaults.buttonColors(containerColor = VegitoSecondary),
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    Icon(Icons.Default.PriceCheck, contentDescription = "Quote", modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Send Custom Quote")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
