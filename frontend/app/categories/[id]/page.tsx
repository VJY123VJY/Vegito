"use client";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCategory } from "@/lib/api/categories";
import { getProducts } from "@/lib/api/products";
import { ProductCard } from "@/components/product/product-card";
export default function CategoryPage({ params }: { params: Promise<{ id: string }> }) { const { id } = use(params); const category=useQuery({queryKey:["category",id],queryFn:()=>getCategory(id)});const products=useQuery({queryKey:["products","category",id],queryFn:()=>getProducts({categoryId:Number(id)}),enabled:!!category.data});return <main className="simple-page"><p className="section-kicker">CATEGORY</p><h1>{category.data?.name ?? "Loading category…"}</h1>{products.isLoading?<p className="helper">Loading listings…</p>:products.isError?<p className="inline-message">Products are unavailable right now.</p>:<div className="product-grid results-grid">{products.data?.items.map(p=><ProductCard key={p.id} product={p}/>)}</div>}</main> }
