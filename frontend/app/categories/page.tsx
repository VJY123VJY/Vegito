"use client";
import { useQuery } from "@tanstack/react-query";
import { getCategories } from "@/lib/api/categories";
import { CategoryCard } from "@/components/category/category-card";
export default function CategoriesPage(){const query=useQuery({queryKey:["categories"],queryFn:getCategories});return <main className="simple-page"><p className="section-kicker">SHOP BY TYPE</p><h1>Categories</h1>{query.isLoading?<p className="helper">Loading categories…</p>:query.isError?<p className="inline-message">Categories are unavailable right now.</p>:<div className="category-grid categories-list">{query.data?.map(c=><CategoryCard key={c.id} category={c}/>)}</div>}</main>}
