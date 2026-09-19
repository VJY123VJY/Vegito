"use client";
import Link from "next/link";
import { Heart, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiProduct } from "@/lib/api/products";
import { addFavorite, listFavorites, removeFavorite, type Favorite } from "@/lib/api/favorites";
import { getStoredRole } from "@/lib/api/auth";
import { QuantitySelector } from "@/components/ui/quantity-selector";

const art: Record<string, string> = { tomato: "🍅", potato: "🥔", onion: "🧅", spinach: "🥬", banana: "🍌" };
export function ProductCard({ product, quantity = 0, onChange, onLoginRequired }: { product: ApiProduct; quantity?: number; onChange?: (amount: number) => void; onLoginRequired?: () => void }) {
  const client = useQueryClient();
  const role = getStoredRole();
  const favorites = useQuery({ queryKey: ["favorites"], queryFn: listFavorites, enabled: role === "CUSTOMER" });
  const isFavorite = favorites.data?.some((favorite) => favorite.product_id === product.id) ?? false;
  const favoriteMutation = useMutation<Favorite | boolean>({ mutationFn: () => isFavorite ? removeFavorite(product.id) : addFavorite(product.id), onSuccess: () => client.invalidateQueries({ queryKey: ["favorites"] }) });
  const offer = product.seller_products[0];
  const available = product.is_in_stock && product.min_price != null && !!offer;
  const price = product.min_price == null ? null : Number(product.min_price);
  const action = () => available ? onChange?.(1) : onLoginRequired?.();
  return <article className="product-card">
    <div className="product-image product-art"><Link href={`/products/_?id=${product.id}`} aria-label={`View ${product.name}`}><span aria-hidden="true">{art[product.name.toLowerCase()] ?? "🥕"}</span>{available ? <small className="fresh-tag">Fresh today</small> : <small className="fresh-tag muted-tag">Availability soon</small>}</Link><button type="button" className="heart" disabled={favoriteMutation.isPending} aria-label={isFavorite ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites`} onClick={() => { if (role !== "CUSTOMER") { onLoginRequired?.(); return; } favoriteMutation.mutate(); }}><Heart size={18} fill={isFavorite ? "currentColor" : "none"} /></button></div>
    <div className="product-info"><Link href={`/products/_?id=${product.id}`} className="product-name">{product.name}</Link><p className="unit">{offer?.seller_business_name ?? "Local seller"} · {product.unit}</p><div className="product-bottom"><p className="price">{price == null ? <b className="awaiting-price">Price soon</b> : <><b>₹{price}</b><span>/{product.unit}</span></>}</p>{available && quantity && onChange ? <QuantitySelector quantity={quantity} onChange={onChange} /> : <button className="add-button" disabled={!available} onClick={action}>{available ? <><Plus size={18} /> Add</> : "Unavailable"}</button>}</div></div>
  </article>;
}
