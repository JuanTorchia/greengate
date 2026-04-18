import { cn } from "@/lib/utils";

export interface BomRow {
  index: number;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  kgCo2e: number;
  hotspotRank: number | null;
}

export function BomTable({ rows }: { rows: BomRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-canvas text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
          <tr>
            <th className="py-3 pl-6 pr-3">#</th>
            <th className="px-3">Material</th>
            <th className="px-3 text-right">Qty</th>
            <th className="px-3">Unit</th>
            <th className="px-3 text-right">kg CO₂e</th>
            <th className="py-3 pl-3 pr-6">Hotspot</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.index}
              className={cn(
                "h-10 border-b border-border last:border-b-0",
                r.hotspotRank !== null && "border-l-2 border-l-hotspot",
              )}
            >
              <td className="pl-6 pr-3 font-[var(--font-mono)] text-xs text-muted">{r.index}</td>
              <td className="px-3 font-medium text-ink">
                {r.name}
                <span className="ml-2 font-[var(--font-mono)] text-[10px] text-muted">{r.code}</span>
              </td>
              <td className="px-3 text-right font-[var(--font-display)] font-medium tabular-nums">
                {r.quantity.toLocaleString()}
              </td>
              <td className="px-3 text-muted">{r.unit}</td>
              <td className="px-3 text-right font-[var(--font-display)] font-medium text-ink tabular-nums">
                {Math.round(r.kgCo2e).toLocaleString()}
              </td>
              <td className="py-3 pl-3 pr-6">
                {r.hotspotRank !== null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-hotspot/10 px-2 py-0.5 text-[10px] font-semibold text-hotspot">
                    🔥 #{r.hotspotRank}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
