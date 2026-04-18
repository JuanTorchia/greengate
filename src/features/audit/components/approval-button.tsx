"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  requestApproval,
  checkApproval,
  type CheckApprovalState,
} from "@/features/audit/server/approvals";

type Local =
  | { kind: "idle" }
  | { kind: "initiating" }
  | { kind: "polling"; authReqId: string; bindingMessage: string }
  | { kind: "approved"; approvalId: string }
  | { kind: "denied"; reason: string }
  | { kind: "expired" }
  | { kind: "error"; message: string };

const INITIAL_POLL_DELAY_MS = 6000;
const MAX_TOTAL_MS = 5 * 60 * 1000;

async function pollUntilDecided(
  authReqId: string,
  suggestionId: string,
  setState: (s: Local) => void,
  bindingMessage: string,
) {
  const start = Date.now();
  let nextDelay = INITIAL_POLL_DELAY_MS;
  while (Date.now() - start < MAX_TOTAL_MS) {
    await new Promise((r) => setTimeout(r, nextDelay));
    let result: CheckApprovalState;
    try {
      result = await checkApproval(authReqId, suggestionId);
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : String(e) });
      return;
    }
    if (result.kind === "pending") {
      nextDelay = result.nextPollMs;
      setState({ kind: "polling", authReqId, bindingMessage });
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

export function ApprovalButton({ suggestionId }: { suggestionId: string }) {
  const [state, setState] = useState<Local>({ kind: "idle" });

  async function onClick() {
    setState({ kind: "initiating" });
    const r = await requestApproval(suggestionId);
    if (r.kind === "error") {
      setState({ kind: "error", message: r.message });
      return;
    }
    setState({ kind: "polling", authReqId: r.authReqId, bindingMessage: r.bindingMessage });
    void pollUntilDecided(r.authReqId, suggestionId, setState, r.bindingMessage);
  }

  const busy = state.kind === "initiating" || state.kind === "polling";

  if (state.kind === "approved") {
    return (
      <p className="text-sm text-emerald-600 dark:text-emerald-400">
        ✓ Approved. Approval id: <span className="font-mono">{state.approvalId}</span>
      </p>
    );
  }
  if (state.kind === "denied") {
    return <p className="text-sm text-rose-600 dark:text-rose-400">✗ Denied ({state.reason})</p>;
  }
  if (state.kind === "expired") {
    return <p className="text-sm text-amber-600 dark:text-amber-400">⏱ Expired</p>;
  }
  if (state.kind === "error") {
    return <p className="text-sm text-rose-600 dark:text-rose-400">Error: {state.message}</p>;
  }

  return (
    <div className="space-y-2">
      <Button size="sm" onClick={onClick} disabled={busy}>
        {busy ? "Waiting for push…" : "Request approval"}
      </Button>
      {state.kind === "polling" && (
        <p className="text-xs text-muted-foreground">
          Push sent. Open Auth0 Guardian and approve or deny.
          <br />
          <span className="font-mono">binding_message: {state.bindingMessage}</span>
        </p>
      )}
    </div>
  );
}
