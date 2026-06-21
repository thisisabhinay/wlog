import type { RecordKpis } from '#domain/selectors';

export function KpiCards({ kpis }: { kpis: RecordKpis }) {
  const entries = Object.entries(kpis);
  if (entries.length === 0) return null;

  return (
    <div className="flex gap-4 flex-wrap">
      {entries.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-border bg-card px-4 py-3 min-w-[140px]">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tabular-nums mt-0.5">{String(value)}</p>
        </div>
      ))}
    </div>
  );
}
