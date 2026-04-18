import { cn } from "@/lib/utils";

export type StatusKind = "URGENT" | "AWAITING" | "IN_REVIEW" | "CLEARED";

const styles: Record<StatusKind, { dot: string; label: string; text: string; bg: string }> = {
  URGENT:    { dot: "bg-danger",       label: "URGENT",    text: "text-danger",       bg: "bg-danger/10" },
  AWAITING:  { dot: "bg-warning",      label: "AWAITING",  text: "text-warning",      bg: "bg-warning/10" },
  IN_REVIEW: { dot: "bg-brand-teal",   label: "IN REVIEW", text: "text-brand-teal",   bg: "bg-brand-teal/10" },
  CLEARED:   { dot: "bg-brand-accent", label: "CLEARED",   text: "text-brand-primary",bg: "bg-brand-accent/10" },
};

export function StatusBadge({ kind, className }: { kind: StatusKind; className?: string }) {
  const s = styles[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
        s.bg,
        s.text,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}
