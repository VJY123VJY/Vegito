import { B2BDashboard } from "@/components/customer/b2b-dashboard";

export const metadata = {
  title: "B2B Commercial & Bulk Ordering | Vegito V1",
  description: "Wholesale Mandi Rates for Restaurants, Hotels, Caterers & Hostels in Solapur",
};

export default function CustomerB2BPage() {
  return (
    <main style={{ width: "100%", minHeight: "100vh", paddingBottom: 60 }}>
      <B2BDashboard />
    </main>
  );
}
