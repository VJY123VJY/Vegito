package com.vegito.app.presentation.devtools

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vegito.app.data.demo.DemoOrderRunner
import com.vegito.app.data.demo.DemoOrderState
import com.vegito.app.data.demo.DemoRunStatus
import com.vegito.app.data.demo.DemoStepStatus
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class DemoOrderViewModel(
    private val runner: DemoOrderRunner
) : ViewModel() {
    private val _state = MutableStateFlow(DemoOrderState())
    val state: StateFlow<DemoOrderState> = _state.asStateFlow()
    private var runJob: Job? = null

    fun start() {
        if (_state.value.isRunning) return

        _state.value = DemoOrderState(
            status = DemoRunStatus.RUNNING,
            steps = _state.value.steps.map { it.copy(status = DemoStepStatus.PENDING, detail = null) }
                .map { if (it.id == "customer-auth") it.copy(status = DemoStepStatus.RUNNING) else it }
        )
        runJob = viewModelScope.launch {
            try {
                when (val result = runner.verifyPreflight()) {
                    is DemoOrderRunner.PreflightResult.Failed -> fail(
                        stepId = result.stepId,
                        httpStatus = result.httpStatus,
                        message = result.message
                    )
                    is DemoOrderRunner.PreflightResult.Authenticated -> {
                        updateStep(
                            "customer-auth",
                            DemoStepStatus.PASSED,
                            "Backend authenticated customer ${result.customerId}."
                        )
                        _state.value = _state.value.copy(
                            customerName = result.customerName,
                            customerId = result.customerId
                        )
                        fail(
                            stepId = "test-isolation",
                            httpStatus = null,
                            message = "Backend does not currently expose a safe development mechanism for creating or selecting isolated DEMO customer, seller, and delivery-partner identities. No cart or order mutation was performed."
                        )
                    }
                }
            } catch (error: TimeoutCancellationException) {
                fail(
                    stepId = "customer-auth",
                    httpStatus = null,
                    message = "Session verification timed out after 15 seconds. No cart or order mutation was performed."
                )
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                fail(
                    stepId = "customer-auth",
                    httpStatus = null,
                    message = "Preflight failed: ${error.message ?: error.javaClass.simpleName}. No cart or order mutation was performed."
                )
            }
        }
    }

    fun cancel() {
        val job = runJob ?: return
        if (job.isActive) {
            job.cancel()
            _state.value = _state.value.copy(status = DemoRunStatus.CANCELLED)
        }
        runJob = null
    }

    private fun fail(stepId: String, httpStatus: Int?, message: String) {
        val title = _state.value.steps.firstOrNull { it.id == stepId }?.title ?: stepId
        val updatedSteps = _state.value.steps.map { step ->
            when {
                step.id == stepId -> step.copy(status = DemoStepStatus.FAILED, detail = message)
                step.status == DemoStepStatus.PENDING -> step.copy(
                    status = DemoStepStatus.NOT_RUN,
                    detail = "Stopped because the preceding prerequisite failed."
                )
                else -> step
            }
        }
        _state.value = _state.value.copy(
            status = DemoRunStatus.FAILED,
            steps = updatedSteps,
            failedStep = title,
            httpStatus = httpStatus,
            backendMessage = message
        )
        runJob = null
    }

    private fun updateStep(id: String, status: DemoStepStatus, detail: String) {
        _state.value = _state.value.copy(
            steps = _state.value.steps.map { step ->
                if (step.id == id) step.copy(status = status, detail = detail) else step
            }
        )
    }

    override fun onCleared() {
        runJob?.cancel()
        super.onCleared()
    }
}
