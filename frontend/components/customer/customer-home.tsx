"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, MapPin, Search, Sparkles } from "lucide-react";
import { getCategories } from "@/lib/api/categories";
import { getProducts } from "@/lib/api/products";
import { getCart } from "@/lib/api/cart";
import { CustomerHeader } from "@/components/layout/customer-header";
import { CategoryCard } from "@/components/category/category-card";
import { ProductCard } from "@/components/product/product-card";
import { BottomNavigation } from "@/components/navigation/bottom-navigation";
import styles from "@/styles/customer-app.module.css";

export function CustomerHome() {
  const router = useRouter();
  const categories = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const products = useQuery({ queryKey: ["products", "home"], queryFn: () => getProducts({ pageSize: 8 }) });
  const cart = useQuery({ queryKey: ["cart"], queryFn: getCart });
  const items = products.data?.items ?? [];
  const basketCount = cart.data?.total_items_count ?? 0;
  return <main className={`app-shell compact-shop ${styles.shell}`}><CustomerHeader count={basketCount} />
    <section className="delivery-context"><MapPin size={17} /><span><small>DELIVERING TO</small><b>Home · Solapur, Maharashtra</b></span><span className="delivery-time">35–45 min</span></section>
    <Link href="/search" className="shop-search"><Search size={20} /><span>Search vegetables, fruits...</span><kbd>⌘ K</kbd></Link>
    <section className="content-section quick-section"><div className="section-head"><div><p className="section-kicker">START WITH THE BASICS</p><h2>What do you need?</h2></div><Link href="/categories" className="small-link">All categories <ChevronRight size={17} /></Link></div><div className="category-grid">{categories.isLoading ? <CategorySkeletons /> : categories.isError ? <p className="inline-message">Categories are unavailable right now.</p> : categories.data?.map((category) => <CategoryCard key={category.id} category={category} />)}</div></section>
    <section className="content-section fresh-section"><div className="section-head"><div><p className="section-kicker">MARKET UPDATE · TODAY</p><h2>Fresh today</h2></div><Link href="/categories" className="small-link">Browse all <ChevronRight size={17} /></Link></div><div className="source-note"><Sparkles size={15} /> These are the products currently listed by Vegito’s market network.</div>{products.isLoading ? <ProductSkeletons /> : products.isError ? <p className="inline-message">We couldn’t load the market right now. Please refresh and try again.</p> : items.length ? <div className="product-grid">{items.map((product) => <ProductCard key={product.id} product={product} onLoginRequired={() => router.push("/auth/customer")} />)}</div> : <div className="empty-inline"><b>Today’s market is getting ready.</b><span>Please check back shortly for fresh produce.</span></div>}</section>
    <section className="local-callout"><div><span>✦</span><p><b>From market to basket</b><br />See a vegetable, inspect its price, then add it when a local seller lists stock.</p></div><Link href="/search">Explore market <ChevronRight size={17} /></Link></section>
    <BottomNavigation basketCount={basketCount} />
  </main>;
}
function CategorySkeletons() { return <>{Array.from({ length: 4 }).map((_, index) => <div key={index} className="skeleton category-skeleton" />)}</>; }
function ProductSkeletons() { return <div className="product-grid">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="skeleton product-skeleton" />)}</div>; }
