package com.vegito.app.presentation.seller

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.SellerAddProductRequest
import com.vegito.app.ui.theme.VegitoPrimary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SellerAddProductScreen(
    onBack: () -> Unit,
    onSubmitProduct: (SellerAddProductRequest) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("Fresh Vegetables") }
    var priceStr by remember { mutableStateOf("") }
    var unit by remember { mutableStateOf("kg") }
    var stockStr by remember { mutableStateOf("50") }
    var freshnessPct by remember { mutableStateOf(95f) }
    var isOrganic by remember { mutableStateOf(true) }
    var description by remember { mutableStateOf("") }

    val categories = listOf("Fresh Vegetables", "Leafy Greens", "Exotic & Herbs", "Tubers & Roots", "Seasonal Specials")
    val units = listOf("kg", "bunch", "piece", "gm", "crate")

    var categoryExpanded by remember { mutableStateOf(false) }
    var unitExpanded by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Add Mandi Product", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text("Publish Produce to Live Customer Catalog", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)

            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Product Name (e.g. Solapur Desi Tomato)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            // Category selector
            ExposedDropdownMenuBox(
                expanded = categoryExpanded,
                onExpandedChange = { categoryExpanded = it }
            ) {
                OutlinedTextField(
                    value = category,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Category") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = categoryExpanded) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor(),
                    shape = RoundedCornerShape(12.dp)
                )
                ExposedDropdownMenu(
                    expanded = categoryExpanded,
                    onDismissRequest = { categoryExpanded = false }
                ) {
                    categories.forEach { cat ->
                        DropdownMenuItem(
                            text = { Text(cat) },
                            onClick = {
                                category = cat
                                categoryExpanded = false
                            }
                        )
                    }
                }
            }

            // Price & Unit
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = priceStr,
                    onValueChange = { priceStr = it },
                    label = { Text("Price (₹)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1.2f),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp)
                )

                ExposedDropdownMenuBox(
                    expanded = unitExpanded,
                    onExpandedChange = { unitExpanded = it },
                    modifier = Modifier.weight(1f)
                ) {
                    OutlinedTextField(
                        value = unit,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Unit") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = unitExpanded) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor(),
                        shape = RoundedCornerShape(12.dp)
                    )
                    ExposedDropdownMenu(
                        expanded = unitExpanded,
                        onDismissRequest = { unitExpanded = false }
                    ) {
                        units.forEach { u ->
                            DropdownMenuItem(
                                text = { Text(u) },
                                onClick = {
                                    unit = u
                                    unitExpanded = false
                                }
                            )
                        }
                    }
                }
            }

            // Initial Stock
            OutlinedTextField(
                value = stockStr,
                onValueChange = { stockStr = it },
                label = { Text("Initial Stock Available") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            // Freshness Percentage Slider
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Mandi Freshness Score", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("${freshnessPct.toInt()}% Fresh", color = VegitoPrimary, fontWeight = FontWeight.ExtraBold)
                    }
                    Slider(
                        value = freshnessPct,
                        onValueChange = { freshnessPct = it },
                        valueRange = 50f..100f,
                        steps = 9
                    )
                }
            }

            // Organic Checkbox
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Checkbox(
                    checked = isOrganic,
                    onCheckedChange = { isOrganic = it }
                )
                Spacer(modifier = Modifier.width(4.dp))
                Column {
                    Text("Farm-Fresh / Organic Produce", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    Text("Highlight with organic badge in customer app", fontSize = 12.sp, color = Color.Gray)
                }
            }

            // Description
            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Description & Farm Details (Optional)") },
                modifier = Modifier.fillMaxWidth(),
                maxLines = 3,
                shape = RoundedCornerShape(12.dp)
            )

            errorMessage?.let {
                Text(it, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
            }

            Spacer(modifier = Modifier.height(10.dp))

            Button(
                onClick = {
                    val price = priceStr.toDoubleOrNull()
                    val stock = stockStr.toDoubleOrNull()
                    if (name.isBlank()) {
                        errorMessage = "Please enter product name"
                    } else if (price == null || price <= 0.0) {
                        errorMessage = "Please enter valid price greater than 0"
                    } else if (stock == null || stock < 0.0) {
                        errorMessage = "Please enter valid stock quantity"
                    } else {
                        errorMessage = null
                        val categoryId = when (category) {
                            "Fresh Vegetables" -> 1
                            "Leafy Greens" -> 3
                            "Tubers & Roots" -> 4
                            "Exotic & Herbs" -> 5
                            else -> 1
                        }
                        onSubmitProduct(
                            SellerAddProductRequest(
                                productName = name.trim(),
                                categoryId = categoryId,
                                price = price,
                                unit = unit,
                                stockQuantity = stock,
                                description = description.ifBlank { "Direct from local Solapur farm harvest" }
                            )
                        )
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary),
                shape = RoundedCornerShape(14.dp)
            ) {
                Icon(Icons.Default.Check, contentDescription = "Publish")
                Spacer(modifier = Modifier.width(8.dp))
                Text("Publish to Live Store", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }
        }
    }
}
