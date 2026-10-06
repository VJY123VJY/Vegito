import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, MapPin, Search, ShoppingBasket } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { getStoredLocation } from "@/components/location/location-modal";

export function CustomerHeader({ count }: { count: number }) {
  const router = useRouter();
  const [locTitle, setLocTitle] = useState("Set location");

  useEffect(() => {
    const loc = getStoredLocation();
    if (loc?.city) {
      setLocTitle(loc.city);
    } else if (loc?.address) {
      setLocTitle(loc.address.split(",")[0] || "Set location");
    }
  }, []);

  return (
    <header className="customer-header">
      <div className="top-row">
        <Link href="/customer"><Wordmark /></Link>
        <button className="location" onClick={() => router.push("/customer/profile/addresses")}>
          <MapPin size={17} />
          <span><small>Delivering to</small><b>{locTitle}</b></span>
          <ChevronDown size={15} />
        </button>
        <nav className="desktop-links" aria-label="Customer links">
          <Link href="/vegetables">🥦 Vegetables</Link>
          <Link href="/fruits">🍎 Fruits</Link>
          <Link href="/offers">🏷️ Offers</Link>
          <Link href="/categories">Categories</Link>
          <Link href="/customer/orders">Orders</Link>
          <Link href="/customer/favorites">Favorites</Link>
          <Link href="/customer/b2b" style={{ fontWeight: 700, color: "var(--vegito-primary, #0a4d3c)" }}>🏢 B2B Bulk</Link>
        </nav>
        <Link className="icon-button" href="/customer/notifications" aria-label="Notifications"><Bell size={20} /></Link>
        <Link className="header-basket" href="/customer/cart" aria-label="Basket"><ShoppingBasket size={20} />{count > 0 ? <em>{count}</em> : null}</Link>
      </div>
      <button className="search-box" onClick={() => router.push("/search")} aria-label="Search vegetables and fruits">
        <Search size={20} />
        <span>Search vegetables, fruits...</span>
        <kbd>⌘ K</kbd>
      </button>
    </header>
  );
}

