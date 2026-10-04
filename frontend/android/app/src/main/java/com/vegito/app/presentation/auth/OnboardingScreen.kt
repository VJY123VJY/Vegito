package com.vegito.app.presentation.auth

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.*
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Eco
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.R
import com.vegito.app.ui.theme.*
import com.vegito.app.utils.Localization
import kotlinx.coroutines.launch

data class OnboardingSlide(
    val emoji: String,
    val title: String,
    val subtitle: String
)

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun OnboardingScreen(
    lang: String,
    onStartShopping: () -> Unit,
    onLogin: () -> Unit,
    onSellOnVegito: () -> Unit,
    onDeliverWithVegito: () -> Unit
) {
    val slides = listOf(
        OnboardingSlide(
            emoji = "🌾",
            title = "Direct APMC Mandi Sourcing",
            subtitle = "Farm-fresh produce harvested at dawn, directly connecting Solapur farmers to your doorstep."
        ),
        OnboardingSlide(
            emoji = "⚡",
            title = "Living Freshness Intelligence",
            subtitle = "Dew-point tested and quality-scored in real time. Know exact freshness percentages before ordering."
        ),
        OnboardingSlide(
            emoji = "🛵",
            title = "Express Hyperlocal Delivery",
            subtitle = "Pulsing live Mapbox tracking with strict doorstep GPS privacy until authorized seller handover."
        )
    )

    val pagerState = rememberPagerState(pageCount = { slides.size })
    val scope = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(VegitoGradients.EmeraldDawn)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Spacer(modifier = Modifier.height(10.dp))

            // App Brand Header with subtle floating motion
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.organicFloating(rangeDp = 4.dp)
            ) {
                Surface(
                    color = Color.White,
                    shape = RoundedCornerShape(24.dp),
                    modifier = Modifier.size(80.dp),
                    shadowElevation = 8.dp
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Image(
                            painter = painterResource(id = R.drawable.ic_vegito_logo),
                            contentDescription = "Vegito Logo",
                            modifier = Modifier.size(64.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = Localization.getString("app_name", lang),
                    fontSize = 34.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White,
                    letterSpacing = (-0.5).sp
                )
                Text(
                    text = Localization.getString("tagline", lang),
                    fontSize = 14.sp,
                    color = Color.White.copy(alpha = 0.88f),
                    textAlign = TextAlign.Center
                )
            }

            // Feature Slides Carousel
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                HorizontalPager(
                    state = pagerState,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(130.dp)
                ) { page ->
                    val slide = slides[page]
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp)
                    ) {
                        Text(text = slide.emoji, fontSize = 36.sp)
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = slide.title,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = slide.subtitle,
                            fontSize = 12.sp,
                            color = Color.White.copy(alpha = 0.82f),
                            textAlign = TextAlign.Center,
                            maxLines = 2
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Animated Pill Dots Indicator
                Row(
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    repeat(slides.size) { index ->
                        val isSelected = pagerState.currentPage == index
                        val dotWidth by animateDpAsState(
                            targetValue = if (isSelected) 24.dp else 8.dp,
                            animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
                            label = "dotWidth"
                        )
                        Box(
                            modifier = Modifier
                                .padding(horizontal = 3.dp)
                                .height(7.dp)
                                .width(dotWidth)
                                .clip(RoundedCornerShape(4.dp))
                                .background(if (isSelected) Color.White else Color.White.copy(alpha = 0.35f))
                                .clickable { scope.launch { pagerState.animateScrollToPage(index) } }
                        )
                    }
                }
            }

            // Action Bottom Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(VegitoRadius.Hero),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    VegitoButton(
                        text = "${Localization.getString("start_shopping", lang)} →",
                        onClick = onStartShopping,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedButton(
                        onClick = onLogin,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                            .bounceClick(scaleDown = 0.96f) { onLogin() },
                        shape = RoundedCornerShape(VegitoRadius.Card)
                    ) {
                        Text(
                            text = Localization.getString("login", lang),
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = VegitoPrimary
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))
                    HorizontalDivider(color = Color.LightGray.copy(alpha = 0.3f))
                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "Partner with Vegito Ecosystem",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(
                            onClick = onSellOnVegito,
                            modifier = Modifier
                                .weight(1f)
                                .height(42.dp)
                                .bounceClick(scaleDown = 0.95f) { onSellOnVegito() },
                            shape = RoundedCornerShape(VegitoRadius.CompactCard)
                        ) {
                            Icon(Icons.Default.Storefront, contentDescription = "Sell", tint = VegitoPrimary, modifier = Modifier.size(15.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Sell", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = VegitoPrimary)
                        }

                        OutlinedButton(
                            onClick = onDeliverWithVegito,
                            modifier = Modifier
                                .weight(1f)
                                .height(42.dp)
                                .bounceClick(scaleDown = 0.95f) { onDeliverWithVegito() },
                            shape = RoundedCornerShape(VegitoRadius.CompactCard)
                        ) {
                            Icon(Icons.Default.LocalShipping, contentDescription = "Deliver", tint = VegitoSecondary, modifier = Modifier.size(15.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Deliver", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = VegitoSecondary)
                        }
                    }
                }
            }
        }
    }
}
