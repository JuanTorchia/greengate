"use client";

import { useEffect, useState } from "react";
import { PillButton } from "@/components/ui/pill-button";
import {
  requestApproval,
  checkApproval,
  type CheckApprovalState,
} from "@/features/audit/server/approvals";

type Local =
  | { kind: "idle" }
  | { kind: "initiating" }
  | { kind: "pushed"; authReqId: string; bindingMessage: string; startedAt: number }
  | { kind: "approved" }
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
  startedAt: number,
) {
  let nextDelay = INITIAL_POLL_DELAY_MS;
  while (Date.now() - startedAt < MAX_TOTAL_MS) {
    await new Promise((r) => setTimeout(r, nextDelay));
    const res: CheckApprovalState = await checkApproval(authReqId, suggestionId);
    if (res.kind === "approved") {
      setState({ kind: "approved" });
      return;
    }
    if (res.kind === "denied") {
      setState({ kind: "denied", reason: res.reason });
      return;
    }
    if (res.kind === "expired") {
      setState({ kind: "expired" });
      return;
    }
    if (res.kind === "error") {
      setState({ kind: "error", message: res.message });
      return;
    }
    nextDelay = res.nextPollMs ?? nextDelay;
    setState({ kind: "pushed", authReqId, bindingMessage, startedAt });
  }
  setState({ kind: "expired" });
}

function elapsed(startedAt: number): string {
  const s = Math.floor((Date.now() - startedAt) / 1000);
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

export function ApprovalButton({
  suggestionId,
  approverName,
  approverRole,
  saved,
  originalCode,
  proposedCode,
}: {
  suggestionId: string;
  approverName: string;
  approverRole: string;
  saved: number;
  originalCode: string;
  proposedCode: string;
}) {
  const [state, setState] = useState<Local>({ kind: "idle" });
  const [tick, setTick] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (state.kind !== "pushed") return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [state.kind]);

  async function onSend() {
    setState({ kind: "initiating" });
    const res = await requestApproval(suggestionId);
    if (res.kind === "error") {
      setState({ kind: "error", message: res.message });
      return;
    }
    const startedAt = Date.now();
    setState({ kind: "pushed", authReqId: res.authReqId, bindingMessage: res.bindingMessage, startedAt });
    pollUntilDecided(res.authReqId, suggestionId, setState, res.bindingMessage, startedAt);
  }

  if (state.kind === "idle" || state.kind === "error") {
    return (
      <div className="space-y-2">
        <PillButton onClick={onSend}>📱 Approve with Auth0 CIBA</PillButton>
        <p className="text-[11px] text-muted">
          Sends a push to {approverName} ({approverRole}).
        </p>
        {state.kind === "error" && <p className="text-xs text-danger">{state.message}</p>}
      </div>
    );
  }

  if (state.kind === "initiating") {
    return <p className="text-sm text-muted">Sending push…</p>;
  }

  if (state.kind === "pushed") {
    void tick; // referenced so the re-render ticks the timer
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-ink">
          <span className="flex gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning [animation-delay:300ms]" />
          </span>
          📱 Push sent to {approverName} · {elapsed(state.startedAt)} waiting…
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-[11px] text-muted underline underline-offset-2 hover:text-ink"
        >
          {expanded ? "Hide binding message" : "▸ Show binding message"}
        </button>
        {expanded && (
          <pre className="mt-1 rounded-md border border-border bg-canvas p-3 text-[11px] text-ink/80 whitespace-pre-wrap">
{`Approve substitution: ${originalCode} → ${proposedCode}.
Delta: −${Math.round(saved).toLocaleString()} kg CO2e.
Requested via GreenGate.`}
          </pre>
        )}
      </div>
    );
  }

  if (state.kind === "approved") {
    return <p className="text-sm text-brand-primary">✓ Approved by {approverName}</p>;
  }
  if (state.kind === "denied") {
    return <p className="text-sm text-danger">✗ Rejected — {state.reason}</p>;
  }
  // expired
  return (
    <div className="space-y-2">
      <p className="text-sm text-warning">⏱ Push expired — request a new approval.</p>
      <PillButton size="sm" onClick={onSend}>Retry</PillButton>
    </div>
  );
}
