import { cn } from "@/lib/cn";

const accents = {
  blue: "flame-stat-card-blue",
  gold: "flame-stat-card-gold",
  orange: "flame-stat-card-orange",
  green: "flame-stat-card-green",
} as const;

export function StatCard({
  label,
  value,
  accent = "blue",
}: {
  label: string;
  value: number | string;
  accent?: keyof typeof accents;
}) {
  return (
    <div className={cn("flame-stat-card", accents[accent])}>
      <p className="flame-stat-card-label">{label}</p>
      <p className="flame-stat-card-value">{value}</p>
    </div>
  );
}
