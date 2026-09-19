import Link from "next/link";
import type { ApiCategory } from "@/lib/api/categories";
const art: Record<string, string> = { Vegetables: "🍅", Fruits: "🍌", "Leafy Vegetables": "🥬", "Root Vegetables": "🥕" };
const tones: Record<string, string> = { Vegetables: "vegetables", Fruits: "fruits", "Leafy Vegetables": "leafy", "Root Vegetables": "roots" };
export function CategoryCard({ category }: { category: ApiCategory }) { return <Link href={`/categories/_?id=${category.id}`} className={`category-card ${tones[category.name] ?? "leafy"}`}><span className="category-art">{art[category.name] ?? "🫛"}</span><span><b>{category.name.replace(" Vegetables", "")}</b><small>Explore picks</small></span></Link>; }
