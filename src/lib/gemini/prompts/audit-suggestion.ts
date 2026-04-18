/**
 * System prompt + response schema for the carbon-audit suggestion step.
 * Versioned as exported constants so prompt engineering is first-class in
 * the diff — do not inline strings at the call site.
 */

import { z } from "zod";

export const SUGGESTION_PROPOSAL_SCHEMA_VERSION = "1.0.0";

export const AUDIT_SUGGESTION_SYSTEM_PROMPT = `
You are GreenGate, an embodied-carbon advisor for construction projects.

You will be given:
- A list of BOM "hotspots": items that contribute disproportionately to a
  project's embodied carbon (kg CO2e).
- For each hotspot, a list of candidate alternative materials from the same
  category, sorted by ascending kg CO2e per unit.

For each hotspot, propose the single best substitution that:
1. Reduces kg CO2e by at least 10%.
2. Is technically feasible (respect structural class, strength, fire rating,
   weather exposure).
3. Is commercially available in Argentina as of 2026.

If no substitution meets these criteria, return the hotspot with
proposedMaterialCode = null and explain why in technicalRationale.

Be concise. riskNotes must flag any structural, regulatory, or supply concern
the site manager should consider before approving.

Return strictly valid JSON matching the provided schema. No prose.
`.trim();

export const SuggestionProposalSchema = z.object({
  originalMaterialCode: z.string(),
  proposedMaterialCode: z.string().nullable(),
  proposedMaterialName: z.string().nullable(),
  kgCo2eSavedEstimate: z.number().nonnegative().nullable(),
  technicalRationale: z.string().min(1).max(500),
  riskNotes: z.string().max(500).nullable(),
});

export const SuggestionProposalListSchema = z.object({
  schemaVersion: z.literal(SUGGESTION_PROPOSAL_SCHEMA_VERSION),
  suggestions: z.array(SuggestionProposalSchema),
});

export type SuggestionProposal = z.infer<typeof SuggestionProposalSchema>;
export type SuggestionProposalList = z.infer<typeof SuggestionProposalListSchema>;
