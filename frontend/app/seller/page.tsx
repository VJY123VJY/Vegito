"use client";

import { RoleGuard } from "@/components/role/role-guard";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/api/client";
import { listSellerOrders, updateSellerOrder } from "@/lib/api/seller";
import styles from "@/styles/seller-portal.module.css";

export default function SellerDashboardPage() {
  const client = useQueryClient();
  const orders = useQuery({ queryKey: ["seller-orders"], queryFn: () => listSellerOrders() });
  const update = useMutation({ mutationFn: ({ id, status }: { id: number; status: "ACCEPTED" | "PACKING" | "READY" | "REJECTED" }) => updateSellerOrder(id, status), onSuccess: () => client.invalidateQueries({ queryKey: ["seller-orders"] }) });
  return (
    <RoleGuard allow={["SELLER"]}>
      <main className={`simple-page ${styles.shell}`}>
        <p className="section-kicker">SELLER DASHBOARD</p>
        <h1>Today at your store</h1>
        {orders.isLoading ? <p className="helper">Loading seller orders...</p> : orders.isError ? <p className="form-error">{getErrorMessage(orders.error)}</p> : <div className="order-list">{(orders.data?.items ?? []).map((order) => <article className="order-card" key={order.id}><span className="mini-art">#</span><span><b>Order {order.order_number}</b><small>{new Date(order.placed_at).toLocaleString()} · ₹{Number(order.total_amount).toFixed(2)}</small></span><strong>{order.status}</strong>{order.status === "NEW" ? <button className="add-button" disabled={update.isPending} onClick={() => update.mutate({ id: order.id, status: "ACCEPTED" })}>Accept</button> : order.status === "ACCEPTED" ? <button className="add-button" disabled={update.isPending} onClick={() => update.mutate({ id: order.id, status: "PACKING" })}>Packing</button> : order.status === "PACKING" ? <button className="add-button" disabled={update.isPending} onClick={() => update.mutate({ id: order.id, status: "READY" })}>Ready</button> : null}</article>)}</div>}
        {update.isError ? <p className="form-error">{getErrorMessage(update.error)}</p> : null}
      </main>
    </RoleGuard>
  );
}
