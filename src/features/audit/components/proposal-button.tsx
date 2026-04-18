"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  proposeDummyChange,
  checkApproval,
  type ApprovalState,
} from "@/features/audit/server/dummy-proposal";

type LocalState =
  | { kind: "idle" }
  | { kind: "initiating" }
  | { kind: "polling"; suggestionId: string; authReqId: string }
  | { kind: "approved"; approvalId: string }
  | { kind: "denied"; reason: string }
  | { kind: "expired" }
  | { kind: "error"; message: string };

const INITIAL_POLL_DELAY_MS = 6000;
const MAX_TOTAL_MS = 5 * 60 * 1000; // 5 minutes hard cap

async function pollUntilDecided(
  authReqId: string,
  suggestionId: string,
  setState: (s: LocalState) => void,
) {
  const start = Date.now();
  let nextDelay = INITIAL_POLL_DELAY_MS;
  while (Date.now() - start < MAX_TOTAL_MS) {
    await new Promise((r) => setTimeout(r, nextDelay));
    let result: ApprovalState;
    try {
      result = await checkApproval(authReqId, suggestionId);
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : String(e) });
      return;
    }
    if (result.kind === "pending") {
      nextDelay = result.nextPollMs;
      continue;
    }
    if (result.kind === "approved") setState({ kind: "approved", approvalId: result.approvalId });
    else if (result.kind === "denied") setState({ kind: "denied", reason: result.reason });
    else if (result.kind === "expired") setState({ kind: "expired" });
    else setState({ kind: "error", message: result.message });
    return;
  }
  setState({ kind: "expired" });
}

export function ProposalButton() {
  const [state, setState] = useState<LocalState>({ kind: "idle" });

  async function onClick() {
    setState({ kind: "initiating" });
    const r = await proposeDummyChange();
    if (r.kind === "error") {
      setState({ kind: "error", message: r.message });
      return;
    }
    setState({ kind: "polling", suggestionId: r.suggestionId, authReqId: r.authReqId });
    void pollUntilDecided(r.authReqId, r.suggestionId, setState);
  }

  const busy = state.kind === "initiating" || state.kind === "polling";

  return (
    <div className="space-y-3">
      <Button onClick={onClick} disabled={busy}>
        {busy ? "Waiting for approval…" : "Propose a test change"}
      </Button>

      {state.kind === "polling" && (
        <p className="text-sm text-muted-foreground">
          Push sent. Open Auth0 Guardian on your phone and approve or deny.
          <br />
          <span className="font-mono text-xs">auth_req_id: {state.authReqId}</span>
        </p>
      )}

      {state.kind === "approved" && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          ✓ Approved. Persisted as Approval <span className="font-mono">{state.approvalId}</span>
        </p>
      )}

      {state.kind === "denied" && (
        <p className="text-sm text-rose-600 dark:text-rose-400">
          ✗ Denied ({state.reason})
        </p>
      )}

      {state.kind === "expired" && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          ⏱ Expired without a decision.
        </p>
      )}

      {state.kind === "error" && (
        <p className="text-sm text-rose-600 dark:text-rose-400">Error: {state.message}</p>
      )}
    </div>
  );
}
