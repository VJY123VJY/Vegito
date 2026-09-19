export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
