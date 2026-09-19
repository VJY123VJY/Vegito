export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
