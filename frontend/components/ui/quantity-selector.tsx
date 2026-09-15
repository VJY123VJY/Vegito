"use client";
import { Minus, Plus } from "lucide-react";
export function QuantitySelector({ quantity, onChange }: { quantity: number; onChange: (next: number) => void }) {
  return <div className="quantity" aria-label="Quantity selector"><button aria-label="Decrease quantity" onClick={() => onChange(Math.max(0, quantity - 1))}><Minus size={18} /></button><span aria-live="polite">{quantity}</span><button aria-label="Increase quantity" onClick={() => onChange(quantity + 1)}><Plus size={18} /></button></div>;
}
