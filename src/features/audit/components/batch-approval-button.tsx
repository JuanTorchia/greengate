"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  requestBatchApproval,
  checkBatchApproval,
  type CheckBatchState,
} from "@/features/audit/server/approvals";

type Local =
  | { kind: "idle" }
  | { kind: "initiating" }
  | { kind: "polling"; authReqId: string; bindingMessage: string; count: number; totalSaved: number }
  | { kind: "approved"; appliedCount: number }
  | { kind: "denied"; reason: string }
  | { kind: "expired" }
  | { kind: "error"; message: string };

const INITIAL_POLL_DELAY_MS = 6000;
const MAX_TOTAL_MS = 5 * 60 * 1000;

async function pollUntilDecided(
  authReqId: string,
  auditRunId: string,
  setState: (s: Local) => void,
  context: { bindingMessage: string; count: number; totalSaved: number },
) {
  const start = Date.now();
  let nextDelay = INITIAL_POLL_DELAY_MS;
  while (Date.now() - start < MAX_TOTAL_MS) {
    await new Promise((r) => setTimeout(r, nextDelay));
    let result: CheckBatchState;
    try {
      result = await checkBatchApproval(authReqId, auditRunId);
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : String(e) });
      return;
    }
    if (result.kind === "pending") {
      nextDelay = result.nextPollMs;
      setState({ kind: "polling", authReqId, ...context });
      continue;
    }
    if (result.kind === "approved") setState({ kind: "approved", appliedCount: result.appliedCount });
    else if (result.kind === "denied") setState({ kind: "denied", reason: result.reason });
    else if (result.kind === "expired") setState({ kind: "expired" });
    else setState({ kind: "error", message: result.message });
    return;
  }
  setState({ kind: "expired" });
}

export function BatchApprovalButton({
  auditRunId,
  pendingCount,
  totalSaved,
}: {
  auditRunId: string;
  pendingCount: number;
  totalSaved: number;
}) {
  const router = useRouter();
  const [state, setState] = useState<Local>({ kind: "idle" });

  async function onClick() {
    setState({ kind: "initiating" });
    const r = await requestBatchApproval(auditRunId);
    if (r.kind === "error") {
      setState({ kind: "error", message: r.message });
      return;
    }
    setState({
      kind: "polling",
      authReqId: r.authReqId,
      bindingMessage: r.bindingMessage,
      count: r.count,
      totalSaved: r.totalSaved,
    });
    void pollUntilDecided(r.authReqId, auditRunId, (next) => {
      setState(next);
      if (next.kind === "approved") router.refresh();
    }, {
      bindingMessage: r.bindingMessage,
      count: r.count,
      totalSaved: r.totalSaved,
    });
  }

  const busy = state.kind === "initiating" || state.kind === "polling";

  return (
    <div className="space-y-2 rounded-md border border-emerald-300 bg-emerald-50/40 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            Approve all {pendingCount} pending substitution{pendingCount === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-muted-foreground">
            Single CIBA push covering the full batch — total savings:{" "}
            <strong>{Math.round(totalSaved).toLocaleString()} kg CO₂e</strong>.
          </p>
        </div>
        <Button onClick={onClick} disabled={busy}>
          {busy ? "Waiting for push…" : "Approve all"}
        </Button>
      </div>
      {state.kind === "polling" && (
        <p className="text-xs text-muted-foreground">
          One push covers all {state.count}. Open Auth0 Guardian and approve or deny.
          <br />
          <span className="font-mono">binding_message: {state.bindingMessage}</span>
        </p>
      )}
      {state.kind === "approved" && (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          ✓ Batch approved. {state.appliedCount} BOM substitutions applied.
        </p>
      )}
      {state.kind === "denied" && (
        <p className="text-sm text-rose-600 dark:text-rose-400">✗ Batch denied ({state.reason})</p>
      )}
      {state.kind === "expired" && (
        <p className="text-sm text-amber-600 dark:text-amber-400">⏱ Batch expired</p>
      )}
      {state.kind === "error" && (
        <p className="text-sm text-rose-600 dark:text-rose-400">Error: {state.message}</p>
      )}
    </div>
  );
}
