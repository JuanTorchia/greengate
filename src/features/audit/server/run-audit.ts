import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth0 } from "@/lib/auth0";
import { createMockEmissionsSource } from "@/lib/emissions/mock";
import { createGeminiClient } from "@/lib/gemini/client";
import type { EmissionFactor, EmissionsSource } from "@/lib/emissions/types";
import type { AuditHotspot } from "@/features/audit/schemas";

const HOTSPOT_TOP_N = 5;
const HOTSPOT_MIN_SHARE = 0.05;
const ALTERNATIVES_PER_HOTSPOT = 4;

export type AuditEvent =
  | { event: "session-checked"; userEmail: string }
  | { event: "project-loaded"; projectName: string; bomItemCount: number }
  | { event: "factors-loaded"; factorCount: number; missingCodeCount: number }
  | {
      event: "hotspots-computed";
      totalKgCo2e: number;
      hotspotCount: number;
      hotspotPreview: { materialCode: string; totalKgCo2e: number; share: number }[];
    }
  | { event: "alternatives-loaded"; alternativeCount: number }
  | { event: "gemini-asking"; model: string; hotspotCount: number }
  | { event: "gemini-responded"; rawSuggestionCount: number }
  | { event: "persisted"; suggestionCount: number; auditRunId: string }
  | {
      event: "complete";
      auditRunId: string;
      totalKgCo2e: number;
      hotspotCount: number;
      suggestionCount: number;
    }
  | { event: "error"; message: string };

function pickEmissionsSource(): EmissionsSource {
  const mode = process.env.EMISSIONS_SOURCE ?? "mock";
  if (mode === "mock") return createMockEmissionsSource();
  throw new Error(`EMISSIONS_SOURCE=${mode} not implemented yet (only "mock" is wired).`);
}

async function upsertSessionUser() {
  const session = await auth0.getSession();
  if (!session?.user?.sub) return null;
  return {
    user: await prisma.user.upsert({
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
    }),
    session,
  };
}

export async function* streamAudit(): AsyncGenerator<AuditEvent> {
  const me = await upsertSessionUser();
  if (!me) {
    yield { event: "error", message: "Not signed in." };
    return;
  }
  yield { event: "session-checked", userEmail: me.session.user.email ?? me.session.user.sub! };

  const project =
    (await prisma.project.findFirst({ where: { ownerId: me.user.id } })) ??
    (await prisma.project.findFirst());
  if (!project) {
    yield { event: "error", message: "No projects in DB. Run `npm run db:seed`." };
    return;
  }

  const items = await prisma.bomItem.findMany({
    where: { projectId: project.id },
    include: { material: true },
  });
  if (items.length === 0) {
    yield { event: "error", message: `Project ${project.name} has no BOM items.` };
    return;
  }
  yield { event: "project-loaded", projectName: project.name, bomItemCount: items.length };

  const auditRun = await prisma.auditRun.create({
    data: {
      projectId: project.id,
      status: "RUNNING",
      reviewStatus: "AWAITING_REVIEW",
      slaDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  });

  try {
    const emissions = pickEmissionsSource();

    const codes = Array.from(new Set(items.map((i) => i.material.code)));
    const factors = await emissions.queryByMaterialCodes(codes);
    const factorByCode = new Map(factors.map((f) => [f.materialCode, f]));
    const missingCodes = codes.filter((c) => !factorByCode.has(c));
    yield {
      event: "factors-loaded",
      factorCount: factors.length,
      missingCodeCount: missingCodes.length,
    };

    const itemTotals = items.map((item) => {
      const factor = factorByCode.get(item.material.code);
      const kgCo2ePerUnit = factor?.kgCo2ePerUnit ?? 0;
      return {
        item,
        factor,
        kgCo2ePerUnit,
        totalKgCo2e: kgCo2ePerUnit * item.quantity,
      };
    });

    const projectTotal = itemTotals.reduce((s, x) => s + x.totalKgCo2e, 0);

    const hotspots: AuditHotspot[] = itemTotals
      .filter((x) => x.factor && projectTotal > 0)
      .sort((a, b) => b.totalKgCo2e - a.totalKgCo2e)
      .slice(0, HOTSPOT_TOP_N)
      .filter((x) => x.totalKgCo2e / projectTotal >= HOTSPOT_MIN_SHARE)
      .map((x) => ({
        bomItemId: x.item.id,
        materialCode: x.item.material.code,
        materialName: x.item.material.name,
        category: x.item.material.category,
        quantity: x.item.quantity,
        unit: x.item.unit,
        kgCo2ePerUnit: x.kgCo2ePerUnit,
        totalKgCo2e: x.totalKgCo2e,
        shareOfProject: x.totalKgCo2e / projectTotal,
      }));

    yield {
      event: "hotspots-computed",
      totalKgCo2e: projectTotal,
      hotspotCount: hotspots.length,
      hotspotPreview: hotspots.slice(0, 3).map((h) => ({
        materialCode: h.materialCode,
        totalKgCo2e: h.totalKgCo2e,
        share: h.shareOfProject,
      })),
    };

    const alternativesByCode: Record<string, EmissionFactor[]> = {};
    let altCount = 0;
    for (const h of hotspots) {
      const alts = await emissions.queryLowerCarbonAlternatives(
        h.category,
        h.kgCo2ePerUnit,
        ALTERNATIVES_PER_HOTSPOT,
      );
      alternativesByCode[h.materialCode] = alts;
      altCount += alts.length;
    }
    yield { event: "alternatives-loaded", alternativeCount: altCount };

    let suggestionCount = 0;
    if (hotspots.length > 0) {
      const apiKey = process.env.GEMINI_API_KEY;
      const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");

      yield { event: "gemini-asking", model, hotspotCount: hotspots.length };

      const gemini = createGeminiClient(apiKey, model);
      const proposals = await gemini.proposeSubstitutions({
        hotspots,
        alternativesByMaterialCode: alternativesByCode,
      });

      yield { event: "gemini-responded", rawSuggestionCount: proposals.length };

      const byOriginalCode = new Map(hotspots.map((h) => [h.materialCode, h]));

      for (const p of proposals) {
        const hotspot = byOriginalCode.get(p.originalMaterialCode);
        if (!hotspot || !p.proposedMaterialCode || p.kgCo2eSavedEstimate == null) continue;

        await prisma.suggestion.create({
          data: {
            auditRunId: auditRun.id,
            originalItemId: hotspot.bomItemId,
            proposedMaterialCode: p.proposedMaterialCode,
            proposedMaterialName: p.proposedMaterialName ?? p.proposedMaterialCode,
            kgCo2eSaved: p.kgCo2eSavedEstimate,
            technicalRationale: p.technicalRationale,
            riskNotes: p.riskNotes ?? null,
            status: "PENDING",
          },
        });
        suggestionCount += 1;
      }
    }

    await prisma.auditRun.update({
      where: { id: auditRun.id },
      data: {
        status: "COMPLETED",
        totalKgCo2e: projectTotal,
        hotspotCount: hotspots.length,
        completedAt: new Date(),
        reviewStatus: suggestionCount === 0 ? "CLEARED" : "AWAITING_REVIEW",
      },
    });

    yield { event: "persisted", suggestionCount, auditRunId: auditRun.id };

    revalidatePath("/");

    yield {
      event: "complete",
      auditRunId: auditRun.id,
      totalKgCo2e: projectTotal,
      hotspotCount: hotspots.length,
      suggestionCount,
    };
  } catch (err) {
    await prisma.auditRun.update({
      where: { id: auditRun.id },
      data: {
        status: "FAILED",
        error: err instanceof Error ? err.message : String(err),
        completedAt: new Date(),
      },
    });
    yield { event: "error", message: err instanceof Error ? err.message : String(err) };
  }
}
