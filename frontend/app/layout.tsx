import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/common/app-providers";

export const metadata: Metadata = {
  title: "Vegito — fresh market, simply delivered",
  description: "Fresh vegetables from your local market to your doorstep.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AppProviders>{children}</AppProviders></body></html>;
}
