import { redirect } from "next/navigation";

export default async function OrderDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  redirect(`/customer/orders/${resolvedParams.id}`);
}
