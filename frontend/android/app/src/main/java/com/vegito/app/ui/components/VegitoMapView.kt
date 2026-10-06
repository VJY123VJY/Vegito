package com.vegito.app.ui.components

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.vegito.app.ui.theme.VegitoPrimary

private const val MAPBOX_TOKEN = "pk.eyJ1IjoidmlqYXkxMjN2aWpheSIsImEiOiJjbXU0OHhqOWcwZmdwMnlzZnZ0bGV6bmJjIn0.GMQPeQZOQaB3-JakIULgfw"

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun VegitoMapView(
    modifier: Modifier = Modifier,
    riderLat: Double?,
    riderLng: Double?,
    shopLat: Double,
    shopLng: Double,
    customerLat: Double? = null,
    customerLng: Double? = null,
    shopName: String,
    customerAddress: String,
    statusText: String,
    showRoute: Boolean = true,
    interactive: Boolean = true,
    onGpsClick: (() -> Unit)? = null
) {
    var webViewRef by remember { mutableStateOf<WebView?>(null) }
    var isMapLoading by remember { mutableStateOf(true) }

    // Prepare HTML content for the map
    val mapHtml = remember(
        riderLat, riderLng, shopLat, shopLng, customerLat, customerLng,
        shopName, customerAddress, statusText
    ) {
        val hasCustomer = customerLat != null && customerLng != null
        val customerLatStr = if (hasCustomer) customerLat.toString() else "null"
        val customerLngStr = if (hasCustomer) customerLng.toString() else "null"
        val hasRider = riderLat != null && riderLng != null
        val riderLatStr = if (hasRider) riderLat.toString() else "0"
        val riderLngStr = if (hasRider) riderLng.toString() else "0"

        """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <style>
                body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; font-family: -apple-system, BlinkMacSystemFont, Roboto, sans-serif; }
                .rider-icon {
                    background: #2E7D32;
                    border: 3px solid white;
                    border-radius: 50%;
                    width: 38px;
                    height: 38px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.35);
                    animation: pulse 1.8s infinite;
                }
                .shop-icon {
                    background: #0288D1;
                    border: 3px solid white;
                    border-radius: 50%;
                    width: 34px;
                    height: 34px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.3);
                }
                .dest-icon {
                    background: #D32F2F;
                    border: 3px solid white;
                    border-radius: 50%;
                    width: 34px;
                    height: 34px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.3);
                }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0.7); }
                    70% { box-shadow: 0 0 0 14px rgba(46, 125, 50, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0); }
                }
                .leaflet-popup-content-wrapper {
                    border-radius: 12px;
                    font-weight: bold;
                    font-size: 13px;
                }
            </style>
        </head>
        <body>
            <div id="map"></div>
            <script>
                var map;
                var riderMarker, shopMarker, destMarker;
                var routePolyline;

                var initialCenter = [$shopLat, $shopLng];
                map = L.map('map', {
                    zoomControl: false,
                    attributionControl: false
                }).setView(initialCenter, 14);

                // Use Mapbox tiles if token exists, fallback to OSM
                var mapboxUrl = 'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=$MAPBOX_TOKEN';
                var osmUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

                var tileLayer = L.tileLayer(mapboxUrl, {
                    tileSize: 512,
                    zoomOffset: -1,
                    maxZoom: 19
                }).addTo(map);

                tileLayer.on('tileerror', function() {
                    L.tileLayer(osmUrl, { maxZoom: 19 }).addTo(map);
                });

                // Shop / Mandi Marker
                var shopIconHtml = L.divIcon({
                    html: '<div class="shop-icon">🏪</div>',
                    className: '',
                    iconSize: [34, 34],
                    iconAnchor: [17, 17]
                });
                shopMarker = L.marker([$shopLat, $shopLng], { icon: shopIconHtml }).addTo(map);
                shopMarker.bindPopup('<b>$shopName</b><br>APMC Mandi Yard');

                // Customer Destination Marker
                var hasCust = $customerLatStr !== null && $customerLngStr !== null;
                if (hasCust) {
                    var destIconHtml = L.divIcon({
                        html: '<div class="dest-icon">📍</div>',
                        className: '',
                        iconSize: [34, 34],
                        iconAnchor: [17, 17]
                    });
                    destMarker = L.marker([$customerLatStr, $customerLngStr], { icon: destIconHtml }).addTo(map);
                    destMarker.bindPopup('<b>$customerAddress</b><br>Delivery Doorstep');
                }

                var hasRider = $hasRider;
                if (hasRider) {
                    var riderIconHtml = L.divIcon({
                        html: '<div class="rider-icon">🛵</div>',
                        className: '',
                        iconSize: [38, 38],
                        iconAnchor: [19, 19]
                    });
                    riderMarker = L.marker([$riderLatStr, $riderLngStr], { icon: riderIconHtml }).addTo(map);
                    riderMarker.bindPopup('<b>Delivery Partner</b><br>$statusText');
                }

                // Polyline Route
                var waypoints = [[$shopLat, $shopLng]];
                if (hasRider) waypoints.push([$riderLatStr, $riderLngStr]);
                if (hasCust) {
                    waypoints.push([$customerLatStr, $customerLngStr]);
                }
                if (waypoints.length > 1) {
                    routePolyline = L.polyline(waypoints, {
                        color: '#2E7D32',
                        weight: 4,
                        dashArray: '8, 8',
                        opacity: 0.85
                    }).addTo(map);
                }

                // Auto-fit all markers
                var bounds = L.latLngBounds(waypoints);
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });

                // Function to update rider position dynamically
                window.updateRider = function(lat, lng) {
                    if (riderMarker) {
                        riderMarker.setLatLng([lat, lng]);
                        var updatedPoints = [[$shopLat, $shopLng], [lat, lng]];
                        if (hasCust) updatedPoints.push([$customerLatStr, $customerLngStr]);
                        if (routePolyline) routePolyline.setLatLngs(updatedPoints);
                    }
                };

                window.centerOnRider = function(lat, lng) {
                    map.setView([lat, lng], 15);
                };
            </script>
        </body>
        </html>
        """.trimIndent()
    }

    // Update rider location in WebView whenever coordinates change
    LaunchedEffect(riderLat, riderLng) {
        webViewRef?.evaluateJavascript("if (window.updateRider) { window.updateRider($riderLat, $riderLng); }", null)
    }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(20.dp))
            .background(Color(0xFFE8F5E9))
    ) {
        AndroidView(
            factory = { ctx ->
                WebView(ctx).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.loadWithOverviewMode = true
                    settings.useWideViewPort = true
                    settings.setSupportZoom(interactive)
                    settings.builtInZoomControls = false

                    webChromeClient = WebChromeClient()
                    webViewClient = object : WebViewClient() {
                        override fun onPageFinished(view: WebView?, url: String?) {
                            super.onPageFinished(view, url)
                            isMapLoading = false
                        }
                    }

                    loadDataWithBaseURL("https://api.mapbox.com", mapHtml, "text/html", "UTF-8", null)
                    webViewRef = this
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        // Overlay 1: Live Status Badge Pill (Top-Left)
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = Color.White.copy(alpha = 0.95f),
            shadowElevation = 4.dp,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(12.dp)
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(VegitoPrimary)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = if (statusText == "OUT_FOR_DELIVERY") "🛵 Live Tracking • Out for Delivery" else "📍 $statusText",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1B5E20)
                )
            }
        }

        // Overlay 2: Center On Rider / My Location GPS Button (Bottom-Right)
        FloatingActionButton(
            onClick = {
                webViewRef?.evaluateJavascript("if (window.centerOnRider) { window.centerOnRider($riderLat, $riderLng); }", null)
                onGpsClick?.invoke()
            },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(12.dp)
                .size(42.dp),
            containerColor = Color.White,
            contentColor = VegitoPrimary,
            shape = CircleShape,
            elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 4.dp)
        ) {
            Icon(Icons.Default.MyLocation, contentDescription = "Center Map", modifier = Modifier.size(20.dp))
        }

        // Loading Indicator while tiles load
        if (isMapLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.White.copy(alpha = 0.6f)),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.size(28.dp),
                    color = VegitoPrimary,
                    strokeWidth = 2.5.dp
                )
            }
        }
    }
}
