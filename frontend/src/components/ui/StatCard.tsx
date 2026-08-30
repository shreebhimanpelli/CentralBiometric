const accents = {
  blue: "text-flame-blue",
  gold: "text-[#b8860b]",
  orange: "text-flame-orange",
  green: "text-green-700",
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
    <div className="flame-card p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-flame-orange via-flame-gold to-flame-blue opacity-80" />
      <p className="flame-text-small mb-1 mt-1">{label}</p>
      <p className={`text-3xl font-headline font-bold ${accents[accent]}`}>{value}</p>
    </div>
  );
}
