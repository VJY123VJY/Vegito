import Link from "next/link";
import type { ApiCategory } from "@/lib/api/categories";

const art: Record<string, string> = {
  Vegetables: "🥦",
  Fruits: "🍎",
  "Leafy Vegetables": "🥬",
  "Root Vegetables": "🥕",
  "Fruit Vegetables": "🍅",
  Gourds: "🥒",
  "Beans & Peas": "🫛",
  "Cruciferous Vegetables": "🥦",
  "Herbs & Fresh Greens": "🌿",
  "Specialty & Seasonal Vegetables": "🌽",
  "Citrus Fruits": "🍊",
  "Tropical Fruits": "🥭",
  Melons: "🍉",
  "Berries & Stone Fruits": "🍓",
  "Exotic Fruits": "🥝",
};

const tones: Record<string, string> = {
  Vegetables: "vegetables",
  Fruits: "fruits",
  "Leafy Vegetables": "leafy",
  "Root Vegetables": "roots",
  "Fruit Vegetables": "vegetables",
  Gourds: "leafy",
  "Beans & Peas": "leafy",
  "Cruciferous Vegetables": "vegetables",
  "Herbs & Fresh Greens": "leafy",
  "Specialty & Seasonal Vegetables": "roots",
  "Citrus Fruits": "fruits",
  "Tropical Fruits": "fruits",
  Melons: "fruits",
  "Berries & Stone Fruits": "fruits",
  "Exotic Fruits": "fruits",
};

export function CategoryCard({ category }: { category: ApiCategory }) {
  const emoji = art[category.name] ?? (category.name.toLowerCase().includes("fruit") ? "🍎" : "🥬");
  const tone = tones[category.name] ?? (category.name.toLowerCase().includes("fruit") ? "fruits" : "leafy");

  return (
    <Link href={`/categories/_?id=${category.id}`} className={`category-card ${tone}`}>
      <span className="category-art">{emoji}</span>
      <span>
        <b>{category.name}</b>
        <small>{category.description || "Fresh daily picks"}</small>
      </span>
    </Link>
  );
}
