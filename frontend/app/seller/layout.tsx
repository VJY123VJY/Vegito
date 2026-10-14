"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    router.replace("/unauthorized?reason=platform_separation&from=/seller");
  }, [router]);

  return null;
}
