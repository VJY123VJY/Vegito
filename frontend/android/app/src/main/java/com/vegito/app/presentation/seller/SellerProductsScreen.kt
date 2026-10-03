package com.vegito.app.presentation.seller

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.Product
import com.vegito.app.ui.components.FreshnessBadge
import com.vegito.app.ui.theme.VegitoPrimary

@Composable
fun SellerProductsScreen(
    products: List<Product>,
    onAddProduct: () -> Unit
) {
    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = onAddProduct,
                containerColor = VegitoPrimary
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Product", tint = androidx.compose.ui.graphics.Color.White)
            }
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(16.dp)
        ) {
            item {
                Text("Inventory & Stock Control", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(12.dp))
            }

            items(products) { product ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 6.dp),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(product.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Text("₹${product.price} / ${product.unit} • Stock: ${product.stockQuantity}", fontSize = 12.sp)
                            Spacer(modifier = Modifier.height(4.dp))
                            FreshnessBadge(percentage = product.freshnessPercentage)
                        }

                        TextButton(onClick = {}) {
                            Text("Edit Stock")
                        }
                    }
                }
            }
        }
    }
}
