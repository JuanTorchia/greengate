"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PillButton } from "@/components/ui/pill-button";
import type { AuditEvent } from "@/features/audit/server/run-audit";

type LogLine = { ts: number; text: string; tone: "info" | "ok" | "warn" | "err" };

function eventToLine(evt: AuditEvent): LogLine | null {
  const ts = Date.now();
  switch (evt.event) {
    case "session-checked":
      return { ts, tone: "info", text: `Session OK · ${evt.userEmail}` };
    case "project-loaded":
      return {
        ts,
        tone: "info",
        text: `Loaded project "${evt.projectName}" · ${evt.bomItemCount} BOM items`,
      };
    case "factors-loaded":
      return {
        ts,
        tone: evt.missingCodeCount > 0 ? "warn" : "ok",
        text: `Fetched ${evt.factorCount} ICE emission factors${
          evt.missingCodeCount > 0 ? ` · ${evt.missingCodeCount} codes missing` : ""
        }`,
      };
    case "hotspots-computed": {
      const total = Math.round(evt.totalKgCo2e).toLocaleString();
      const preview = evt.hotspotPreview
        .map(
          (h) =>
            `${h.materialCode} (${Math.round(h.totalKgCo2e).toLocaleString()} kg, ${(
              h.share * 100
            ).toFixed(0)}%)`,
        )
        .join(", ");
      return {
        ts,
        tone: "ok",
        text: `Project total: ${total} kg CO₂e · ${evt.hotspotCount} hotspot${
          evt.hotspotCount === 1 ? "" : "s"
        }${preview ? ` → ${preview}` : ""}`,
      };
    }
    case "alternatives-loaded":
      return {
        ts,
        tone: "info",
        text: `Found ${evt.alternativeCount} lower-carbon alternative${
          evt.alternativeCount === 1 ? "" : "s"
        } across categories`,
      };
    case "gemini-asking":
      return {
        ts,
        tone: "info",
        text: `Asking ${evt.model} for substitutions on ${evt.hotspotCount} hotspot${
          evt.hotspotCount === 1 ? "" : "s"
        }…`,
      };
    case "gemini-responded":
      return {
        ts,
        tone: "ok",
        text: `Gemini returned ${evt.rawSuggestionCount} proposal${
          evt.rawSuggestionCount === 1 ? "" : "s"
        }`,
      };
    case "persisted":
      return {
        ts,
        tone: "ok",
        text: `Persisted ${evt.suggestionCount} suggestion${
          evt.suggestionCount === 1 ? "" : "s"
        } (audit run ${evt.auditRunId.slice(-6)})`,
      };
    case "complete":
      return null;
    case "error":
      return { ts, tone: "err", text: `Error: ${evt.message}` };
  }
}

const toneClass: Record<LogLine["tone"], string> = {
  info: "text-ink/80",
  ok: "text-brand-accent",
  warn: "text-warning",
  err: "text-danger",
};

export function RunAuditButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);
  const [done, setDone] = useState<Extract<AuditEvent, { event: "complete" }> | null>(null);

  async function onClick() {
    setBusy(true);
    setLog([]);
    setDone(null);

    const res = await fetch("/api/audit", { method: "POST" });
    if (!res.ok || !res.body) {
      setLog((l) => [
        ...l,
        { ts: Date.now(), tone: "err", text: `HTTP ${res.status}: ${res.statusText}` },
      ]);
      setBusy(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split("\n\n");
        buffer = messages.pop() ?? "";
        for (const m of messages) {
          if (!m.startsWith("data: ")) continue;
          let evt: AuditEvent;
          try {
            evt = JSON.parse(m.slice(6)) as AuditEvent;
          } catch {
            continue;
          }
          if (evt.event === "complete") setDone(evt);
          const line = eventToLine(evt);
          if (line) setLog((l) => [...l, line]);
        }
      }
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <PillButton onClick={onClick} disabled={busy}>
        {busy ? "Running audit…" : "Run audit"}
      </PillButton>

      {log.length > 0 && (
        <ul className="space-y-1 rounded-md border border-border bg-canvas p-3 font-mono text-xs leading-relaxed text-ink/80">
          {log.map((line, i) => (
            <li key={i} className={toneClass[line.tone]}>
              <span className="text-muted">›</span> {line.text}
            </li>
          ))}
          {busy && (
            <li className="text-muted">
              <span className="text-muted">›</span> <span className="animate-pulse">working…</span>
            </li>
          )}
        </ul>
      )}

      {done && (
        <p className="text-sm text-brand-accent">
          ✓ Audit complete. Project total:{" "}
          <strong>{Math.round(done.totalKgCo2e).toLocaleString()} kg CO₂e</strong> · {done.hotspotCount}{" "}
          hotspot{done.hotspotCount === 1 ? "" : "s"} → {done.suggestionCount} suggestion
          {done.suggestionCount === 1 ? "" : "s"} ready for approval below.
        </p>
      )}
    </div>
  );
}
