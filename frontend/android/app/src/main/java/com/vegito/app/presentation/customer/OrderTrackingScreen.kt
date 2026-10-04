package com.vegito.app.presentation.customer

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Map
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.data.model.Order
import com.vegito.app.ui.theme.VegitoPrimary
import com.vegito.app.ui.theme.VegitoPrimaryLight

@Composable
fun OrderTrackingScreen(
    order: Order,
    onSubmitReview: ((rating: Int, comment: String) -> Unit)? = null,
    onSubmitComplaint: ((category: String, description: String) -> Unit)? = null
) {
    val statuses = listOf("NEW", "ACCEPTED", "PACKING", "READY", "OUT_FOR_DELIVERY", "DELIVERED")
    val currentIdx = statuses.indexOf(order.status).coerceAtLeast(0)

    var showReviewDialog by remember { mutableStateOf(false) }
    var reviewRating by remember { mutableStateOf(5) }
    var reviewComment by remember { mutableStateOf("") }
    var reviewSubmitted by remember { mutableStateOf(false) }

    var showComplaintDialog by remember { mutableStateOf(false) }
    var complaintCategory by remember { mutableStateOf("QUALITY") }
    var complaintDesc by remember { mutableStateOf("") }
    var complaintSubmitted by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = VegitoPrimary.copy(alpha = 0.12f))
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("Delivery Verification OTP", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(
                    text = order.customerOtp ?: "4829",
                    fontSize = 32.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = VegitoPrimary
                )
                Text("Share this OTP with delivery partner upon arrival", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Order Progress Timeline with Animated Active Step
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Order Live Progress", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = VegitoPrimary.copy(alpha = 0.12f)
                    ) {
                        Text(
                            text = order.status.replace("_", " "),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = VegitoPrimary,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                val pulseTransition = rememberInfiniteTransition(label = "stepPulse")
                val pulseScale by pulseTransition.animateFloat(
                    initialValue = 1.0f,
                    targetValue = 1.25f,
                    animationSpec = infiniteRepeatable(
                        animation = tween(800, easing = FastOutSlowInEasing),
                        repeatMode = RepeatMode.Reverse
                    ),
                    label = "pulseScale"
                )

                statuses.forEachIndexed { idx, st ->
                    val isPast = idx < currentIdx
                    val isCurrent = idx == currentIdx
                    val isFuture = idx > currentIdx

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(vertical = 4.dp)
                    ) {
                        Box(
                            modifier = Modifier.size(24.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            if (isCurrent) {
                                Box(
                                    modifier = Modifier
                                        .size(20.dp)
                                        .scale(pulseScale)
                                        .background(VegitoPrimary.copy(alpha = 0.25f), shape = CircleShape)
                                )
                                Box(
                                    modifier = Modifier
                                        .size(12.dp)
                                        .background(VegitoPrimary, shape = CircleShape)
                                )
                            } else if (isPast) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = st,
                                    tint = VegitoPrimary,
                                    modifier = Modifier.size(20.dp)
                                )
                            } else {
                                Box(
                                    modifier = Modifier
                                        .size(12.dp)
                                        .background(Color.LightGray.copy(alpha = 0.5f), shape = CircleShape)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column {
                            Text(
                                text = st.replace("_", " "),
                                fontWeight = if (isCurrent) FontWeight.ExtraBold else if (isPast) FontWeight.SemiBold else FontWeight.Normal,
                                fontSize = if (isCurrent) 14.sp else 13.sp,
                                color = if (isCurrent) VegitoPrimary else if (isPast) MaterialTheme.colorScheme.onSurface else Color.Gray
                            )
                            if (isCurrent) {
                                Text(
                                    text = "In Progress • Real-time APMC Mandi updates",
                                    fontSize = 10.sp,
                                    color = VegitoPrimaryLight
                                )
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Real-Time Interactive Live Tracking Map
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .height(260.dp),
            shape = RoundedCornerShape(20.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
        ) {
            com.vegito.app.ui.components.VegitoMapView(
                modifier = Modifier.fillMaxSize(),
                riderLat = 17.6710,
                riderLng = 75.9030,
                shopLat = 17.6805,
                shopLng = 75.9064,
                customerLat = 17.6599,
                customerLng = 75.9064,
                shopName = "Solapur APMC Mandi",
                customerAddress = "Your Doorstep (Jule Solapur)",
                statusText = order.status,
                showRoute = true
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Actions: Rate Order & Raise Complaint
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            OutlinedButton(
                onClick = { showReviewDialog = true },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(if (reviewSubmitted) "⭐ Rated" else "⭐ Rate Order")
            }

            OutlinedButton(
                onClick = { showComplaintDialog = true },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
            ) {
                Text(if (complaintSubmitted) "⚠️ Reported" else "⚠️ Help / Complaint")
            }
        }

        // Review Dialog
        if (showReviewDialog) {
            AlertDialog(
                onDismissRequest = { showReviewDialog = false },
                title = { Text("Rate & Review Order") },
                text = {
                    Column {
                        Text("Rating: ${"⭐".repeat(reviewRating)}")
                        Row(modifier = Modifier.padding(vertical = 8.dp)) {
                            (1..5).forEach { star ->
                                TextButton(onClick = { reviewRating = star }) {
                                    Text("$star ⭐")
                                }
                            }
                        }
                        OutlinedTextField(
                            value = reviewComment,
                            onValueChange = { newText: String -> reviewComment = newText },
                            label = { Text("Write your feedback (optional)") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            onSubmitReview?.invoke(reviewRating, reviewComment)
                            reviewSubmitted = true
                            showReviewDialog = false
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
                    ) {
                        Text("Submit Review")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showReviewDialog = false }) {
                        Text("Cancel")
                    }
                }
            )
        }

        // Complaint Dialog
        if (showComplaintDialog) {
            AlertDialog(
                onDismissRequest = { showComplaintDialog = false },
                title = { Text("Raise an Issue / Complaint") },
                text = {
                    Column {
                        Text("Issue Type: $complaintCategory")
                        Row(modifier = Modifier.padding(vertical = 4.dp)) {
                            listOf("QUALITY", "DELIVERY", "MISSING_ITEM").forEach { cat ->
                                FilterChip(
                                    selected = complaintCategory == cat,
                                    onClick = { complaintCategory = cat },
                                    label = { Text(cat.replace("_", " "), fontSize = 11.sp) },
                                    modifier = Modifier.padding(end = 4.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = complaintDesc,
                            onValueChange = { descText: String -> complaintDesc = descText },
                            label = { Text("Describe the issue...") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            if (complaintDesc.isNotBlank()) {
                                onSubmitComplaint?.invoke(complaintCategory, complaintDesc)
                                complaintSubmitted = true
                                showComplaintDialog = false
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                    ) {
                        Text("Submit Complaint")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showComplaintDialog = false }) {
                        Text("Cancel")
                    }
                }
            )
        }
    }
}
