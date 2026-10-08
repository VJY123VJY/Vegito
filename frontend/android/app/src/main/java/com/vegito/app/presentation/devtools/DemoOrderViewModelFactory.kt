package com.vegito.app.presentation.devtools

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.vegito.app.data.demo.DemoOrderRunner

class DemoOrderViewModelFactory(
    private val runner: DemoOrderRunner
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (!modelClass.isAssignableFrom(DemoOrderViewModel::class.java)) {
            throw IllegalArgumentException("Unsupported ViewModel class: ${modelClass.name}")
        }
        return DemoOrderViewModel(runner) as T
    }
}
