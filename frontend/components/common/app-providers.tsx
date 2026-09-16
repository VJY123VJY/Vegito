"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ThemeProvider } from "@/context/theme-context";
import { I18nProvider } from "@/context/i18n-context";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 60_000 } } }));
  return (
    <ThemeProvider>
      <I18nProvider>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
