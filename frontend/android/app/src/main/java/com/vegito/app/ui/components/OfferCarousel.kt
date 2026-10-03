package com.vegito.app.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.vegito.app.data.model.Offer
import com.vegito.app.ui.theme.VegitoPrimary
import com.vegito.app.ui.theme.VegitoSecondary
import kotlinx.coroutines.delay

@Composable
fun OfferCarousel(
    offers: List<Offer>,
    autoSlideIntervalMs: Long = 4500L,
    onOfferClick: (Offer) -> Unit
) {
    if (offers.isEmpty()) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "No active fruit offers currently available",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        return
    }

    var currentIndex by remember { mutableStateOf(0) }
    var isPaused by remember { mutableStateOf(false) }

    // Auto-slide loop with pause handling
    LaunchedEffect(offers.size, isPaused, autoSlideIntervalMs) {
        if (!isPaused && offers.size > 1) {
            while (true) {
                delay(autoSlideIntervalMs)
                currentIndex = (currentIndex + 1) % offers.size
            }
        }
    }

    val currentOffer = offers.getOrNull(currentIndex) ?: offers.first()
    val isEven = currentIndex % 2 == 0

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp)
    ) {
        // Section Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = if (currentOffer.isFamilyPack) "🧺" else "🍎",
                    fontSize = 20.sp
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text(
                        text = "Fruit & Family Offers",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "Direct Mandi Deals · Offer ${currentIndex + 1} of ${offers.size}",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Arrow Controls
            if (offers.size > 1) {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    IconButton(
                        onClick = {
                            currentIndex = (currentIndex - 1 + offers.size) % offers.size
                        },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.KeyboardArrowLeft,
                            contentDescription = "Previous Offer",
                            tint = VegitoPrimary
                        )
                    }
                    IconButton(
                        onClick = {
                            currentIndex = (currentIndex + 1) % offers.size
                        },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.KeyboardArrowRight,
                            contentDescription = "Next Offer",
                            tint = VegitoPrimary
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Animated Sliding Zig-Zag Offer Card
        AnimatedContent(
            targetState = currentIndex,
            transitionSpec = {
                (slideInHorizontally { width -> width } + fadeIn()).togetherWith(
                    slideOutHorizontally { width -> -width } + fadeOut()
                )
            },
            label = "OfferSlideAnimation",
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
        ) { targetIndex ->
            val offer = offers.getOrNull(targetIndex) ?: currentOffer
            val cardIsEven = targetIndex % 2 == 0

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOfferClick(offer) },
                shape = RoundedCornerShape(20.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (offer.isFamilyPack) Color(0xFFFFFBEB) else Color(0xFFF0FDF4)
                )
            ) {
                // Alternating Zig-Zag Row
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    if (cardIsEven) {
                        // IMAGE LEFT, CONTENT RIGHT
                        OfferImage(offer = offer, modifier = Modifier.size(110.dp))
                        Spacer(modifier = Modifier.width(14.dp))
                        OfferDetails(offer = offer, modifier = Modifier.weight(1f))
                    } else {
                        // CONTENT LEFT, IMAGE RIGHT
                        OfferDetails(offer = offer, modifier = Modifier.weight(1f))
                        Spacer(modifier = Modifier.width(14.dp))
                        OfferImage(offer = offer, modifier = Modifier.size(110.dp))
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Pagination Dots
        if (offers.size > 1) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                offers.forEachIndexed { index, _ ->
                    val isSelected = index == currentIndex
                    Box(
                        modifier = Modifier
                            .padding(horizontal = 3.dp)
                            .height(6.dp)
                            .width(if (isSelected) 22.dp else 6.dp)
                            .clip(CircleShape)
                            .background(if (isSelected) VegitoPrimary else Color.LightGray)
                            .clickable { currentIndex = index }
                    )
                }
            }
        }
    }
}

@Composable
private fun OfferImage(offer: Offer, modifier: Modifier = Modifier) {
    Box(modifier = modifier) {
        if (!offer.imageUrl.isNullOrBlank()) {
            AsyncImage(
                model = offer.imageUrl,
                contentDescription = offer.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxSize()
                    .clip(RoundedCornerShape(16.dp))
            )
        } else {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color(0xFFE2E8F0)),
                contentAlignment = Alignment.Center
            ) {
                Text(text = "🍎", fontSize = 32.sp)
            }
        }

        // Discount tag on image
        if (offer.discountPercent > 0) {
            Surface(
                color = Color(0xFFDC2626),
                shape = RoundedCornerShape(topStart = 16.dp, bottomEnd = 10.dp),
                modifier = Modifier.align(Alignment.TopStart)
            ) {
                Text(
                    text = "${offer.discountPercent}% OFF",
                    color = Color.White,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.ExtraBold,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
        }
    }
}

@Composable
private fun OfferDetails(offer: Offer, modifier: Modifier = Modifier) {
    Column(modifier = modifier) {
        // Tag badge
        Surface(
            color = if (offer.isFamilyPack) Color(0xFFFEF3C7) else Color(0xFFDCFCE7),
            shape = RoundedCornerShape(6.dp)
        ) {
            Text(
                text = if (offer.isFamilyPack) "FAMILY COMBO" else "MANDI HARVEST",
                color = if (offer.isFamilyPack) Color(0xFFB45309) else Color(0xFF15803D),
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = offer.title,
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF063C32),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )

        Text(
            text = offer.description,
            fontSize = 11.sp,
            color = Color(0xFF475569),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            lineHeight = 14.sp
        )

        Spacer(modifier = Modifier.height(6.dp))

        // Price Row
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            if (offer.offerPrice != null) {
                Text(
                    text = "₹${offer.offerPrice.toInt()}",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color(0xFF063C32)
                )
            }
            if (offer.originalPrice != null && offer.originalPrice > (offer.offerPrice ?: 0.0)) {
                Text(
                    text = "₹${offer.originalPrice.toInt()}",
                    fontSize = 12.sp,
                    color = Color.Gray,
                    textDecoration = TextDecoration.LineThrough
                )
            }
            if (!offer.unit.isNullOrBlank()) {
                Text(
                    text = "/ ${offer.unit}",
                    fontSize = 11.sp,
                    color = VegitoPrimary,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}
