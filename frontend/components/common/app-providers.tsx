"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ThemeProvider } from "@/context/theme-context";
import { I18nProvider } from "@/context/i18n-context";
import { App } from "@capacitor/app";
import { useRouter } from "next/navigation";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 60_000 } } }));
  const router = useRouter();

  useEffect(() => {
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

    return () => {
      backListener.then((l) => l.remove());
    };
  }, [router]);

  return (
    <ThemeProvider>
      <I18nProvider>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
