"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ThemeProvider } from "@/context/theme-context";
import { I18nProvider } from "@/context/i18n-context";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useRouter } from "next/navigation";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error: any) => {
              if (
                error?.response?.status === 401 ||
                error?.response?.status === 403 ||
                error?.response?.status === 404
              ) {
                return false;
              }
              return failureCount < 1;
            },
            staleTime: 60_000,
          },
        },
      })
  );
  const router = useRouter();

  useEffect(() => {
    const handleAuthStateChange = () => {
      client.clear();
    };

    window.addEventListener("vegito:auth_state_changed", handleAuthStateChange);

    // Android Hardware Back Button Handler
    const backListener = App.addListener("backButton", (data) => {
      if (typeof window !== "undefined") {
        if (window.history.length > 1 && data.canGoBack) {
          window.history.back();
        } else {
          // No more history, exit app
          App.exitApp();
        }
      }
    });

    // Register Service Worker for PWA installability & offline shell caching
    if (typeof window !== "undefined" && "serviceWorker" in navigator && !Capacitor.isNativePlatform()) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            if (process.env.NODE_ENV !== "production") {
              console.info("[Vegito PWA] Service worker registered with scope:", reg.scope);
            }
          })
          .catch((err) => {
            console.warn("[Vegito PWA] Service worker registration failed:", err);
          });
      });
    }

    return () => {
      window.removeEventListener("vegito:auth_state_changed", handleAuthStateChange);
      backListener.then((l) => l.remove());
    };
  }, [client, router]);

  return (
    <ThemeProvider>
      <I18nProvider>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
