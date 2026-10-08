package com.vegito.app.presentation.customer

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.Product
import com.vegito.app.ui.components.ZigZagSection
import com.vegito.app.ui.theme.VegitoPrimary
import kotlinx.coroutines.delay

@Composable
fun SearchScreen(
    products: List<Product>,
    initialCategory: String? = null,
    onProductClick: (Product) -> Unit,
    onAddToCart: (Product) -> Unit,
    onToggleFavorite: ((Product) -> Unit)? = null,
    onSearchQueryChange: (String) -> Unit = {},
    searchError: String? = null
) {
    var searchQuery by remember { mutableStateOf(TextFieldValue("")) }
    var selectedCategory by remember { mutableStateOf("ALL") }
    var sortByPrice by remember { mutableStateOf("NONE") } // NONE, ASC, DESC

    LaunchedEffect(initialCategory) {
        selectedCategory = initialCategory?.takeIf { category ->
            products.any { it.category.equals(category, ignoreCase = true) }
        } ?: "ALL"
    }

    LaunchedEffect(searchQuery.text) {
        delay(300L)
        onSearchQueryChange(searchQuery.text.trim())
    }

    val categories = remember(products) {
        listOf("ALL") + products.map { it.category }.distinct()
    }

    val filtered = remember(searchQuery.text, selectedCategory, sortByPrice, products) {
        var list = products

        if (searchQuery.text.isNotBlank()) {
            list = list.filter {
                it.name.contains(searchQuery.text, ignoreCase = true) ||
                it.category.contains(searchQuery.text, ignoreCase = true)
            }
        }

        if (selectedCategory != "ALL") {
            list = list.filter { it.category.equals(selectedCategory, ignoreCase = true) }
        }

        when (sortByPrice) {
            "ASC" -> list.sortedBy { it.price }
            "DESC" -> list.sortedByDescending { it.price }
            else -> list
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            label = { Text("Search fresh vegetables & mandi produce...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search", tint = VegitoPrimary) },
            trailingIcon = {
                if (searchQuery.text.isNotEmpty()) {
                    IconButton(onClick = { searchQuery = TextFieldValue("") }) {
                        Icon(Icons.Default.Clear, contentDescription = "Clear")
                    }
                }
            },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        )

        Spacer(modifier = Modifier.height(10.dp))

        // Category Filter Chips
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            categories.forEach { cat ->
                FilterChip(
                    selected = selectedCategory == cat,
                    onClick = { selectedCategory = cat },
                    label = { Text(cat) }
                )
            }
        }

        Spacer(modifier = Modifier.height(6.dp))

        // Sort options
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            FilterChip(
                selected = sortByPrice == "ASC",
                onClick = {
                    sortByPrice = if (sortByPrice == "ASC") "NONE" else "ASC"
                },
                label = { Text("Price: Low to High") }
            )

            FilterChip(
                selected = sortByPrice == "DESC",
                onClick = {
                    sortByPrice = if (sortByPrice == "DESC") "NONE" else "DESC"
                },
                label = { Text("Price: High to Low") }
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "Results (${filtered.size})",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            if (selectedCategory != "ALL" || sortByPrice != "NONE" || searchQuery.text.isNotBlank()) {
                TextButton(onClick = {
                    selectedCategory = "ALL"
                    sortByPrice = "NONE"
                    searchQuery = TextFieldValue("")
                }) {
                    Text("Reset Filters")
                }
            }
        }

        if (filtered.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 40.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = searchError ?: if (searchQuery.text.isBlank()) {
                        "No products are currently available in this catalog."
                    } else {
                        "No products match your search. Try another name or category."
                    },
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            ZigZagSection(
                products = filtered,
                onProductClick = onProductClick,
                onAddToCart = onAddToCart,
                onToggleFavorite = { onToggleFavorite?.invoke(it) }
            )
        }
    }
}
