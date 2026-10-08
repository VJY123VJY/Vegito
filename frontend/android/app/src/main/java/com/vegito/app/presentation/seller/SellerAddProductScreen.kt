package com.vegito.app.presentation.seller

import android.Manifest
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.vegito.app.data.model.SellerAddProductRequest
import com.vegito.app.ui.theme.VegitoPrimary
import java.io.ByteArrayOutputStream

data class PresetProduceImage(
    val label: String,
    val url: String,
    val category: String
)

val PRESET_PRODUCE_IMAGES = listOf(
    PresetProduceImage("Tomatoes", "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80", "Fresh Vegetables"),
    PresetProduceImage("Potatoes", "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80", "Fresh Vegetables"),
    PresetProduceImage("Onions", "https://images.unsplash.com/photo-1508747703725-719777637510?w=600&auto=format&fit=crop&q=80", "Fresh Vegetables"),
    PresetProduceImage("Spinach", "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80", "Leafy Greens"),
    PresetProduceImage("Carrots", "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&auto=format&fit=crop&q=80", "Tubers & Roots"),
    PresetProduceImage("Cauliflower", "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=600&auto=format&fit=crop&q=80", "Fresh Vegetables"),
    PresetProduceImage("Bananas", "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&auto=format&fit=crop&q=80", "Seasonal Specials"),
    PresetProduceImage("Apples", "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&auto=format&fit=crop&q=80", "Seasonal Specials"),
    PresetProduceImage("Mangoes", "https://images.unsplash.com/photo-1553279768-865429fa0078?w=600&auto=format&fit=crop&q=80", "Seasonal Specials"),
    PresetProduceImage("Pomegranate", "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80", "Seasonal Specials")
)

private fun bitmapToDataUrl(bitmap: Bitmap): String {
    val outputStream = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.JPEG, 85, outputStream)
    val byteArray = outputStream.toByteArray()
    val base64 = Base64.encodeToString(byteArray, Base64.NO_WRAP)
    return "data:image/jpeg;base64,$base64"
}

private fun uriToDataUrl(context: Context, uri: Uri): String? {
    return try {
        val inputStream = context.contentResolver.openInputStream(uri) ?: return null
        val bitmap = BitmapFactory.decodeStream(inputStream)
        inputStream.close()
        if (bitmap == null) return null
        bitmapToDataUrl(bitmap)
    } catch (_: Exception) {
        null
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SellerAddProductScreen(
    onBack: () -> Unit,
    onSubmitProduct: (SellerAddProductRequest) -> Unit
) {
    val context = LocalContext.current

    var name by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("Fresh Vegetables") }
    var priceStr by remember { mutableStateOf("") }
    var unit by remember { mutableStateOf("kg") }
    var stockStr by remember { mutableStateOf("50") }
    var freshnessPct by remember { mutableStateOf(95f) }
    var isOrganic by remember { mutableStateOf(true) }
    var description by remember { mutableStateOf("") }
    var selectedImageUrl by remember { mutableStateOf<String?>(null) }
    var showImagePickerDialog by remember { mutableStateOf(false) }

    val categories = listOf("Fresh Vegetables", "Leafy Greens", "Exotic & Herbs", "Tubers & Roots", "Seasonal Specials")
    val units = listOf("kg", "bunch", "piece", "gm", "crate")

    var categoryExpanded by remember { mutableStateOf(false) }
    var unitExpanded by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isUploadingImage by remember { mutableStateOf(false) }

    // Activity Launchers for Camera & Gallery
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicturePreview()
    ) { bitmap ->
        if (bitmap != null) {
            isUploadingImage = true
            val dataUrl = bitmapToDataUrl(bitmap)
            selectedImageUrl = dataUrl
            isUploadingImage = false
        }
    }

    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            cameraLauncher.launch(null)
        } else {
            errorMessage = "Camera permission is required to take a produce photo."
        }
    }

    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            isUploadingImage = true
            val dataUrl = uriToDataUrl(context, uri)
            if (dataUrl != null) {
                selectedImageUrl = dataUrl
            } else {
                errorMessage = "Failed to process selected image."
            }
            isUploadingImage = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Add Mandi Product", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text("Publish Produce to Live Customer Catalog", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)

            // Product Image Picker Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)),
                border = BorderStroke(1.dp, VegitoPrimary.copy(alpha = 0.3f))
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Produce Photo",
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = Color(0xFF0A4D3C)
                        )
                        if (selectedImageUrl != null) {
                            TextButton(onClick = { selectedImageUrl = null }) {
                                Text("Remove", color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    if (selectedImageUrl != null) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(180.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color.White)
                        ) {
                            AsyncImage(
                                model = ImageRequest.Builder(LocalContext.current)
                                    .data(selectedImageUrl)
                                    .crossfade(true)
                                    .build(),
                                contentDescription = "Product Image Preview",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                            Surface(
                                shape = CircleShape,
                                color = Color.Black.copy(alpha = 0.6f),
                                modifier = Modifier
                                    .align(Alignment.BottomEnd)
                                    .padding(8.dp)
                                    .clickable { showImagePickerDialog = true }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Default.Edit, contentDescription = "Change", tint = Color.White, modifier = Modifier.size(14.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Change Photo", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    } else {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(140.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .border(1.5.dp, VegitoPrimary.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                                .background(Color.White)
                                .clickable { showImagePickerDialog = true },
                            contentAlignment = Alignment.Center
                        ) {
                            if (isUploadingImage) {
                                CircularProgressIndicator(color = VegitoPrimary)
                            } else {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(
                                        Icons.Default.AddAPhoto,
                                        contentDescription = "Add Photo",
                                        tint = VegitoPrimary,
                                        modifier = Modifier.size(36.dp)
                                    )
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        "Tap to Add Produce Photo",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = VegitoPrimary
                                    )
                                    Text(
                                        "Camera, Gallery or Mandi Presets",
                                        fontSize = 12.sp,
                                        color = Color.Gray
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Quick Preset Chips
                    Text(
                        text = "Or pick from harvest presets:",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF475569),
                        modifier = Modifier.align(Alignment.Start)
                    )
                    Spacer(modifier = Modifier.height(6.dp))

                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        items(PRESET_PRODUCE_IMAGES) { preset ->
                            FilterChip(
                                selected = selectedImageUrl == preset.url,
                                onClick = {
                                    selectedImageUrl = preset.url
                                    if (name.isBlank()) {
                                        name = "Solapur ${preset.label}"
                                    }
                                },
                                label = { Text(preset.label, fontSize = 12.sp) },
                                leadingIcon = {
                                    Icon(Icons.Default.Spa, contentDescription = null, modifier = Modifier.size(14.dp))
                                }
                            )
                        }
                    }
                }
            }

            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Product Name (e.g. Solapur Desi Tomato)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            // Category selector
            ExposedDropdownMenuBox(
                expanded = categoryExpanded,
                onExpandedChange = { categoryExpanded = it }
            ) {
                OutlinedTextField(
                    value = category,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Category") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = categoryExpanded) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor(),
                    shape = RoundedCornerShape(12.dp)
                )
                ExposedDropdownMenu(
                    expanded = categoryExpanded,
                    onDismissRequest = { categoryExpanded = false }
                ) {
                    categories.forEach { cat ->
                        DropdownMenuItem(
                            text = { Text(cat) },
                            onClick = {
                                category = cat
                                categoryExpanded = false
                            }
                        )
                    }
                }
            }

            // Price & Unit
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = priceStr,
                    onValueChange = { priceStr = it },
                    label = { Text("Price (₹)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1.2f),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp)
                )

                ExposedDropdownMenuBox(
                    expanded = unitExpanded,
                    onExpandedChange = { unitExpanded = it },
                    modifier = Modifier.weight(1f)
                ) {
                    OutlinedTextField(
                        value = unit,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Unit") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = unitExpanded) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor(),
                        shape = RoundedCornerShape(12.dp)
                    )
                    ExposedDropdownMenu(
                        expanded = unitExpanded,
                        onDismissRequest = { unitExpanded = false }
                    ) {
                        units.forEach { u ->
                            DropdownMenuItem(
                                text = { Text(u) },
                                onClick = {
                                    unit = u
                                    unitExpanded = false
                                }
                            )
                        }
                    }
                }
            }

            // Initial Stock
            OutlinedTextField(
                value = stockStr,
                onValueChange = { stockStr = it },
                label = { Text("Initial Stock Available") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            // Freshness Percentage Slider
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Mandi Freshness Score", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("${freshnessPct.toInt()}% Fresh", color = VegitoPrimary, fontWeight = FontWeight.ExtraBold)
                    }
                    Slider(
                        value = freshnessPct,
                        onValueChange = { freshnessPct = it },
                        valueRange = 50f..100f,
                        steps = 9
                    )
                }
            }

            // Organic Checkbox
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Checkbox(
                    checked = isOrganic,
                    onCheckedChange = { isOrganic = it }
                )
                Spacer(modifier = Modifier.width(4.dp))
                Column {
                    Text("Farm-Fresh / Organic Produce", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    Text("Highlight with organic badge in customer app", fontSize = 12.sp, color = Color.Gray)
                }
            }

            // Description
            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Description & Farm Details (Optional)") },
                modifier = Modifier.fillMaxWidth(),
                maxLines = 3,
                shape = RoundedCornerShape(12.dp)
            )

            errorMessage?.let {
                Text(it, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
            }

            Spacer(modifier = Modifier.height(10.dp))

            Button(
                onClick = {
                    val price = priceStr.toDoubleOrNull()
                    val stock = stockStr.toDoubleOrNull()
                    if (name.isBlank()) {
                        errorMessage = "Please enter product name"
                    } else if (price == null || price <= 0.0) {
                        errorMessage = "Please enter valid price greater than 0"
                    } else if (stock == null || stock < 0.0) {
                        errorMessage = "Please enter valid stock quantity"
                    } else {
                        errorMessage = null
                        val categoryId = when (category) {
                            "Fresh Vegetables" -> 1
                            "Leafy Greens" -> 3
                            "Tubers & Roots" -> 4
                            "Exotic & Herbs" -> 5
                            else -> 1
                        }
                        onSubmitProduct(
                            SellerAddProductRequest(
                                productName = name.trim(),
                                categoryId = categoryId,
                                price = price,
                                unit = unit,
                                stockQuantity = stock,
                                description = description.ifBlank { "Direct from local Solapur farm harvest" },
                                imageUrl = selectedImageUrl
                            )
                        )
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary),
                shape = RoundedCornerShape(14.dp)
            ) {
                Icon(Icons.Default.Check, contentDescription = "Publish")
                Spacer(modifier = Modifier.width(8.dp))
                Text("Publish to Live Store", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }
        }
    }

    // Modal / Dialog for Photo Source Selection
    if (showImagePickerDialog) {
        AlertDialog(
            onDismissRequest = { showImagePickerDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CameraAlt, contentDescription = null, tint = VegitoPrimary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Select Photo Source", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = {
                            showImagePickerDialog = false
                            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.PhotoCamera, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Take Photo with Camera")
                    }

                    OutlinedButton(
                        onClick = {
                            showImagePickerDialog = false
                            galleryLauncher.launch("image/*")
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.PhotoLibrary, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Choose from Gallery")
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showImagePickerDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
