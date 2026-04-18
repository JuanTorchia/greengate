"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PillButton } from "@/components/ui/pill-button";
import {
  requestBatchApproval,
  checkBatchApproval,
  type CheckBatchState,
} from "@/features/audit/server/approvals";

type Local =
  | { kind: "idle" }
  | { kind: "initiating" }
  | { kind: "pushed"; authReqId: string; bindingMessage: string; count: number; totalSaved: number; startedAt: number }
  | { kind: "approved"; appliedCount: number }
  | { kind: "denied"; reason: string }
  | { kind: "expired" }
  | { kind: "error"; message: string };

const POLL_MS = 6000;
const MAX_TOTAL_MS = 5 * 60 * 1000;

async function pollBatch(
  authReqId: string,
  auditRunId: string,
  startedAt: number,
  setState: (s: Local) => void,
) {
  while (Date.now() - startedAt < MAX_TOTAL_MS) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    const res: CheckBatchState = await checkBatchApproval(authReqId, auditRunId);
    if (res.kind === "approved") return setState({ kind: "approved", appliedCount: res.appliedCount });
    if (res.kind === "denied")   return setState({ kind: "denied", reason: res.reason });
    if (res.kind === "expired")  return setState({ kind: "expired" });
    if (res.kind === "error")    return setState({ kind: "error", message: res.message });
  }
  setState({ kind: "expired" });
}

export function BatchApprovalModal({
  auditRunId,
  pendingCount,
  totalSaved,
  approverName,
  approverRole,
  preview,
}: {
  auditRunId: string;
  pendingCount: number;
  totalSaved: number;
  approverName: string;
  approverRole: string;
  preview: Array<{ originalCode: string; proposedCode: string; saved: number }>;
}) {
  const [state, setState] = useState<Local>({ kind: "idle" });
  const [open, setOpen] = useState(false);

  async function onSend() {
    setState({ kind: "initiating" });
    const res = await requestBatchApproval(auditRunId);
    if (res.kind === "error") {
      setState({ kind: "error", message: res.message });
      return;
    }
    const startedAt = Date.now();
    setState({
      kind: "pushed",
      authReqId: res.authReqId,
      bindingMessage: res.bindingMessage,
      count: res.count,
      totalSaved: res.totalSaved,
      startedAt,
    });
    pollBatch(res.authReqId, auditRunId, startedAt, setState);
  }

  const bindingPreview = preview
    .map((p) => `• ${p.originalCode} → ${p.proposedCode}  (−${Math.round(p.saved).toLocaleString()})`)
    .join("\n");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <PillButton size="sm">
          Approve all · {Math.round(totalSaved).toLocaleString()} kg ↓
        </PillButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl bg-card">
        <DialogHeader>
          <DialogTitle className="font-[var(--font-display)] text-xl text-brand-primary">
            Approve {pendingCount} substitutions
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-ink/80">
          A single CIBA push will be sent to <strong>{approverName}</strong> ({approverRole}) with this binding message:
        </p>
        <pre className="rounded-md border border-border bg-canvas p-3 font-[var(--font-mono)] text-[11px] text-ink/80 whitespace-pre-wrap">
{`Approve ${pendingCount} subs on audit ${auditRunId.slice(-6)}:
${bindingPreview}
Total delta: −${Math.round(totalSaved).toLocaleString()} kg CO2e`}
        </pre>
        <p className="text-xs text-muted">
          Approving one push signs off on all {pendingCount}. Rejecting rejects all {pendingCount}.
        </p>

        {state.kind === "idle" && (
          <div className="flex justify-end gap-3 pt-4">
            <PillButton variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</PillButton>
            <PillButton size="sm" onClick={onSend}>Send single CIBA push</PillButton>
          </div>
        )}
        {state.kind === "initiating" && <p className="pt-4 text-sm text-muted">Sending push…</p>}
        {state.kind === "pushed" && (
          <p className="pt-4 text-sm text-ink">
            <span className="mr-2 inline-flex gap-1 align-middle">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning [animation-delay:300ms]" />
            </span>
            📱 Push sent — waiting for {approverName} to approve {state.count} substitutions…
          </p>
        )}
        {state.kind === "approved" && (
          <p className="pt-4 text-sm text-brand-primary">
            ✓ Approved — {state.appliedCount} substitutions applied. Reload to see updated stats.
          </p>
        )}
        {state.kind === "denied"   && <p className="pt-4 text-sm text-danger">✗ Rejected — {state.reason}</p>}
        {state.kind === "expired"  && <p className="pt-4 text-sm text-warning">⏱ Push expired.</p>}
        {state.kind === "error"    && <p className="pt-4 text-sm text-danger">{state.message}</p>}
      </DialogContent>
    </Dialog>
  );
}
