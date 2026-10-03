package com.vegito.app.presentation.customer

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.Category
import com.vegito.app.data.model.Offer
import com.vegito.app.data.model.Product
import com.vegito.app.ui.components.CompactProductCard
import com.vegito.app.ui.components.OfferCarousel
import com.vegito.app.ui.components.ZigZagSection
import com.vegito.app.ui.theme.VegitoPrimary
import com.vegito.app.ui.theme.VegitoSecondary
import com.vegito.app.utils.Localization

@Composable
fun CustomerHomeScreen(
    lang: String,
    offers: List<Offer>,
    categories: List<Category>,
    allProducts: List<Product>,
    cartItemQuantities: Map<String, Double> = emptyMap(),
    onCategoryClick: (Category) -> Unit,
    onProductClick: (Product) -> Unit,
    onAddToCart: (Product) -> Unit,
    onUpdateQuantity: ((Product, Double) -> Unit)? = null,
    onOfferClick: (Offer) -> Unit,
    onQuickAddOffer: ((Offer) -> Unit)? = null,
    onB2BClick: () -> Unit
) {
    // Vegetable Categories Filter Chips
    val vegetableFilters = listOf(
        "All Vegetables",
        "Leafy Greens",
        "Root Vegetables",
        "Fruit Vegetables",
        "Gourds",
        "Beans & Peas",
        "Cruciferous"
    )
    var selectedVegFilter by remember { mutableStateOf("All Vegetables") }

    // Fruit Categories Filter Chips
    val fruitFilters = listOf(
        "All Fruits",
        "Citrus Fruits",
        "Tropical Fruits",
        "Melons",
        "Berries & Stone",
        "Exotic Fruits"
    )
    var selectedFruitFilter by remember { mutableStateOf("All Fruits") }

    // Split products into Vegetables and Fruits
    val allVegetables = remember(allProducts) {
        allProducts.filter { prod ->
            prod.category.contains("Vegetable", ignoreCase = true) ||
            prod.category.contains("Leafy", ignoreCase = true) ||
            prod.category.contains("Gourd", ignoreCase = true) ||
            prod.category.contains("Root", ignoreCase = true) ||
            prod.category.contains("Bean", ignoreCase = true) ||
            prod.category.contains("Cruciferous", ignoreCase = true) ||
            prod.category.contains("Herb", ignoreCase = true)
        }
    }

    val allFruits = remember(allProducts) {
        allProducts.filter { prod ->
            prod.category.contains("Fruit", ignoreCase = true) ||
            prod.category.contains("Citrus", ignoreCase = true) ||
            prod.category.contains("Tropical", ignoreCase = true) ||
            prod.category.contains("Melon", ignoreCase = true) ||
            prod.category.contains("Berries", ignoreCase = true) ||
            prod.category.contains("Exotic", ignoreCase = true)
        }
    }

    val filteredVegetables = remember(allVegetables, selectedVegFilter) {
        if (selectedVegFilter == "All Vegetables") allVegetables
        else allVegetables.filter {
            it.name.contains(selectedVegFilter.replace("Vegetables", "").trim(), ignoreCase = true) ||
            it.category.contains(selectedVegFilter.replace("Vegetables", "").trim(), ignoreCase = true) ||
            it.description.contains(selectedVegFilter.replace("Vegetables", "").trim(), ignoreCase = true)
        }
    }

    val filteredFruits = remember(allFruits, selectedFruitFilter) {
        if (selectedFruitFilter == "All Fruits") allFruits
        else allFruits.filter {
            it.name.contains(selectedFruitFilter.replace("Fruits", "").trim(), ignoreCase = true) ||
            it.category.contains(selectedFruitFilter.replace("Fruits", "").trim(), ignoreCase = true) ||
            it.description.contains(selectedFruitFilter.replace("Fruits", "").trim(), ignoreCase = true)
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 90.dp)
    ) {
        // 1. PREMIUM FRUIT & HARVEST OFFER CAROUSEL (ZIG-ZAG ALTERNATING LAYOUT)
        item {
            OfferCarousel(
                offers = offers,
                autoSlideIntervalMs = 4500L,
                onOfferClick = onOfferClick,
                onQuickAdd = onQuickAddOffer
            )
        }

        // 2. VEGETABLES SECTION
        item {
            Spacer(modifier = Modifier.height(14.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "🥬", fontSize = 20.sp)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Fresh Vegetables",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
                Text(
                    text = "${filteredVegetables.size} Items",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Vegetable Category Filter Chips
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(vegetableFilters) { filter ->
                    val isSelected = selectedVegFilter == filter
                    FilterChip(
                        selected = isSelected,
                        onClick = { selectedVegFilter = filter },
                        label = {
                            Text(
                                text = filter,
                                fontSize = 12.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = VegitoPrimary,
                            selectedLabelColor = Color.White
                        ),
                        shape = RoundedCornerShape(20.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
        }

        // 2-Column Compact Grid for Vegetables
        items(filteredVegetables.chunked(2)) { pair ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                CompactProductCard(
                    product = pair[0],
                    currentQuantity = cartItemQuantities[pair[0].id] ?: 0.0,
                    modifier = Modifier.weight(1f),
                    onProductClick = onProductClick,
                    onAddToCart = onAddToCart,
                    onUpdateQuantity = onUpdateQuantity
                )

                if (pair.size > 1) {
                    CompactProductCard(
                        product = pair[1],
                        currentQuantity = cartItemQuantities[pair[1].id] ?: 0.0,
                        modifier = Modifier.weight(1f),
                        onProductClick = onProductClick,
                        onAddToCart = onAddToCart,
                        onUpdateQuantity = onUpdateQuantity
                    )
                } else {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }

        // 3. FRUITS SECTION
        item {
            Spacer(modifier = Modifier.height(20.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "🍎", fontSize = 20.sp)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Farm-Fresh Fruits",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
                Text(
                    text = "${filteredFruits.size} Items",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Fruit Category Filter Chips
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(fruitFilters) { filter ->
                    val isSelected = selectedFruitFilter == filter
                    FilterChip(
                        selected = isSelected,
                        onClick = { selectedFruitFilter = filter },
                        label = {
                            Text(
                                text = filter,
                                fontSize = 12.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = VegitoPrimary,
                            selectedLabelColor = Color.White
                        ),
                        shape = RoundedCornerShape(20.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
        }

        // 2-Column Compact Grid for Fruits
        items(filteredFruits.chunked(2)) { pair ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                CompactProductCard(
                    product = pair[0],
                    currentQuantity = cartItemQuantities[pair[0].id] ?: 0.0,
                    modifier = Modifier.weight(1f),
                    onProductClick = onProductClick,
                    onAddToCart = onAddToCart,
                    onUpdateQuantity = onUpdateQuantity
                )

                if (pair.size > 1) {
                    CompactProductCard(
                        product = pair[1],
                        currentQuantity = cartItemQuantities[pair[1].id] ?: 0.0,
                        modifier = Modifier.weight(1f),
                        onProductClick = onProductClick,
                        onAddToCart = onAddToCart,
                        onUpdateQuantity = onUpdateQuantity
                    )
                } else {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }

        // 4. COMPACT ZIG-ZAG FEATURED HIGHLIGHTS
        item {
            Spacer(modifier = Modifier.height(20.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(text = "⭐", fontSize = 18.sp)
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "Daily Handpicked Highlights",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            ZigZagSection(
                products = allProducts.take(4),
                onProductClick = onProductClick,
                onAddToCart = onAddToCart,
                onToggleFavorite = {}
            )
        }

        // 5. B2B / RESTAURANT BULK BANNER
        item {
            Spacer(modifier = Modifier.height(16.dp))
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .clickable { onB2BClick() },
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = VegitoSecondary.copy(alpha = 0.12f))
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = CircleShape,
                        color = VegitoSecondary.copy(alpha = 0.2f),
                        modifier = Modifier.size(44.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.BusinessCenter,
                                contentDescription = "B2B",
                                tint = VegitoSecondary,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(14.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Vegito B2B Wholesale Portal",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = VegitoSecondary
                        )
                        Text(
                            text = "Bulk crates (>50 kg) for Restaurants & Hotels with instant custom mandi pricing.",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Icon(Icons.Default.ChevronRight, contentDescription = "Go", tint = VegitoSecondary)
                }
            }
        }
    }
}
