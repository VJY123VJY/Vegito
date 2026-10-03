package com.vegito.app.presentation.customer

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BusinessCenter
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
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
import com.vegito.app.ui.components.FreshnessBadge
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
    featuredProducts: List<Product>,
    smartBasketProducts: List<Product>,
    onCategoryClick: (Category) -> Unit,
    onProductClick: (Product) -> Unit,
    onAddToCart: (Product) -> Unit,
    onB2BClick: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 80.dp)
    ) {
        // 1. ACTIVE OFFERS CAROUSEL
        item {
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = Localization.getString("active_offers", lang),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
            )
            OfferCarousel(offers = offers, onOfferClick = {})
        }

        // 2. CATEGORIES GRID
        item {
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = Localization.getString("categories", lang),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
            )
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(categories) { category ->
                    Card(
                        modifier = Modifier
                            .width(90.dp)
                            .clickable { onCategoryClick(category) },
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Column(
                            modifier = Modifier.padding(10.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Surface(
                                modifier = Modifier.size(44.dp),
                                shape = CircleShape,
                                color = VegitoPrimary.copy(alpha = 0.15f)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.Star, contentDescription = category.name, tint = VegitoPrimary)
                                }
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = category.name,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1
                            )
                        }
                    }
                }
            }
        }

        // 3. B2B / BULK BANNER
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
                    Icon(
                        imageVector = Icons.Default.BusinessCenter,
                        contentDescription = "B2B",
                        tint = VegitoSecondary,
                        modifier = Modifier.size(36.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = Localization.getString("b2b_banner", lang),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = VegitoSecondary
                        )
                        Text(
                            text = Localization.getString("b2b_subtitle", lang),
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Icon(Icons.Default.ChevronRight, contentDescription = "Go", tint = VegitoSecondary)
                }
            }
        }

        // 4. ZIG-ZAG FEATURED PRODUCTS SECTION
        item {
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = Localization.getString("zigzag_section", lang),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
            )
            ZigZagSection(
                products = featuredProducts,
                onProductClick = onProductClick,
                onAddToCart = onAddToCart,
                onToggleFavorite = {}
            )
        }
    }
}
