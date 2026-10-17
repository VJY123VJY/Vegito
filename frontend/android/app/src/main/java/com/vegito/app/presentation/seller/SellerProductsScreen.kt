package com.vegito.app.presentation.seller

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.vegito.app.data.model.Product
import com.vegito.app.ui.components.FreshnessBadge
import com.vegito.app.ui.theme.VegitoPrimary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SellerProductsScreen(
    products: List<Product>,
    onBack: (() -> Unit)? = null,
    onAddProduct: () -> Unit,
    onEditStock: (productId: Int, change: Double, isAdd: Boolean) -> Unit = { _, _, _ -> },
    onPublishPrice: ((sellerProductId: String, newPrice: Double) -> Unit)? = null
) {
    var selectedProductForStock by remember { mutableStateOf<Product?>(null) }
    var adjustStockQuantityStr by remember { mutableStateOf("10") }
    var selectedProductForPrice by remember { mutableStateOf<Product?>(null) }
    var newPriceStr by remember { mutableStateOf("") }

    if (selectedProductForPrice != null) {
        val prod = selectedProductForPrice!!
        val ref = prod.marketReferencePrice
        val minSuggested = if (ref != null && ref > 0) (ref * 1.05).toInt() else null
        val maxSuggested = if (ref != null && ref > 0) (ref * 1.25).toInt() else null

        AlertDialog(
            onDismissRequest = { selectedProductForPrice = null },
            title = { Text("भाव ठरवा / Set Price: ${prod.name}", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("सध्याचा भाव: ₹${prod.price} / ${prod.unit}", fontSize = 13.sp)

                    if (ref != null && ref > 0) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                Text(
                                    "🏛️ Solapur APMC Mandi Rate: ₹${ref.toInt()} / kg",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    color = Color(0xFF2E7D32)
                                )
                                Text(
                                    "Safe Recommended Range: ₹$minSuggested - ₹$maxSuggested / kg",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Text(
                                    "Source: ${prod.marketSource ?: "MSAMB / Solapur APMC"}",
                                    fontSize = 10.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                                )
                            }
                        }

                        Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            OutlinedButton(
                                onClick = { newPriceStr = ref.toInt().toString() },
                                modifier = Modifier.weight(1f),
                                contentPadding = PaddingValues(horizontal = 4.dp, vertical = 4.dp)
                            ) {
                                Text("Mandi: ₹${ref.toInt()}", fontSize = 10.sp)
                            }
                            if (minSuggested != null) {
                                OutlinedButton(
                                    onClick = { newPriceStr = minSuggested.toString() },
                                    modifier = Modifier.weight(1f),
                                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 4.dp)
                                ) {
                                    Text("+5%: ₹$minSuggested", fontSize = 10.sp)
                                }
                            }
                            if (maxSuggested != null) {
                                OutlinedButton(
                                    onClick = { newPriceStr = maxSuggested.toString() },
                                    modifier = Modifier.weight(1f),
                                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 4.dp)
                                ) {
                                    Text("+25%: ₹$maxSuggested", fontSize = 10.sp)
                                }
                            }
                        }
                    } else {
                        Text(
                            "Today's verified Solapur market price is unavailable.",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    OutlinedTextField(
                        value = newPriceStr,
                        onValueChange = { newPriceStr = it },
                        label = { Text("नवीन विक्री भाव (₹) / New Price") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val parsed = newPriceStr.toDoubleOrNull()
                        if (parsed != null && parsed > 0.0) {
                            onPublishPrice?.invoke(prod.sellerProductId, parsed)
                        }
                        selectedProductForPrice = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                ) {
                    Text("भाव प्रसिद्ध करा (Publish)")
                }
            },
            dismissButton = {
                TextButton(onClick = { selectedProductForPrice = null }) {
                    Text("रद्द करा")
                }
            }
        )
    }

    if (selectedProductForStock != null) {
        val prod = selectedProductForStock!!
        AlertDialog(
            onDismissRequest = { selectedProductForStock = null },
            title = { Text("साठा अद्ययावत करा: ${prod.name}", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("सध्याचा उपलब्ध साठा: ${prod.stockQuantity} ${prod.unit}")
                    OutlinedTextField(
                        value = adjustStockQuantityStr,
                        onValueChange = { adjustStockQuantityStr = it },
                        label = { Text("बदलण्याचे प्रमाण / Quantity change") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = {
                            val qty = adjustStockQuantityStr.toDoubleOrNull() ?: 10.0
                            val prodId = prod.id.toIntOrNull() ?: 1
                            onEditStock(prodId, qty, true)
                            selectedProductForStock = null
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                    ) {
                        Text("+ जोडा (+ Add)")
                    }

                    OutlinedButton(
                        onClick = {
                            val qty = adjustStockQuantityStr.toDoubleOrNull() ?: 10.0
                            val prodId = prod.id.toIntOrNull() ?: 1
                            onEditStock(prodId, qty, false)
                            selectedProductForStock = null
                        }
                    ) {
                        Text("- वजा करा (- Deduct)")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { selectedProductForStock = null }) {
                    Text("रद्द करा")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("उत्पादन कॅटलॉग (Produce Catalog)", fontWeight = FontWeight.Bold, fontSize = 17.sp) },
                navigationIcon = {
                    if (onBack != null) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onAddProduct,
                icon = { Icon(Icons.Default.Add, contentDescription = "Add Product", tint = Color.White) },
                text = { Text("नवीन उत्पादन जोडा", fontWeight = FontWeight.Bold, color = Color.White) },
                containerColor = VegitoPrimary,
                shape = RoundedCornerShape(16.dp)
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(16.dp)
        ) {
            item {
                Text("साठा आणि भाव व्यवस्थापन (Inventory & Prices)", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Text("आपल्या भाज्या व फळांचे दर आणि उपलब्ध साठा नियंत्रित करा", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(12.dp))
            }

            items(products, key = { it.id }) { product ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 6.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (product.imageUrl.isNotBlank()) {
                            AsyncImage(
                                model = ImageRequest.Builder(LocalContext.current)
                                    .data(product.imageUrl)
                                    .crossfade(true)
                                    .build(),
                                contentDescription = product.name,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(52.dp)
                                    .clip(RoundedCornerShape(10.dp))
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Text(product.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Text("₹${product.price} / ${product.unit} • साठा: ${product.stockQuantity}", fontSize = 12.sp)
                            if (product.marketReferencePrice != null && product.marketReferencePrice > 0) {
                                Text(
                                    "APMC Rate: ₹${product.marketReferencePrice.toInt()}/kg (${product.marketTrend ?: "STABLE"})",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = Color(0xFF2E7D32)
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            FreshnessBadge(percentage = product.freshnessPercentage)
                        }

                        Column(
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                            horizontalAlignment = Alignment.End
                        ) {
                            Button(
                                onClick = { selectedProductForStock = product },
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Icon(Icons.Default.Edit, contentDescription = "Edit", modifier = Modifier.size(12.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("साठा", fontSize = 11.sp)
                            }

                            OutlinedButton(
                                onClick = {
                                    selectedProductForPrice = product
                                    newPriceStr = product.price.toString()
                                },
                                shape = RoundedCornerShape(10.dp),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Text("भाव ठरवा", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}
