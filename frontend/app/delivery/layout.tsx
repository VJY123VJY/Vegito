"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    router.replace("/unauthorized?reason=platform_separation&from=/delivery");
  }, [router]);

  return null;
}
