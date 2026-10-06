package com.vegito.app.data.remote

import android.util.Log
import com.vegito.app.BuildConfig
import com.vegito.app.data.local.SessionManager
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.IOException
import java.util.concurrent.TimeUnit

object RetrofitClient {

    private const val TAG = "VegitoHttp"
    private val baseUrl = BuildConfig.VEGITO_API_BASE_URL

    private var sessionManager: SessionManager? = null

    fun init(manager: SessionManager) {
        sessionManager = manager
    }

    private val authInterceptor = Interceptor { chain ->

        val originalRequest = chain.request()
        val token = sessionManager?.getToken()

        val requestBuilder = originalRequest.newBuilder()

        if (!token.isNullOrBlank()) {
            requestBuilder.header(
                "Authorization",
                "Bearer $token"
            )
        }

        chain.proceed(requestBuilder.build())
    }

    private val safeLoggingInterceptor = Interceptor { chain ->
        val request = chain.request()
        val path = request.url.encodedPath
        val startNanos = System.nanoTime()
        try {
            val response = chain.proceed(request)
            val elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos)
            Log.d(TAG, "${request.url.host} ${request.method} $path -> ${response.code} (${elapsedMs}ms)")
            response
        } catch (error: IOException) {
            Log.w(TAG, "${request.url.host} ${request.method} $path failed (${error.javaClass.simpleName})")
            throw error
        }
    }

    private val okHttpClient =
        OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .apply {
                if (BuildConfig.DEBUG) {
                    addInterceptor(safeLoggingInterceptor)
                }
            }
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