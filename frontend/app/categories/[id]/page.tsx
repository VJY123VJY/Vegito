"use client";
import { use } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getCategory } from "@/lib/api/categories";
import { getProducts } from "@/lib/api/products";
import { ProductCard } from "@/components/product/product-card";
function CategoryContent({ params }: { params: Promise<{ id: string }> }) {
	const { id: shellId } = use(params);
	const searchParams = useSearchParams();
	const id = searchParams?.get("id") ?? shellId;
	const category = useQuery({ queryKey: ["category", id], queryFn: () => getCategory(id), enabled: id !== "_" });
	const products = useQuery({
		queryKey: ["products", "category", id],
		queryFn: () => getProducts({ categoryId: Number(id), pageSize: 100 }),
		enabled: !!category.data,
	});

	const items = products.data?.items ?? [];

	return (
		<main className="simple-page">
			<p className="section-kicker">MARKET CATEGORY</p>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
				<h1 style={{ margin: 0 }}>{category.data?.name ?? "Loading category…"}</h1>
				{items.length > 0 && (
					<span style={{ fontSize: "13px", fontWeight: 700, backgroundColor: "#dcfce7", color: "#15803d", padding: "4px 12px", borderRadius: "12px" }}>
						{items.length} Fresh Items
					</span>
				)}
			</div>
			{category.data?.description && (
				<p style={{ color: "#6b7280", fontSize: "14px", marginTop: "-8px", marginBottom: "20px" }}>
					{category.data.description}
				</p>
			)}
			{products.isLoading ? (
				<p className="helper">Loading fresh market listings…</p>
			) : products.isError ? (
				<p className="inline-message">Products are unavailable right now.</p>
			) : items.length === 0 ? (
				<div style={{ textAlign: "center", padding: "60px 20px", backgroundColor: "#ffffff", borderRadius: "16px", border: "1px dashed #d1d5db" }}>
					<p style={{ fontSize: "16px", fontWeight: 700, color: "#374151" }}>No products available in this category</p>
					<span style={{ fontSize: "13px", color: "#6b7280" }}>Check back soon as local mandi farmers add daily fresh harvests.</span>
				</div>
			) : (
				<div className="product-grid results-grid">
					{items.map((product) => (
						<ProductCard key={product.id} product={product} />
					))}
				</div>
			)}
		</main>
	);
}
export default function CategoryPage({ params }: { params: Promise<{ id: string }> }) { return <Suspense fallback={<main className="simple-page"><p className="helper">Loading category…</p></main>}><CategoryContent params={params} /></Suspense>; }
