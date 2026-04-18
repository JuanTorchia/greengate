/**
 * Google Gemini wrapper producing typed structured output.
 *
 * VERIFY: @google/generative-ai structured-output API (responseMimeType +
 * responseSchema), retry semantics, error shape.
 *   https://ai.google.dev/gemini-api/docs/structured-output
 *   https://ai.google.dev/gemini-api/docs/models/gemini
 */

import type { z } from "zod";
import type { EmissionFactor } from "@/lib/emissions/types";
import type { AuditHotspot } from "@/features/audit/schemas";
import type { SuggestionProposal } from "@/lib/gemini/prompts/audit-suggestion";

export interface GeminiClient {
  proposeSubstitutions(input: {
    hotspots: AuditHotspot[];
    alternativesByMaterialCode: Record<string, EmissionFactor[]>;
  }): Promise<SuggestionProposal[]>;
}

export function createGeminiClient(_apiKey: string, _model: string): GeminiClient {
  throw new Error("not implemented");
}

/**
 * Calls Gemini with a JSON-mode response and validates it against `schema`.
 * On validation failure, retries once with an error-feedback reprompt.
 */
export async function callWithSchema<T>(
  _prompt: string,
  _schema: z.ZodType<T>,
  _opts?: { maxRetries?: number },
): Promise<T> {
  throw new Error("not implemented");
}
