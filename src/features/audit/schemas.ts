import { z } from "zod";

export {
  SuggestionProposalSchema,
  SuggestionProposalListSchema,
  type SuggestionProposal,
  type SuggestionProposalList,
} from "@/lib/gemini/prompts/audit-suggestion";

export const AuditHotspotSchema = z.object({
  bomItemId: z.string(),
  materialCode: z.string(),
  materialName: z.string(),
  category: z.string(),
  quantity: z.number().nonnegative(),
  unit: z.string(),
  kgCo2ePerUnit: z.number().nonnegative(),
  totalKgCo2e: z.number().nonnegative(),
  shareOfProject: z.number().min(0).max(1),
});

export type AuditHotspot = z.infer<typeof AuditHotspotSchema>;
