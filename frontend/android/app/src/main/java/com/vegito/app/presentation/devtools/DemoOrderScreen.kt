package com.vegito.app.presentation.devtools

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.HourglassEmpty
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vegito.app.BuildConfig
import com.vegito.app.data.demo.DemoOrderStep
import com.vegito.app.data.demo.DemoRunStatus
import com.vegito.app.data.demo.DemoStepStatus
import com.vegito.app.ui.theme.VegitoPrimary

@Composable
fun DemoOrderScreen(viewModel: DemoOrderViewModel) {
    val state by viewModel.state.collectAsState()
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("VEGITO DEMO ORDER", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
        Text(
            "Native Android integration test. Backend responses are authoritative; no local order or location success is simulated.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Environment", fontWeight = FontWeight.Bold)
                Text(if (BuildConfig.DEBUG) "Debug build • backend environment not verified" else "Release build")
                Text("Location mode: not started (no GPS or simulated coordinates have been used).")
                state.customerId?.let { Text("Authenticated customer ID: $it") }
                state.customerName?.let { Text("Customer: $it") }
            }
        }

        state.steps.forEach { step -> DemoStepRow(step) }

        if (state.status == DemoRunStatus.FAILED) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("DEMO ORDER FAILED", fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.error)
                    Text("Failed step: ${state.failedStep ?: "Unknown"}", fontWeight = FontWeight.Bold)
                    Text("HTTP: ${state.httpStatus?.toString() ?: "Not applicable (local safety precondition)"}")
                    Text("Message: ${state.backendMessage.orEmpty()}")
                    Text("Previous successful step: ${state.steps.lastOrNull { it.status == DemoStepStatus.PASSED }?.title ?: "None"}")
                    Text("No later step was attempted.")
                }
            }
        } else if (state.status == DemoRunStatus.PASSED) {
            Text("DEMO ORDER PASSED", color = VegitoPrimary, fontWeight = FontWeight.ExtraBold)
        } else if (state.status == DemoRunStatus.CANCELLED) {
            Text("DEMO ORDER CANCELLED. No demo order was created.", color = MaterialTheme.colorScheme.error)
        }

        if (state.isRunning) {
            OutlinedButton(
                onClick = viewModel::cancel,
                modifier = Modifier.fillMaxWidth()
            ) { Text("Cancel preflight") }
        } else {
            Button(
                onClick = viewModel::start,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = VegitoPrimary)
            ) {
                Text(if (state.status == DemoRunStatus.START) "RUN ONE DEMO ORDER" else "RUN PREFLIGHT AGAIN")
            }
        }
    }
}

@Composable
private fun DemoStepRow(step: DemoOrderStep) {
    val (icon, tint, statusText) = when (step.status) {
        DemoStepStatus.PASSED -> Triple(Icons.Default.CheckCircle, VegitoPrimary, "Verified by backend")
        DemoStepStatus.FAILED -> Triple(Icons.Default.Error, MaterialTheme.colorScheme.error, "Failed")
        DemoStepStatus.RUNNING -> Triple(Icons.Default.HourglassEmpty, MaterialTheme.colorScheme.primary, "Running")
        DemoStepStatus.NOT_RUN -> Triple(Icons.Default.RadioButtonUnchecked, Color.Gray, "Not run")
        DemoStepStatus.PENDING -> Triple(Icons.Default.RadioButtonUnchecked, Color.Gray, "Pending")
    }
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (step.status == DemoStepStatus.RUNNING) {
                CircularProgressIndicator(modifier = Modifier.padding(2.dp), strokeWidth = 2.dp)
            } else {
                Icon(icon, contentDescription = statusText, tint = tint)
            }
            Column(modifier = Modifier.padding(start = 12.dp).weight(1f)) {
                Text(step.title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Text(statusText, color = tint, fontSize = 12.sp)
                step.detail?.let {
                    Spacer(Modifier.height(4.dp))
                    Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}
