# GreenGate MVP Positioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the functional-but-prototype GreenGate home page into an inbox-first MVP with One Click LCA visual tokens, landing page, protected `/app` routes, and redesigned BOM detail with a five-state approval flow.

**Architecture:** Additive Prisma migration (new fields on `Project` and `AuditRun`). Tailwind 4 `@theme { ... }` CSS-first tokens in `globals.css` (no `tailwind.config.ts` — Tailwind 4 doesn't use one). `next/font/google` for Sora/Inter/Poppins/JetBrains Mono applied on the root layout. New protected shell under `src/app/app/`. Existing server actions (`approvals.ts`, `run-audit.ts`) are reused as-is except for a small reviewStatus recalc inside approval paths. New UI components live in `src/features/audit/components/`.

**Tech Stack:** Next.js 16 (App Router, RSC), TypeScript strict, Tailwind 4, Prisma + Postgres (Railway), `@auth0/nextjs-auth0` v4 + CIBA, Gemini structured output, framer-motion, lucide-react, shadcn/ui (already installed).

**Spec:** `docs/superpowers/specs/2026-04-18-greengate-mvp-positioning-design.md` (commit `13da8dc`).

**Verification strategy:** No automated tests in this repo. Every task ends with `npm run typecheck` and, where UI is touched, a manual smoke in `npm run dev` (documented per task). Commit after each task.

---

## File map

### Created

- `prisma/migrations/<timestamp>_mvp_positioning/migration.sql` — schema additions.
- `src/app/fonts.ts` — next/font exports.
- `src/app/app/layout.tsx` — protected shell: top bar, auth gate, container.
- `src/app/app/page.tsx` — inbox.
- `src/app/app/projects/[id]/page.tsx` — BOM detail.
- `src/features/inbox/components/top-bar.tsx`
- `src/features/inbox/components/stats-row.tsx`
- `src/features/inbox/components/filter-chips.tsx`
- `src/features/inbox/components/bom-card.tsx`
- `src/features/inbox/server/inbox-data.ts` — data loader for the inbox (stats, cards).
- `src/features/inbox/server/seed-demo.ts` — empty-state "Seed demo project" server action.
- `src/features/project-detail/components/project-header.tsx`
- `src/features/project-detail/components/summary-tiles.tsx`
- `src/features/project-detail/components/bom-table.tsx`
- `src/features/project-detail/components/suggestion-card.tsx`
- `src/features/project-detail/components/batch-approval-modal.tsx`
- `src/features/project-detail/server/project-detail-data.ts` — data loader for the project page.
- `src/features/landing/components/hero.tsx`
- `src/features/landing/components/pillars.tsx`
- `src/features/landing/components/how-it-works.tsx`
- `src/features/landing/components/landing-footer.tsx`
- `src/features/landing/components/live-suggestion-card.tsx` — animated hero mock.
- `src/components/ui/status-badge.tsx`
- `src/components/ui/pill-button.tsx`

### Modified

- `prisma/schema.prisma` — add fields and enum.
- `prisma/seed.ts` — full rewrite to three seeded projects.
- `src/app/layout.tsx` — apply font CSS variables and `bg-canvas`.
- `src/app/globals.css` — replace `@theme` block with One Click LCA tokens.
- `src/app/page.tsx` — redirect to `/app` when authenticated, render landing when not.
- `src/features/audit/components/approval-button.tsx` — redesign to match spec §6.5 (5 UI states, pill button, binding-message expander).
- `src/features/audit/components/batch-approval-button.tsx` — convert to a modal trigger that delegates to `batch-approval-modal.tsx`.
- `src/features/audit/components/run-audit-button.tsx` — restyle only (pill button, Sora 500 numbers) — no logic change.
- `src/features/audit/server/approvals.ts` — after each decision, recompute `AuditRun.reviewStatus`.
- `src/features/audit/server/run-audit.ts` — on zero-suggestion runs, set `reviewStatus = CLEARED`; on normal completion, set `AWAITING_REVIEW`. Set `slaDueAt = startedAt + 48h`.

### Preserved untouched

- `src/lib/auth0/{ciba,mgmt,mgmt-client}.ts`
- `src/lib/emissions/*`
- `src/lib/gemini/*`
- `src/lib/prisma.ts`
- `scripts/auth0-*.ts`
- The CIBA server action signatures — only internal recomputation is added.
- `src/components/ui/button.tsx` — `pill-button` is a new sibling, not a replacement.

---

## Task 1 — Prisma schema additions

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_mvp_positioning/migration.sql` (via `prisma migrate dev`)

**Context:** Adds `responsibleApproverName`/`responsibleApproverRole` on `Project`, `reviewStatus`/`slaDueAt` on `AuditRun`, and a new `ReviewStatus` enum. All additive; no destructive changes.

- [ ] **Step 1: Edit schema** — append the enum, then patch the two models.

Locate the `AuditStatus` enum block and add this enum **below it**:

```prisma
enum ReviewStatus {
  AWAITING_REVIEW
  IN_REVIEW
  CLEARED
}
```

In `model Project { ... }`, add **before** the `createdAt` line:

```prisma
  responsibleApproverName String @default("")
  responsibleApproverRole String @default("")
```

In `model AuditRun { ... }`, add **after** the `hotspotCount` line:

```prisma
  reviewStatus  ReviewStatus @default(AWAITING_REVIEW)
  slaDueAt      DateTime?
```

- [ ] **Step 2: Generate migration + client**

Run:
```bash
npm run db:migrate -- --name mvp_positioning
```

Expected: a new folder under `prisma/migrations/` and Prisma client regenerated.

- [ ] **Step 3: Typecheck**

Run:
```bash
npm run typecheck
```

Expected: `tsc --noEmit` exits with code 0. If any existing code references `reviewStatus` with the wrong casing, fix it.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/*_mvp_positioning
git commit -m "feat(db): add Project.responsibleApprover{Name,Role}, AuditRun.reviewStatus + slaDueAt"
```

---

## Task 2 — One Click LCA design tokens + `next/font` setup

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/app/fonts.ts`
- Modify: `src/app/layout.tsx`

**Context:** Tailwind 4 uses a CSS-first config via the `@theme` block. We replace the existing OKLCH tokens with the hex palette from the spec §7.1 and register fonts via `next/font/google` so we can reference them as CSS variables in `@theme`.

- [ ] **Step 1: Write `src/app/fonts.ts`**

```ts
import { Sora, Inter, Poppins, JetBrains_Mono } from "next/font/google";

export const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sora",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-poppins",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
```

- [ ] **Step 2: Apply variables and `bg-canvas` in `src/app/layout.tsx`**

Replace the file contents with:

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { sora, inter, poppins, jetbrainsMono } from "./fonts";

export const metadata: Metadata = {
  title: "GreenGate — Embodied carbon audits, human-signed",
  description:
    "Agent-driven embodied-carbon audit for construction BOMs, with Auth0 CIBA-bound human approvals.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${inter.variable} ${poppins.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased bg-canvas text-ink">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Replace `src/app/globals.css` with One Click LCA tokens**

Replace the entire file contents with:

```css
@import "tailwindcss";

@theme {
  /* Palette (hex, from oneclicklca.com) */
  --color-canvas: #F0EDE6;
  --color-card: #FFFFFF;
  --color-dark: #154B3E;
  --color-ink: #000000;
  --color-muted: #999999;
  --color-brand-primary: #006726;
  --color-brand-accent: #00C04B;
  --color-brand-teal: #0C7B5F;
  --color-warning: #A86B00;
  --color-danger: #8B1A1A;
  --color-hotspot: #C2410C;
  --color-border: #E5E3DC;

  /* Shadcn tokens mapped onto our palette so existing components keep working */
  --color-background: var(--color-canvas);
  --color-foreground: var(--color-ink);
  --color-card-foreground: var(--color-ink);
  --color-primary: var(--color-brand-accent);
  --color-primary-foreground: #FFFFFF;
  --color-secondary: #F5F2EA;
  --color-secondary-foreground: var(--color-ink);
  --color-muted-foreground: var(--color-muted);
  --color-accent: #F5F2EA;
  --color-accent-foreground: var(--color-ink);
  --color-destructive: var(--color-danger);
  --color-destructive-foreground: #FFFFFF;
  --color-input: var(--color-border);
  --color-ring: var(--color-brand-accent);

  --radius: 0.5rem;

  /* Font families (variables come from next/font) */
  --font-sans: var(--font-inter), system-ui, sans-serif;
  --font-display: var(--font-sora), var(--font-inter), system-ui, sans-serif;
  --font-ui: var(--font-poppins), var(--font-inter), system-ui, sans-serif;
  --font-mono: var(--font-jetbrains-mono), ui-monospace, monospace;
}

body {
  background: var(--color-canvas);
  color: var(--color-ink);
  font-family: var(--font-sans);
  font-size: 14px;
}

h1, h2, h3, h4 {
  font-family: var(--font-display);
  color: var(--color-brand-primary);
  letter-spacing: -0.01em;
}
```

- [ ] **Step 4: Typecheck + dev smoke**

Run:
```bash
npm run typecheck
```
Expected: exit 0.

Run:
```bash
npm run dev
```
Open `http://localhost:3000`. Expected: the page renders on a cream background (`#F0EDE6`), text is in Inter, headings in Sora forest green. Stop dev (`Ctrl+C`).

- [ ] **Step 5: Commit**

```bash
git add src/app/fonts.ts src/app/globals.css src/app/layout.tsx
git commit -m "feat(ui): apply One Click LCA design tokens + next/font setup"
```

---

## Task 3 — Shared UI primitives (`PillButton`, `StatusBadge`)

**Files:**
- Create: `src/components/ui/pill-button.tsx`
- Create: `src/components/ui/status-badge.tsx`

**Context:** The spec's signature visual move is pill-shaped buttons in Poppins 600. We introduce `PillButton` as a new sibling to the existing shadcn `Button` (which we keep for internal/secondary UI). `StatusBadge` is the four-variant chip used on inbox cards and project headers.

- [ ] **Step 1: Write `src/components/ui/pill-button.tsx`**

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center rounded-full font-[var(--font-ui)] font-semibold " +
  "transition-opacity duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2";

const sizes: Record<Size, string> = {
  sm: "px-4 py-1.5 text-xs",
  md: "px-6 py-2.5 text-sm",
  lg: "px-8 py-3 text-base",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-accent text-white border border-brand-accent hover:opacity-85",
  outline:
    "bg-transparent text-brand-accent border-2 border-brand-accent hover:bg-brand-accent/10",
  ghost:
    "bg-transparent text-brand-primary border border-transparent hover:bg-brand-primary/5",
};

export interface PillButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export const PillButton = React.forwardRef<HTMLButtonElement, PillButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(base, sizes[size], variants[variant], className)}
        {...props}
      />
    );
  },
);
PillButton.displayName = "PillButton";
```

- [ ] **Step 2: Write `src/components/ui/status-badge.tsx`**

```tsx
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
```

- [ ] **Step 3: Typecheck**

Run:
```bash
npm run typecheck
```
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/pill-button.tsx src/components/ui/status-badge.tsx
git commit -m "feat(ui): add PillButton and StatusBadge primitives"
```

---

## Task 4 — Expand materials catalog for three seed projects

**Files:**
- Modify: `prisma/seed.ts` (materials array only in this task; BOM/project rewrite is Task 5)

**Context:** The three seed projects need low-carbon alternatives that Gemini already suggests. `CEM III/A` exists. We add: low-carbon aluminum, green-steel rebar, low-carbon concrete, recycled EPS, dense-mix green concrete. Adding them now unlocks deterministic pre-seeded `Suggestion` rows for projects #2 and #3.

- [ ] **Step 1: Extend the `materials` array in `prisma/seed.ts`**

Open `prisma/seed.ts`. Locate the `const materials: MaterialSeed[] = [ ... ];` block. Append **at the end** (before the closing `];`):

```ts
  // --- Low-carbon alternatives (for suggestions) ---
  { code: "REBAR-EAF-10", name: "EAF-produced rebar ADN-420 10 mm", category: "steel", defaultUnit: "kg" },
  { code: "REBAR-EAF-12", name: "EAF-produced rebar ADN-420 12 mm", category: "steel", defaultUnit: "kg" },
  { code: "ALU-LOWCARBON", name: "Low-carbon aluminium (hydropower)", category: "openings", defaultUnit: "kg" },
  { code: "ALU-RECYCLED", name: "Recycled aluminium", category: "openings", defaultUnit: "kg" },
  { code: "CONC-C25-GGBS", name: "Ready-mix concrete C25/30 (50% GGBS)", category: "concrete", defaultUnit: "m3" },
  { code: "INSUL-WOODFIBRE", name: "Wood-fibre insulation board 50 mm", category: "insulation", defaultUnit: "m2" },
  { code: "GLASS-RECYCLED", name: "Low-embodied glazing (recycled float)", category: "openings", defaultUnit: "m2" },
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npm run typecheck
```
Expected: exit 0 (materials don't have TS types that would fail — this is a data change).

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(seed): add 7 low-carbon material alternatives for MVP suggestions"
```

---

## Task 5 — Rewrite seed to three distinct projects with pre-approvals

**Files:**
- Modify: `prisma/seed.ts` (replace the `main()` body)

**Context:** Single seeded project becomes three. Each has its own `Project` row with `responsibleApproverName/Role`, a separate BOM, and pre-created `AuditRun` + `Suggestion` rows so the inbox populates realistically. Project #2 has two `APPROVED` suggestions with `decidedAt` within the current month — drives the `CO₂e SAVED this month` stat.

- [ ] **Step 1: Replace `main()` in `prisma/seed.ts`**

Replace the entire `async function main() { ... }` (keep the `main().catch(...)` tail and the `materials` and old `bomItems` arrays above — the rewrite below defines its own per-project BOMs and no longer uses the flat `bomItems`).

```ts
interface ProjectSeed {
  id: string;
  slug: string;
  name: string;
  description: string;
  areaSqm: number;
  approverName: string;
  approverRole: string;
  boms: Array<{ code: string; qty: number; unit: string; notes?: string }>;
  audit?: {
    status: "COMPLETED";
    reviewStatus: "AWAITING_REVIEW" | "IN_REVIEW" | "CLEARED";
    totalKgCo2e: number;
    hotspotCount: number;
    slaHoursFromNow: number;
    suggestions: Array<{
      originalCode: string;
      proposedCode: string;
      proposedName: string;
      kgCo2eSaved: number;
      technicalRationale: string;
      riskNotes?: string;
      /** when set, create an Approval row with this decision + decidedAt = now - decidedMinutesAgo */
      preApproved?: { decidedMinutesAgo: number };
    }>;
  };
}

const projects: ProjectSeed[] = [
  {
    id: "proj-torre-nunez",
    slug: "torre-nunez",
    name: "Torre Núñez — Core & Shell",
    description: "Office tower, 24 stories. BOM v3.2. Shared by PM 14h ago.",
    areaSqm: 18400,
    approverName: "Ing. Martín Acosta",
    approverRole: "Structural Engineer",
    boms: [
      { code: "CONC-C25", qty: 840, unit: "m3", notes: "Core + slab" },
      { code: "CEM-I-42.5", qty: 6200, unit: "kg", notes: "Site mortar + finishes" },
      { code: "STEEL-REBAR-12", qty: 112000, unit: "kg", notes: "Core rebar" },
      { code: "STEEL-REBAR-10", qty: 38000, unit: "kg" },
      { code: "STEEL-REBAR-8", qty: 14000, unit: "kg" },
      { code: "WINDOW-ALU-DG", qty: 2400, unit: "m2", notes: "Curtain wall glazing" },
      { code: "ALU-LOWCARBON", qty: 28, unit: "kg", notes: "Placeholder for current aluminium frames" },
      { code: "INSUL-MINWOOL", qty: 3200, unit: "m2", notes: "Core insulation" },
      { code: "INSUL-EPS-50", qty: 640, unit: "m3" },
      { code: "ROOF-GALV", qty: 840, unit: "m2" },
      { code: "TILE-CERAMIC", qty: 1800, unit: "m2" },
      { code: "PLASTER-GYP", qty: 24000, unit: "kg" },
      { code: "PAINT-LATEX", qty: 980, unit: "L" },
      { code: "DOOR-STEEL-EXT", qty: 18, unit: "unit" },
      { code: "DOOR-WOOD", qty: 240, unit: "unit" },
      { code: "PIPE-PVC-110", qty: 720, unit: "m" },
      { code: "PIPE-PPR-25", qty: 2400, unit: "m" },
      { code: "WIRE-CU-2.5", qty: 14000, unit: "m" },
    ],
    audit: {
      status: "COMPLETED",
      reviewStatus: "AWAITING_REVIEW",
      totalKgCo2e: 184_320,
      hotspotCount: 4,
      slaHoursFromNow: 10,
      suggestions: [
        {
          originalCode: "CEM-I-42.5",
          proposedCode: "CEM-III-A",
          proposedName: "Blast-furnace slag cement CEM III/A",
          kgCo2eSaved: 9240,
          technicalRationale:
            "CEM III/A meets BS EN 197-1 CEM III class; same strength grade, broadly available. Cures slower in cold weather — verify placement schedule before approving.",
          riskNotes: "Cold-weather cure delay on pours below 10°C.",
        },
        {
          originalCode: "STEEL-REBAR-12",
          proposedCode: "REBAR-EAF-12",
          proposedName: "EAF-produced rebar ADN-420 12 mm",
          kgCo2eSaved: 3120,
          technicalRationale:
            "Electric-arc-furnace rebar with >90% recycled scrap. Same mechanical class (ADN-420). Requires mill certificate check.",
        },
        {
          originalCode: "WINDOW-ALU-DG",
          proposedCode: "GLASS-RECYCLED",
          proposedName: "Low-embodied glazing (recycled float)",
          kgCo2eSaved: 1610,
          technicalRationale:
            "Recycled float glass for curtain-wall units. Optical performance identical for SHGC/U-value specs.",
        },
        {
          originalCode: "ALU-LOWCARBON",
          proposedCode: "ALU-RECYCLED",
          proposedName: "Recycled aluminium",
          kgCo2eSaved: 850,
          technicalRationale:
            "100% recycled aluminium for extruded frame sections. No structural impact for curtain-wall mullions.",
        },
      ],
    },
  },
  {
    id: "proj-distrito-solar",
    slug: "distrito-solar",
    name: "Distrito Solar Rosario",
    description: "Residential, 4 towers. BOM v1.0. Shared by PM 2 days ago.",
    areaSqm: 42000,
    approverName: "Arq. Lucía Renaud",
    approverRole: "Architect of Record",
    boms: [
      { code: "CONC-C25", qty: 1240, unit: "m3" },
      { code: "STEEL-REBAR-12", qty: 84000, unit: "kg" },
      { code: "STEEL-REBAR-10", qty: 26000, unit: "kg" },
      { code: "BRICK-HOLLOW", qty: 180000, unit: "unit" },
      { code: "CEM-I-42.5", qty: 14000, unit: "kg" },
      { code: "INSUL-EPS-50", qty: 4800, unit: "m2" },
      { code: "WINDOW-PVC-DG", qty: 1800, unit: "m2" },
      { code: "ROOF-TILE-CLAY", qty: 18000, unit: "unit" },
      { code: "TILE-CERAMIC", qty: 12000, unit: "m2" },
      { code: "PAINT-LATEX", qty: 1400, unit: "L" },
      { code: "DOOR-WOOD", qty: 480, unit: "unit" },
      { code: "WIRE-CU-2.5", qty: 22000, unit: "m" },
    ],
    audit: {
      status: "COMPLETED",
      reviewStatus: "IN_REVIEW",
      totalKgCo2e: 312_400,
      hotspotCount: 3,
      slaHoursFromNow: 72,
      suggestions: [
        {
          originalCode: "STEEL-REBAR-12",
          proposedCode: "REBAR-EAF-12",
          proposedName: "EAF-produced rebar ADN-420 12 mm",
          kgCo2eSaved: 6200,
          technicalRationale: "EAF rebar for main structure; mill cert on file.",
          preApproved: { decidedMinutesAgo: 90 },
        },
        {
          originalCode: "CONC-C25",
          proposedCode: "CONC-C25-GGBS",
          proposedName: "Ready-mix concrete C25/30 (50% GGBS)",
          kgCo2eSaved: 2904,
          technicalRationale: "GGBS blend for non-structural pours. Compatible with standard curing.",
          preApproved: { decidedMinutesAgo: 60 },
        },
        {
          originalCode: "INSUL-EPS-50",
          proposedCode: "INSUL-WOODFIBRE",
          proposedName: "Wood-fibre insulation board 50 mm",
          kgCo2eSaved: 1420,
          technicalRationale: "Carbon-negative on a biogenic basis. Check fire rating per DPU.",
          riskNotes: "Verify hygrothermal performance in humid coastal wall assemblies.",
        },
      ],
    },
  },
  {
    id: "proj-ezeiza",
    slug: "centro-logistico-ezeiza",
    name: "Centro Logístico Ezeiza",
    description: "Industrial warehouse. BOM v2.1. Cleared 2 days ago.",
    areaSqm: 12400,
    approverName: "Ing. Rodrigo Salerno",
    approverRole: "Structural Engineer",
    boms: [
      { code: "CONC-C25", qty: 680, unit: "m3" },
      { code: "STEEL-REBAR-12", qty: 18000, unit: "kg" },
      { code: "ROOF-GALV", qty: 9800, unit: "m2" },
      { code: "CEM-I-42.5", qty: 3200, unit: "kg" },
      { code: "INSUL-MINWOOL", qty: 9800, unit: "m2" },
      { code: "DOOR-STEEL-EXT", qty: 8, unit: "unit" },
      { code: "PAINT-LATEX", qty: 420, unit: "L" },
      { code: "WIRE-CU-4", qty: 4800, unit: "m" },
    ],
    // No audit yet — lets the demo run SSE live from the inbox empty-audit card.
  },
];

async function main() {
  console.log("Seeding database...");

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@greengate.local" },
    update: {},
    create: {
      auth0Sub: "auth0|demo-user-placeholder",
      email: "demo@greengate.local",
      name: "Demo Sustainability Lead",
    },
  });

  for (const m of materials) {
    await prisma.material.upsert({
      where: { code: m.code },
      update: m,
      create: m,
    });
  }

  for (const p of projects) {
    const project = await prisma.project.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        description: p.description,
        areaSqm: p.areaSqm,
        responsibleApproverName: p.approverName,
        responsibleApproverRole: p.approverRole,
      },
      create: {
        id: p.id,
        name: p.name,
        description: p.description,
        areaSqm: p.areaSqm,
        responsibleApproverName: p.approverName,
        responsibleApproverRole: p.approverRole,
        ownerId: demoUser.id,
      },
    });

    await prisma.bomItem.deleteMany({ where: { projectId: project.id } });
    for (const item of p.boms) {
      const material = await prisma.material.findUniqueOrThrow({ where: { code: item.code } });
      await prisma.bomItem.create({
        data: {
          projectId: project.id,
          materialId: material.id,
          quantity: item.qty,
          unit: item.unit,
          notes: item.notes ?? null,
        },
      });
    }

    // Wipe previous synthetic audit for idempotency (keeps real CIBA-generated ones intact by id mismatch).
    await prisma.auditRun.deleteMany({
      where: { projectId: project.id, id: { startsWith: "seed-" } },
    });

    if (!p.audit) continue;

    const auditId = `seed-${p.slug}-audit`;
    const now = Date.now();
    const slaDueAt = new Date(now + p.audit.slaHoursFromNow * 60 * 60 * 1000);
    const startedAtReal = new Date(slaDueAt.getTime() - 48 * 60 * 60 * 1000);

    const audit = await prisma.auditRun.create({
      data: {
        id: auditId,
        projectId: project.id,
        status: "COMPLETED",
        reviewStatus: p.audit.reviewStatus,
        totalKgCo2e: p.audit.totalKgCo2e,
        hotspotCount: p.audit.hotspotCount,
        startedAt: startedAtReal,
        completedAt: startedAtReal,
        slaDueAt,
      },
    });

    for (let i = 0; i < p.audit.suggestions.length; i++) {
      const s = p.audit.suggestions[i];
      const originalItem = await prisma.bomItem.findFirstOrThrow({
        where: { projectId: project.id, material: { code: s.originalCode } },
      });
      const suggestion = await prisma.suggestion.create({
        data: {
          id: `seed-${p.slug}-sugg-${i + 1}`,
          auditRunId: audit.id,
          originalItemId: originalItem.id,
          proposedMaterialCode: s.proposedCode,
          proposedMaterialName: s.proposedName,
          kgCo2eSaved: s.kgCo2eSaved,
          technicalRationale: s.technicalRationale,
          riskNotes: s.riskNotes ?? null,
          status: s.preApproved ? "APPROVED" : "PENDING",
        },
      });

      if (s.preApproved) {
        await prisma.approval.create({
          data: {
            suggestionId: suggestion.id,
            userId: demoUser.id,
            authReqId: `seed-${p.slug}-authreq-${i + 1}`,
            decision: "APPROVED",
            decidedAt: new Date(now - s.preApproved.decidedMinutesAgo * 60 * 1000),
            rawResponse: { seeded: true } as unknown as object,
          },
        });
      }
    }
  }

  console.log(
    `Seeded ${materials.length} materials and ${projects.length} projects (plus audits + pre-approvals).`,
  );
}
```

- [ ] **Step 2: Delete the now-unused legacy flat `bomItems` array**

Remove the `const bomItems: BomItemSeed[] = [ ... ];` block and the `BomItemSeed` interface. Keep `MaterialSeed`.

- [ ] **Step 3: Run the seed**

Run:
```bash
npm run db:seed
```

Expected: output ends with `Seeded 37 materials and 3 projects (plus audits + pre-approvals).`

- [ ] **Step 4: Verify inserts via a quick Prisma query**

Run:
```bash
npx tsx -e "import {PrismaClient} from '@prisma/client'; const p=new PrismaClient(); (async()=>{const rows=await p.auditRun.findMany({include:{project:true,suggestions:true}}); console.log(rows.map(r=>({project:r.project.name,status:r.reviewStatus,sla:r.slaDueAt,suggestions:r.suggestions.length,approved:r.suggestions.filter(s=>s.status==='APPROVED').length}))); await p.\$disconnect();})();"
```

Expected output (shapes): 2 rows — Torre Núñez with `status: AWAITING_REVIEW`, 4 suggestions, 0 approved; Distrito Solar with `status: IN_REVIEW`, 3 suggestions, 2 approved. Ezeiza is not present (no audit seeded).

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(seed): rewrite to 3 projects with pre-seeded audits and approvals"
```

---

## Task 6 — Landing: hero, live suggestion card, pillars, how-it-works, footer

**Files:**
- Create: `src/features/landing/components/hero.tsx`
- Create: `src/features/landing/components/live-suggestion-card.tsx`
- Create: `src/features/landing/components/pillars.tsx`
- Create: `src/features/landing/components/how-it-works.tsx`
- Create: `src/features/landing/components/landing-footer.tsx`

**Context:** Five presentational components. Only `live-suggestion-card` needs `"use client"` because it animates. Copy is taken verbatim from spec §4.

- [ ] **Step 1: Write `live-suggestion-card.tsx`**

```tsx
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
```

- [ ] **Step 2: Write `hero.tsx`**

```tsx
import { PillButton } from "@/components/ui/pill-button";
import { LiveSuggestionCard } from "./live-suggestion-card";

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-20 pb-16">
      <div className="grid gap-12 md:grid-cols-2 md:items-center">
        <div>
          <h1 className="text-5xl font-medium tracking-tight text-brand-primary">
            Audit embodied carbon on every BOM. Keep the human in the loop.
          </h1>
          <p className="mt-6 text-lg text-ink/80 max-w-xl">
            Construction is 37% of global energy-related CO₂ — most of it decided at the
            Bill-of-Materials stage. GreenGate's agent audits each BOM against the ICE Database
            and proposes lower-carbon substitutions. The responsible engineer approves each swap
            with a single push on their phone — cryptographically bound to the decision via Auth0 CIBA.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <PillButton asChild size="lg">
              <a href="/auth/login">Log in with Auth0 →</a>
            </PillButton>
            <PillButton asChild size="lg" variant="outline">
              <a href="#how-it-works">See how it works</a>
            </PillButton>
          </div>
        </div>
        <div className="flex justify-center md:justify-end">
          <LiveSuggestionCard />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Write `pillars.tsx`**

```tsx
const pillars = [
  {
    icon: "🧮",
    title: "Auditable by construction",
    body:
      "Every suggestion is pinned to an ICE Database factor and a materialized kg CO₂e delta. No hallucinated numbers.",
  },
  {
    icon: "🔐",
    title: "Signed by the human",
    body:
      "Substitutions require a CIBA-bound approval from the responsible engineer. Audit trail (auth_req_id, timestamp, user) persisted for CSRD / SB 253.",
  },
  {
    icon: "📐",
    title: "Built on real BOMs",
    body:
      "Works on line-item BOMs from architect specs, not on whole-building estimators.",
  },
];

export function Pillars() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="grid gap-6 md:grid-cols-3">
        {pillars.map((p) => (
          <div key={p.title} className="rounded-2xl border border-border bg-card p-6">
            <div className="text-2xl">{p.icon}</div>
            <h3 className="mt-3 text-lg font-medium text-brand-primary">{p.title}</h3>
            <p className="mt-2 text-sm text-ink/80">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Write `how-it-works.tsx`**

```tsx
const steps = [
  {
    n: "01",
    title: "Agent runs the audit",
    body:
      "GreenGate parses the BOM, matches each line to an ICE Database emission factor, and ranks hotspots by kg CO₂e.",
  },
  {
    n: "02",
    title: "Substitutions get proposed",
    body:
      "Gemini proposes lower-carbon alternatives with a technical rationale and a risk flag. Every proposal carries a signed delta.",
  },
  {
    n: "03",
    title: "A human signs off",
    body:
      "The responsible engineer receives a CIBA push on their phone with the exact substitution description. One approval binds the decision cryptographically.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-16">
      <h2 className="text-3xl font-medium tracking-tight text-brand-primary">How it works</h2>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} className="rounded-2xl border border-border bg-card p-6">
            <span className="font-[var(--font-mono)] text-xs text-muted">{s.n}</span>
            <h3 className="mt-2 text-lg font-medium text-ink">{s.title}</h3>
            <p className="mt-2 text-sm text-ink/80">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Write `landing-footer.tsx`**

```tsx
export function LandingFooter() {
  return (
    <footer className="mt-24 bg-dark px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl space-y-4 text-sm">
        <p className="font-medium">
          Built for the DEV.to Weekend Challenge — Earth Day 2026
        </p>
        <p className="text-white/70">
          Category: Best Use of Auth0 for AI Agents
        </p>
        <p className="text-white/70">
          web-production-5dcc8.up.railway.app · github.com/&lt;handle&gt;/greengate · demo video ↗
        </p>
        <p className="pt-6 text-white/60 italic">
          By Juan Torchia — arquitecto → ingeniero, building tools I wish had existed on my sites.
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 6: Typecheck**

Run:
```bash
npm run typecheck
```
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/features/landing
git commit -m "feat(landing): add hero, live suggestion card, pillars, how-it-works, footer"
```

---

## Task 7 — Rewrite `src/app/page.tsx` as public landing with auth redirect

**Files:**
- Modify: `src/app/page.tsx`

**Context:** Replace the current 240-line home page with a tiny composition that redirects to `/app` when authenticated and renders the landing components otherwise. All prior inline audit UI is deleted — its replacement lives in `/app/projects/[id]`.

- [ ] **Step 1: Replace file contents**

Replace `src/app/page.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { Hero } from "@/features/landing/components/hero";
import { Pillars } from "@/features/landing/components/pillars";
import { HowItWorks } from "@/features/landing/components/how-it-works";
import { LandingFooter } from "@/features/landing/components/landing-footer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth0.getSession();
  if (session) redirect("/app");

  return (
    <main className="min-h-screen">
      <Hero />
      <Pillars />
      <HowItWorks />
      <LandingFooter />
    </main>
  );
}
```

- [ ] **Step 2: Typecheck + dev smoke (unauthenticated)**

Run:
```bash
npm run typecheck
```
Expected: exit 0.

Run `npm run dev`, open `http://localhost:3000` in a **private** window (unauthenticated). Expected: landing loads with hero + animated live suggestion card + pillars + how-it-works + dark footer. Stop dev.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(landing): public home redirects authenticated users to /app"
```

---

## Task 8 — Protected shell: `/app` layout + top bar

**Files:**
- Create: `src/features/inbox/components/top-bar.tsx`
- Create: `src/app/app/layout.tsx`

**Context:** All `/app/**` pages share a layout with a top bar (nav + avatar menu) and the auth gate. Inactive nav links (`Projects`, `Reports`) are rendered disabled.

- [ ] **Step 1: Write `src/features/inbox/components/top-bar.tsx`**

```tsx
import Link from "next/link";
import type { SessionData } from "@auth0/nextjs-auth0/types";

export function TopBar({ session }: { session: SessionData }) {
  const email = session.user.email ?? session.user.sub;
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/app" className="font-[var(--font-display)] text-lg font-semibold text-brand-primary">
            GreenGate
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium">
            <Link href="/app" className="text-ink hover:text-brand-primary">Inbox</Link>
            <span
              title="coming soon"
              className="cursor-not-allowed text-muted"
            >
              Projects
            </span>
            <span
              title="coming soon"
              className="cursor-not-allowed text-muted"
            >
              Reports
            </span>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted">{email}</span>
          <Link
            href="/auth/logout"
            className="rounded-full border border-border px-3 py-1 text-ink hover:bg-canvas"
          >
            Log out
          </Link>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Write `src/app/app/layout.tsx`**

```tsx
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { TopBar } from "@/features/inbox/components/top-bar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login");

  return (
    <div className="min-h-screen bg-canvas">
      <TopBar session={session} />
      <div className="mx-auto max-w-6xl px-6 py-10">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run:
```bash
npm run typecheck
```
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/features/inbox/components/top-bar.tsx src/app/app/layout.tsx
git commit -m "feat(app): protected /app shell with top bar + auth gate"
```

---

## Task 9 — Inbox page: stats row, filter chips, BOM cards, empty state

**Files:**
- Create: `src/features/inbox/server/inbox-data.ts`
- Create: `src/features/inbox/server/seed-demo.ts`
- Create: `src/features/inbox/components/stats-row.tsx`
- Create: `src/features/inbox/components/filter-chips.tsx`
- Create: `src/features/inbox/components/bom-card.tsx`
- Create: `src/app/app/page.tsx`

**Context:** Data comes from a single server function that loads the three stats + the filtered card list. Filters drive off `searchParams.status`. Empty-state button calls a server action.

- [ ] **Step 1: Write `src/features/inbox/server/inbox-data.ts`**

```ts
import { prisma } from "@/lib/prisma";
import type { Project, AuditRun, Suggestion } from "@prisma/client";

export type InboxCardStatus = "URGENT" | "AWAITING" | "IN_REVIEW" | "CLEARED";

export interface InboxCard {
  projectId: string;
  projectName: string;
  description: string | null;
  status: InboxCardStatus;
  approverName: string;
  approverRole: string;
  lineItemCount: number;
  hotspotCount: number;
  potentialSavingKg: number;
  slaDueAt: Date | null;
  latestAuditId: string | null;
}

export interface InboxStats {
  awaitingCount: number;
  savedThisMonthKg: number;
  dueIn24hCount: number;
}

export interface InboxData {
  stats: InboxStats;
  cards: InboxCard[];
}

function deriveCardStatus(run: AuditRun | null): InboxCardStatus {
  if (!run) return "AWAITING";
  const soonMs = 24 * 60 * 60 * 1000;
  if (run.reviewStatus === "AWAITING_REVIEW") {
    if (run.slaDueAt && run.slaDueAt.getTime() - Date.now() < soonMs) return "URGENT";
    return "AWAITING";
  }
  if (run.reviewStatus === "IN_REVIEW") return "IN_REVIEW";
  return "CLEARED";
}

export async function loadInboxData(filter: InboxCardStatus | "ALL"): Promise<InboxData> {
  const [projects, savedThisMonth, awaitingRuns] = await Promise.all([
    prisma.project.findMany({
      include: {
        bomItems: { select: { id: true } },
        audits: {
          orderBy: { startedAt: "desc" },
          take: 1,
          include: {
            suggestions: { select: { status: true, kgCo2eSaved: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.suggestion.aggregate({
      where: {
        status: "APPROVED",
        approval: { decidedAt: { gte: startOfMonth() } },
      },
      _sum: { kgCo2eSaved: true },
    }),
    prisma.auditRun.findMany({
      where: {
        reviewStatus: "AWAITING_REVIEW",
        slaDueAt: { lte: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      },
      select: { id: true },
    }),
  ]);

  const cards: InboxCard[] = projects.map((p) => {
    const run = p.audits[0] ?? null;
    const status = deriveCardStatus(run);
    const pendingSavings =
      run?.suggestions
        .filter((s) => s.status === "PENDING")
        .reduce((acc, s) => acc + s.kgCo2eSaved, 0) ?? 0;
    return {
      projectId: p.id,
      projectName: p.name,
      description: p.description,
      status,
      approverName: p.responsibleApproverName,
      approverRole: p.responsibleApproverRole,
      lineItemCount: p.bomItems.length,
      hotspotCount: run?.hotspotCount ?? 0,
      potentialSavingKg: pendingSavings,
      slaDueAt: run?.slaDueAt ?? null,
      latestAuditId: run?.id ?? null,
    };
  });

  const filteredCards = filter === "ALL" ? cards : cards.filter((c) => c.status === filter);
  const awaitingCount = cards.filter((c) => c.status === "AWAITING" || c.status === "URGENT").length;

  return {
    stats: {
      awaitingCount,
      savedThisMonthKg: savedThisMonth._sum.kgCo2eSaved ?? 0,
      dueIn24hCount: awaitingRuns.length,
    },
    cards: filteredCards,
  };
}

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
```

- [ ] **Step 2: Write `src/features/inbox/server/seed-demo.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth0 } from "@/lib/auth0";

/**
 * Inserts a lightweight seed project for an empty-state CTA.
 * Safe to call repeatedly: uses a stable id.
 */
export async function seedDemoProject() {
  const session = await auth0.getSession();
  if (!session?.user?.sub) throw new Error("not authenticated");

  const user = await prisma.user.upsert({
    where: { auth0Sub: session.user.sub },
    create: {
      auth0Sub: session.user.sub,
      email: session.user.email ?? `${session.user.sub}@unknown.local`,
      name: session.user.name ?? null,
    },
    update: {},
  });

  await prisma.project.upsert({
    where: { id: "seeded-empty-state" },
    create: {
      id: "seeded-empty-state",
      name: "Demo Project (seeded from empty state)",
      description: "Auto-created to demo the inbox flow.",
      areaSqm: 240,
      ownerId: user.id,
      responsibleApproverName: "Ing. Demo Approver",
      responsibleApproverRole: "Structural Engineer",
    },
    update: {},
  });

  revalidatePath("/app");
}
```

- [ ] **Step 3: Write `src/features/inbox/components/stats-row.tsx`**

```tsx
import type { InboxStats } from "../server/inbox-data";
import { AnimatedKg } from "@/features/audit/components/animated-kg";

export function StatsRow({ stats }: { stats: InboxStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Tile label="AWAITING review" value={stats.awaitingCount.toString()} />
      <Tile label="CO₂e SAVED this month" value={<AnimatedKg value={stats.savedThisMonthKg} />} suffix="kg" />
      <Tile
        label="DUE < 24h"
        value={stats.dueIn24hCount.toString()}
        tone={stats.dueIn24hCount > 0 ? "danger" : "neutral"}
      />
    </div>
  );
}

function Tile({
  label,
  value,
  suffix,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  suffix?: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p
        className={
          "mt-3 font-[var(--font-display)] text-4xl font-medium tracking-tight " +
          (tone === "danger" ? "text-danger" : "text-brand-primary")
        }
      >
        {value}
        {suffix ? <span className="ml-2 text-lg text-muted">{suffix}</span> : null}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Write `src/features/inbox/components/filter-chips.tsx`**

```tsx
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
```

- [ ] **Step 5: Write `src/features/inbox/components/bom-card.tsx`**

```tsx
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { PillButton } from "@/components/ui/pill-button";
import type { InboxCard } from "../server/inbox-data";

function formatSla(dueAt: Date | null): string {
  if (!dueAt) return "no SLA";
  const ms = dueAt.getTime() - Date.now();
  if (ms <= 0) return "overdue";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return hours > 24 ? `${Math.floor(hours / 24)}d left` : `SLA in ${hours}h ${minutes}m`;
}

export function BomCard({ card }: { card: InboxCard }) {
  const cta = card.status === "CLEARED" ? "View record →" : card.status === "IN_REVIEW" ? "Continue →" : "Review →";
  return (
    <Link
      href={`/app/projects/${card.projectId}`}
      className="block rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <StatusBadge kind={card.status} />
            <p className="font-[var(--font-display)] text-lg font-medium text-ink">
              {card.projectName}
            </p>
          </div>
          {card.description && <p className="mt-1 text-xs text-muted">{card.description}</p>}
        </div>
        <PillButton size="sm" variant="outline" asChild>
          <span>{cta}</span>
        </PillButton>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-ink/80">
        <span>{card.lineItemCount} line items</span>
        <span>·</span>
        <span>{card.hotspotCount} hotspots</span>
        {card.potentialSavingKg > 0 && (
          <>
            <span>·</span>
            <span>
              potential saving <strong className="text-brand-primary">{Math.round(card.potentialSavingKg).toLocaleString()} kg CO₂e</strong>
            </span>
          </>
        )}
      </div>
      <div className="mt-2 text-xs text-muted">
        Approver: {card.approverName} ({card.approverRole}) · {formatSla(card.slaDueAt)}
      </div>
    </Link>
  );
}
```

- [ ] **Step 6: Write `src/app/app/page.tsx`**

```tsx
import { PillButton } from "@/components/ui/pill-button";
import { loadInboxData, type InboxCardStatus } from "@/features/inbox/server/inbox-data";
import { seedDemoProject } from "@/features/inbox/server/seed-demo";
import { StatsRow } from "@/features/inbox/components/stats-row";
import { FilterChips } from "@/features/inbox/components/filter-chips";
import { BomCard } from "@/features/inbox/components/bom-card";

function parseFilter(value: string | undefined): InboxCardStatus | "ALL" {
  const v = (value ?? "").toUpperCase();
  if (v === "AWAITING" || v === "URGENT" || v === "IN_REVIEW" || v === "CLEARED") return v;
  return "ALL";
}

type FilterKey = "ALL" | "AWAITING" | "IN_REVIEW" | "CLEARED";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = parseFilter(status);
  const data = await loadInboxData(filter);

  const active: FilterKey =
    filter === "URGENT" || filter === "AWAITING" ? "AWAITING" : (filter as FilterKey);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-medium tracking-tight text-brand-primary">
          Welcome back.
        </h1>
        <p className="mt-1 text-sm text-muted">
          Three projects are awaiting your carbon review.
        </p>
      </div>

      <StatsRow stats={data.stats} />

      <FilterChips active={active} />

      {data.cards.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="font-[var(--font-display)] text-lg font-medium text-ink">
            No BOMs pending review.
          </p>
          <p className="mt-2 text-sm text-muted">
            When a PM shares a new BOM, it lands here.
          </p>
          <form action={seedDemoProject} className="mt-6 inline-flex gap-3">
            <PillButton type="submit">Seed demo project</PillButton>
            <PillButton variant="outline" disabled title="coming soon">
              Upload a BOM (CSV)
            </PillButton>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          {data.cards.map((c) => (
            <BomCard key={c.projectId} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Typecheck + dev smoke**

Run:
```bash
npm run typecheck
```
Expected: exit 0.

Run `npm run dev`, log in with Auth0, expect to be redirected to `/app`. Verify: stats row shows counts, three cards render (Torre Núñez URGENT, Distrito Solar IN_REVIEW, Ezeiza AWAITING), filter chips reload with `?status=...`. Stop dev.

- [ ] **Step 8: Commit**

```bash
git add src/features/inbox src/app/app/page.tsx
git commit -m "feat(inbox): /app page with stats row, filters, BOM cards, empty-state seed action"
```

---

## Task 10 — Project detail shell: header + summary tiles + data loader

**Files:**
- Create: `src/features/project-detail/server/project-detail-data.ts`
- Create: `src/features/project-detail/components/project-header.tsx`
- Create: `src/features/project-detail/components/summary-tiles.tsx`
- Create: `src/app/app/projects/[id]/page.tsx`

**Context:** Lays the skeleton of the detail route. BOM table and suggestions come in tasks 11–12; this task gets the page loading with header + summary + data plumbing.

- [ ] **Step 1: Write `src/features/project-detail/server/project-detail-data.ts`**

```ts
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const include = {
  bomItems: { include: { material: true } },
  audits: {
    orderBy: { startedAt: "desc" as const },
    take: 1,
    include: {
      suggestions: {
        orderBy: { kgCo2eSaved: "desc" as const },
        include: {
          originalItem: { include: { material: true } },
          approval: { include: { user: true } },
        },
      },
    },
  },
} satisfies Prisma.ProjectInclude;

export type ProjectWithDetail = Prisma.ProjectGetPayload<{ include: typeof include }>;

export async function loadProjectDetail(projectId: string): Promise<ProjectWithDetail | null> {
  return prisma.project.findUnique({ where: { id: projectId }, include });
}
```

- [ ] **Step 2: Write `project-header.tsx`**

```tsx
import { StatusBadge, type StatusKind } from "@/components/ui/status-badge";

export function ProjectHeader({
  name,
  description,
  approverName,
  approverRole,
  status,
  slaLabel,
}: {
  name: string;
  description: string | null;
  approverName: string;
  approverRole: string;
  status: StatusKind;
  slaLabel: string;
}) {
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-medium tracking-tight text-brand-primary">{name}</h1>
      {description && <p className="text-sm text-muted">{description}</p>}
      <div className="flex flex-wrap items-center gap-4 pt-2 text-sm">
        <span className="text-ink">
          <span className="text-muted">Approver:</span> 👤 {approverName} — {approverRole}
        </span>
        <StatusBadge kind={status} />
        <span className="text-muted">{slaLabel}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `summary-tiles.tsx`**

```tsx
import { AnimatedKg } from "@/features/audit/components/animated-kg";

export function SummaryTiles({
  totalKgCo2e,
  potentialSavingKg,
  hotspotCount,
  lineItemCount,
  hotspotPctOfTotal,
}: {
  totalKgCo2e: number;
  potentialSavingKg: number;
  hotspotCount: number;
  lineItemCount: number;
  hotspotPctOfTotal: number;
}) {
  const pct = totalKgCo2e > 0 ? Math.round((potentialSavingKg / totalKgCo2e) * 100) : 0;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Tile label="Total embodied" value={<AnimatedKg value={totalKgCo2e} />} suffix="kg CO₂e" sub="post-review projection" />
      <Tile
        label="Potential savings"
        value={<>− <AnimatedKg value={potentialSavingKg} /></>}
        suffix="kg CO₂e"
        sub={`${pct}% reduction`}
        accent
      />
      <Tile
        label="Hotspots"
        value={<>{hotspotCount}<span className="text-lg text-muted"> of {lineItemCount}</span></>}
        sub={`drive ${hotspotPctOfTotal}%`}
      />
    </div>
  );
}

function Tile({
  label,
  value,
  suffix,
  sub,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  suffix?: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p
        className={
          "mt-3 font-[var(--font-display)] text-4xl font-medium tracking-tight " +
          (accent ? "text-brand-primary" : "text-ink")
        }
      >
        {value}
        {suffix && <span className="ml-2 text-lg text-muted">{suffix}</span>}
      </p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Write `src/app/app/projects/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { loadProjectDetail } from "@/features/project-detail/server/project-detail-data";
import { ProjectHeader } from "@/features/project-detail/components/project-header";
import { SummaryTiles } from "@/features/project-detail/components/summary-tiles";
import type { StatusKind } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

function deriveStatus(
  reviewStatus: "AWAITING_REVIEW" | "IN_REVIEW" | "CLEARED",
  slaDueAt: Date | null,
): StatusKind {
  const soonMs = 24 * 60 * 60 * 1000;
  if (reviewStatus === "AWAITING_REVIEW") {
    if (slaDueAt && slaDueAt.getTime() - Date.now() < soonMs) return "URGENT";
    return "AWAITING";
  }
  if (reviewStatus === "IN_REVIEW") return "IN_REVIEW";
  return "CLEARED";
}

function formatSla(dueAt: Date | null): string {
  if (!dueAt) return "no SLA";
  const ms = dueAt.getTime() - Date.now();
  if (ms <= 0) return "overdue";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  return hours > 24 ? `SLA in ${Math.floor(hours / 24)}d` : `SLA in ${hours}h`;
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await loadProjectDetail(id);
  if (!project) notFound();

  const run = project.audits[0];
  const totalKgCo2e = run?.totalKgCo2e ?? 0;
  const hotspotCount = run?.hotspotCount ?? 0;
  const pendingSavings =
    run?.suggestions.filter((s) => s.status === "PENDING").reduce((a, s) => a + s.kgCo2eSaved, 0) ?? 0;
  const approvedSavings =
    run?.suggestions.filter((s) => s.status === "APPROVED").reduce((a, s) => a + s.kgCo2eSaved, 0) ?? 0;
  const potentialSavings = pendingSavings + approvedSavings;
  const status = run
    ? deriveStatus(run.reviewStatus, run.slaDueAt)
    : "AWAITING";

  return (
    <div className="space-y-10">
      <ProjectHeader
        name={project.name}
        description={project.description}
        approverName={project.responsibleApproverName}
        approverRole={project.responsibleApproverRole}
        status={status}
        slaLabel={formatSla(run?.slaDueAt ?? null)}
      />

      <SummaryTiles
        totalKgCo2e={Math.max(totalKgCo2e - approvedSavings, 0)}
        potentialSavingKg={potentialSavings}
        hotspotCount={hotspotCount}
        lineItemCount={project.bomItems.length}
        hotspotPctOfTotal={72 /* placeholder — BOM table computes the exact figure in Task 11 */}
      />

      <p className="text-sm text-muted">
        BOM table and suggestions list render in follow-up tasks.
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck + dev smoke**

Run `npm run typecheck` — expect exit 0. Run `npm run dev`, log in, click a BOM card in `/app`, land on the detail page. Expect header + three summary tiles + placeholder paragraph. Stop dev.

- [ ] **Step 6: Commit**

```bash
git add src/features/project-detail src/app/app/projects
git commit -m "feat(project-detail): page shell with header + summary tiles + data loader"
```

---

## Task 11 — BOM table with hotspot markers

**Files:**
- Create: `src/features/project-detail/components/bom-table.tsx`
- Modify: `src/app/app/projects/[id]/page.tsx` (wire in + compute hotspots)

**Context:** Compute per-item `kgCo2e` contribution from the mock emissions source, rank top 4 as hotspots, render the table with a faint orange left border on hotspot rows.

- [ ] **Step 1: Write `bom-table.tsx`**

```tsx
import { cn } from "@/lib/utils";

export interface BomRow {
  index: number;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  kgCo2e: number;
  hotspotRank: number | null;
}

export function BomTable({ rows }: { rows: BomRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-canvas text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
          <tr>
            <th className="py-3 pl-6 pr-3">#</th>
            <th className="px-3">Material</th>
            <th className="px-3 text-right">Qty</th>
            <th className="px-3">Unit</th>
            <th className="px-3 text-right">kg CO₂e</th>
            <th className="py-3 pl-3 pr-6">Hotspot</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.index}
              className={cn(
                "h-10 border-b border-border last:border-b-0",
                r.hotspotRank !== null && "border-l-2 border-l-hotspot",
              )}
            >
              <td className="pl-6 pr-3 font-[var(--font-mono)] text-xs text-muted">{r.index}</td>
              <td className="px-3 font-medium text-ink">
                {r.name}
                <span className="ml-2 font-[var(--font-mono)] text-[10px] text-muted">{r.code}</span>
              </td>
              <td className="px-3 text-right font-[var(--font-display)] font-medium tabular-nums">
                {r.quantity.toLocaleString()}
              </td>
              <td className="px-3 text-muted">{r.unit}</td>
              <td className="px-3 text-right font-[var(--font-display)] font-medium text-ink tabular-nums">
                {Math.round(r.kgCo2e).toLocaleString()}
              </td>
              <td className="py-3 pl-3 pr-6">
                {r.hotspotRank !== null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-hotspot/10 px-2 py-0.5 text-[10px] font-semibold text-hotspot">
                    🔥 #{r.hotspotRank}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Compute BOM rows in the page + wire table**

In `src/app/app/projects/[id]/page.tsx`, add imports and replace the placeholder paragraph.

Add at the top of the file, with existing imports:

```tsx
import { BomTable, type BomRow } from "@/features/project-detail/components/bom-table";
import { createMockEmissionsSource } from "@/lib/emissions/mock";
```

Inside `ProjectDetailPage`, **after** the `const potentialSavings = ...` line and **before** the `const status = ...` line, insert:

```tsx
const emissions = createMockEmissionsSource();
const rowsUnranked: BomRow[] = await Promise.all(
  project.bomItems.map(async (item, i) => {
    const factor = await emissions.getFactorForMaterialCode(item.material.code);
    const kgCo2e = (factor?.kgCo2ePerUnit ?? 0) * item.quantity;
    return {
      index: i + 1,
      code: item.material.code,
      name: item.material.name,
      quantity: item.quantity,
      unit: item.unit,
      kgCo2e,
      hotspotRank: null,
    };
  }),
);
const sortedByImpact = [...rowsUnranked].sort((a, b) => b.kgCo2e - a.kgCo2e);
sortedByImpact.slice(0, 4).forEach((r, idx) => {
  const match = rowsUnranked.find((x) => x.index === r.index);
  if (match) match.hotspotRank = idx + 1;
});
const top4Sum = sortedByImpact.slice(0, 4).reduce((a, r) => a + r.kgCo2e, 0);
const totalFromRows = rowsUnranked.reduce((a, r) => a + r.kgCo2e, 0);
const hotspotPct = totalFromRows > 0 ? Math.round((top4Sum / totalFromRows) * 100) : 0;
```

Replace the existing `hotspotPctOfTotal={72 /* placeholder */}` line with:

```tsx
        hotspotPctOfTotal={hotspotPct}
```

Replace the placeholder paragraph with:

```tsx
      <section className="space-y-3">
        <h2 className="text-xl font-medium text-brand-primary">Bill of Materials</h2>
        <BomTable rows={rowsUnranked} />
      </section>
```

- [ ] **Step 3: Confirm `createMockEmissionsSource` API**

Run:
```bash
grep -n "getFactorForMaterialCode\|kgCo2ePerUnit" src/lib/emissions/mock.ts src/features/audit/server/run-audit.ts
```

If the method name or return-type property differs (e.g. the method is `getFactor` or the field is `factorKgCo2e`), adjust the code above to match — use the existing names as source of truth. If grep shows no match, inspect `src/lib/emissions/mock.ts` and use its actual exported API.

- [ ] **Step 4: Typecheck + dev smoke**

Run `npm run typecheck`, expect exit 0. Run `npm run dev`, open a project detail page, verify table renders with 4 orange-bordered hotspot rows and 🔥 #1..#4 badges. Stop dev.

- [ ] **Step 5: Commit**

```bash
git add src/features/project-detail/components/bom-table.tsx src/app/app/projects/[id]/page.tsx
git commit -m "feat(project-detail): BOM table with hotspot markers and per-item CO₂e"
```

---

## Task 12 — Suggestion card with 5 UI states

**Files:**
- Create: `src/features/project-detail/components/suggestion-card.tsx`
- Modify: `src/features/audit/components/approval-button.tsx` (rebuild to match the new spec)
- Modify: `src/app/app/projects/[id]/page.tsx` (render suggestions section)

**Context:** This task replaces the old inline "Replace X with Y" layout with a full card that owns the 5 UI states and the binding-message expander.

- [ ] **Step 1: Write `suggestion-card.tsx`**

```tsx
import { ApprovalButton } from "@/features/audit/components/approval-button";

export interface SuggestionCardData {
  id: string;
  originalCode: string;
  originalName: string;
  proposedCode: string;
  proposedName: string;
  kgCo2eSaved: number;
  technicalRationale: string;
  riskNotes: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  approverName: string;
  approverRole: string;
  approvedBy?: { name: string; at: Date } | null;
  rejectedReason?: string | null;
}

const statusColor: Record<SuggestionCardData["status"], string> = {
  PENDING: "text-muted",
  APPROVED: "text-brand-primary",
  REJECTED: "text-danger",
  EXPIRED: "text-warning",
};

export function SuggestionCard({ data }: { data: SuggestionCardData }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-baseline justify-between">
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${statusColor[data.status]}`}>
          {data.status}
        </span>
        <span className="font-[var(--font-mono)] text-[10px] text-muted">#{data.id.slice(-6)}</span>
      </div>

      <div className="mt-3 space-y-1 text-sm">
        <p>
          <span className="text-muted">Replace</span>{" "}
          <span className="font-medium text-ink">{data.originalName}</span>
        </p>
        <p>
          <span className="text-muted">With</span>{" "}
          <span className="font-medium text-ink">{data.proposedName}</span>
        </p>
      </div>

      <p className="mt-6 font-[var(--font-display)] text-4xl font-medium tracking-tight text-brand-primary">
        − {Math.round(data.kgCo2eSaved).toLocaleString()}
        <span className="ml-2 text-lg text-muted">kg CO₂e</span>
      </p>

      <p className="mt-6 text-sm text-ink/80">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Rationale</span>{" "}
        {data.technicalRationale}
      </p>
      {data.riskNotes && (
        <p className="mt-2 text-sm text-warning">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider">Risk</span>{" "}
          {data.riskNotes}
        </p>
      )}

      <div className="mt-6 border-t border-border pt-4">
        {data.status === "PENDING" && (
          <ApprovalButton
            suggestionId={data.id}
            approverName={data.approverName}
            approverRole={data.approverRole}
            saved={data.kgCo2eSaved}
            originalCode={data.originalCode}
            proposedCode={data.proposedCode}
          />
        )}
        {data.status === "APPROVED" && data.approvedBy && (
          <p className="text-sm text-brand-primary">
            ✓ Approved by {data.approvedBy.name} at {data.approvedBy.at.toISOString()}
          </p>
        )}
        {data.status === "REJECTED" && (
          <p className="text-sm text-danger">
            ✗ Rejected{data.rejectedReason ? ` — ${data.rejectedReason}` : ""}
          </p>
        )}
        {data.status === "EXPIRED" && (
          <p className="text-sm text-warning">⏱ Push expired — request a new approval.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `src/features/audit/components/approval-button.tsx`**

Replace the entire file with:

```tsx
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
```

- [ ] **Step 3: Render suggestions section in the project page**

Open `src/app/app/projects/[id]/page.tsx`. Add import:

```tsx
import { SuggestionCard, type SuggestionCardData } from "@/features/project-detail/components/suggestion-card";
```

After the `<section>` that renders `BomTable`, append a new section:

```tsx
      <section className="space-y-3">
        <h2 className="text-xl font-medium text-brand-primary">
          Agent suggestions ({run?.suggestions.length ?? 0})
        </h2>
        {run && run.suggestions.length > 0 ? (
          <div className="space-y-4">
            {run.suggestions.map((s) => {
              const data: SuggestionCardData = {
                id: s.id,
                originalCode: s.originalItem.material.code,
                originalName: s.originalItem.material.name,
                proposedCode: s.proposedMaterialCode,
                proposedName: s.proposedMaterialName,
                kgCo2eSaved: s.kgCo2eSaved,
                technicalRationale: s.technicalRationale,
                riskNotes: s.riskNotes,
                status: s.status,
                approverName: project.responsibleApproverName,
                approverRole: project.responsibleApproverRole,
                approvedBy:
                  s.status === "APPROVED" && s.approval
                    ? { name: s.approval.user.name ?? s.approval.user.email, at: s.approval.decidedAt }
                    : null,
                rejectedReason: null,
              };
              return <SuggestionCard key={s.id} data={data} />;
            })}
          </div>
        ) : (
          <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted">
            {run ? "Agent found no substitutions that meet current thresholds." : "No audit run yet."}
          </p>
        )}
      </section>
```

- [ ] **Step 4: Typecheck + dev smoke**

Run `npm run typecheck` → expect exit 0. Run `npm run dev`, open a project with suggestions. For Torre Núñez expect 4 PENDING cards with "Approve with Auth0 CIBA" pill buttons; for Distrito Solar expect 2 APPROVED cards (green) and 1 PENDING. Click a pending Approve button, confirm it reaches PUSHED state with the pulsing dots and the binding-message expander works. Stop dev.

- [ ] **Step 5: Commit**

```bash
git add src/features/project-detail/components/suggestion-card.tsx src/features/audit/components/approval-button.tsx src/app/app/projects/[id]/page.tsx
git commit -m "feat(project-detail): suggestion cards with 5 UI states and binding-message inspector"
```

---

## Task 13 — Batch approval modal with binding-message inspector

**Files:**
- Create: `src/features/project-detail/components/batch-approval-modal.tsx`
- Modify: `src/features/audit/components/batch-approval-button.tsx` (open modal instead of inline flow)
- Modify: `src/app/app/projects/[id]/page.tsx` (wire "Approve all" at top of suggestions)

**Context:** Spec §6.6. A single CIBA push approves N suggestions. The modal shows the exact batch binding message and runs the poll in-component. Cascade animation on success.

- [ ] **Step 1: Add shadcn dialog if missing**

Run:
```bash
npx shadcn@latest add dialog
```
Answer yes to prompts. Expected: creates `src/components/ui/dialog.tsx`. If the file already exists, skip.

- [ ] **Step 2: Write `batch-approval-modal.tsx`**

```tsx
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
```

- [ ] **Step 3: Retire old `batch-approval-button.tsx` by making it re-export the modal**

Replace the entire contents of `src/features/audit/components/batch-approval-button.tsx` with:

```tsx
export { BatchApprovalModal as BatchApprovalButton } from "@/features/project-detail/components/batch-approval-modal";
```

This keeps existing imports compiling while the page wires the new modal by its new name.

- [ ] **Step 4: Wire into the project page**

In `src/app/app/projects/[id]/page.tsx`, add import:

```tsx
import { BatchApprovalModal } from "@/features/project-detail/components/batch-approval-modal";
```

Replace the `<h2>Agent suggestions (...)</h2>` line with:

```tsx
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium text-brand-primary">
            Agent suggestions ({run?.suggestions.length ?? 0})
          </h2>
          {run && run.suggestions.filter((s) => s.status === "PENDING").length >= 2 && (
            <BatchApprovalModal
              auditRunId={run.id}
              pendingCount={run.suggestions.filter((s) => s.status === "PENDING").length}
              totalSaved={run.suggestions
                .filter((s) => s.status === "PENDING")
                .reduce((a, s) => a + s.kgCo2eSaved, 0)}
              approverName={project.responsibleApproverName}
              approverRole={project.responsibleApproverRole}
              preview={run.suggestions
                .filter((s) => s.status === "PENDING")
                .map((s) => ({
                  originalCode: s.originalItem.material.code,
                  proposedCode: s.proposedMaterialCode,
                  saved: s.kgCo2eSaved,
                }))}
            />
          )}
        </div>
```

- [ ] **Step 5: Typecheck + dev smoke**

Run `npm run typecheck`. Expected exit 0. Run `npm run dev`, open Torre Núñez, click `Approve all`, confirm modal opens with the binding message preview and the 4 substitutions listed. Close modal. Stop dev.

- [ ] **Step 6: Commit**

```bash
git add src/features/project-detail/components/batch-approval-modal.tsx src/features/audit/components/batch-approval-button.tsx src/app/app/projects/[id]/page.tsx
git commit -m "feat(project-detail): batch-approval modal with binding-message inspector"
```

---

## Task 14 — Recompute `AuditRun.reviewStatus` on decisions; set `slaDueAt` on new runs

**Files:**
- Modify: `src/features/audit/server/approvals.ts`
- Modify: `src/features/audit/server/run-audit.ts`

**Context:** Without this, inbox filters drift: decisions happen but cards stay `AWAITING`. We add a small helper that recomputes the run status after each decision and call it from both individual and batch approval paths.

- [ ] **Step 1: Add a helper to `approvals.ts`**

Open `src/features/audit/server/approvals.ts`. Near the bottom of the imports add:

```ts
import type { Prisma } from "@prisma/client";
```

Above the first exported server action, add:

```ts
async function recomputeReviewStatus(auditRunId: string, tx?: Prisma.TransactionClient): Promise<void> {
  const client = tx ?? prisma;
  const run = await client.auditRun.findUnique({
    where: { id: auditRunId },
    include: { suggestions: { select: { status: true } } },
  });
  if (!run) return;
  const all = run.suggestions;
  if (all.length === 0) {
    await client.auditRun.update({ where: { id: auditRunId }, data: { reviewStatus: "CLEARED" } });
    return;
  }
  const terminal = all.every((s) => s.status === "APPROVED" || s.status === "REJECTED" || s.status === "EXPIRED");
  if (terminal) {
    await client.auditRun.update({ where: { id: auditRunId }, data: { reviewStatus: "CLEARED" } });
    return;
  }
  const anyDecided = all.some((s) => s.status !== "PENDING");
  await client.auditRun.update({
    where: { id: auditRunId },
    data: { reviewStatus: anyDecided ? "IN_REVIEW" : "AWAITING_REVIEW" },
  });
}
```

- [ ] **Step 2: Call it after every decision write**

Inside `checkApproval` — after the block where a successful `approve` or `deny` writes the `Approval` row and updates the `Suggestion.status` — add before returning the result:

```ts
  if (suggestion.auditRunId) await recomputeReviewStatus(suggestion.auditRunId);
```

(If the existing code wraps the write in a `prisma.$transaction`, pass the transaction client: `await recomputeReviewStatus(suggestion.auditRunId, tx);`. The helper accepts both.)

Inside `checkBatchApproval` — after the loop that updates all suggestions on the run — add:

```ts
  await recomputeReviewStatus(auditRunId);
```

- [ ] **Step 3: Set `slaDueAt` + initial `reviewStatus` in `run-audit.ts`**

Open `src/features/audit/server/run-audit.ts`. Locate the `prisma.auditRun.create({ ... })` (or `update({ ... data: { status: "COMPLETED", ... }})`) calls. At the **create** site add:

```ts
      slaDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      reviewStatus: "AWAITING_REVIEW",
```

At the completion site, if zero suggestions were produced, set `reviewStatus: "CLEARED"`; otherwise leave `AWAITING_REVIEW`. The simplest shape: after the Gemini call resolves, add:

```ts
  const reviewStatus = suggestionsToInsert.length === 0 ? "CLEARED" : "AWAITING_REVIEW";
  // then in the update:
  // data: { status: "COMPLETED", totalKgCo2e, hotspotCount, completedAt: new Date(), reviewStatus }
```

Adjust the variable names to match the existing code's names (e.g. `suggestionsPayload`, `completedSuggestions`). Grep if unsure.

- [ ] **Step 4: Typecheck + dev smoke**

Run `npm run typecheck` — expect exit 0.

Run `npm run dev`, open Distrito Solar (has 2 APPROVED + 1 PENDING pre-seeded). Confirm status is `IN_REVIEW`. Approve the last pending suggestion via the real CIBA flow (push → your phone → approve). Back on the page, reload: expect `CLEARED`. Stop dev.

- [ ] **Step 5: Commit**

```bash
git add src/features/audit/server/approvals.ts src/features/audit/server/run-audit.ts
git commit -m "feat(audit): recompute AuditRun.reviewStatus on decisions; seed slaDueAt on new runs"
```

---

## Task 15 — Restyle `run-audit-button.tsx` to the new system

**Files:**
- Modify: `src/features/audit/components/run-audit-button.tsx`

**Context:** The SSE audit runner still works; only the button/log visuals need to match the new palette. No logic changes.

- [ ] **Step 1: Replace the JSX-level Button with `PillButton` and restyle the log panel**

Open `src/features/audit/components/run-audit-button.tsx`. Replace the import of `Button` with:

```tsx
import { PillButton } from "@/components/ui/pill-button";
```

Replace every `<Button ...>` occurrence in the render with `<PillButton ...>` (same props). Wherever there is a log container with classes like `bg-muted` or `text-muted-foreground`, change to `bg-canvas border border-border text-ink/80` for the container and `text-muted` for the timestamp column. Change any `text-green-*` tones to `text-brand-accent`, red tones to `text-danger`, amber to `text-warning`.

No other structural change.

- [ ] **Step 2: Typecheck + dev smoke**

Run `npm run typecheck`, expect 0. Run `npm run dev`, open the Ezeiza project (no audit yet), run the audit live. Confirm: button looks like a pill, log panel reads on cream-to-white contrast. Stop dev.

- [ ] **Step 3: Commit**

```bash
git add src/features/audit/components/run-audit-button.tsx
git commit -m "chore(ui): restyle RunAuditButton + SSE log panel to One Click LCA palette"
```

---

## Task 16 — Full smoke, deploy, final commit

**Files:** none new.

**Context:** End-to-end verification on local + production, then ship.

- [ ] **Step 1: Full type + lint sweep**

Run (sequentially):
```bash
npm run typecheck
npm run lint
```
Both expected to exit 0. Fix anything that fails before proceeding.

- [ ] **Step 2: Manual smoke — golden path**

Run:
```bash
npm run dev
```

Open a **private** browser window and walk through:

1. `http://localhost:3000` — landing renders, hero + pillars + how-it-works + footer visible.
2. Click `Log in with Auth0` → Universal Login → lands on `/app`.
3. Inbox shows three cards. Stats row shows counts. Filter chips change URL.
4. Click Torre Núñez → project detail loads. Header shows approver + status. Summary tiles render. BOM table has 4 orange-bordered hotspot rows. 4 PENDING suggestion cards. `Approve all · 14,820 kg ↓` pill is visible.
5. Click `Approve all` → modal opens with the binding message preview.
6. Close modal. Click the individual `Approve with Auth0 CIBA` on the first suggestion → pushed state with pulsing dots + expandable binding message.
7. Complete the approval on your phone (real CIBA). Page reflects APPROVED after the poll resolves; stats tile animates the new delta.

Stop dev on Ctrl+C.

- [ ] **Step 3: Deploy to Railway**

Run:
```bash
railway up --ci
```

Expected: build + deploy succeeds in ~90s. Once it prints `Deploy complete`, verify:

```bash
curl -sS -o /dev/null -w "HTTP %{http_code} · %{time_total}s\n" https://web-production-5dcc8.up.railway.app/
```

Expected: `HTTP 200`.

- [ ] **Step 4: Push migration on Railway**

The Railway Postgres needs the new `mvp_positioning` migration. Run:
```bash
railway run npm run db:deploy
railway run npm run db:seed
```

Expected: migration applied and seed inserts 3 projects.

- [ ] **Step 5: Remote smoke**

Open `https://web-production-5dcc8.up.railway.app/` in a private browser, log in, walk the same path. All three cards appear. Stop.

- [ ] **Step 6: Final commit (if any hotfixes landed during smoke)**

```bash
git status
# If clean: nothing to do. If fixes:
git add -u
git commit -m "fix(ui): <describe smoke-time adjustments>"
```

---

## Post-execution follow-ups (NOT in this plan)

- Demo video recording (OBS + phone overlay).
- DEV.to post (draft from `BITACORA.md`).
- `<handle>` placeholder in footer → real GitHub handle.
- Moving the approver from a string field to a real FK when the hackathon is over.
