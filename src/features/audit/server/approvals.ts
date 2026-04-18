"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth0 } from "@/lib/auth0";
import { buildLoginHint, initiateCiba, pollCibaToken } from "@/lib/auth0/ciba";

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

  const existing = await prisma.approval.findUnique({ where: { authReqId } });
  if (existing) {
    if (decision === "APPROVED") return { kind: "approved", approvalId: existing.id };
    if (decision === "REJECTED")
      return { kind: "denied", reason: result.status === "denied" ? result.error : "denied" };
    return { kind: "expired" };
  }

  await prisma.$transaction([
    prisma.approval.create({
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
    }),
    prisma.suggestion.update({ where: { id: suggestionId }, data: { status: decision } }),
  ]);

  revalidatePath("/");

  if (result.status === "approved") {
    const approval = await prisma.approval.findUnique({ where: { authReqId } });
    return { kind: "approved", approvalId: approval!.id };
  }
  if (result.status === "denied") return { kind: "denied", reason: result.error };
  return { kind: "expired" };
}
