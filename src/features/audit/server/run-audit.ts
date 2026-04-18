"use server";

/**
 * Main audit orchestrator server action.
 *
 * Data flow (see PLAN.md and README.md for full context):
 *   1. Authenticate the request (Auth0 session).
 *   2. Load the project's BOM from Postgres.
 *   3. Fetch emission factors from Snowflake (or mock).
 *   4. Compute per-item kg CO2e and flag top-N hotspots.
 *   5. Query lower-carbon alternatives per hotspot category.
 *   6. Call Gemini with hotspots + alternatives → structured suggestions.
 *   7. For each suggestion, initiate an Auth0 CIBA request.
 *   8. Persist AuditRun + Suggestions (status: PENDING). Client polls.
 *   9. On approval, update the BOM and persist Approval with auth_req_id.
 *  10. Return updated totals for the UI to animate.
 */

import type { AuditHotspot, SuggestionProposal } from "@/features/audit/schemas";

export interface RunAuditInput {
  projectId: string;
}

export interface RunAuditResult {
  auditRunId: string;
  totalKgCo2e: number;
  hotspots: AuditHotspot[];
  suggestions: SuggestionProposal[];
}

export async function runAudit(_input: RunAuditInput): Promise<RunAuditResult> {
  // TODO 1: Authenticate the request via Auth0 session (getSession()).
  // TODO 2: Load project BOM (Prisma: project + items + material).
  // TODO 3: Pick EmissionsSource based on EMISSIONS_SOURCE env var
  //         (mock vs snowflake) and fetch factors for each BOM material code.
  // TODO 4: Compute totalKgCo2e per item, sort desc, select top-N contributing
  //         >= X% of project total (start with top 5 or >= 10% share).
  // TODO 5: For each hotspot, query lower-carbon alternatives in the same
  //         category via EmissionsSource.queryLowerCarbonAlternatives.
  // TODO 6: Ask Gemini for SuggestionProposal[] (validated with Zod).
  // TODO 7: Persist AuditRun and pending Suggestions in a single transaction.
  // TODO 8: For each Suggestion, initiateCiba() with a concise binding_message.
  //         Persist auth_req_id on the Suggestion row so the poller can find it.
  // TODO 9: Return auditRunId + hotspots + suggestions. Poller server action
  //         handles approval/denial and writes Approval + BOM mutation.
  throw new Error("not implemented");
}
