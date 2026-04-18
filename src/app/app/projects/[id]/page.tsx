import { notFound } from "next/navigation";
import { loadProjectDetail } from "@/features/project-detail/server/project-detail-data";
import { ProjectHeader } from "@/features/project-detail/components/project-header";
import { SummaryTiles } from "@/features/project-detail/components/summary-tiles";
import { BomTable, type BomRow } from "@/features/project-detail/components/bom-table";
import { createMockEmissionsSource } from "@/lib/emissions/mock";
import type { StatusKind } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

function deriveStatus(
  reviewStatus: "AWAITING_REVIEW" | "IN_REVIEW" | "CLEARED",
  slaDueAt: Date | null,
): StatusKind {
  const soonMs = 24 * 60 * 60 * 1000;
  if (reviewStatus === "AWAITING_REVIEW") {
    if (slaDueAt && slaDueAt.getTime() - Date.now() < soonMs) return "URGENT";
    return "AWAITING";
  }
  if (reviewStatus === "IN_REVIEW") return "IN_REVIEW";
  return "CLEARED";
}

function formatSla(dueAt: Date | null): string {
  if (!dueAt) return "no SLA";
  const ms = dueAt.getTime() - Date.now();
  if (ms <= 0) return "overdue";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  return hours > 24 ? `SLA in ${Math.floor(hours / 24)}d` : `SLA in ${hours}h`;
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await loadProjectDetail(id);
  if (!project) notFound();

  const run = project.audits[0];
  const totalKgCo2e = run?.totalKgCo2e ?? 0;
  const hotspotCount = run?.hotspotCount ?? 0;
  const pendingSavings =
    run?.suggestions.filter((s) => s.status === "PENDING").reduce((a, s) => a + s.kgCo2eSaved, 0) ?? 0;
  const approvedSavings =
    run?.suggestions.filter((s) => s.status === "APPROVED").reduce((a, s) => a + s.kgCo2eSaved, 0) ?? 0;
  const potentialSavings = pendingSavings + approvedSavings;

  const emissions = createMockEmissionsSource();
  const uniqueCodes = Array.from(new Set(project.bomItems.map((i) => i.material.code)));
  const factors = await emissions.queryByMaterialCodes(uniqueCodes);
  const factorByCode = new Map(factors.map((f) => [f.materialCode, f]));
  const rowsUnranked: BomRow[] = project.bomItems.map((item, i) => {
    const factor = factorByCode.get(item.material.code);
    const kgCo2e = (factor?.kgCo2ePerUnit ?? 0) * item.quantity;
    return {
      index: i + 1,
      code: item.material.code,
      name: item.material.name,
      quantity: item.quantity,
      unit: item.unit,
      kgCo2e,
      hotspotRank: null,
    };
  });
  const sortedByImpact = [...rowsUnranked].sort((a, b) => b.kgCo2e - a.kgCo2e);
  sortedByImpact.slice(0, 4).forEach((r, idx) => {
    const match = rowsUnranked.find((x) => x.index === r.index);
    if (match) match.hotspotRank = idx + 1;
  });
  const top4Sum = sortedByImpact.slice(0, 4).reduce((a, r) => a + r.kgCo2e, 0);
  const totalFromRows = rowsUnranked.reduce((a, r) => a + r.kgCo2e, 0);
  const hotspotPct = totalFromRows > 0 ? Math.round((top4Sum / totalFromRows) * 100) : 0;

  const status = run
    ? deriveStatus(run.reviewStatus, run.slaDueAt)
    : "AWAITING";

  return (
    <div className="space-y-10">
      <ProjectHeader
        name={project.name}
        description={project.description}
        approverName={project.responsibleApproverName}
        approverRole={project.responsibleApproverRole}
        status={status}
        slaLabel={formatSla(run?.slaDueAt ?? null)}
      />

      <SummaryTiles
        totalKgCo2e={Math.max(totalKgCo2e - approvedSavings, 0)}
        potentialSavingKg={potentialSavings}
        hotspotCount={hotspotCount}
        lineItemCount={project.bomItems.length}
        hotspotPctOfTotal={hotspotPct}
      />

      <section className="space-y-3">
        <h2 className="text-xl font-medium text-brand-primary">Bill of Materials</h2>
        <BomTable rows={rowsUnranked} />
      </section>
    </div>
  );
}
