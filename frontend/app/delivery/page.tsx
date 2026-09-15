"use client";

import { RoleGuard } from "@/components/role/role-guard";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { completeDelivery, listDeliveryTasks, updateDeliveryTask } from "@/lib/api/delivery";
import { getErrorMessage } from "@/lib/api/client";
import { useState } from "react";
import styles from "@/styles/delivery-app.module.css";

export default function DeliveryDashboardPage() {
  const client = useQueryClient();
  const tasks = useQuery({ queryKey: ["delivery-tasks"], queryFn: () => listDeliveryTasks(), refetchInterval: 15000 });
  const [otp, setOtp] = useState<Record<number, string>>({});
  const update = useMutation({ mutationFn: ({ id, status }: { id: number; status: "STARTED" | "FAILED" | "CANCELLED" }) => updateDeliveryTask(id, status), onSuccess: () => client.invalidateQueries({ queryKey: ["delivery-tasks"] }) });
  const complete = useMutation({ mutationFn: ({ id, code }: { id: number; code: string }) => completeDelivery(id, code), onSuccess: () => client.invalidateQueries({ queryKey: ["delivery-tasks"] }) });
  return (
    <RoleGuard allow={["DELIVERY_PARTNER"]}>
      <main className={`simple-page ${styles.shell}`}>
        <p className="section-kicker">DELIVERY DASHBOARD</p>
        <h1>Today&apos;s delivery tasks</h1>
        {tasks.isLoading ? <p className="helper">Loading assigned tasks...</p> : tasks.isError ? <p className="form-error">{getErrorMessage(tasks.error)}</p> : <div className="order-list">{(tasks.data ?? []).map((task) => <article className="checkout-panel" key={task.id}><p className="section-kicker">{task.status}</p><h2>Order {task.order_number ?? task.order_id}</h2><p>{task.customer_name ?? "Customer"} · {task.customer_phone ?? "Phone unavailable"}</p><p className="helper">{task.delivery_address?.address_line1}, {task.delivery_address?.city} {task.delivery_address?.pincode}</p>{task.status === "ASSIGNED" ? <button className="primary-action" onClick={() => update.mutate({ id: task.id, status: "STARTED" })}>Start delivery</button> : task.status === "STARTED" ? <><input value={otp[task.id] ?? ""} onChange={(event) => setOtp({ ...otp, [task.id]: event.target.value.replace(/\D/g, "") })} placeholder="Customer delivery OTP" maxLength={6} /><button className="primary-action" disabled={complete.isPending} onClick={() => complete.mutate({ id: task.id, code: otp[task.id] ?? "" })}>Mark delivered</button></> : null}</article>)}</div>}
        {update.isError ? <p className="form-error">{getErrorMessage(update.error)}</p> : null}
        {complete.isError ? <p className="form-error">{getErrorMessage(complete.error)}</p> : null}
      </main>
    </RoleGuard>
  );
}
