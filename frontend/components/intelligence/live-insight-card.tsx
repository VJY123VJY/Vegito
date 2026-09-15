import styles from "@/styles/unique-features.module.css";

type LiveInsightCardProps = {
  title: string;
  value?: string | number | null;
  detail?: string | null;
  configured?: boolean;
};

export function LiveInsightCard({ title, value, detail, configured = false }: LiveInsightCardProps) {
  const available = configured && value !== null && value !== undefined;
  return <article className={styles.card} aria-live="polite">
    <span>{title}</span>
    {available ? <strong className={styles.badge}>{value}</strong> : <span className={styles.unavailable}>Not configured in the live data source</span>}
    {detail ? <small>{detail}</small> : null}
  </article>;
}
