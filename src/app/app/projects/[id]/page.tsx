import { notFound } from "next/navigation";
import { loadProjectDetail } from "@/features/project-detail/server/project-detail-data";
import { ProjectHeader } from "@/features/project-detail/components/project-header";
import { SummaryTiles } from "@/features/project-detail/components/summary-tiles";
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
        hotspotPctOfTotal={72 /* placeholder — BOM table computes the exact figure in Task 11 */}
      />

      <p className="text-sm text-muted">
        BOM table and suggestions list render in follow-up tasks.
      </p>
    </div>
  );
}
