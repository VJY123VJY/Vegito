package com.vegito.app.presentation.customer

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.CartSummary
import com.vegito.app.ui.theme.VegitoPrimary

@Composable
fun CartScreen(
    cart: CartSummary,
    onUpdateQuantity: (itemId: String, newQty: Double) -> Unit,
    onRemoveItem: (itemId: String) -> Unit,
    onProceedToCheckout: () -> Unit
) {
    if (cart.items.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Your Cart is Empty", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))
                Text("Add fresh vegetables and groceries to continue", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        return
    }

    Scaffold(
        bottomBar = {
            Surface(shadowElevation = 8.dp) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Grand Total", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Text("₹${cart.grandTotal}", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = VegitoPrimary)
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = onProceedToCheckout,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                    ) {
                        Text("Proceed to Checkout", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }
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
                Text("Your Shopping Basket", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(12.dp))
            }

            items(cart.items) { item ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 6.dp),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(item.product.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Text("₹${item.product.price} / ${item.product.unit}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("Total: ₹${item.itemTotal}", fontWeight = FontWeight.Bold, color = VegitoPrimary, fontSize = 14.sp)
                        }

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconButton(
                                onClick = {
                                    if (item.quantity > 1) onUpdateQuantity(item.id, item.quantity - 1)
                                    else onRemoveItem(item.id)
                                },
                                modifier = Modifier.size(32.dp)
                            ) {
                                Icon(
                                    imageVector = if (item.quantity == 1.0) Icons.Default.Delete else Icons.Default.Remove,
                                    contentDescription = "Decrease"
                                )
                            }
                            Text("${item.quantity.toInt()} ${item.product.unit}", fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 6.dp))
                            IconButton(
                                onClick = { onUpdateQuantity(item.id, item.quantity + 1) },
                                modifier = Modifier.size(32.dp)
                            ) {
                                Icon(Icons.Default.Add, contentDescription = "Increase")
                            }
                        }
                    }
                }
            }
        }
    }
}
