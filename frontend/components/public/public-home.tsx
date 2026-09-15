"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, MapPin, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getCategories, type ApiCategory } from "@/lib/api/categories";
import { getProducts } from "@/lib/api/products";
import { ProductCard } from "@/components/product/product-card";
import styles from "@/styles/custom-landing.module.css";

function CategoryBentoCard({ category }: { category: ApiCategory }) {
  return <Link href={`/categories/${category.id}`} className={styles.categoryCard}>
    <span className={styles.categoryMeta}>{category.is_active ? "Live catalog" : "Unavailable"}</span>
    <span className={styles.categoryName}>{category.name}</span>
    <span className={styles.categoryDescription}>{category.description || "Category detail is available from the live catalog."}</span>
  </Link>;
}

export function PublicHome() {
  const router = useRouter();
  const [roleDrawer, setRoleDrawer] = useState(false);
  const [search, setSearch] = useState("");
  const categories = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const products = useQuery({ queryKey: ["products", "public"], queryFn: () => getProducts({ pageSize: 4 }) });
  const sortedCategories = [...(categories.data ?? [])].filter((category) => category.is_active !== false).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  const items = products.data?.items ?? [];

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    router.push(search.trim() ? `/search?search=${encodeURIComponent(search.trim())}` : "/search");
  }

  return <main className={styles.landing}>
    <header className={styles.nav}>
      <span aria-hidden="true" />
      <Link href="/" className={styles.logo}>vegito</Link>
      <div className={styles.navLinks}><Link className={styles.navLink} href="/categories">Explore</Link><Link className={styles.navLink} href="/how-it-works">How it works</Link><Link className={styles.navLink} href="/auth/seller">Become a seller</Link><Link className={styles.navLink} href="/auth/delivery">Deliver with us</Link></div>
      <div className={styles.navActions}><button type="button" className={styles.register} onClick={() => router.push("/auth/register")}>Register</button><button type="button" className={styles.login} onClick={() => setRoleDrawer((open) => !open)}>Log in <ArrowUpRight size={14} /></button></div>
      {roleDrawer ? <div className={styles.drawer}><p className={styles.drawerTitle}>Choose your login portal</p><div className={styles.drawerLinks}><Link href="/auth/customer">Customer</Link><Link href="/auth/seller">Seller / farmer</Link><Link href="/auth/delivery">Delivery partner</Link></div><Link className={styles.drawerRegister} href="/auth/register">New to Vegito? Register</Link></div> : null}
    </header>

    <section className={styles.hero}>
      <article className={styles.heroPrimary}><p className={styles.eyebrow}>SOLAPUR · LOCAL MARKET NETWORK</p><h1 className={styles.heroTitle}>Fresh vegetables,<br /><em>delivered simply.</em></h1><p className={styles.heroCopy}>Browse what participating local sellers have available today, with prices and stock confirmed by the live catalog.</p><form className={styles.search} onSubmit={submitSearch}><Search size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the live market" aria-label="Search the live market" /><button aria-label="Submit product search"><ArrowUpRight size={18} /></button></form></article>
      <aside className={styles.heroSide}><article className={styles.mapCard}><div className={styles.mapLabel}><small>Delivery coverage</small><strong>Solapur service area</strong></div><MapPin className={styles.mapPin} size={18} /><p className={styles.notConfigured}>Distance mapping becomes available when configured address coordinates are returned by the API.</p></article><article className={styles.insightCard}><span className={styles.insightLabel}>Live catalog signal</span>{products.isLoading ? <span className={styles.notConfigured}>Syncing listings...</span> : products.isError ? <span className={styles.notConfigured}>Listings unavailable</span> : <><strong className={styles.insightValue}>{products.data?.meta.total_items ?? 0} listings</strong><span className={styles.notConfigured}>Count returned by the product API</span></>}</article></aside>
    </section>

    <section className={styles.section}><div className={styles.sectionHead}><div><p className={styles.sectionKicker}>SHOP THE MARKET</p><h2 className={styles.sectionTitle}>Browse by category</h2></div><Link className={styles.sectionLink} href="/categories">View catalog <ArrowUpRight size={14} /></Link></div>{categories.isLoading ? <div className={styles.empty}>Loading categories from PostgreSQL...</div> : categories.isError ? <div className={styles.empty}>Categories are unavailable right now.</div> : sortedCategories.length ? <div className={styles.categoryGrid}>{sortedCategories.map((category) => <CategoryBentoCard category={category} key={category.id} />)}</div> : <div className={styles.empty}>No active categories were returned by the database.</div>}</section>

    <section className={styles.section}><div className={styles.sectionHead}><div><p className={styles.sectionKicker}>LIVE LISTINGS</p><h2 className={styles.sectionTitle}>Available now</h2></div><Sparkles className={styles.sparkle} size={18} /></div>{products.isLoading ? <div className={styles.empty}>Loading live listings...</div> : products.isError ? <div className={styles.empty}>The live product service is unavailable.</div> : items.length ? <div className={styles.products}>{items.map((product) => <div className={styles.productSlot} key={product.id}><ProductCard product={product} onLoginRequired={() => router.push("/auth/customer")} /></div>)}</div> : <div className={styles.empty}>No active product listings were returned.</div>}</section>

    <footer className={styles.audit} aria-label="Live platform status"><span>Catalog API {categories.isError ? "unavailable" : categories.isLoading ? "syncing" : "connected"}</span><span>Listings API {products.isError ? "unavailable" : products.isLoading ? "syncing" : "connected"}</span><span><ShieldCheck size={12} /> Session security handled by backend</span><span>Database metrics shown only when returned</span></footer>
  </main>;
}
