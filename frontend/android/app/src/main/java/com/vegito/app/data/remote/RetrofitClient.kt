package com.vegito.app.data.remote

import android.os.Build
import android.util.Log
import com.vegito.app.BuildConfig
import com.vegito.app.data.local.SessionManager
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.IOException
import java.util.UUID
import java.util.concurrent.TimeUnit

object RetrofitClient {

    private const val TAG = "VegitoHttp"

    val isRunningOnEmulator: Boolean by lazy {
        try {
            val fingerprint = Build.FINGERPRINT ?: ""
            val model = Build.MODEL ?: ""
            val hardware = Build.HARDWARE ?: ""
            val product = Build.PRODUCT ?: ""
            fingerprint.startsWith("generic") ||
                    fingerprint.startsWith("unknown") ||
                    model.contains("google_sdk") ||
                    model.contains("Emulator") ||
                    model.contains("Android SDK built for x86") ||
                    hardware.contains("goldfish") ||
                    hardware.contains("ranchu") ||
                    product.contains("sdk_gphone") ||
                    product.contains("sdk")
        } catch (_: Throwable) {
            false
        }
    }

    private fun resolveBaseUrl(): String {
        val configured = BuildConfig.VEGITO_API_BASE_URL
        if (BuildConfig.DEBUG && isRunningOnEmulator) {
            if (configured.contains("127.0.0.1")) {
                val rewritten = configured.replace("127.0.0.1", "10.0.2.2")
                Log.i(TAG, "Android Emulator detected: adjusted local dev base URL to $rewritten")
                return rewritten
            }
            if (configured.contains("localhost")) {
                val rewritten = configured.replace("localhost", "10.0.2.2")
                Log.i(TAG, "Android Emulator detected: adjusted local dev base URL to $rewritten")
                return rewritten
            }
        }
        return configured
    }

    private val baseUrl by lazy { resolveBaseUrl() }

    private var sessionManager: SessionManager? = null

    fun init(manager: SessionManager) {
        sessionManager = manager
    }

    private val authInterceptor = Interceptor { chain ->
        val originalRequest = chain.request()
        val requestBuilder = originalRequest.newBuilder()

        // Only attach stored session token if an Authorization header was not explicitly set on the request
        val existingAuth = originalRequest.header("Authorization")
        if (existingAuth.isNullOrBlank()) {
            val token = sessionManager?.getToken()
            if (!token.isNullOrBlank()) {
                requestBuilder.header(
                    "Authorization",
                    "Bearer $token"
                )
            }
        }

        chain.proceed(requestBuilder.build())
    }

    private val safeLoggingInterceptor = Interceptor { chain ->
        val originalRequest = chain.request()
        val requestId = originalRequest.header("X-Request-ID")
            ?: ("req_" + UUID.randomUUID().toString().take(8))
        val request = originalRequest.newBuilder()
            .header("X-Request-ID", requestId)
            .build()
        val path = request.url.encodedPath
        val startNanos = System.nanoTime()
        try {
            val response = chain.proceed(request)
            val elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos)
            Log.d(TAG, "[$requestId] ${request.url.host} ${request.method} $path -> ${response.code} (${elapsedMs}ms)")
            response
        } catch (error: IOException) {
            val elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos)
            Log.w(TAG, "[$requestId] ${request.url.host} ${request.method} $path failed after ${elapsedMs}ms (${error.javaClass.simpleName})")
            throw error
        }
    }

    private val localDevFallbackInterceptor = Interceptor { chain ->
        val request = chain.request()
        try {
            chain.proceed(request)
        } catch (initialError: IOException) {
            val currentHost = request.url.host
            val isLocal = currentHost == "127.0.0.1" || currentHost == "localhost" ||
                    currentHost == "10.0.2.2" || currentHost.startsWith("192.168.") ||
                    currentHost.startsWith("10.")
            if (!BuildConfig.DEBUG || !isLocal) {
                throw initialError
            }
            val alternativeHosts = (if (isRunningOnEmulator) {
                listOf("10.0.2.2", "127.0.0.1", "192.168.1.9")
            } else {
                listOf("192.168.1.9", "127.0.0.1", "10.0.2.2")
            }).filter { it != currentHost }

            for (altHost in alternativeHosts) {
                try {
                    val newUrl = request.url.newBuilder().host(altHost).build()
                    val newRequest = request.newBuilder().url(newUrl).build()
                    val response = chain.proceed(newRequest)
                    Log.i(TAG, "Local dev failover: re-routed from $currentHost to $altHost successfully (${response.code})")
                    return@Interceptor response
                } catch (failoverError: IOException) {
                    Log.d(TAG, "Local dev failover to $altHost failed (${failoverError.javaClass.simpleName})")
                }
            }
            throw initialError
        }
    }

    private val okHttpClient =
        OkHttpClient.Builder()
            .apply {
                if (BuildConfig.DEBUG) {
                    addInterceptor(localDevFallbackInterceptor)
                    addInterceptor(safeLoggingInterceptor)
                }
            }
            .addInterceptor(authInterceptor)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(45, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .build()

    val apiService: VegitoApiService by lazy {
        Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(VegitoApiService::class.java)
    }
}