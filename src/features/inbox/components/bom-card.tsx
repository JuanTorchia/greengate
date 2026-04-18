import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { PillButton } from "@/components/ui/pill-button";
import type { InboxCard } from "../server/inbox-data";

function formatSla(dueAt: Date | null): string {
  if (!dueAt) return "no SLA";
  const ms = dueAt.getTime() - Date.now();
  if (ms <= 0) return "overdue";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return hours > 24 ? `${Math.floor(hours / 24)}d left` : `SLA in ${hours}h ${minutes}m`;
}

export function BomCard({ card }: { card: InboxCard }) {
  const cta = card.status === "CLEARED" ? "View record →" : card.status === "IN_REVIEW" ? "Continue →" : "Review →";
  return (
    <Link
      href={`/app/projects/${card.projectId}`}
      className="block rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <StatusBadge kind={card.status} />
            <p className="font-[var(--font-display)] text-lg font-medium text-ink">
              {card.projectName}
            </p>
          </div>
          {card.description && <p className="mt-1 text-xs text-muted">{card.description}</p>}
        </div>
        <PillButton size="sm" variant="outline" asChild>
          <span>{cta}</span>
        </PillButton>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-ink/80">
        <span>{card.lineItemCount} line items</span>
        <span>·</span>
        <span>{card.hotspotCount} hotspots</span>
        {card.potentialSavingKg > 0 && (
          <>
            <span>·</span>
            <span>
              potential saving <strong className="text-brand-primary">{Math.round(card.potentialSavingKg).toLocaleString()} kg CO₂e</strong>
            </span>
          </>
        )}
      </div>
      <div className="mt-2 text-xs text-muted">
        Approver: {card.approverName} ({card.approverRole}) · {formatSla(card.slaDueAt)}
      </div>
    </Link>
  );
}
