package com.vegito.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Local development only: the LAN FastAPI endpoint is HTTP while the
        // Capacitor shell is HTTPS. Release builds keep WebView mixed content
        // disabled so production remains HTTPS-only.
        boolean debugBuild = (getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        if (debugBuild && bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().getSettings().setMixedContentMode(
                WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            );
        }
    }
}
