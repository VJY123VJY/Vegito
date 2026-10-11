"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AddressesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/customer/addresses");
  }, [router]);

  return null;
}

