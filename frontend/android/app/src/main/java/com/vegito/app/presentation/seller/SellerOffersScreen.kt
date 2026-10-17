package com.vegito.app.presentation.seller

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.Product
import com.vegito.app.data.model.PromotionDto
import com.vegito.app.ui.theme.VegitoPrimary
import com.vegito.app.ui.theme.VegitoSecondary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SellerOffersScreen(
    promotions: List<PromotionDto>,
    sellerProducts: List<Product>,
    isLoading: Boolean = false,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onCreateOffer: (title: String, description: String?, price: Double, sellerProductId: Int) -> Unit,
    onToggleOfferStatus: (promoId: Int, newStatus: String) -> Unit,
    onDeleteOffer: (promoId: Int) -> Unit
) {
    var showCreateSheet by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Seller Offers & Deals", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Text("${promotions.size} active promotions", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = onRefresh) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { showCreateSheet = true },
                icon = { Icon(Icons.Default.LocalOffer, contentDescription = "Create Offer") },
                text = { Text("Create Offer", fontWeight = FontWeight.Bold) },
                containerColor = VegitoPrimary,
                contentColor = Color.White,
                shape = RoundedCornerShape(16.dp)
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            if (isLoading && promotions.isEmpty()) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    color = VegitoPrimary
                )
            } else if (promotions.isEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        Icons.Default.LocalOffer,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.outline,
                        modifier = Modifier.size(64.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        "No Offers Created Yet",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Boost customer sales by creating fresh deals and discount offers on your produce.",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(
                        onClick = { showCreateSheet = true },
                        colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Create Your First Offer", fontWeight = FontWeight.Bold)
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(promotions, key = { it.id }) { promo ->
                        SellerOfferCard(
                            promotion = promo,
                            onToggleStatus = { newStatus -> onToggleOfferStatus(promo.id, newStatus) },
                            onDelete = { onDeleteOffer(promo.id) }
                        )
                    }
                }
            }
        }
    }

    if (showCreateSheet) {
        CreateOfferBottomSheet(
            sellerProducts = sellerProducts,
            onDismiss = { showCreateSheet = false },
            onSubmit = { title, desc, price, spId ->
                showCreateSheet = false
                onCreateOffer(title, desc, price, spId)
            }
        )
    }
}

@Composable
private fun SellerOfferCard(
    promotion: PromotionDto,
    onToggleStatus: (String) -> Unit,
    onDelete: () -> Unit
) {
    val isActive = promotion.status.equals("ACTIVE", ignoreCase = true)

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = CircleShape,
                        color = if (isActive) Color(0xFFE8F5E9) else Color(0xFFFFEBEE)
                    ) {
                        Text(
                            text = if (isActive) "ACTIVE" else "INACTIVE",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isActive) Color(0xFF2E7D32) else Color(0xFFC62828),
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                    if (promotion.discountPercent != null && promotion.discountPercent > 0) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Surface(
                            shape = CircleShape,
                            color = VegitoSecondary.copy(alpha = 0.15f)
                        ) {
                            Text(
                                text = "${promotion.discountPercent}% OFF",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = VegitoSecondary,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }

                Row {
                    IconButton(onClick = { onToggleStatus(if (isActive) "INACTIVE" else "ACTIVE") }) {
                        Icon(
                            imageVector = if (isActive) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                            contentDescription = "Toggle Status",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    IconButton(onClick = onDelete) {
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = "Delete Offer",
                            tint = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = promotion.title,
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp
            )

            if (!promotion.description.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = promotion.description,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            if (!promotion.productName.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.ShoppingBag,
                        contentDescription = null,
                        tint = VegitoPrimary,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = promotion.productName,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = VegitoPrimary
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "₹${promotion.price}",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 18.sp,
                    color = VegitoPrimary
                )
                if (promotion.originalPrice != null && promotion.originalPrice > promotion.price) {
                    Text(
                        text = "₹${promotion.originalPrice}",
                        fontSize = 13.sp,
                        color = Color.Gray,
                        style = MaterialTheme.typography.bodySmall.copy(
                            textDecoration = TextDecoration.LineThrough
                        )
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CreateOfferBottomSheet(
    sellerProducts: List<Product>,
    onDismiss: () -> Unit,
    onSubmit: (title: String, description: String?, price: Double, sellerProductId: Int) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var priceText by remember { mutableStateOf("") }
    var selectedProduct by remember { mutableStateOf(sellerProducts.firstOrNull()) }
    var productExpanded by remember { mutableStateOf(false) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 12.dp)
        ) {
            Text("Create New Offer / Deal", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Offer Title (e.g. Fresh Mango Bogo)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(10.dp))

            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Description (Optional)") },
                modifier = Modifier.fillMaxWidth(),
                maxLines = 3
            )

            Spacer(modifier = Modifier.height(10.dp))

            ExposedDropdownMenuBox(
                expanded = productExpanded,
                onExpandedChange = { productExpanded = !productExpanded }
            ) {
                OutlinedTextField(
                    value = selectedProduct?.name ?: "Select Produce",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Select Product") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = productExpanded) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                )

                ExposedDropdownMenu(
                    expanded = productExpanded,
                    onDismissRequest = { productExpanded = false }
                ) {
                    sellerProducts.forEach { sp ->
                        DropdownMenuItem(
                            text = { Text("${sp.name} (Current Price: ₹${sp.price}/${sp.unit})") },
                            onClick = {
                                selectedProduct = sp
                                if (priceText.isBlank()) priceText = sp.price.toString()
                                productExpanded = false
                            }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            OutlinedTextField(
                value = priceText,
                onValueChange = { priceText = it },
                label = { Text("Special Offer Price (₹)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(20.dp))

            Button(
                onClick = {
                    val p = priceText.toDoubleOrNull()
                    val sp = selectedProduct
                    val spId = sp?.sellerProductId?.toIntOrNull() ?: sp?.id?.toIntOrNull() ?: 0
                    if (title.isNotBlank() && p != null && p > 0 && spId > 0) {
                        onSubmit(title, description.ifBlank { null }, p, spId)
                    }
                },
                enabled = title.isNotBlank() && priceText.toDoubleOrNull() != null && selectedProduct != null,
                colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary),
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Publish Offer", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
