package com.vegito.app.presentation.customer

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import com.vegito.app.data.model.Product
import com.vegito.app.ui.components.ZigZagSection

@Composable
fun SearchScreen(
    products: List<Product>,
    onProductClick: (Product) -> Unit,
    onAddToCart: (Product) -> Unit
) {
    var searchQuery by remember { mutableStateOf(TextFieldValue("")) }

    val filtered = remember(searchQuery.text, products) {
        if (searchQuery.text.isEmpty()) products
        else products.filter { it.name.contains(searchQuery.text, ignoreCase = true) || it.category.contains(searchQuery.text, ignoreCase = true) }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            label = { Text("Search fresh vegetables & groceries...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text("Search Results (${filtered.size})", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

        ZigZagSection(
            products = filtered,
            onProductClick = onProductClick,
            onAddToCart = onAddToCart,
            onToggleFavorite = {}
        )
    }
}
