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
import com.vegito.app.data.model.MarketIntelligenceDto
import com.vegito.app.data.model.NearbySellerDto
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
    marketIntelligence: List<MarketIntelligenceDto> = emptyList(),
    nearbySellers: List<NearbySellerDto> = emptyList(),
    selectedSellerId: Int? = null,
    onSelectSeller: ((Int) -> Unit)? = null,
    onChangeLocationClick: (() -> Unit)? = null,
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

            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (onChangeLocationClick != null) {
                    OutlinedButton(
                        onClick = onChangeLocationClick,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.height(48.dp)
                    ) {
                        Icon(Icons.Default.LocationOn, contentDescription = null, modifier = Modifier.size(18.dp), tint = VegitoPrimary)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Change Location", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    }
                }
                Button(
                    onClick = onRetryCatalog,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary),
                    modifier = Modifier.height(48.dp)
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Refresh", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                }
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
        // 0. NEARBY STORES (within 20 km)
        if (nearbySellers.isNotEmpty()) {
            item {
                Column(modifier = Modifier.padding(top = 8.dp, bottom = 4.dp)) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("🏪", fontSize = 16.sp)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Stores Delivering to You",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onBackground
                            )
                        }
                        if (selectedSellerId != null) {
                            Text(
                                text = "Show All Stores",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = VegitoPrimary,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(4.dp))
                                    .clickable { onSelectSeller?.invoke(selectedSellerId) }
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(nearbySellers) { seller ->
                            val isSelected = selectedSellerId == seller.id
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = if (isSelected) VegitoPrimary.copy(alpha = 0.08f) else MaterialTheme.colorScheme.surface,
                                border = androidx.compose.foundation.BorderStroke(
                                    width = if (isSelected) 1.5.dp else 1.dp,
                                    color = if (isSelected) VegitoPrimary else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                                ),
                                shadowElevation = if (isSelected) 2.dp else 0.5.dp,
                                modifier = Modifier
                                    .width(210.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .clickable { onSelectSeller?.invoke(seller.id) }
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = seller.businessName.takeIf { it.isNotBlank() } ?: "Local Mandi Seller",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp,
                                            maxLines = 1,
                                            color = MaterialTheme.colorScheme.onSurface,
                                            modifier = Modifier.weight(1f)
                                        )
                                        if (isSelected) {
                                            Icon(
                                                Icons.Default.CheckCircle,
                                                contentDescription = "Selected",
                                                tint = VegitoPrimary,
                                                modifier = Modifier.size(16.dp)
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(4.dp))

                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(6.dp)
                                                .background(
                                                    if (seller.isAvailable && seller.isDeliverable) Color(0xFF2E7D32) else Color.Gray,
                                                    CircleShape
                                                )
                                        )
                                        Text(
                                            text = if (seller.isAvailable && seller.isDeliverable) "Open & Delivering" else "Temporarily Closed",
                                            fontSize = 11.sp,
                                            color = if (seller.isAvailable && seller.isDeliverable) Color(0xFF2E7D32) else Color.Gray,
                                            fontWeight = FontWeight.Medium
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(6.dp))

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        seller.distanceKm?.let { d ->
                                            Text(
                                                text = "📍 %.1f km".format(d),
                                                fontSize = 11.sp,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                        Text(
                                            text = "${seller.activeProductsCount} items",
                                            fontSize = 11.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

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

        // 2.5 SOLAPUR APMC MANDI BENCHMARK RATES
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("📊", fontSize = 18.sp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(
                                    text = "Solapur APMC Mandi Daily Rates",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = "Verified APMC Wholesale Reference",
                                    fontSize = 10.sp,
                                    color = Color(0xFF2E7D32),
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFF2E7D32).copy(alpha = 0.12f)
                        ) {
                            Text(
                                text = "MSAMB Official",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF2E7D32),
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    if (marketIntelligence.isEmpty()) {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "Today's verified Solapur market price is unavailable. Mandi rates are published during daily trading hours.",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(12.dp)
                            )
                        }
                    } else {
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(marketIntelligence) { item ->
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
                                    modifier = Modifier.width(150.dp)
                                ) {
                                    Column(modifier = Modifier.padding(10.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = item.productName ?: "Commodity #${item.productId}",
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 13.sp,
                                                color = MaterialTheme.colorScheme.onSurface
                                            )
                                            val trendSymbol = when (item.trend.uppercase()) {
                                                "UP" -> "↗"
                                                "DOWN" -> "↘"
                                                else -> "→"
                                            }
                                            val trendColor = when (item.trend.uppercase()) {
                                                "UP" -> Color(0xFFE65100)
                                                "DOWN" -> Color(0xFF2E7D32)
                                                else -> Color.Gray
                                            }
                                            Text(
                                                text = trendSymbol,
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = trendColor
                                            )
                                        }

                                        Spacer(modifier = Modifier.height(4.dp))

                                        Text(
                                            text = "₹${item.referencePrice.toInt()} / ${item.unit}",
                                            fontWeight = FontWeight.ExtraBold,
                                            fontSize = 15.sp,
                                            color = MaterialTheme.colorScheme.primary
                                        )

                                        if (item.suggestedRangeMin > 0 && item.suggestedRangeMax > 0) {
                                            Text(
                                                text = "Range: ₹${item.suggestedRangeMin.toInt()} - ₹${item.suggestedRangeMax.toInt()}",
                                                fontSize = 10.sp,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }

                                        Text(
                                            text = item.source,
                                            fontSize = 9.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                                            maxLines = 1
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 2.6 SOLAPUR CLIMATE & STORAGE ADVISORY
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = VegitoPrimary.copy(alpha = 0.08f)),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("☀️", fontSize = 24.sp)
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Solapur Mandi Climate Advisory",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = VegitoPrimary
                        )
                        Text(
                            text = "28°C • Humidity 42% • Optimal cold-chain storage active for farm-fresh greens.",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
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
