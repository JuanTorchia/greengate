"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth0 } from "@/lib/auth0";
import { buildLoginHint, initiateCiba, pollCibaToken } from "@/lib/auth0/ciba";
import { createMockEmissionsSource } from "@/lib/emissions/mock";

const SCOPE = "openid audit:propose";
const BINDING_MESSAGE_MAX = 64;

export type RequestApprovalState =
  | { kind: "ok"; authReqId: string; bindingMessage: string }
  | { kind: "error"; message: string };

export type CheckApprovalState =
  | { kind: "pending"; nextPollMs: number }
  | { kind: "approved"; approvalId: string }
  | { kind: "denied"; reason: string }
  | { kind: "expired" }
  | { kind: "error"; message: string };

export type RequestBatchState =
  | { kind: "ok"; authReqId: string; bindingMessage: string; count: number; totalSaved: number }
  | { kind: "error"; message: string };

export type CheckBatchState =
  | { kind: "pending"; nextPollMs: number }
  | { kind: "approved"; appliedCount: number }
  | { kind: "denied"; reason: string }
  | { kind: "expired" }
  | { kind: "error"; message: string };

async function upsertSessionUser() {
  const session = await auth0.getSession();
  if (!session?.user?.sub) return null;
  return prisma.user.upsert({
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
}

// Auth0 only allows alphanumerics, whitespace and `+-_.,:#` in binding_message.
function sanitize(s: string): string {
  return s.replace(/[^A-Za-z0-9 +\-_.,:#]/g, "");
}

function buildBindingMessage(originalCode: string, newCode: string, saved: number): string {
  const savedKg = Math.round(saved);
  const raw = `Sub ${originalCode} with ${newCode}: save ${savedKg}kg CO2e`;
  const clean = sanitize(raw);
  return clean.length <= BINDING_MESSAGE_MAX ? clean : clean.slice(0, BINDING_MESSAGE_MAX);
}

function buildBatchBindingMessage(count: number, totalSaved: number): string {
  const savedKg = Math.round(totalSaved);
  const raw = `Approve ${count} subs: save ${savedKg}kg CO2e`;
  const clean = sanitize(raw);
  return clean.length <= BINDING_MESSAGE_MAX ? clean : clean.slice(0, BINDING_MESSAGE_MAX);
}

async function recomputeReviewStatus(auditRunId: string, tx?: Prisma.TransactionClient): Promise<void> {
  const client = tx ?? prisma;
  const run = await client.auditRun.findUnique({
    where: { id: auditRunId },
    include: { suggestions: { select: { status: true } } },
  });
  if (!run) return;
  const all = run.suggestions;
  if (all.length === 0) {
    await client.auditRun.update({ where: { id: auditRunId }, data: { reviewStatus: "CLEARED" } });
    return;
  }
  const terminal = all.every((s) => s.status === "APPROVED" || s.status === "REJECTED" || s.status === "EXPIRED");
  if (terminal) {
    await client.auditRun.update({ where: { id: auditRunId }, data: { reviewStatus: "CLEARED" } });
    return;
  }
  const anyDecided = all.some((s) => s.status !== "PENDING");
  await client.auditRun.update({
    where: { id: auditRunId },
    data: { reviewStatus: anyDecided ? "IN_REVIEW" : "AWAITING_REVIEW" },
  });
}

export async function requestApproval(suggestionId: string): Promise<RequestApprovalState> {
  const me = await upsertSessionUser();
  if (!me) return { kind: "error", message: "Not signed in." };

  const suggestion = await prisma.suggestion.findUnique({
    where: { id: suggestionId },
    include: { originalItem: { include: { material: true } } },
  });
  if (!suggestion) return { kind: "error", message: "Suggestion not found." };

  const bindingMessage = buildBindingMessage(
    suggestion.originalItem.material.code,
    suggestion.proposedMaterialCode,
    suggestion.kgCo2eSaved,
  );

  try {
    const ciba = await initiateCiba({
      loginHint: buildLoginHint(me.auth0Sub),
      bindingMessage,
      scope: SCOPE,
    });
    return { kind: "ok", authReqId: ciba.authReqId, bindingMessage };
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : String(err) };
  }
}

export async function checkApproval(
  authReqId: string,
  suggestionId: string,
): Promise<CheckApprovalState> {
  const me = await upsertSessionUser();
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

  const existing = await prisma.approval.findFirst({ where: { authReqId, suggestionId } });
  if (existing) {
    if (decision === "APPROVED") return { kind: "approved", approvalId: existing.id };
    if (decision === "REJECTED")
      return { kind: "denied", reason: result.status === "denied" ? result.error : "denied" };
    return { kind: "expired" };
  }

  // Persist Approval + flip Suggestion status, and on APPROVED also apply
  // the substitution to the BomItem (close the loop).
  await prisma.$transaction(async (tx) => {
    await tx.approval.create({
      data: {
        suggestionId,
        userId: me.id,
        authReqId,
        decision,
        rawResponse:
          result.status === "approved"
            ? (result.rawResponse as object)
            : { status: result.status, ...(result.status === "denied" ? { error: result.error } : {}) },
      },
    });
    const updated = await tx.suggestion.update({
      where: { id: suggestionId },
      data: { status: decision },
    });

    if (decision === "APPROVED") {
      const suggestion = await tx.suggestion.findUniqueOrThrow({
        where: { id: suggestionId },
        include: { originalItem: true },
      });

      const emissions = createMockEmissionsSource();
      const [factor] = await emissions.queryByMaterialCodes([suggestion.proposedMaterialCode]);
      if (factor) {
        const newMaterial = await tx.material.upsert({
          where: { code: factor.materialCode },
          create: {
            code: factor.materialCode,
            name: factor.materialName,
            category: factor.category,
            defaultUnit: factor.unit,
          },
          update: {},
        });

        await tx.bomItem.update({
          where: { id: suggestion.originalItem.id },
          data: { materialId: newMaterial.id },
        });
      }
    }

    if (updated.auditRunId) await recomputeReviewStatus(updated.auditRunId, tx);
  });

  revalidatePath("/");

  if (result.status === "approved") {
    const approval = await prisma.approval.findFirst({
      where: { authReqId, suggestionId },
      orderBy: { decidedAt: "desc" },
    });
    return { kind: "approved", approvalId: approval!.id };
  }
  if (result.status === "denied") return { kind: "denied", reason: result.error };
  return { kind: "expired" };
}

export async function requestBatchApproval(auditRunId: string): Promise<RequestBatchState> {
  const me = await upsertSessionUser();
  if (!me) return { kind: "error", message: "Not signed in." };

  const pending = await prisma.suggestion.findMany({
    where: { auditRunId, status: "PENDING" },
  });
  if (pending.length === 0) return { kind: "error", message: "No pending suggestions." };

  const totalSaved = pending.reduce((s, x) => s + x.kgCo2eSaved, 0);
  const bindingMessage = buildBatchBindingMessage(pending.length, totalSaved);

  try {
    const ciba = await initiateCiba({
      loginHint: buildLoginHint(me.auth0Sub),
      bindingMessage,
      scope: SCOPE,
    });
    return {
      kind: "ok",
      authReqId: ciba.authReqId,
      bindingMessage,
      count: pending.length,
      totalSaved,
    };
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : String(err) };
  }
}

export async function checkBatchApproval(
  authReqId: string,
  auditRunId: string,
): Promise<CheckBatchState> {
  const me = await upsertSessionUser();
  if (!me) return { kind: "error", message: "Not signed in." };

  const result = await pollCibaToken(authReqId);

  if (result.status === "pending") {
    const nextPollMs = result.slowDown
      ? Math.max((result.retryAfterSeconds ?? 10) * 1000, 6000)
      : 6000;
    return { kind: "pending", nextPollMs };
  }

  // Idempotency: if any Approval already exists for this batch, return the cached terminal state.
  const existing = await prisma.approval.findFirst({ where: { authReqId } });
  if (existing) {
    if (existing.decision === "APPROVED") {
      const count = await prisma.approval.count({ where: { authReqId } });
      return { kind: "approved", appliedCount: count };
    }
    if (existing.decision === "REJECTED")
      return { kind: "denied", reason: result.status === "denied" ? result.error : "denied" };
    return { kind: "expired" };
  }

  const decision =
    result.status === "approved"
      ? "APPROVED"
      : result.status === "denied"
        ? "REJECTED"
        : "EXPIRED";

  const pending = await prisma.suggestion.findMany({
    where: { auditRunId, status: "PENDING" },
  });

  const emissions = createMockEmissionsSource();
  const proposedCodes = Array.from(new Set(pending.map((p) => p.proposedMaterialCode)));
  const factors = await emissions.queryByMaterialCodes(proposedCodes);
  const factorByCode = new Map(factors.map((f) => [f.materialCode, f]));

  await prisma.$transaction(async (tx) => {
    const rawForRow =
      result.status === "approved"
        ? (result.rawResponse as object)
        : { status: result.status, ...(result.status === "denied" ? { error: result.error } : {}) };

    for (const suggestion of pending) {
      await tx.approval.create({
        data: {
          suggestionId: suggestion.id,
          userId: me.id,
          authReqId,
          decision,
          rawResponse: rawForRow,
        },
      });
      await tx.suggestion.update({ where: { id: suggestion.id }, data: { status: decision } });

      if (decision !== "APPROVED") continue;

      const factor = factorByCode.get(suggestion.proposedMaterialCode);
      if (!factor) continue;

      const newMaterial = await tx.material.upsert({
        where: { code: factor.materialCode },
        create: {
          code: factor.materialCode,
          name: factor.materialName,
          category: factor.category,
          defaultUnit: factor.unit,
        },
        update: {},
      });

      await tx.bomItem.update({
        where: { id: suggestion.originalItemId },
        data: { materialId: newMaterial.id },
      });
    }
  });

  await recomputeReviewStatus(auditRunId);

  revalidatePath("/");

  if (decision === "APPROVED") return { kind: "approved", appliedCount: pending.length };
  if (decision === "REJECTED") return { kind: "denied", reason: result.status === "denied" ? result.error : "denied" };
  return { kind: "expired" };
}
