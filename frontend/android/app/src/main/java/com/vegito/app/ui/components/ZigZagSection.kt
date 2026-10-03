package com.vegito.app.ui.components

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.vegito.app.data.model.Product
import com.vegito.app.ui.theme.VegitoPrimary

@Composable
fun ZigZagSection(
    products: List<Product>,
    onProductClick: (Product) -> Unit,
    onAddToCart: (Product) -> Unit,
    onToggleFavorite: (Product) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
    ) {
        products.forEachIndexed { index, product ->
            val isLeftImage = index % 2 == 0

            AnimatedVisibility(
                visible = true,
                enter = fadeIn(animationSpec = tween(500)) + slideInVertically(
                    initialOffsetY = { 50 },
                    animationSpec = tween(500)
                )
            ) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                        .clickable { onProductClick(product) },
                    shape = RoundedCornerShape(20.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (isLeftImage) {
                            ProductImageBlock(product, Modifier.weight(0.4f))
                            Spacer(modifier = Modifier.width(12.dp))
                            ProductInfoBlock(
                                product = product,
                                modifier = Modifier.weight(0.6f),
                                onAddToCart = onAddToCart,
                                onToggleFavorite = onToggleFavorite
                            )
                        } else {
                            ProductInfoBlock(
                                product = product,
                                modifier = Modifier.weight(0.6f),
                                onAddToCart = onAddToCart,
                                onToggleFavorite = onToggleFavorite
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            ProductImageBlock(product, Modifier.weight(0.4f))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ProductImageBlock(product: Product, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .height(110.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
    ) {
        AsyncImage(
            model = product.imageUrl.ifEmpty { "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=400" },
            contentDescription = product.name,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize()
        )
        FreshnessBadge(
            percentage = product.freshnessPercentage,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(6.dp)
        )
    }
}

@Composable
private fun ProductInfoBlock(
    product: Product,
    modifier: Modifier = Modifier,
    onAddToCart: (Product) -> Unit,
    onToggleFavorite: (Product) -> Unit
) {
    Column(modifier = modifier) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = product.name,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                maxLines = 1
            )
            IconButton(
                onClick = { onToggleFavorite(product) },
                modifier = Modifier.size(24.dp)
            ) {
                Icon(
                    imageVector = if (product.isFavorite) Icons.Default.Favorite else Icons.Outlined.FavoriteBorder,
                    contentDescription = "Favorite",
                    tint = if (product.isFavorite) Color.Red else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        Text(
            text = product.category,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(6.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "₹${product.price}",
                    style = MaterialTheme.typography.titleMedium,
                    color = VegitoPrimary,
                    fontWeight = FontWeight.ExtraBold
                )
                Text(
                    text = "per ${product.unit}",
                    style = MaterialTheme.typography.labelMedium,
                    fontSize = 10.sp
                )
            }

            Button(
                onClick = { onAddToCart(product) },
                colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary),
                shape = CircleShape,
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                modifier = Modifier.height(32.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = "Add",
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text("ADD", fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}
