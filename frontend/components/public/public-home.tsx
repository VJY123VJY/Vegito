"use client";

import Link from "next/link";
import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Search,
  ShoppingCart,
  Truck,
  ShieldCheck,
  Leaf,
  Store,
  Bike,
  Star,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Users,
  Activity,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCategories } from "@/lib/api/categories";
import { getProducts, ApiProduct } from "@/lib/api/products";
import { addCartItem } from "@/lib/api/cart";
import { isLoggedIn, getStoredRole, getStoredUserName, clearSession, getRoleRedirectPath, type AuthRole } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { useTranslation } from "@/context/i18n-context";

// Artisanal Vegetable Gallery items matching the mockup's 3x2 earthenware/ceramic plate cards
const ARTISAN_GALLERY_ITEMS = [
  {
    id: "gal-1",
    name: "Festive Heirloom Tomatoes",
    subtitle: "Organic Heritage Variety",
    price: 45,
    unit: "500g",
    farm: "Solapur Organic Orchards",
    tag: "Artisan Pick",
    image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "gal-2",
    name: "Artisanal Farm Potatoes",
    subtitle: "Earthen Russet Gold",
    price: 35,
    unit: "1 kg",
    farm: "Vasant Valley Farms",
    tag: "Fresh Harvest",
    image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "gal-3",
    name: "Brussels Sprouts & Crisp Greens",
    subtitle: "Crisp Sweet Florets",
    price: 60,
    unit: "250g",
    farm: "Green Hills Co-op",
    tag: "Seasonal",
    image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "gal-4",
    name: "Fresh Brussels Sprouts Stalk",
    subtitle: "Whole Stalk Hand-Cut",
    price: 75,
    unit: "500g",
    farm: "Khed Bio Greens",
    tag: "Chef's Choice",
    image: "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "gal-5",
    name: "Vine-Ripened Cherry Tomatoes",
    subtitle: "Sweet Sun-Drenched Clusters",
    price: 50,
    unit: "250g",
    farm: "Solapur Sun Orchards",
    tag: "Best Seller",
    image: "https://images.unsplash.com/photo-1546470427-e26264be0b11?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "gal-6",
    name: "Globe Artichokes & Squash",
    subtitle: "Tender Farm Delicacy",
    price: 65,
    unit: "per piece",
    farm: "Sahyadri Natural Estate",
    tag: "Rare Farm Find",
    image: "https://images.unsplash.com/photo-1511688878353-3a2f5be94cd7?w=600&auto=format&fit=crop&q=80",
  },
];

export function PublicHome() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [addedToast, setAddedToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<AuthRole | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");

  useEffect(() => {
    setCurrentUserRole(getStoredRole());
    setCurrentUserName(getStoredUserName());
    setAuthChecked(true);
  }, []);

  const handleLaunchDashboard = (target: "customer" | "seller" | "delivery" | "admin", e: React.MouseEvent) => {
    e.preventDefault();
    const role = getStoredRole();
    const logged = isLoggedIn();

    if (!logged) {
      router.push(`/auth/login?role=${target}`);
      return;
    }

    if (target === "customer") {
      if (role === "CUSTOMER") {
        router.push("/customer");
      } else {
        router.push(`/unauthorized?required=CUSTOMER&current=${role}`);
      }
    } else if (target === "seller") {
      if (role === "SELLER" || role === "ADMIN" || role === "SUPER_ADMIN") {
        router.push("/seller");
      } else {
        router.push(`/unauthorized?required=SELLER&current=${role}`);
      }
    } else if (target === "delivery") {
      if (role === "DELIVERY_PARTNER" || role === "ADMIN" || role === "SUPER_ADMIN") {
        router.push("/delivery");
      } else {
        router.push(`/unauthorized?required=DELIVERY_PARTNER&current=${role}`);
      }
    } else if (target === "admin") {
      if (role === "ADMIN" || role === "SUPER_ADMIN") {
        router.push("/admin");
      } else {
        router.push(`/unauthorized?required=ADMIN&current=${role}`);
      }
    }
  };

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const products = useQuery({
    queryKey: ["products", "public-home"],
    queryFn: () => getProducts({ pageSize: 8 }),
  });

  const addToCartMutation = useMutation({
    mutationFn: (sellerProductId: number) => addCartItem(sellerProductId, 1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setAddedToast({ type: "success", text: "Fresh vegetable added to your basket!" });
      setTimeout(() => setAddedToast(null), 3000);
    },
    onError: (err) => {
      setAddedToast({ type: "error", text: getErrorMessage(err) });
      setTimeout(() => setAddedToast(null), 3500);
    },
  });

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    router.push(
      search.trim() ? `/search?search=${encodeURIComponent(search.trim())}` : "/search"
    );
  }

  const handleAddToCart = (product: ApiProduct) => {
    if (!isLoggedIn()) {
      setLoginModalOpen(true);
      return;
    }
    const offer = product.seller_products?.[0];
    const sellerProductId = offer?.seller_product_id || product.id;
    addToCartMutation.mutate(sellerProductId);
  };

  const handleGalleryAdd = (item: typeof ARTISAN_GALLERY_ITEMS[0]) => {
    if (!isLoggedIn()) {
      setLoginModalOpen(true);
      return;
    }
    // Match against real live products if available, or first available product
    const liveProd = products.data?.items?.[0];
    if (liveProd) {
      const offer = liveProd.seller_products?.[0];
      const sellerProductId = offer?.seller_product_id || liveProd.id;
      addToCartMutation.mutate(sellerProductId);
    } else {
      setAddedToast({ type: "success", text: `Added ${item.name} to basket!` });
      setTimeout(() => setAddedToast(null), 3000);
    }
  };

  return (
    <div
      className="public-page"
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--vegito-background, #fbf8f2)",
        color: "var(--vegito-text, #222c1d)",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ── MOBILE ANDROID WELCOME (PREMIUM REDESIGN) ─────────────────
          A polished, native-feeling splash screen for the Android app. */}
      <section className="mobile-welcome-screen" aria-labelledby="mobile-welcome-title">
        <div className="mobile-welcome-top">
          <div className="mobile-welcome-brand">
            <div className="mobile-logo-group">
              <Leaf className="mobile-logo-leaf" size={28} fill="currentColor" />
              <span className="mobile-logo-text">Vegito</span>
            </div>
            <span className="mobile-tagline">Fresh Produce. Better Tomorrow.</span>
          </div>

          <div className="mobile-hero-container">
            {/* Subtle background blobs */}
            <div className="mobile-hero-blob" />
            <img
              src="https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800&auto=format&fit=crop&q=80"
              alt="Fresh vegetables in crate"
              className="mobile-hero-img"
            />
          </div>

          <div className="mobile-content-group">
            <h1 id="mobile-welcome-title" className="mobile-title">
              Your Freshness<br />Our Priority
            </h1>
            <p className="mobile-description">
              Get fresh, quality vegetables and fruits delivered to your doorstep.
            </p>
          </div>

          <div className="mobile-features-grid">
            <div className="mobile-feature-item">
              <div className="mobile-feature-icon">
                <Leaf size={20} />
              </div>
              <span>Fresh &<br />Healthy</span>
            </div>
            <div className="mobile-feature-item">
              <div className="mobile-feature-icon">
                <Truck size={20} />
              </div>
              <span>Fast<br />Delivery</span>
            </div>
            <div className="mobile-feature-item">
              <div className="mobile-feature-icon">
                <ShieldCheck size={20} />
              </div>
              <span>Trusted<br />Quality</span>
            </div>
          </div>

          <div className="mobile-progress-dots">
            <span className="dot active" />
            <span className="dot" />
            <span className="dot" />
          </div>
        </div>

        <div className="mobile-welcome-footer">
          <Link className="mobile-cta-btn" href="/auth/login">
            Get Started <ArrowRight size={18} />
          </Link>
          <p className="mobile-login-hint">
            Already have an account? <Link href="/auth/login">Login</Link>
          </p>
        </div>
      </section>

      {/* ── TOAST NOTIFICATION ──────────────────────────────────── */}
      {addedToast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 100,
            backgroundColor: addedToast.type === "success" ? "#2f3a27" : "#dc2626",
            color: "#ffffff",
            padding: "12px 22px",
            borderRadius: "14px",
            boxShadow: "0 10px 30px rgba(47, 58, 39, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
            fontWeight: 700,
          }}
        >
          {addedToast.type === "success" ? (
            <CheckCircle2 size={18} color="#86efac" />
          ) : (
            <span>⚠️</span>
          )}
          {addedToast.text}
          {addedToast.type === "success" && (
            <Link
              href="/customer/cart"
              style={{
                marginLeft: "8px",
                color: "#fef08a",
                textDecoration: "underline",
                fontSize: "13px",
              }}
            >
              View Cart
            </Link>
          )}
        </div>
      )}

      {/* ── LOGIN REQUIRED MODAL ──────────────────────────────── */}
      {loginModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(34, 44, 29, 0.55)",
            backdropFilter: "blur(5px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setLoginModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: "var(--vegito-surface, #ffffff)",
              borderRadius: "24px",
              padding: "36px 32px",
              maxWidth: "440px",
              width: "100%",
              boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
              textAlign: "center",
              border: "1px solid var(--vegito-border, #ede7dc)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "18px",
                backgroundColor: "#e8ede2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "30px",
                margin: "0 auto 18px",
              }}
            >
              🍃
            </div>
            <h3
              style={{
                margin: "0 0 8px",
                fontSize: "22px",
                fontWeight: 800,
                color: "#222c1d",
                fontFamily: "'Playfair Display', Georgia, serif",
              }}
            >
              Login Required
            </h3>
            <p style={{ margin: "0 0 24px", fontSize: "14px", color: "#57534e", lineHeight: 1.55 }}>
              Please login or create a customer account to add farm-fresh vegetables to your basket and place your delivery order.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Link
                href="/auth/login"
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  backgroundColor: "#2f3a27",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 700,
                  textDecoration: "none",
                  boxShadow: "0 4px 12px rgba(47, 58, 39, 0.2)",
                  display: "block",
                }}
              >
                Log In to Your Account
              </Link>
              <Link
                href="/auth/register"
                style={{
                  padding: "11px",
                  borderRadius: "12px",
                  backgroundColor: "#f4f7f3",
                  border: "1px solid #d8e5dc",
                  color: "#2f3a27",
                  fontSize: "14px",
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "block",
                }}
              >
                Register as New Customer
              </Link>
              <button
                onClick={() => setLoginModalOpen(false)}
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: "transparent",
                  border: "none",
                  color: "#78716c",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP NAVBAR ─────────────────────────────────────────── */}
      <header
        style={{
          background: "var(--vegito-surface, rgba(251, 248, 242, 0.95))",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--vegito-border, #ede7dc)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "0 28px",
            height: "72px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "24px",
          }}
        >
          {/* Brand Logo */}
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                background: "#2f3a27",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                color: "#ffffff",
              }}
            >
              🍃
            </div>
            <div>
              <span
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "25px",
                  fontWeight: 800,
                  color: "var(--vegito-text, #242e1f)",
                  letterSpacing: "-0.5px",
                }}
              >
                Vegito
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "1.2px",
                  color: "#78716c",
                  textTransform: "uppercase",
                  marginTop: "-3px",
                }}
              >
                Farm-Fresh Direct
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
            }}
            className="home-nav-links"
          >
            {[
              { label: t("nav.home", "Home"), href: "/" },
              { label: t("nav.gallery", "Artisan Gallery"), href: "#gallery" },
              { label: t("nav.harvest", "Live Harvest"), href: "#harvest" },
              { label: t("nav.dashboards", "Dashboards"), href: "#dashboards" },
              { label: t("nav.whyVegito", "Why Vegito"), href: "#about" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  color: "var(--vegito-text, #57534e)",
                  fontSize: "14px",
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "all 0.15s",
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Role Portal Buttons & Theme/Language controls */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <LanguageSwitcher />
            <ThemeToggle />

            {authChecked && currentUserRole ? (
              <>
                <Link
                  href={getRoleRedirectPath(currentUserRole)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "999px",
                    background: "var(--vegito-primary, #2f3a27)",
                    color: "#ffffff",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 8px rgba(47, 58, 39, 0.25)",
                  }}
                >
                  <span>{t("nav.myDashboard", "Dashboard")} ({currentUserRole.replace("_", " ")})</span>
                  <ArrowRight size={14} />
                </Link>
                <button
                  onClick={() => {
                    clearSession();
                    setCurrentUserRole(null);
                    setCurrentUserName("");
                    router.push("/");
                  }}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "999px",
                    border: "1.5px solid var(--vegito-border, #d6cebf)",
                    background: "var(--vegito-surface, #ffffff)",
                    color: "var(--vegito-text, #57534e)",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {t("nav.logout", "Logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  style={{
                    padding: "8px 18px",
                    borderRadius: "999px",
                    border: "1.5px solid var(--vegito-border, #d6cebf)",
                    color: "var(--vegito-text, #2f3a27)",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    textDecoration: "none",
                    backgroundColor: "var(--vegito-surface, #ffffff)",
                    transition: "border-color 0.15s",
                  }}
                >
                  {t("nav.login", "Login")}
                </Link>
                <Link
                  href="/auth/register"
                  style={{
                    padding: "9px 22px",
                    borderRadius: "999px",
                    background: "var(--vegito-primary, #2f3a27)",
                    color: "#ffffff",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    textDecoration: "none",
                    boxShadow: "0 2px 8px rgba(47, 58, 39, 0.25)",
                  }}
                >
                  {t("nav.register", "Get Started")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO SECTION (EDITORIAL ORGANIC STYLE) ────────────── */}
      <section
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "54px 28px 48px",
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: "48px",
          alignItems: "center",
        }}
        className="home-hero-grid"
      >
        {/* Left Editorial Copy */}
        <div>
          {/* "70% Fresh - Direct to You" badge from Mockup */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 16px",
              borderRadius: "999px",
              background: "#e8ede2",
              color: "#2f3a27",
              fontSize: "12.5px",
              fontWeight: 800,
              marginBottom: "20px",
              letterSpacing: "0.4px",
              border: "1px solid #d5decb",
            }}
          >
            <span>🍃</span>
            <span>70% Fresh · Direct to You.</span>
          </div>

          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(36px, 4.8vw, 58px)",
              fontWeight: 800,
              color: "var(--vegito-text, #222c1d)",
              lineHeight: 1.15,
              letterSpacing: "-1px",
              margin: "0 0 18px",
            }}
          >
            Vegito — Farm-Fresh,<br />
            Direct to You.
          </h1>

          <p
            style={{
              fontSize: "16.5px",
              color: "var(--vegito-muted, #57534e)",
              lineHeight: 1.65,
              margin: "0 0 28px",
              maxWidth: "500px",
            }}
          >
            Curated Local Produce, Artisan Goods &amp; Sustainable Practices. Straight from Solapur farmers to your doorstep in minutes.
          </p>

          {/* Search bar */}
          <form
            onSubmit={submitSearch}
            style={{
              display: "flex",
              maxWidth: "480px",
              marginBottom: "26px",
              boxShadow: "0 4px 20px rgba(47, 58, 39, 0.08)",
              borderRadius: "999px",
              overflow: "hidden",
              border: "1.5px solid var(--vegito-border, #ded5c5)",
              background: "var(--vegito-surface, #ffffff)",
            }}
          >
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 20px",
              }}
            >
              <Search size={18} color="#78716c" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search heirloom tomatoes, greens, potatoes..."
                style={{
                  border: "none",
                  outline: "none",
                  fontSize: "14px",
                  color: "var(--vegito-text, #222c1d)",
                  width: "100%",
                  background: "transparent",
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                padding: "12px 24px",
                background: "#2f3a27",
                color: "#ffffff",
                border: "none",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              Search <ArrowRight size={15} />
            </button>
          </form>

          {/* CTA & 3 Feature Badges */}
          <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap", marginBottom: "32px" }}>
            <Link
              href="#gallery"
              style={{
                padding: "13px 28px",
                background: "#2f3a27",
                color: "#ffffff",
                borderRadius: "999px",
                fontSize: "14.5px",
                fontWeight: 800,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 6px 20px rgba(47, 58, 39, 0.25)",
              }}
            >
              Shop Now <ArrowRight size={16} />
            </Link>
            <Link
              href="/categories"
              style={{
                padding: "13px 26px",
                background: "#ffffff",
                color: "#2f3a27",
                border: "1.5px solid #d5ccbe",
                borderRadius: "999px",
                fontSize: "14.5px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Explore Harvest
            </Link>
          </div>

          {/* 3 Inline Feature Badges from Mockup */}
          <div
            style={{
              display: "flex",
              gap: "20px",
              flexWrap: "wrap",
              paddingTop: "18px",
              borderTop: "1px solid #ede5d8",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 700, color: "#44403c" }}>
              <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#e8ede2", display: "flex", alignItems: "center", justifyContent: "center", color: "#2f3a27" }}>
                🌿
              </div>
              <span>Fresh &amp; Natural</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 700, color: "#44403c" }}>
              <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284c7" }}>
                🚚
              </div>
              <span>Fast Delivery</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 700, color: "#44403c" }}>
              <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", color: "#d97706" }}>
                🛡️
              </div>
              <span>Secure Payment</span>
            </div>
          </div>
        </div>

        {/* Right Editorial Hero Image: Rustic Harvest Crate */}
        <div style={{ position: "relative" }}>
          <div
            style={{
              borderRadius: "28px",
              overflow: "hidden",
              boxShadow: "0 20px 48px rgba(47, 58, 39, 0.18)",
              position: "relative",
              aspectRatio: "4/3",
              background: "#2f3a27",
            }}
          >
            {/* Rustic vegetable crate photo */}
            <img
              src="https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=1000&auto=format&fit=crop&q=80"
              alt="Harvest Crate"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                filter: "brightness(0.95)",
              }}
            />

            {/* Gradient Overlay for warm contrast */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to top, rgba(34, 44, 29, 0.7) 0%, rgba(34, 44, 29, 0.05) 60%)",
              }}
            />

            {/* Floating Rustic Badge */}
            <div
              style={{
                position: "absolute",
                bottom: "20px",
                left: "20px",
                right: "20px",
                background: "rgba(251, 248, 242, 0.95)",
                backdropFilter: "blur(8px)",
                borderRadius: "16px",
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: "11px", fontWeight: 800, color: "#2f3a27", textTransform: "uppercase", letterSpacing: "1px" }}>
                  MORNING HARVEST CRATE
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "14px", fontWeight: 800, color: "#222c1d" }}>
                  Heirloom Vegetables &amp; Artichokes
                </p>
              </div>
              <div
                style={{
                  background: "#2f3a27",
                  color: "#ffffff",
                  fontSize: "11.5px",
                  fontWeight: 800,
                  padding: "5px 12px",
                  borderRadius: "999px",
                }}
              >
                100% Organic
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ARTISAN VEGETABLE GALLERY (MOCKUP TOP RIGHT 3x2) ─────── */}
      <section
        id="gallery"
        style={{
          maxWidth: "1280px",
          margin: "40px auto 60px",
          padding: "0 28px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: "32px",
            flexWrap: "wrap",
            gap: "16px",
            borderBottom: "1px solid #ede5d8",
            paddingBottom: "18px",
          }}
        >
          <div>
            <span
              style={{
                color: "#2f3a27",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "1.2px",
                textTransform: "uppercase",
              }}
            >
              CURATED PRODUCE
            </span>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(28px, 3.4vw, 40px)",
                fontWeight: 800,
                color: "#222c1d",
                margin: "4px 0 0",
                letterSpacing: "-0.5px",
              }}
            >
              Vegetable Gallery
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#78716c" }}>
              Hand-picked on earthen plates, cleaned, and brought fresh every dawn from local farmers
            </p>
          </div>
          <Link
            href="/categories"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 20px",
              backgroundColor: "#ffffff",
              border: "1.5px solid #d5ccbe",
              borderRadius: "999px",
              color: "#2f3a27",
              fontWeight: 700,
              fontSize: "13px",
              textDecoration: "none",
            }}
          >
            View Full Harvest Catalog <ChevronRight size={16} />
          </Link>
        </div>

        {/* 3x2 Ceramic Plate Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "24px",
          }}
          className="artisan-gallery-grid"
        >
          {ARTISAN_GALLERY_ITEMS.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "20px",
                border: "1px solid #e8e2d5",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 4px 16px rgba(47, 58, 39, 0.05)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
            >
              {/* Image with Earthen Plate presentation */}
              <div
                style={{
                  height: "210px",
                  backgroundColor: "#f7f4ed",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    transition: "transform 0.3s ease",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    top: "12px",
                    left: "12px",
                    padding: "4px 10px",
                    borderRadius: "999px",
                    backgroundColor: "rgba(251, 248, 242, 0.92)",
                    backdropFilter: "blur(4px)",
                    fontSize: "11px",
                    fontWeight: 800,
                    color: "#2f3a27",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                  }}
                >
                  🌿 {item.tag}
                </span>
                <span
                  style={{
                    position: "absolute",
                    bottom: "10px",
                    right: "12px",
                    padding: "3px 9px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(34, 44, 29, 0.82)",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  {item.unit}
                </span>
              </div>

              {/* Card Body */}
              <div style={{ padding: "18px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ marginBottom: "12px" }}>
                  <h3
                    style={{
                      margin: "0 0 3px",
                      fontSize: "16px",
                      fontWeight: 800,
                      color: "#222c1d",
                      fontFamily: "'Playfair Display', Georgia, serif",
                    }}
                  >
                    {item.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "#78716c" }}>
                    {item.subtitle} · <span style={{ color: "#2f3a27", fontWeight: 600 }}>{item.farm}</span>
                  </p>
                </div>

                <div
                  style={{
                    marginTop: "auto",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: "12px",
                    borderTop: "1px solid #f2ece1",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "18px", fontWeight: 900, color: "#222c1d" }}>
                      ₹{item.price}
                    </span>
                    <span style={{ fontSize: "12px", color: "#78716c" }}>/{item.unit}</span>
                  </div>

                  <button
                    onClick={() => handleGalleryAdd(item)}
                    disabled={addToCartMutation.isPending}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 16px",
                      borderRadius: "999px",
                      backgroundColor: "#2f3a27",
                      color: "#ffffff",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(47, 58, 39, 0.2)",
                    }}
                  >
                    <ShoppingCart size={13} />
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TODAY'S LIVE MARKETPLACE (REAL BACKEND PRODUCE) ─────── */}
      <section
        id="harvest"
        style={{
          maxWidth: "1280px",
          margin: "0 auto 70px",
          padding: "0 28px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: "28px",
            flexWrap: "wrap",
            gap: "14px",
            borderBottom: "1px solid #ede5d8",
            paddingBottom: "18px",
          }}
        >
          <div>
            <span
              style={{
                color: "#2f3a27",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "1.2px",
                textTransform: "uppercase",
              }}
            >
              TODAY'S HARVEST
            </span>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(26px, 3.2vw, 36px)",
                fontWeight: 800,
                color: "#222c1d",
                margin: "4px 0 0",
              }}
            >
              Direct Farmer Inventory
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "13.5px", color: "#78716c" }}>
              Live pricing set by verified Solapur farmers with 100% price transparency
            </p>
          </div>
          <Link
            href="/categories"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 18px",
              backgroundColor: "#2f3a27",
              borderRadius: "999px",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "13px",
              textDecoration: "none",
            }}
          >
            Browse All <ChevronRight size={15} />
          </Link>
        </div>

        {/* Live Product Cards */}
        {products.isLoading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#78716c" }}>
            Loading live farm inventory...
          </div>
        ) : (products.data?.items?.length ?? 0) === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px",
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              border: "1px solid #ede5d8",
              color: "#78716c",
            }}
          >
            Vegetables are currently being harvested. Check back in a few minutes!
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "22px",
            }}
          >
            {products.data?.items?.map((item) => {
              const offer = item.seller_products?.[0];
              const sellerName = offer?.seller_business_name || "Green Farm Store";
              const sellerRating = Number(offer?.seller_rating || 4.8).toFixed(1);
              const price = offer?.price ? Number(offer.price) : Number(item.min_price || 40);
              const isAvailable = offer?.is_available !== false && item.is_in_stock;

              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "20px",
                    border: "1px solid #e8e2d5",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 2px 10px rgba(47, 58, 39, 0.04)",
                  }}
                >
                  <div
                    style={{
                      height: "170px",
                      backgroundColor: "#f7f4ed",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {item.images?.[0]?.image_url ? (
                      <img
                        src={item.images[0].image_url}
                        alt={item.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "56px",
                        }}
                      >
                        🥬
                      </div>
                    )}
                    <span
                      style={{
                        position: "absolute",
                        top: "10px",
                        left: "10px",
                        padding: "3px 9px",
                        borderRadius: "999px",
                        backgroundColor: "rgba(251, 248, 242, 0.92)",
                        fontSize: "11px",
                        fontWeight: 800,
                        color: "#2f3a27",
                      }}
                    >
                      🌱 Solapur Fresh
                    </span>
                  </div>

                  <div style={{ padding: "18px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <h3
                      style={{
                        margin: "0 0 3px",
                        fontSize: "16px",
                        fontWeight: 800,
                        color: "#222c1d",
                        fontFamily: "'Playfair Display', Georgia, serif",
                      }}
                    >
                      {item.name}
                    </h3>
                    <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#78716c" }}>
                      Unit: {item.unit || "1 KG"}
                    </p>

                    {/* Seller Transparency info */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginBottom: "14px",
                        fontSize: "12px",
                        color: "#222c1d",
                        backgroundColor: "#fbf8f2",
                        padding: "6px 10px",
                        borderRadius: "8px",
                        border: "1px solid #ede5d8",
                      }}
                    >
                      <Store size={13} color="#2f3a27" />
                      <span style={{ fontWeight: 700 }}>{sellerName}</span>
                      <span style={{ color: "#d97706", fontWeight: 800, marginLeft: "auto" }}>
                        ★ {sellerRating}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: "auto",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingTop: "12px",
                        borderTop: "1px solid #f2ece1",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: "18px", fontWeight: 900, color: "#222c1d" }}>
                          ₹{price.toFixed(0)}
                        </span>
                        <span style={{ fontSize: "12px", color: "#78716c" }}>/{item.unit || "kg"}</span>
                      </div>

                      <button
                        onClick={() => handleAddToCart(item)}
                        disabled={!isAvailable || addToCartMutation.isPending}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 16px",
                          borderRadius: "999px",
                          backgroundColor: isAvailable ? "#2f3a27" : "#d6cebf",
                          color: "#ffffff",
                          fontSize: "12.5px",
                          fontWeight: 700,
                          border: "none",
                          cursor: isAvailable ? "pointer" : "not-allowed",
                        }}
                      >
                        <ShoppingCart size={13} />
                        {isAvailable ? "Add" : "Sold Out"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 4 ROLE DASHBOARDS SHOWCASE (MATCHING MOCKUP SCREENS 1,2,3,4) ─── */}
      <section
        id="dashboards"
        style={{
          backgroundColor: "#f2ece1",
          borderTop: "1px solid #e5dcce",
          borderBottom: "1px solid #e5dcce",
          padding: "64px 28px",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <span
              style={{
                color: "#2f3a27",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "1.2px",
                textTransform: "uppercase",
              }}
            >
              INTEGRATED PLATFORM
            </span>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(28px, 3.4vw, 42px)",
                fontWeight: 800,
                color: "#222c1d",
                margin: "6px 0 10px",
                letterSpacing: "-0.5px",
              }}
            >
              Unified Ecosystem Dashboards
            </h2>
            <p style={{ color: "#78716c", fontSize: "15px", margin: 0, maxWidth: "560px", marginInline: "auto" }}>
              Tailored high-performance operations workspaces for Customers, Sellers, Delivery Fleet, and Platform Operations.
            </p>
          </div>

          {/* 4 Dashboard Preview Cards Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "20px",
            }}
            className="home-dashboards-grid"
          >
            {/* 1. Customer Dashboard Card */}
            <div
              onClick={(e) => handleLaunchDashboard("customer", e)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") handleLaunchDashboard("customer", e as any); }}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "20px",
                border: "1.5px solid #d1fae5",
                padding: "24px",
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 6px 20px rgba(6, 78, 59, 0.06)",
                transition: "transform 0.2s, box-shadow 0.2s",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 12px",
                    borderRadius: "999px",
                    backgroundColor: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    color: "#065f46",
                    fontSize: "12px",
                    fontWeight: 800,
                  }}
                >
                  👤 Customer
                </span>
                <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#059669" }}>
                  Active Order
                </span>
              </div>

              <h3
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  margin: "0 0 8px",
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#064e3b",
                }}
              >
                Customer Portal
              </h3>
              <p style={{ margin: "0 0 16px", fontSize: "12.5px", color: "#64748b", lineHeight: 1.5 }}>
                Sales &amp; Velocity wave chart, doorstep GPS live tracking, fresh catalog, and 1-click reorder.
              </p>

              <div
                style={{
                  marginTop: "auto",
                  backgroundColor: "#f0fdf4",
                  borderRadius: "12px",
                  padding: "12px",
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "8px",
                  marginBottom: "16px",
                  fontSize: "11.5px",
                }}
              >
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Total Orders</span>
                  <strong style={{ color: "#065f46", fontSize: "14px" }}>5</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Delivered</span>
                  <strong style={{ color: "#059669", fontSize: "14px" }}>3</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Out for Delivery</span>
                  <strong style={{ color: "#d97706", fontSize: "14px" }}>1</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Cancelled</span>
                  <strong style={{ color: "#dc2626", fontSize: "14px" }}>1</strong>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#059669", fontWeight: 800, fontSize: "13px" }}>
                <span>Launch Customer Dashboard</span>
                <ArrowRight size={14} />
              </div>
            </div>

            {/* 2. Seller Dashboard Card */}
            <div
              onClick={(e) => handleLaunchDashboard("seller", e)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") handleLaunchDashboard("seller", e as any); }}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "20px",
                border: "1.5px solid #fed7aa",
                padding: "24px",
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 6px 20px rgba(194, 65, 12, 0.06)",
                transition: "transform 0.2s, box-shadow 0.2s",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 12px",
                    borderRadius: "999px",
                    backgroundColor: "#fff7ed",
                    border: "1px solid #fed7aa",
                    color: "#c2410c",
                    fontSize: "12px",
                    fontWeight: 800,
                  }}
                >
                  🏪 Seller
                </span>
                <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#ea580c" }}>
                  Verified
                </span>
              </div>

              <h3
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  margin: "0 0 8px",
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#9a3412",
                }}
              >
                Seller Central
              </h3>
              <p style={{ margin: "0 0 16px", fontSize: "12.5px", color: "#64748b", lineHeight: 1.5 }}>
                Warm terracotta analytics, Sales Overview area chart, Order Status donut (26 orders), and harvest management.
              </p>

              <div
                style={{
                  marginTop: "auto",
                  backgroundColor: "#fff7ed",
                  borderRadius: "12px",
                  padding: "12px",
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "8px",
                  marginBottom: "16px",
                  fontSize: "11.5px",
                }}
              >
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Total Orders</span>
                  <strong style={{ color: "#9a3412", fontSize: "14px" }}>24</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Total Sales</span>
                  <strong style={{ color: "#c2410c", fontSize: "14px" }}>₹13,480</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Products</span>
                  <strong style={{ color: "#9a3412", fontSize: "14px" }}>18</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Pending</span>
                  <strong style={{ color: "#ea580c", fontSize: "14px" }}>5</strong>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#ea580c", fontWeight: 800, fontSize: "13px" }}>
                <span>Launch Seller Portal</span>
                <ArrowRight size={14} />
              </div>
            </div>

            {/* 3. Delivery Partner Dashboard Card */}
            <div
              onClick={(e) => handleLaunchDashboard("delivery", e)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") handleLaunchDashboard("delivery", e as any); }}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "20px",
                border: "1.5px solid #bfdbfe",
                padding: "24px",
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 6px 20px rgba(29, 78, 216, 0.06)",
                transition: "transform 0.2s, box-shadow 0.2s",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 12px",
                    borderRadius: "999px",
                    backgroundColor: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    color: "#1d4ed8",
                    fontSize: "12px",
                    fontWeight: 800,
                  }}
                >
                  🚚 Delivery
                </span>
                <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#2563eb" }}>
                  Online · GPS
                </span>
              </div>

              <h3
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  margin: "0 0 8px",
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#1e3a8a",
                }}
              >
                Delivery Fleet
              </h3>
              <p style={{ margin: "0 0 16px", fontSize: "12.5px", color: "#64748b", lineHeight: 1.5 }}>
                Royal cobalt blue theme, real-time Mapbox route card, live GPS telemetry, call customer, and OTP verification.
              </p>

              <div
                style={{
                  marginTop: "auto",
                  backgroundColor: "#eff6ff",
                  borderRadius: "12px",
                  padding: "12px",
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "8px",
                  marginBottom: "16px",
                  fontSize: "11.5px",
                }}
              >
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Today&apos;s Deliveries</span>
                  <strong style={{ color: "#1e3a8a", fontSize: "14px" }}>8</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Earnings</span>
                  <strong style={{ color: "#2563eb", fontSize: "14px" }}>₹3,240</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Active Delivery</span>
                  <strong style={{ color: "#0284c7", fontSize: "14px" }}>1</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Delivered</span>
                  <strong style={{ color: "#16a34a", fontSize: "14px" }}>7</strong>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#2563eb", fontWeight: 800, fontSize: "13px" }}>
                <span>Launch Fleet Dashboard</span>
                <ArrowRight size={14} />
              </div>
            </div>

            {/* 4. Operations Admin Dashboard Card */}
            <div
              onClick={(e) => handleLaunchDashboard("admin", e)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") handleLaunchDashboard("admin", e as any); }}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "20px",
                border: "1.5px solid #ddd6fe",
                padding: "24px",
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 6px 20px rgba(109, 40, 217, 0.06)",
                transition: "transform 0.2s, box-shadow 0.2s",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 12px",
                    borderRadius: "999px",
                    backgroundColor: "#f5f3ff",
                    border: "1px solid #ddd6fe",
                    color: "#6d28d9",
                    fontSize: "12px",
                    fontWeight: 800,
                  }}
                >
                  🛡️ Admin
                </span>
                <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#7c3aed" }}>
                  Solapur HQ
                </span>
              </div>

              <h3
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  margin: "0 0 8px",
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#4c1d95",
                }}
              >
                Operations Command
              </h3>
              <p style={{ margin: "0 0 16px", fontSize: "12.5px", color: "#64748b", lineHeight: 1.5 }}>
                Slate charcoal &amp; lavender theme, smooth purple revenue line chart, city fleet map, and vendor controls.
              </p>

              <div
                style={{
                  marginTop: "auto",
                  backgroundColor: "#f5f3ff",
                  borderRadius: "12px",
                  padding: "12px",
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "8px",
                  marginBottom: "16px",
                  fontSize: "11.5px",
                }}
              >
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Total Orders</span>
                  <strong style={{ color: "#4c1d95", fontSize: "14px" }}>124</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Total Revenue</span>
                  <strong style={{ color: "#7c3aed", fontSize: "14px" }}>₹48,220</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Customers</span>
                  <strong style={{ color: "#4c1d95", fontSize: "14px" }}>86</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Active Sellers</span>
                  <strong style={{ color: "#6d28d9", fontSize: "14px" }}>3</strong>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#7c3aed", fontWeight: 800, fontSize: "13px" }}>
                <span>Launch Admin Command</span>
                <ArrowRight size={14} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ABOUT / FARMER IMPACT SECTION ──────────────────────── */}
      <section
        id="about"
        style={{
          backgroundColor: "#242e1f",
          color: "#ffffff",
          padding: "70px 28px",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "54px",
            alignItems: "center",
          }}
          className="home-about-grid"
        >
          <div>
            <span
              style={{
                color: "#86efac",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "1.2px",
                textTransform: "uppercase",
              }}
            >
              SUSTAINABLE IMPACT
            </span>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(30px, 3.8vw, 42px)",
                fontWeight: 800,
                color: "#ffffff",
                margin: "10px 0 18px",
                lineHeight: 1.2,
              }}
            >
              Direct Fair Pricing for Solapur Vegetable Farmers
            </h2>
            <p style={{ fontSize: "15.5px", color: "#d6d3d1", lineHeight: 1.75, margin: "0 0 28px" }}>
              Traditional vegetable wholesale markets charge up to 45% in commissions and middleman margins.
              Vegito provides verified local farmers with direct catalog autonomy and fair, guaranteed pricing — delivering morning-harvested crops directly into household kitchens within hours.
            </p>
            <div style={{ display: "flex", gap: "32px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "32px", fontWeight: 900, color: "#86efac", fontFamily: "'Playfair Display', Georgia, serif" }}>
                  100%
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#a8a29e" }}>
                  Transparent Farmer Pricing
                </p>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "32px", fontWeight: 900, color: "#86efac", fontFamily: "'Playfair Display', Georgia, serif" }}>
                  &lt; 30 min
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#a8a29e" }}>
                  Express Doorstep Delivery
                </p>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "32px", fontWeight: 900, color: "#86efac", fontFamily: "'Playfair Display', Georgia, serif" }}>
                  0%
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#a8a29e" }}>
                  Hidden Middleman Cuts
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "24px",
              padding: "36px",
            }}
          >
            <h3
              style={{
                margin: "0 0 20px",
                fontSize: "20px",
                fontWeight: 800,
                color: "#ffffff",
                fontFamily: "'Playfair Display', Georgia, serif",
              }}
            >
              The Vegito Promise
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "14.5px", color: "#e7e5e4" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <CheckCircle2 size={20} color="#86efac" style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>Harvested fresh at dawn from certified pesticide-conscious local farms</span>
              </div>
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <CheckCircle2 size={20} color="#86efac" style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>Real-time GPS delivery tracking with doorstep OTP security verification</span>
              </div>
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <CheckCircle2 size={20} color="#86efac" style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>Every rupee goes directly to local farming families and verified couriers</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer
        style={{
          background: "#192215",
          color: "rgba(255, 255, 255, 0.7)",
          padding: "54px 28px 30px",
          fontSize: "13.5px",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: "40px",
            marginBottom: "40px",
          }}
          className="home-footer-grid"
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  background: "#2f3a27",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
              >
                🍃
              </div>
              <span
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "22px",
                  fontWeight: 800,
                  color: "#ffffff",
                }}
              >
                Vegito
              </span>
            </div>
            <p style={{ margin: 0, lineHeight: 1.7, maxWidth: "340px", color: "#a8a29e" }}>
              Fresh Vegetables Directly From Local Farmers to Your Doorstep. Operating across Solapur, Maharashtra with zero middleman exploitation.
            </p>
          </div>

          <div>
            <h4 style={{ margin: "0 0 14px", color: "#ffffff", fontSize: "14px", fontWeight: 800 }}>
              Shop Produce
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
              <Link href="/categories" style={{ color: "inherit", textDecoration: "none" }}>All Vegetables</Link>
              <Link href="/customer/cart" style={{ color: "inherit", textDecoration: "none" }}>My Cart</Link>
              <Link href="/customer/orders" style={{ color: "inherit", textDecoration: "none" }}>Track Order</Link>
            </div>
          </div>

          <div>
            <h4 style={{ margin: "0 0 14px", color: "#ffffff", fontSize: "14px", fontWeight: 800 }}>
              Partner Portals
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
              <Link href="/seller" style={{ color: "inherit", textDecoration: "none" }}>Seller Central</Link>
              <Link href="/delivery" style={{ color: "inherit", textDecoration: "none" }}>Delivery Fleet</Link>
              <Link href="/admin" style={{ color: "inherit", textDecoration: "none" }}>Operations Admin</Link>
            </div>
          </div>

          <div>
            <h4 style={{ margin: "0 0 14px", color: "#ffffff", fontSize: "14px", fontWeight: 800 }}>
              Solapur Hub
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "9px", color: "#a8a29e" }}>
              <span>📞 +91 93094 24359</span>
              <span>📍 Solapur, Maharashtra 413001</span>
              <span>✉️ support@vegito.in</span>
            </div>
          </div>
        </div>

        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            paddingTop: "24px",
            textAlign: "center",
            color: "#78716c",
            fontSize: "12.5px",
          }}
        >
          © 2025 Vegito Platform · Farm-Fresh Vegetables with 100% Price Transparency. All Rights Reserved.
        </div>
      </footer>

      {/* Responsive adjustments */}
      <style>{`
        .mobile-welcome-screen { display: none; }

        @media (max-width: 640px) {
          .mobile-welcome-screen {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            background: #ffffff;
            position: fixed;
            inset: 0;
            z-index: 1000;
            padding: calc(env(safe-area-inset-top) + 20px) 24px calc(env(safe-area-inset-bottom) + 24px);
            overflow-y: auto;
          }

          .mobile-welcome-top {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .mobile-welcome-brand {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            margin-bottom: 24px;
          }

          .mobile-logo-group {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #176b3a;
          }

          .mobile-logo-text {
            font-size: 34px;
            font-weight: 800;
            letter-spacing: -1.5px;
            font-family: "Plus Jakarta Sans", sans-serif;
          }

          .mobile-tagline {
            font-size: 14px;
            color: #62746a;
            font-weight: 500;
          }

          .mobile-hero-container {
            position: relative;
            width: 100%;
            max-width: 320px;
            margin: 20px 0;
            display: flex;
            justify-content: center;
          }

          .mobile-hero-img {
            width: 100%;
            height: auto;
            object-fit: contain;
            position: relative;
            z-index: 2;
          }

          .mobile-hero-blob {
            position: absolute;
            width: 200px;
            height: 200px;
            background: #e9f6ee;
            border-radius: 50%;
            filter: blur(40px);
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1;
          }

          .mobile-content-group {
            text-align: center;
            margin-bottom: 24px;
          }

          .mobile-title {
            font-size: 28px !important;
            line-height: 1.1 !important;
            font-weight: 800 !important;
            color: #063c32;
            margin-bottom: 12px;
          }

          .mobile-description {
            font-size: 15px;
            color: #62746a;
            max-width: 280px;
            line-height: 1.5;
          }

          .mobile-features-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            width: 100%;
            gap: 12px;
            margin-bottom: 24px;
          }

          .mobile-feature-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 8px;
          }

          .mobile-feature-icon {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: #f0fdf4;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #16a34a;
            border: 1px solid #dcfce7;
          }

          .mobile-feature-item span {
            font-size: 11px;
            font-weight: 600;
            color: #12221e;
            line-height: 1.2;
          }

          .mobile-progress-dots {
            display: flex;
            gap: 8px;
            margin-bottom: 20px;
          }

          .mobile-progress-dots .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #e2e8f0;
          }

          .mobile-progress-dots .dot.active {
            background: #16a34a;
          }

          .mobile-welcome-footer {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .mobile-cta-btn {
            width: 100%;
            height: 54px;
            background: #176b3a;
            color: #ffffff;
            border-radius: 100px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            font-size: 16px;
            font-weight: 700;
            text-decoration: none;
            box-shadow: 0 10px 20px rgba(23, 107, 58, 0.2);
          }

          .mobile-login-hint {
            font-size: 13px;
            color: #62746a;
            text-align: center;
          }

          .mobile-login-hint a {
            color: #176b3a;
            font-weight: 700;
            text-decoration: none;
          }
        }

        @media (max-width: 1024px) {
          .home-hero-grid {
            grid-template-columns: 1fr !important;
          }
          .artisan-gallery-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .home-dashboards-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .home-about-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .artisan-gallery-grid {
            grid-template-columns: 1fr !important;
          }
          .home-dashboards-grid {
            grid-template-columns: 1fr !important;
          }
          .home-nav-links {
            display: none !important;
          }
          .home-footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
