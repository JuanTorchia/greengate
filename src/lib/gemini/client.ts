/**
 * Google Gemini wrapper producing typed structured output.
 * Uses responseMimeType=application/json + Zod validation at the boundary.
 * On parse failure, retries once with the validation error fed back into
 * the prompt (two-call pattern from PLAN.md Risk #3 mitigation).
 *
 *   https://ai.google.dev/gemini-api/docs/structured-output
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { z } from "zod";
import type { EmissionFactor } from "@/lib/emissions/types";
import type { AuditHotspot } from "@/features/audit/schemas";
import {
  AUDIT_SUGGESTION_SYSTEM_PROMPT,
  SUGGESTION_PROPOSAL_SCHEMA_VERSION,
  SuggestionProposalListSchema,
  type SuggestionProposal,
} from "@/lib/gemini/prompts/audit-suggestion";

export interface GeminiClient {
  proposeSubstitutions(input: {
    hotspots: AuditHotspot[];
    alternativesByMaterialCode: Record<string, EmissionFactor[]>;
  }): Promise<SuggestionProposal[]>;
}

interface InternalContext {
  apiKey: string;
  model: string;
}

export function createGeminiClient(apiKey: string, model: string): GeminiClient {
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing");
  const ctx: InternalContext = { apiKey, model };

  return {
    async proposeSubstitutions({ hotspots, alternativesByMaterialCode }) {
      const userPrompt = buildSuggestionPrompt(hotspots, alternativesByMaterialCode);
      const result = await callWithSchemaInternal(
        ctx,
        AUDIT_SUGGESTION_SYSTEM_PROMPT,
        userPrompt,
        SuggestionProposalListSchema,
      );
      return result.suggestions;
    },
  };
}

function buildSuggestionPrompt(
  hotspots: AuditHotspot[],
  alternativesByCode: Record<string, EmissionFactor[]>,
): string {
  const payload = {
    schemaVersion: SUGGESTION_PROPOSAL_SCHEMA_VERSION,
    hotspots: hotspots.map((h) => ({
      bomItemId: h.bomItemId,
      materialCode: h.materialCode,
      materialName: h.materialName,
      category: h.category,
      quantity: h.quantity,
      unit: h.unit,
      kgCo2ePerUnit: h.kgCo2ePerUnit,
      totalKgCo2e: Math.round(h.totalKgCo2e),
      shareOfProject: Number(h.shareOfProject.toFixed(3)),
      candidateAlternatives: (alternativesByCode[h.materialCode] ?? []).map((a) => ({
        materialCode: a.materialCode,
        materialName: a.materialName,
        kgCo2ePerUnit: a.kgCo2ePerUnit,
        unit: a.unit,
      })),
    })),
  };

  const schemaSpec = `
Respond with strict JSON of shape:
{
  "schemaVersion": "${SUGGESTION_PROPOSAL_SCHEMA_VERSION}",
  "suggestions": [
    {
      "originalMaterialCode": "<string matching one of the hotspots>",
      "proposedMaterialCode": "<string from candidateAlternatives, or null>",
      "proposedMaterialName": "<string, or null>",
      "kgCo2eSavedEstimate": <non-negative number, or null>,
      "technicalRationale": "<string, max 500 chars>",
      "riskNotes": "<string max 500 chars, or null>"
    }
  ]
}
No markdown, no fences, no commentary outside the JSON.
`.trim();

  return `${schemaSpec}\n\nINPUT:\n${JSON.stringify(payload, null, 2)}`;
}

async function callWithSchemaInternal<T>(
  ctx: InternalContext,
  systemInstruction: string,
  userPrompt: string,
  schema: z.ZodType<T>,
  maxRetries = 1,
): Promise<T> {
  const genAI = new GoogleGenerativeAI(ctx.apiKey);
  const model = genAI.getGenerativeModel({
    model: ctx.model,
    systemInstruction,
    generationConfig: { responseMimeType: "application/json" },
  });

  let lastError: unknown = null;
  let prompt = userPrompt;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const res = await model.generateContent(prompt);
    const text = res.response.text();

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      lastError = e;
      prompt = `${userPrompt}\n\nYour previous response was not valid JSON. Error: ${
        e instanceof Error ? e.message : String(e)
      }\n\nReturn only valid JSON.`;
      continue;
    }

    const result = schema.safeParse(parsed);
    if (result.success) return result.data;

    lastError = result.error;
    prompt = `${userPrompt}\n\nYour previous response did not match the schema. Errors:\n${result.error.issues
      .map((i) => `- ${i.path.join(".")}: ${i.message}`)
      .join("\n")}\n\nReturn only valid JSON matching the schema.`;
  }

  throw new Error(
    `Gemini structured output failed after ${maxRetries + 1} attempts. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

export async function callWithSchema<T>(
  prompt: string,
  schema: z.ZodType<T>,
  opts?: { maxRetries?: number; apiKey?: string; model?: string },
): Promise<T> {
  const apiKey = opts?.apiKey ?? process.env.GEMINI_API_KEY;
  const model = opts?.model ?? process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing");
  return callWithSchemaInternal(
    { apiKey, model },
    "Return strictly valid JSON. No prose.",
    prompt,
    schema,
    opts?.maxRetries ?? 1,
  );
}
