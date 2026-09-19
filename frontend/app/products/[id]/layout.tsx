export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
