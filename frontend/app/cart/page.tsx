import { redirect } from "next/navigation";

export default function CartRedirect() {
  redirect("/customer/cart");
}
