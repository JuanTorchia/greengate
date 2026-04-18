import { prisma } from "@/lib/prisma";
import type { Project, AuditRun, Suggestion } from "@prisma/client";

export type InboxCardStatus = "URGENT" | "AWAITING" | "IN_REVIEW" | "CLEARED";

export interface InboxCard {
  projectId: string;
  projectName: string;
  description: string | null;
  status: InboxCardStatus;
  approverName: string;
  approverRole: string;
  lineItemCount: number;
  hotspotCount: number;
  potentialSavingKg: number;
  slaDueAt: Date | null;
  latestAuditId: string | null;
}

export interface InboxStats {
  awaitingCount: number;
  savedThisMonthKg: number;
  dueIn24hCount: number;
}

export interface InboxData {
  stats: InboxStats;
  cards: InboxCard[];
}

function deriveCardStatus(run: AuditRun | null): InboxCardStatus {
  if (!run) return "AWAITING";
  const soonMs = 24 * 60 * 60 * 1000;
  if (run.reviewStatus === "AWAITING_REVIEW") {
    if (run.slaDueAt && run.slaDueAt.getTime() - Date.now() < soonMs) return "URGENT";
    return "AWAITING";
  }
  if (run.reviewStatus === "IN_REVIEW") return "IN_REVIEW";
  return "CLEARED";
}

export async function loadInboxData(filter: InboxCardStatus | "ALL"): Promise<InboxData> {
  const [projects, savedThisMonth, awaitingRuns] = await Promise.all([
    prisma.project.findMany({
      include: {
        bomItems: { select: { id: true } },
        audits: {
          orderBy: { startedAt: "desc" },
          take: 1,
          include: {
            suggestions: { select: { status: true, kgCo2eSaved: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.suggestion.aggregate({
      where: {
        status: "APPROVED",
        approval: { decidedAt: { gte: startOfMonth() } },
      },
      _sum: { kgCo2eSaved: true },
    }),
    prisma.auditRun.findMany({
      where: {
        reviewStatus: "AWAITING_REVIEW",
        slaDueAt: { lte: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      },
      select: { id: true },
    }),
  ]);

  const cards: InboxCard[] = projects.map((p) => {
    const run = p.audits[0] ?? null;
    const status = deriveCardStatus(run);
    const pendingSavings =
      run?.suggestions
        .filter((s) => s.status === "PENDING")
        .reduce((acc, s) => acc + s.kgCo2eSaved, 0) ?? 0;
    return {
      projectId: p.id,
      projectName: p.name,
      description: p.description,
      status,
      approverName: p.responsibleApproverName,
      approverRole: p.responsibleApproverRole,
      lineItemCount: p.bomItems.length,
      hotspotCount: run?.hotspotCount ?? 0,
      potentialSavingKg: pendingSavings,
      slaDueAt: run?.slaDueAt ?? null,
      latestAuditId: run?.id ?? null,
    };
  });

  const filteredCards = filter === "ALL" ? cards : cards.filter((c) => c.status === filter);
  const awaitingCount = cards.filter((c) => c.status === "AWAITING" || c.status === "URGENT").length;

  return {
    stats: {
      awaitingCount,
      savedThisMonthKg: savedThisMonth._sum.kgCo2eSaved ?? 0,
      dueIn24hCount: awaitingRuns.length,
    },
    cards: filteredCards,
  };
}

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
