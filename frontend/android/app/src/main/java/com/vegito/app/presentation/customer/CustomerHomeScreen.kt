package com.vegito.app.presentation.customer

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import android.util.Log
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.Category
import com.vegito.app.data.model.Offer
import com.vegito.app.data.model.Product
import com.vegito.app.ui.components.CompactProductCard
import com.vegito.app.ui.components.OfferBannerSkeleton
import com.vegito.app.ui.components.OfferCarousel
import com.vegito.app.ui.components.ProductCardSkeleton
import com.vegito.app.ui.components.ZigZagSection
import com.vegito.app.ui.theme.VegitoPrimary
import com.vegito.app.ui.theme.VegitoSecondary

@Composable
fun CustomerHomeScreen(
    lang: String,
    offers: List<Offer>,
    categories: List<Category>,
    allProducts: List<Product>,
    isLoadingCatalog: Boolean,
    catalogError: String? = null,
    catalogEmptyMessage: String? = null,
    cartItemQuantities: Map<String, Double> = emptyMap(),
    onRetryCatalog: () -> Unit,
    onCategoryClick: (Category) -> Unit,
    onProductClick: (Product) -> Unit,
    onAddToCart: (Product) -> Unit,
    onUpdateQuantity: ((Product, Double) -> Unit)? = null,
    onToggleFavorite: ((Product) -> Unit)? = null,
    onOfferClick: (Offer) -> Unit,
    onQuickAddOffer: ((Offer) -> Unit)? = null,
    onB2BClick: () -> Unit
) {
    LaunchedEffect(allProducts, isLoadingCatalog, catalogError) {
        Log.d(
            "VegitoCatalog",
            "Customer home received ${allProducts.size} products; " +
                "loading=$isLoadingCatalog; error=${catalogError != null}"
        )
    }

    // 1. LOADING SKELETON STATE
    if (isLoadingCatalog && allProducts.isEmpty()) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background),
            contentPadding = PaddingValues(bottom = 90.dp)
        ) {
            item {
                Box(modifier = Modifier.padding(16.dp)) {
                    OfferBannerSkeleton()
                }
            }
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    repeat(4) {
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier
                                .width(90.dp)
                                .height(32.dp)
                        ) {}
                    }
                }
            }
            item {
                Text(
                    text = "Loading Fresh Produce...",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }
            items(3) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    ProductCardSkeleton(modifier = Modifier.weight(1f))
                    ProductCardSkeleton(modifier = Modifier.weight(1f))
                }
            }
        }
        return
    }

    // 2. EMPTY STATE WHEN NO PRODUCTS
    if (allProducts.isEmpty()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Surface(
                shape = CircleShape,
                color = VegitoPrimary.copy(alpha = 0.12f),
                modifier = Modifier.size(80.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text("🥬", fontSize = 42.sp)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = if (catalogError != null) "Couldn't load products" else "No vegetables or fruits available right now",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onBackground
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = catalogError
                    ?: catalogEmptyMessage
                    ?: "No products are currently available. Check back soon or select a category below.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 14.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 12.dp)
            )

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = onRetryCatalog,
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary),
                modifier = Modifier.height(48.dp)
            ) {
                Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Refresh Catalog", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }

            if (categories.isNotEmpty()) {
                Spacer(modifier = Modifier.height(28.dp))

                Text(
                    text = "Explore Categories",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = MaterialTheme.colorScheme.onBackground
                )

                Spacer(modifier = Modifier.height(12.dp))

                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    categories.forEach { category ->
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surface,
                            tonalElevation = 1.dp,
                            shadowElevation = 1.dp,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .clickable { onCategoryClick(category) }
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        when {
                                            category.name.contains("Fruit", true) -> "🍎"
                                            category.name.contains("Leafy", true) -> "🥬"
                                            category.name.contains("Root", true) -> "🥕"
                                            category.name.contains("Herb", true) -> "🌿"
                                            else -> "🥦"
                                        },
                                        fontSize = 18.sp
                                    )
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Text(
                                        category.name,
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 14.sp,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                }
                                Icon(
                                    Icons.Default.ChevronRight,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
        return
    }

    // 3. POPULATED CATALOG
    // Split products into Vegetables, Fruits, and Others
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
            !prod.category.contains("Vegetable", ignoreCase = true) &&
                (prod.category.contains("Fruit", ignoreCase = true) ||
                    prod.category.contains("Citrus", ignoreCase = true) ||
                    prod.category.contains("Tropical", ignoreCase = true) ||
                    prod.category.contains("Melon", ignoreCase = true) ||
                    prod.category.contains("Berries", ignoreCase = true) ||
                    prod.category.contains("Exotic", ignoreCase = true))
        }
    }

    val otherProducts = remember(allProducts, allVegetables, allFruits) {
        val categorizedIds = (allVegetables + allFruits).mapTo(mutableSetOf()) { it.id }
        allProducts.filterNot { it.id in categorizedIds }
    }

    val vegetableFilters = remember(allVegetables) {
        listOf("All Vegetables") + allVegetables.map { it.category }.filter(String::isNotBlank).distinct().sorted()
    }
    var selectedVegFilter by remember { mutableStateOf("All Vegetables") }

    val fruitFilters = remember(allFruits) {
        listOf("All Fruits") + allFruits.map { it.category }.filter(String::isNotBlank).distinct().sorted()
    }
    var selectedFruitFilter by remember { mutableStateOf("All Fruits") }

    val filteredVegetables = remember(allVegetables, selectedVegFilter) {
        if (selectedVegFilter == "All Vegetables") allVegetables
        else allVegetables.filter { it.category.equals(selectedVegFilter, ignoreCase = true) }
    }

    val filteredFruits = remember(allFruits, selectedFruitFilter) {
        if (selectedFruitFilter == "All Fruits") allFruits
        else allFruits.filter { it.category.equals(selectedFruitFilter, ignoreCase = true) }
    }

    val cartSellerId = allProducts.firstOrNull {
        (cartItemQuantities[it.id] ?: 0.0) > 0.0
    }?.sellerId

    val basketSuggestions = remember(allProducts, cartItemQuantities, cartSellerId) {
        allProducts
            .filter { (cartItemQuantities[it.id] ?: 0.0) <= 0.0 }
            .filter { it.sellerProductId.isNotBlank() && it.stockQuantity > 0.0 && it.price > 0.0 }
            .filter { cartSellerId.isNullOrBlank() || it.sellerId == cartSellerId }
            .take(4)
    }

    // Categories with item counts or live categories from backend
    val displayCategories = remember(categories, allProducts) {
        if (categories.isNotEmpty()) {
            categories.map { category ->
                val count = allProducts.count { it.category.equals(category.name, ignoreCase = true) }
                category.copy(itemCount = count)
            }
        } else {
            allProducts.map { it.category }.filter(String::isNotBlank).distinct().sorted().map { name ->
                Category(id = name, name = name, itemCount = allProducts.count { it.category == name })
            }
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(bottom = 90.dp)
    ) {
        // 1. OFFER BANNER CAROUSEL
        if (offers.isNotEmpty()) {
            item {
                OfferCarousel(
                    offers = offers,
                    autoSlideIntervalMs = 4500L,
                    onOfferClick = onOfferClick,
                    onQuickAdd = onQuickAddOffer
                )
            }
        }

        // 2. SHOP BY CATEGORY HORIZONTAL ROW
        if (displayCategories.isNotEmpty()) {
            item {
                Column(modifier = Modifier.padding(vertical = 8.dp)) {
                    Text(
                        text = "Shop by Category",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                    )
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(displayCategories) { category ->
                            val emoji = when {
                                category.name.contains("Fruit", true) -> "🍎"
                                category.name.contains("Leafy", true) -> "🥬"
                                category.name.contains("Root", true) -> "🥕"
                                category.name.contains("Herb", true) -> "🌿"
                                else -> "🥦"
                            }
                            AssistChip(
                                onClick = { onCategoryClick(category) },
                                label = {
                                    Text(
                                        text = if (category.itemCount > 0) "$emoji ${category.name} (${category.itemCount})" else "$emoji ${category.name}",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                },
                                shape = RoundedCornerShape(20.dp),
                                colors = AssistChipDefaults.assistChipColors(
                                    containerColor = MaterialTheme.colorScheme.surface,
                                    labelColor = MaterialTheme.colorScheme.onSurface
                                )
                            )
                        }
                    }
                }
            }
        }

        // 3. VEGETABLES SECTION
        if (filteredVegetables.isNotEmpty()) {
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
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onBackground
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
                if (vegetableFilters.size > 2) {
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
                        onUpdateQuantity = onUpdateQuantity,
                        onToggleFavorite = onToggleFavorite
                    )

                    if (pair.size > 1) {
                        CompactProductCard(
                            product = pair[1],
                            currentQuantity = cartItemQuantities[pair[1].id] ?: 0.0,
                            modifier = Modifier.weight(1f),
                            onProductClick = onProductClick,
                            onAddToCart = onAddToCart,
                            onUpdateQuantity = onUpdateQuantity,
                            onToggleFavorite = onToggleFavorite
                        )
                    } else {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }

        // 4. FRUITS SECTION
        if (filteredFruits.isNotEmpty()) {
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
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                    }
                    Text(
                        text = "${filteredFruits.size} Items",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                if (fruitFilters.size > 2) {
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
                        onUpdateQuantity = onUpdateQuantity,
                        onToggleFavorite = onToggleFavorite
                    )

                    if (pair.size > 1) {
                        CompactProductCard(
                            product = pair[1],
                            currentQuantity = cartItemQuantities[pair[1].id] ?: 0.0,
                            modifier = Modifier.weight(1f),
                            onProductClick = onProductClick,
                            onAddToCart = onAddToCart,
                            onUpdateQuantity = onUpdateQuantity,
                            onToggleFavorite = onToggleFavorite
                        )
                    } else {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }

        // 5. OTHER PRODUCE SECTION
        if (otherProducts.isNotEmpty()) {
            item {
                Spacer(modifier = Modifier.height(20.dp))
                Text(
                    text = "Other Fresh Produce",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }
            items(otherProducts.chunked(2)) { pair ->
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
                        onUpdateQuantity = onUpdateQuantity,
                        onToggleFavorite = onToggleFavorite
                    )
                    if (pair.size > 1) {
                        CompactProductCard(
                            product = pair[1],
                            currentQuantity = cartItemQuantities[pair[1].id] ?: 0.0,
                            modifier = Modifier.weight(1f),
                            onProductClick = onProductClick,
                            onAddToCart = onAddToCart,
                            onUpdateQuantity = onUpdateQuantity,
                            onToggleFavorite = onToggleFavorite
                        )
                    } else {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }

        // 6. DAILY HANDPICKED HIGHLIGHTS
        if (allProducts.isNotEmpty()) {
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
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                ZigZagSection(
                    products = allProducts.take(4),
                    onProductClick = onProductClick,
                    onAddToCart = onAddToCart,
                    onToggleFavorite = { onToggleFavorite?.invoke(it) }
                )
            }
        }

        // 7. BASKET SUGGESTIONS
        if (basketSuggestions.isNotEmpty()) {
            item {
                Spacer(modifier = Modifier.height(20.dp))
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("🧺", fontSize = 18.sp)
                                Spacer(modifier = Modifier.width(6.dp))
                                Column {
                                    Text(
                                        text = "More to Explore",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = VegitoPrimary
                                    )
                                    Text(
                                        text = if (cartSellerId.isNullOrBlank()) {
                                            "Browse more fresh produce from Vegito sellers."
                                        } else {
                                            "More available items from your selected store."
                                        },
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(basketSuggestions) { prod ->
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = MaterialTheme.colorScheme.surface,
                                    shadowElevation = 1.dp,
                                    modifier = Modifier
                                        .width(135.dp)
                                        .clickable { onProductClick(prod) }
                                ) {
                                    Column(modifier = Modifier.padding(8.dp)) {
                                        Text(
                                            text = prod.name,
                                            fontWeight = FontWeight.SemiBold,
                                            fontSize = 12.sp,
                                            maxLines = 1,
                                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                                        )
                                        Text(
                                            text = "₹${prod.price.toInt()} / ${prod.unit}",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = VegitoPrimary
                                        )
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Surface(
                                            shape = RoundedCornerShape(6.dp),
                                            color = VegitoPrimary.copy(alpha = 0.12f),
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clickable { onAddToCart(prod) }
                                        ) {
                                            Text(
                                                text = "+ Add",
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = VegitoPrimary,
                                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                                modifier = Modifier.padding(vertical = 4.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 8. B2B / RESTAURANT BULK BANNER
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
