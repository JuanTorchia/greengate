import { PillButton } from "@/components/ui/pill-button";
import { loadInboxData, type InboxCardStatus } from "@/features/inbox/server/inbox-data";
import { seedDemoProject } from "@/features/inbox/server/seed-demo";
import { StatsRow } from "@/features/inbox/components/stats-row";
import { FilterChips } from "@/features/inbox/components/filter-chips";
import { BomCard } from "@/features/inbox/components/bom-card";

function parseFilter(value: string | undefined): InboxCardStatus | "ALL" {
  const v = (value ?? "").toUpperCase();
  if (v === "AWAITING" || v === "URGENT" || v === "IN_REVIEW" || v === "CLEARED") return v;
  return "ALL";
}

type FilterKey = "ALL" | "AWAITING" | "IN_REVIEW" | "CLEARED";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = parseFilter(status);
  const data = await loadInboxData(filter);

  const active: FilterKey =
    filter === "URGENT" || filter === "AWAITING" ? "AWAITING" : (filter as FilterKey);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-medium tracking-tight text-brand-primary">
          Welcome back.
        </h1>
        <p className="mt-1 text-sm text-muted">
          Three projects are awaiting your carbon review.
        </p>
      </div>

      <StatsRow stats={data.stats} />

      <FilterChips active={active} />

      {data.cards.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="font-[var(--font-display)] text-lg font-medium text-ink">
            No BOMs pending review.
          </p>
          <p className="mt-2 text-sm text-muted">
            When a PM shares a new BOM, it lands here.
          </p>
          <form action={seedDemoProject} className="mt-6 inline-flex gap-3">
            <PillButton type="submit">Seed demo project</PillButton>
            <PillButton variant="outline" disabled title="coming soon">
              Upload a BOM (CSV)
            </PillButton>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          {data.cards.map((c) => (
            <BomCard key={c.projectId} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}
