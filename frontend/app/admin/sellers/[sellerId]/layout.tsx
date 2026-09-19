export function generateStaticParams() {
  return [{ sellerId: "_" }];
}

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
