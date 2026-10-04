package com.vegito.app.ui.components

import androidx.compose.animation.core.tween
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.collectIsDraggedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.ShoppingCart
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.vegito.app.data.model.Offer
import com.vegito.app.ui.theme.VegitoPrimary
import com.vegito.app.ui.theme.VegitoSecondary
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun OfferCarousel(
    offers: List<Offer>,
    autoSlideIntervalMs: Long = 4500L,
    onOfferClick: (Offer) -> Unit,
    onQuickAdd: ((Offer) -> Unit)? = null
) {
    if (offers.isEmpty()) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = "🍎", fontSize = 28.sp)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Farm-fresh mandi offers arriving daily!",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
        return
    }

    val coroutineScope = rememberCoroutineScope()
    val pagerState = rememberPagerState(pageCount = { offers.size })
    val isDragged by pagerState.interactionSource.collectIsDraggedAsState()

    // Auto-slide loop with pause on drag
    LaunchedEffect(pagerState, offers.size, isDragged, autoSlideIntervalMs) {
        if (offers.size > 1 && !isDragged) {
            while (true) {
                delay(autoSlideIntervalMs)
                if (!isDragged) {
                    val nextPage = (pagerState.currentPage + 1) % offers.size
                    pagerState.animateScrollToPage(
                        page = nextPage,
                        animationSpec = tween(durationMillis = 650)
                    )
                }
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
    ) {
        // Section Header matching Website dynamic-fruit-offers.tsx
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            val currentOffer = offers.getOrNull(pagerState.currentPage) ?: offers.first()
            val isCurrentFamily = currentOffer.isFamilyPack

            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (isCurrentFamily) Color(0xFFFEF3C7) else Color(0xFFE9F6EE),
                    modifier = Modifier.size(38.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = if (isCurrentFamily) "🧺" else "🍎",
                            fontSize = 18.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.width(10.dp))

                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "Farm-Fresh Fruit Offers",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color(0xFF063C32)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Surface(
                            shape = RoundedCornerShape(999.dp),
                            color = Color(0xFFFEE2E2)
                        ) {
                            Text(
                                text = "LIVE DEAL",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color(0xFFDC2626),
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                    Text(
                        text = "Auto-sliding seasonal offers direct from Solapur APMC",
                        fontSize = 11.sp,
                        color = Color(0xFF62746A),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            // Controls: Counter + Prev / Next Arrows
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "${pagerState.currentPage + 1} / ${offers.size}",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF62746A)
                )
                Spacer(modifier = Modifier.width(6.dp))

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = MaterialTheme.colorScheme.surface,
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE1E8E2)),
                    modifier = Modifier
                        .size(30.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .clickable {
                            coroutineScope.launch {
                                val prevPage = (pagerState.currentPage - 1 + offers.size) % offers.size
                                pagerState.animateScrollToPage(prevPage)
                            }
                        }
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            Icons.Default.ArrowBack,
                            contentDescription = "Previous",
                            tint = Color(0xFF063C32),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.width(4.dp))

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = MaterialTheme.colorScheme.surface,
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE1E8E2)),
                    modifier = Modifier
                        .size(30.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .clickable {
                            coroutineScope.launch {
                                val nextPage = (pagerState.currentPage + 1) % offers.size
                                pagerState.animateScrollToPage(nextPage)
                            }
                        }
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            Icons.Default.ArrowForward,
                            contentDescription = "Next",
                            tint = Color(0xFF063C32),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Horizontal Pager with Zig-Zag Card
        HorizontalPager(
            state = pagerState,
            contentPadding = PaddingValues(horizontal = 16.dp),
            pageSpacing = 12.dp,
            modifier = Modifier
                .fillMaxWidth()
                .height(260.dp)
        ) { pageIndex ->
            val offer = offers[pageIndex]
            val isEven = pageIndex % 2 == 0
            ZigZagOfferCard(
                offer = offer,
                isEvenIndex = isEven,
                onClick = { onOfferClick(offer) },
                onQuickAdd = { onQuickAdd?.invoke(offer) }
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Dots & Progress indicator
        if (offers.size > 1) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                repeat(offers.size) { index ->
                    val isSelected = pagerState.currentPage == index
                    Box(
                        modifier = Modifier
                            .padding(horizontal = 3.dp)
                            .height(6.dp)
                            .width(if (isSelected) 22.dp else 6.dp)
                            .clip(CircleShape)
                            .background(
                                if (isSelected) Color(0xFF063C32) else Color(0xFFCBD5E1)
                            )
                    )
                }
            }
        }
    }
}

/**
 * Zig-Zag Alternating Card Layout:
 * Even Slide: [ Image (Left) ] + [ Content (Right) ]
 * Odd Slide:  [ Content (Left) ] + [ Image (Right) ]
 */
@Composable
private fun ZigZagOfferCard(
    offer: Offer,
    isEvenIndex: Boolean,
    onClick: () -> Unit,
    onQuickAdd: () -> Unit
) {
    val isFamilyPack = offer.isFamilyPack
    val borderColor = if (isFamilyPack) Color(0xFFFDE68A) else Color(0xFFBBF7D0)

    val backgroundBrush = if (isFamilyPack) {
        Brush.linearGradient(
            listOf(Color(0xFFFFFBEB), Color(0xFFFEF3C7), Color(0xFFFFFFFF))
        )
    } else if (isEvenIndex) {
        Brush.linearGradient(
            listOf(Color(0xFFF0FDF4), Color(0xFFFFFFFF), Color(0xFFF7FEE7))
        )
    } else {
        Brush.linearGradient(
            listOf(Color(0xFFFFFFFF), Color(0xFFF0FDF4), Color(0xFFECFDF5))
        )
    }

    Card(
        modifier = Modifier
            .fillMaxSize()
            .clip(RoundedCornerShape(22.dp))
            .clickable { onClick() },
        shape = RoundedCornerShape(22.dp),
        border = androidx.compose.foundation.BorderStroke(1.5.dp, borderColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(backgroundBrush)
        ) {
            Row(
                modifier = Modifier.fillMaxSize(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (isEvenIndex) {
                    // Even Slide: Image Left, Content Right
                    OfferImageColumn(offer = offer, modifier = Modifier.weight(0.44f))
                    OfferContentColumn(
                        offer = offer,
                        modifier = Modifier.weight(0.56f),
                        onClick = onClick,
                        onQuickAdd = onQuickAdd
                    )
                } else {
                    // Odd Slide: Content Left, Image Right
                    OfferContentColumn(
                        offer = offer,
                        modifier = Modifier.weight(0.56f),
                        onClick = onClick,
                        onQuickAdd = onQuickAdd
                    )
                    OfferImageColumn(offer = offer, modifier = Modifier.weight(0.44f))
                }
            }
        }
    }
}

@Composable
private fun OfferImageColumn(
    offer: Offer,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxHeight()
            .background(Color(0xFFF4F7F4))
    ) {
        AsyncImage(
            model = ImageRequest.Builder(LocalContext.current)
                .data(offer.imageUrl ?: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=500")
                .crossfade(true)
                .build(),
            contentDescription = offer.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize()
        )

        // Discount Tag at Top Left
        Surface(
            shape = RoundedCornerShape(999.dp),
            color = Color(0xFFDC2626),
            modifier = Modifier
                .padding(10.dp)
                .align(Alignment.TopStart)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
            ) {
                Icon(
                    Icons.Default.LocalOffer,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(11.dp)
                )
                Spacer(modifier = Modifier.width(3.dp))
                Text(
                    text = "${offer.discountPercent}% OFF",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White
                )
            }
        }

        // Mandi Freshness Pill at Bottom Left
        val freshness = offer.freshness ?: 96
        Surface(
            shape = RoundedCornerShape(8.dp),
            color = Color(0xD9063C32),
            modifier = Modifier
                .padding(8.dp)
                .align(Alignment.BottomStart)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
            ) {
                Text(text = "🌱", fontSize = 10.sp)
                Spacer(modifier = Modifier.width(3.dp))
                Text(
                    text = "$freshness% Mandi Fresh",
                    fontSize = 9.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF86EFAC)
                )
            }
        }

        if (offer.isFamilyPack) {
            Surface(
                shape = RoundedCornerShape(999.dp),
                color = Color(0xFFD97706),
                modifier = Modifier
                    .padding(8.dp)
                    .align(Alignment.TopEnd)
            ) {
                Text(
                    text = "FAMILY COMBO",
                    fontSize = 8.5.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                )
            }
        }
    }
}

@Composable
private fun OfferContentColumn(
    offer: Offer,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
    onQuickAdd: () -> Unit
) {
    Column(
        modifier = modifier
            .fillMaxHeight()
            .padding(14.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column {
            // Mandi Tag + Origin
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Surface(
                    shape = RoundedCornerShape(5.dp),
                    color = if (offer.isFamilyPack) Color(0xFFFEF3C7) else Color(0xFFE9F6EE)
                ) {
                    Text(
                        text = if (offer.isFamilyPack) "Family Saver Bundle" else "Mandi Direct Special",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = if (offer.isFamilyPack) Color(0xFFB45309) else Color(0xFF16835B),
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(3.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.LocationOn,
                    contentDescription = null,
                    tint = Color(0xFF16835B),
                    modifier = Modifier.size(11.dp)
                )
                Spacer(modifier = Modifier.width(2.dp))
                Text(
                    text = "Solapur APMC Mandi",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF64748B)
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Offer Title
            Text(
                text = offer.title,
                fontSize = 15.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Color(0xFF063C32),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 18.sp
            )

            Spacer(modifier = Modifier.height(3.dp))

            // Description
            Text(
                text = offer.description,
                fontSize = 11.sp,
                color = Color(0xFF475569),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 15.sp
            )

            Spacer(modifier = Modifier.height(6.dp))

            // Price Details Block
            val offerPrice = offer.offerPrice ?: 75.0
            val originalPrice = offer.originalPrice ?: (offerPrice * 1.25)
            val unit = offer.unit ?: "kg"
            val savings = (originalPrice - offerPrice).toInt()

            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "₹${offerPrice.toInt()}",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black,
                    color = Color(0xFF063C32)
                )

                if (originalPrice > offerPrice) {
                    Spacer(modifier = Modifier.width(5.dp))
                    Text(
                        text = "₹${originalPrice.toInt()}",
                        fontSize = 12.sp,
                        color = Color(0xFF94A3B8),
                        textDecoration = TextDecoration.LineThrough,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "/ $unit",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF16835B)
                )

                if (savings > 0) {
                    Spacer(modifier = Modifier.width(6.dp))
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = Color(0xFFDCFCE7)
                    ) {
                        Text(
                            text = "Save ₹$savings",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color(0xFF15803D),
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                        )
                    }
                }
            }
        }

        // CTA Buttons: Shop This Offer & Quick Add
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = Color(0xFF063C32),
                modifier = Modifier
                    .weight(1f)
                    .height(34.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .clickable { onClick() }
            ) {
                Row(
                    modifier = Modifier.fillMaxSize(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Shop Offer",
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Icon(
                        Icons.Default.ArrowForward,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(12.dp)
                    )
                }
            }

            Surface(
                shape = RoundedCornerShape(10.dp),
                color = Color.White,
                border = androidx.compose.foundation.BorderStroke(1.2.dp, Color(0xFF16835B)),
                modifier = Modifier
                    .size(34.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .clickable { onQuickAdd() }
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.ShoppingCart,
                        contentDescription = "Quick Add",
                        tint = Color(0xFF16835B),
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}
