"use client";

import { useEffect, useState } from "react";
import { AnimatedKg } from "@/features/audit/components/animated-kg";
import { StatusBadge } from "@/components/ui/status-badge";

const TARGET = 14820;
const LOOP_MS = 6000;

export function LiveSuggestionCard() {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setValue((prev) => (prev === 0 ? TARGET : 0));
    }, LOOP_MS / 2);
    // First tick kicks it up immediately
    setTimeout(() => setValue(TARGET), 200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="font-[var(--font-display)] text-base font-medium text-ink">
          Torre Núñez — Core &amp; Shell
        </p>
        <StatusBadge kind="URGENT" />
      </div>
      <div className="mt-4 border-t border-border pt-4 text-sm">
        <p className="text-muted">
          Replace <span className="text-ink">CEM I 42.5 Portland</span>
        </p>
        <p className="text-muted">
          With <span className="text-ink">CEM III/A 42.5 (slag 50%)</span>
        </p>
      </div>
      <p className="mt-6 font-[var(--font-display)] text-4xl font-medium tracking-tight text-brand-primary">
        − <AnimatedKg value={value} /> <span className="text-muted text-xl">kg CO₂e</span>
      </p>
      <div className="mt-6 flex items-center gap-2 text-xs text-muted">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" />
        Approval pending · Ing. Acosta · push sent 00:12 ago
      </div>
    </div>
  );
}
