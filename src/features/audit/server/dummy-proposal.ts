"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth0 } from "@/lib/auth0";
import { buildLoginHint, initiateCiba, pollCibaToken } from "@/lib/auth0/ciba";

const SCOPE = "openid audit:propose";
const BINDING_MESSAGE = "Replace cement CEM I with GGBS, save 180 kg CO2e";

export type ProposalState =
  | { kind: "ok"; suggestionId: string; authReqId: string }
  | { kind: "error"; message: string };

export type ApprovalState =
  | { kind: "pending"; nextPollMs: number }
  | { kind: "approved"; approvalId: string }
  | { kind: "denied"; reason: string }
  | { kind: "expired" }
  | { kind: "error"; message: string };

async function upsertUserFromSession(): Promise<{
  userId: string;
  auth0Sub: string;
} | null> {
  const session = await auth0.getSession();
  if (!session?.user?.sub) return null;

  const user = await prisma.user.upsert({
    where: { auth0Sub: session.user.sub },
    create: {
      auth0Sub: session.user.sub,
      email: session.user.email ?? `${session.user.sub}@unknown.local`,
      name: session.user.name ?? null,
    },
    update: {
      email: session.user.email ?? `${session.user.sub}@unknown.local`,
      name: session.user.name ?? null,
    },
  });

  return { userId: user.id, auth0Sub: user.auth0Sub };
}

export async function proposeDummyChange(): Promise<ProposalState> {
  const me = await upsertUserFromSession();
  if (!me) return { kind: "error", message: "Not signed in." };

  const project =
    (await prisma.project.findFirst({ where: { ownerId: me.userId } })) ??
    (await prisma.project.findFirst());
  if (!project) {
    return { kind: "error", message: "No projects in DB. Run `npm run db:seed`." };
  }

  const firstItem = await prisma.bomItem.findFirst({
    where: { projectId: project.id },
    include: { material: true },
  });
  if (!firstItem) {
    return { kind: "error", message: "Project has no BOM items." };
  }

  const auditRun = await prisma.auditRun.create({
    data: {
      projectId: project.id,
      status: "COMPLETED",
      totalKgCo2e: 0,
      hotspotCount: 1,
      completedAt: new Date(),
    },
  });

  const suggestion = await prisma.suggestion.create({
    data: {
      auditRunId: auditRun.id,
      originalItemId: firstItem.id,
      proposedMaterialCode: "GGBS-CEM-III-A",
      proposedMaterialName: "Ground Granulated Blast-furnace Slag (CEM III/A)",
      kgCo2eSaved: 180,
      technicalRationale:
        "Dummy proposal generated to validate the CIBA approval round-trip end-to-end.",
      status: "PENDING",
    },
  });

  try {
    const ciba = await initiateCiba({
      loginHint: buildLoginHint(me.auth0Sub),
      bindingMessage: BINDING_MESSAGE,
      scope: SCOPE,
    });
    return { kind: "ok", suggestionId: suggestion.id, authReqId: ciba.authReqId };
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function checkApproval(
  authReqId: string,
  suggestionId: string,
): Promise<ApprovalState> {
  const me = await upsertUserFromSession();
  if (!me) return { kind: "error", message: "Not signed in." };

  const result = await pollCibaToken(authReqId);

  if (result.status === "pending") {
    const nextPollMs = result.slowDown
      ? Math.max((result.retryAfterSeconds ?? 10) * 1000, 6000)
      : 6000;
    return { kind: "pending", nextPollMs };
  }

  const decision =
    result.status === "approved"
      ? "APPROVED"
      : result.status === "denied"
        ? "REJECTED"
        : "EXPIRED";

  const existingApproval = await prisma.approval.findUnique({ where: { authReqId } });
  if (existingApproval) {
    if (decision === "APPROVED") return { kind: "approved", approvalId: existingApproval.id };
    if (decision === "REJECTED")
      return { kind: "denied", reason: result.status === "denied" ? result.error : "denied" };
    return { kind: "expired" };
  }

  await prisma.$transaction([
    prisma.approval.create({
      data: {
        suggestionId,
        userId: me.userId,
        authReqId,
        decision,
        rawResponse:
          result.status === "approved"
            ? (result.rawResponse as object)
            : { status: result.status, ...(result.status === "denied" ? { error: result.error } : {}) },
      },
    }),
    prisma.suggestion.update({
      where: { id: suggestionId },
      data: { status: decision },
    }),
  ]);

  revalidatePath("/");

  if (result.status === "approved") {
    const approval = await prisma.approval.findUnique({ where: { authReqId } });
    return { kind: "approved", approvalId: approval!.id };
  }
  if (result.status === "denied") return { kind: "denied", reason: result.error };
  return { kind: "expired" };
}
