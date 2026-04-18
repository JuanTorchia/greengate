import type { InboxStats } from "../server/inbox-data";
import { AnimatedKg } from "@/features/audit/components/animated-kg";

export function StatsRow({ stats }: { stats: InboxStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Tile label="AWAITING review" value={stats.awaitingCount.toString()} />
      <Tile label="CO₂e SAVED this month" value={<AnimatedKg value={stats.savedThisMonthKg} />} suffix="kg" />
      <Tile
        label="DUE < 24h"
        value={stats.dueIn24hCount.toString()}
        tone={stats.dueIn24hCount > 0 ? "danger" : "neutral"}
      />
    </div>
  );
}

function Tile({
  label,
  value,
  suffix,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  suffix?: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p
        className={
          "mt-3 font-[var(--font-display)] text-4xl font-medium tracking-tight " +
          (tone === "danger" ? "text-danger" : "text-brand-primary")
        }
      >
        {value}
        {suffix ? <span className="ml-2 text-lg text-muted">{suffix}</span> : null}
      </p>
    </div>
  );
}
