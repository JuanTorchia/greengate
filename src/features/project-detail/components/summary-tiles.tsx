import { AnimatedKg } from "@/features/audit/components/animated-kg";

export function SummaryTiles({
  totalKgCo2e,
  potentialSavingKg,
  hotspotCount,
  lineItemCount,
  hotspotPctOfTotal,
}: {
  totalKgCo2e: number;
  potentialSavingKg: number;
  hotspotCount: number;
  lineItemCount: number;
  hotspotPctOfTotal: number;
}) {
  const pct = totalKgCo2e > 0 ? Math.round((potentialSavingKg / totalKgCo2e) * 100) : 0;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Tile label="Total embodied" value={<AnimatedKg value={totalKgCo2e} />} suffix="kg CO₂e" sub="post-review projection" />
      <Tile
        label="Potential savings"
        value={<>− <AnimatedKg value={potentialSavingKg} /></>}
        suffix="kg CO₂e"
        sub={`${pct}% reduction`}
        accent
      />
      <Tile
        label="Hotspots"
        value={<>{hotspotCount}<span className="text-lg text-muted"> of {lineItemCount}</span></>}
        sub={`drive ${hotspotPctOfTotal}%`}
      />
    </div>
  );
}

function Tile({
  label,
  value,
  suffix,
  sub,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  suffix?: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p
        className={
          "mt-3 font-[var(--font-display)] text-4xl font-medium tracking-tight " +
          (accent ? "text-brand-primary" : "text-ink")
        }
      >
        {value}
        {suffix && <span className="ml-2 text-lg text-muted">{suffix}</span>}
      </p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}
