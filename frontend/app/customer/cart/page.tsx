"use client";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Trash2 } from "lucide-react";
import { getErrorMessage } from "@/lib/api/client";
import { getCart, removeCartItem, updateCartItem } from "@/lib/api/cart";

export default function CartPage() {
  const client = useQueryClient();
  const cart = useQuery({ queryKey: ["cart"], queryFn: getCart });
  const mutation = useMutation({ mutationFn: ({ id, quantity }: { id: number; quantity: number }) => quantity > 0 ? updateCartItem(id, quantity) : removeCartItem(id), onSuccess: () => client.invalidateQueries({ queryKey: ["cart"] }) });
  if (cart.isLoading) return <main className="simple-page"><p className="helper">Loading your basket…</p></main>;
  if (cart.isError) return <main className="simple-page"><h1>Your basket</h1><p className="inline-message">{getErrorMessage(cart.error)}</p><Link className="primary-action" href="/auth/customer">Log in to view basket</Link></main>;
  if (!cart.data) return <main className="simple-page"><p className="inline-message">Your basket is unavailable. Please try again.</p></main>;
  const data = cart.data;
  return <main className="simple-page cart-page"><h1>Your basket</h1>{data.items.length ? <><div className="cart-items">{data.items.map((item) => <div className="cart-item" key={item.id}><span className="mini-art">🥕</span><div><b>{item.product_name}</b><small>{item.unit} · ₹{Number(item.price_per_unit)} each</small></div><div className="cart-actions"><button disabled={mutation.isPending} onClick={() => mutation.mutate({ id: item.id, quantity: item.quantity - 1 })} aria-label="Decrease"><Minus size={17} /></button><span>{item.quantity}</span><button disabled={mutation.isPending} onClick={() => mutation.mutate({ id: item.id, quantity: item.quantity + 1 })} aria-label="Increase"><Plus size={17} /></button><button disabled={mutation.isPending} className="remove" onClick={() => mutation.mutate({ id: item.id, quantity: 0 })} aria-label="Remove"><Trash2 size={16} /></button></div></div>)}</div><aside className="cart-total"><span>Subtotal <b>₹{Number(data.subtotal)}</b></span><span>Delivery <b>₹{Number(data.delivery_charge)}</b></span><span>Discount <b>−₹{Number(data.discount_amount)}</b></span><strong>Total <b>₹{Number(data.total_amount)}</b></strong><Link className="primary-action" href="/customer/checkout">Proceed to checkout</Link></aside>{mutation.isError && <p className="form-error">{getErrorMessage(mutation.error)}</p>}</> : <div className="empty-inline"><b>Your basket is empty.</b><span>Let’s fill it with something fresh.</span><Link className="primary-action" href="/categories">Explore vegetables</Link></div>}</main>;
}
