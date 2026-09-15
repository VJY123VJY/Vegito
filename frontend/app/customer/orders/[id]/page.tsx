"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, RotateCcw } from "lucide-react";
import { getOrder, reorder } from "@/lib/api/orders";
import { getErrorMessage } from "@/lib/api/client";

const steps = ["NEW", "ACCEPTED", "PACKING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"];

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id ?? "";
  const client = useQueryClient();
  const order = useQuery({ queryKey: ["order", orderId], queryFn: () => getOrder(orderId), enabled: Boolean(orderId), refetchInterval: (query) => query.state.data?.status === "DELIVERED" ? false : 15000 });
  const repeat = useMutation({ mutationFn: () => reorder(Number(orderId)), onSuccess: () => client.invalidateQueries({ queryKey: ["cart"] }) });
  if (order.isLoading) return <main className="simple-page"><p className="helper">Loading order...</p></main>;
  if (order.isError || !order.data) return <main className="simple-page"><Link className="back-link" href="/customer/orders"><ArrowLeft size={16} /> Orders</Link><p className="form-error">{order.isError ? getErrorMessage(order.error) : "Order not found."}</p></main>;
  const data = order.data;
  const currentIndex = steps.indexOf(data.status);
  return <main className="simple-page"><Link className="back-link" href="/customer/orders"><ArrowLeft size={16} /> Orders</Link><div className="order-title"><div><p className="section-kicker">ORDER DETAILS</p><h1>#{data.order_number}</h1></div><span className="status-badge">{data.status.replaceAll("_", " ")}</span></div>
    <section className="timeline">{steps.map((step, index) => <div className={index <= currentIndex ? "timeline-step active" : "timeline-step"} key={step}><span>{index <= currentIndex ? <Check size={14} /> : index + 1}</span><b>{step.replaceAll("_", " ")}</b></div>)}</section>
    <section className="checkout-panel"><p className="section-kicker">ITEMS</p>{data.items.map((item) => <div className="order-line" key={item.id}><span><b>{item.product_name}</b><small>{item.quantity} {item.unit} x ₹{Number(item.unit_price).toFixed(2)}</small></span><strong>₹{Number(item.subtotal).toFixed(2)}</strong></div>)}</section>
    <section className="cart-total"><span>Subtotal <b>₹{Number(data.subtotal).toFixed(2)}</b></span><span>Delivery <b>₹{Number(data.delivery_charge).toFixed(2)}</b></span><span>Discount <b>-₹{Number(data.discount_amount).toFixed(2)}</b></span><strong>Total <b>₹{Number(data.total_amount).toFixed(2)}</b></strong><small>{data.address?.address_line1}, {data.address?.city} {data.address?.pincode}</small></section>
    {data.delivery_otp ? <section className="otp-card"><b>Delivery OTP</b><span>Share this code with your delivery partner when the order arrives.</span><strong>{data.delivery_otp}</strong></section> : null}
    {data.status === "DELIVERED" ? <button className="primary-action" disabled={repeat.isPending} onClick={() => repeat.mutate()}><RotateCcw size={16} /> {repeat.isPending ? "Adding..." : "Reorder available items"}</button> : null}
    {repeat.isError ? <p className="form-error">{getErrorMessage(repeat.error)}</p> : null}
  </main>;
}
