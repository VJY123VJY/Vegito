"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { listOrders } from "@/lib/api/orders";
import { getErrorMessage } from "@/lib/api/client";

export default function OrdersPage() {
  const orders = useQuery({ queryKey: ["orders"], queryFn: () => listOrders() });
  if (orders.isLoading) return <main className="simple-page"><p className="helper">Loading your orders...</p></main>;
  if (orders.isError) return <main className="simple-page"><h1>Your orders</h1><p className="form-error">{getErrorMessage(orders.error)}</p></main>;
  const items = orders.data?.items ?? [];
  return <main className="simple-page"><p className="section-kicker">YOUR VEGITO HISTORY</p><h1>Your orders</h1>{items.length ? <div className="order-list">{items.map((order) => <Link href={`/customer/orders/${order.id}`} className="order-card" key={order.id}><span className="mini-art"><Package size={21} /></span><span><b>#{order.order_number}</b><small>{new Date(order.placed_at).toLocaleDateString()} · {order.items_count ?? 0} items</small></span><strong>{order.status.replaceAll("_", " ")}</strong><b>₹{Number(order.total_amount).toFixed(2)}</b></Link>)}</div> : <div className="empty-inline"><b>No orders yet.</b><span>Your first fresh delivery will appear here.</span><Link className="primary-action" href="/categories">Shop produce</Link></div>}</main>;
}
