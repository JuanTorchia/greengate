import Link from "next/link";
import { cn } from "@/lib/utils";

const chips = [
  { key: "ALL",        label: "All" },
  { key: "AWAITING",   label: "Awaiting" },
  { key: "IN_REVIEW",  label: "In review" },
  { key: "CLEARED",    label: "Cleared" },
] as const;

export function FilterChips({ active }: { active: (typeof chips)[number]["key"] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => {
        const href = c.key === "ALL" ? "/app" : `/app?status=${c.key.toLowerCase()}`;
        const isActive = c.key === active;
        return (
          <Link
            key={c.key}
            href={href}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
              isActive
                ? "bg-brand-accent text-white border-brand-accent"
                : "bg-card text-ink border-border hover:bg-canvas",
            )}
          >
            {c.label}
          </Link>
        );
      })}
    </div>
  );
}
