export function generateStaticParams() {
  return [{ taskId: "_" }];
}

export default function CustomerTrackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
