package com.vegito.app.data.demo

enum class DemoRunStatus {
    START,
    RUNNING,
    PASSED,
    FAILED,
    CANCELLED
}

enum class DemoStepStatus {
    PENDING,
    RUNNING,
    PASSED,
    FAILED,
    NOT_RUN
}

data class DemoOrderStep(
    val id: String,
    val title: String,
    val status: DemoStepStatus = DemoStepStatus.PENDING,
    val detail: String? = null
)

data class DemoOrderState(
    val status: DemoRunStatus = DemoRunStatus.START,
    val steps: List<DemoOrderStep> = demoOrderSteps(),
    val failedStep: String? = null,
    val httpStatus: Int? = null,
    val backendMessage: String? = null,
    val customerName: String? = null,
    val customerId: String? = null
) {
    val isRunning: Boolean
        get() = status == DemoRunStatus.RUNNING
}

fun demoOrderSteps(): List<DemoOrderStep> = listOf(
    DemoOrderStep("customer-auth", "Customer authenticated"),
    DemoOrderStep("test-isolation", "Isolated development test environment"),
    DemoOrderStep("product", "Product selected"),
    DemoOrderStep("order", "Order created"),
    DemoOrderStep("seller-match", "Correct seller matched"),
    DemoOrderStep("seller-accept", "Seller accepted"),
    DemoOrderStep("packing", "Packing"),
    DemoOrderStep("ready", "Ready"),
    DemoOrderStep("task", "Delivery task created"),
    DemoOrderStep("delivery-accept", "Delivery partner accepted"),
    DemoOrderStep("pickup-otp", "Pickup OTP verified"),
    DemoOrderStep("customer-lock", "Customer location locked before pickup"),
    DemoOrderStep("customer-unlock", "Customer location unlocked after pickup"),
    DemoOrderStep("partner-location", "Delivery partner location updates received"),
    DemoOrderStep("map-marker", "Map marker moved from backend location updates"),
    DemoOrderStep("delivery-otp", "Customer delivery OTP verified"),
    DemoOrderStep("delivered", "Order delivered")
)
