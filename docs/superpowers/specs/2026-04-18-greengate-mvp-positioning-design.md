# GreenGate — MVP Positioning & Visual Design Spec

**Date:** 2026-04-18
**Context:** DEV.to Weekend Challenge — Earth Day 2026. Category: Best Use of Auth0 for AI Agents. Deadline 2026-04-20 06:59 UTC.
**Status:** Approved via brainstorming. Pending implementation plan.

---

## 1. Product positioning

### 1.1 Target user (primary)

**Sustainability Lead / ESG Manager** at a construction company or developer.

- Has a mandate to meet carbon targets (CSRD in the EU, SB 253 in California, similar frameworks globally).
- Audits incoming BOMs to justify reductions to the board and to regulators.
- Speaks in terms of Scope 3, embodied carbon, LCA, benchmarks.
- Secondary users (arquitecto, quantity surveyor) are not the UI target — the UI is optimized for the Sustainability Lead's workflow.

### 1.2 Triggering moment (reactive)

The Sustainability Lead opens GreenGate because **a new BOM landed in their inbox** — usually shared by a PM before a tender or a contract signoff. They have an SLA (typically 48h) to review and clear it.

This trigger demands an **inbox-first UX**. The landing screen (post-login) IS an inbox.

### 1.3 Approval-flow shape (hybrid for demo)

Narrative: **separation of duties** — Sustainability proposes, the responsible technical engineer (Structural Engineer, Architect of Record) approves with their own identity via Auth0 CIBA.

Implementation for this MVP: the UI always displays `"Approval sent to: Ing. <Name> — <Role>"`, sourced from a new field on `Project`. The push itself still goes to the currently logged-in user's Auth0 sub (single-identity demo). Post-submission the `Project.responsibleApproverUserId` FK can be made real — out of scope for this spec.

---

## 2. Information architecture

```
/                      Public hero landing
/api/auth/*            Auth0 callbacks (already wired)
/app                   [protected] Inbox — BOMs awaiting review + stats row
/app/projects/[id]     [protected] BOM detail — table, suggestions, approval flow
/api/audit             SSE streaming endpoint (already wired)
```

The top-level app nav shows three items: `Inbox`, `Projects`, `Reports`. Only `Inbox` is functional in the MVP. `Projects` and `Reports` are inert links rendered as `disabled` with a "coming soon" tooltip — signaling roadmap without adding surfaces to polish.

---

## 3. Data model changes

All additive. No destructive migrations.

### 3.1 `Project`

Add two string fields (no FK yet — hybrid demo approach):

- `responsibleApproverName  String`  e.g. `"Ing. Martín Acosta"`
- `responsibleApproverRole  String`  e.g. `"Structural Engineer"`

### 3.2 `AuditRun`

Add two fields:

- `reviewStatus  ReviewStatus  @default(AWAITING_REVIEW)`
- `slaDueAt      DateTime?`

New enum:

```prisma
enum ReviewStatus {
  AWAITING_REVIEW
  IN_REVIEW
  CLEARED
}
```

- `AWAITING_REVIEW`: no approvals decided yet.
- `IN_REVIEW`: at least one suggestion approved or rejected, not all resolved.
- `CLEARED`: all suggestions are APPROVED, REJECTED, or EXPIRED.

The transition is computed inside the existing approval server actions (`src/features/audit/server/approvals.ts` — individual and batch paths) whenever a decision lands. Derivation: if every suggestion on the run is in a terminal state (`APPROVED | REJECTED | EXPIRED`) → `CLEARED`; otherwise if any non-PENDING decision exists → `IN_REVIEW`; otherwise `AWAITING_REVIEW`. If the agent returns zero suggestions, the run is born `CLEARED` immediately.

`slaDueAt` defaults to `startedAt + 48h` in the seed; it is not mutated after creation. Values in the past render as "overdue" (red badge).

### 3.3 Seed data

Three projects with varied profiles:

| Project | Type | Approver | Profile |
|---|---|---|---|
| Torre Núñez — Core & Shell | Office tower, 24 stories | Ing. Martín Acosta (Structural) | Heavy CEM I Portland — large saving potential. Audit already run, all suggestions `PENDING`. |
| Distrito Solar Rosario | Residential, 4 towers | Arq. Lucía Renaud (Architect of Record) | Steel rebar focus. Audit already run, 2 of 3 suggestions `APPROVED` (drives the "Carbon saved this month" tile). |
| Centro Logístico Ezeiza | Industrial warehouse | Ing. Rodrigo Salerno (Structural) | Concrete slab, flooring. No audit yet — lets the demo run the SSE pipeline live. |

Each project has ~15–20 BOM line items. The seed script is idempotent and can be re-run.

---

## 4. Pre-login landing (`/`)

### 4.1 Hero

- **Headline** (Sora 600, `text-5xl`): "Audit embodied carbon on every BOM. Keep the human in the loop."
- **Subhead** (Inter 400, `text-lg`): explains the 37% stat, the role of the agent, and the CIBA-bound approval.
- **Hero visual**: a live mock suggestion card to the right, showing the CEM I → CEM III/A substitution for Torre Núñez, with the `AnimatedKg` number animating from 0 → 14,820 in a 6-second loop. Includes a "Approval pending · Ing. Acosta · Push sent 00:12 ago" line.

### 4.2 Credibility pillars (three tiles under the hero)

| Icon | Title | Body |
|---|---|---|
| 🧮 | Auditable by construction | Every suggestion is pinned to an ICE Database factor and a materialized kg CO₂e delta. No hallucinated numbers. |
| 🔐 | Signed by the human | Substitutions require a CIBA-bound approval from the responsible engineer. Audit trail (auth_req_id, timestamp, user) persisted for CSRD / SB 253. |
| 📐 | Built on real BOMs | Works on line-item BOMs from architect specs, not on whole-building estimators. |

### 4.3 CTAs

- Primary: `Log in with Auth0 →` (pill button, `#00C04B`)
- Secondary: `See how it works` — smooth-scrolls to an inline "How it works" section with 3 steps (agent runs audit → suggestions appear → approver signs on phone).

### 4.4 Footer

```
Built for the DEV.to Weekend Challenge — Earth Day 2026
Category: Best Use of Auth0 for AI Agents
web-production-5dcc8.up.railway.app · github.com/<handle>/greengate · demo video ↗

By Juan Torchia — arquitecto → ingeniero, building tools I wish had existed on my sites.
```

---

## 5. Inbox (`/app`)

### 5.1 Top bar

Three items: `Inbox` (active), `Projects`, `Reports`. Avatar dropdown on the right with the user's email and a `Log out` action.

### 5.2 Stats row (3 tiles)

- `AWAITING review` — count of `AuditRun` with `reviewStatus = AWAITING_REVIEW`.
- `CO₂e SAVED this month` — `SUM(Suggestion.kgCo2eSaved)` where `status = APPROVED` and `decidedAt >= first day of current month`. Rendered with `AnimatedKg`.
- `DUE < 24h` — count of `AWAITING_REVIEW` runs where `slaDueAt < now + 24h`. Red when > 0.

### 5.3 Filter chips

`[All] [Awaiting] [In review] [Cleared]`. State persisted in URL query param (`?status=awaiting`) so links are shareable.

### 5.4 BOM cards

Each row:
- Badge + colored status label. Four visual states:
  - 🔴 `URGENT` — `AWAITING_REVIEW` and `slaDueAt < now + 24h`.
  - 🟠 `AWAITING` — `AWAITING_REVIEW` with comfortable SLA margin.
  - 🟡 `IN REVIEW` — partial approvals exist.
  - 🟢 `CLEARED` — all suggestions resolved.
- Title = project name; subtitle = "type · BOM version · shared <relative time> ago".
- Metrics line: `N line items · M hotspots · potential saving X kg CO₂e`.
- Approver line: `Approver: Ing. <Name> (<Role>) · SLA in <time>`.
- CTA: `Review →` / `Continue →` / `View record →` depending on status.
- Entire card is clickable → `/app/projects/[id]`.

### 5.5 Empty state

```
No BOMs pending review. When a PM shares a new BOM, it lands here.
[ Seed demo project ]   [ Upload a BOM (CSV) ]
```

`Seed demo project` triggers a server action that inserts one of the seed projects on demand. `Upload a BOM` is a stub (`disabled`) with "coming soon" tooltip.

---

## 6. BOM detail (`/app/projects/[id]`)

### 6.1 Project header

- Project name (Sora 500, `text-3xl`).
- Subtitle: `type · N stories · BOM vX.Y · shared <time> ago`.
- Approver line: `👤 Ing. <Name> — <Role>`.
- Status line: `🔴 Awaiting review · SLA in <time>`.

### 6.2 Summary tiles (3)

- `Total embodied` — `AuditRun.totalKgCo2e`, with a "post-review projection" sub-label that reflects deltas from approved suggestions.
- `Potential savings` — sum of pending+approved suggestions as a delta with % of total.
- `Hotspots` — "N of M items · drive X%".

### 6.3 Bill of Materials table

Columns: `#`, `Material`, `Qty`, `Unit`, `kg CO₂e`, `Hotspot`. Top 4 contributors carry a `🔥 #1..#4` badge. Rows for hotspots render with a faint orange left-border (`border-l-2 border-hotspot`). Numeric cells use Sora 500 for tabular consistency.

### 6.4 Suggestions section

Header: `Agent suggestions (N)` with a right-aligned `[ Approve all · X kg ↓ ]` pill button visible only when there are 2+ pending.

Each suggestion card shows:
- Status chip (`PENDING` / `AWAITING APPROVAL` / `APPROVED` / `REJECTED` / `EXPIRED`).
- "Replace <original> with <proposed>" title.
- Numeric delta (Sora 500, `text-4xl`, accent green for positive).
- Rationale (full paragraph).
- Risk notes (if any, in warning ochre).
- Approval control (see 6.5).

### 6.5 Approval button states

These are **UI states**, not DB states. DB `Suggestion.status` stays `PENDING` until the CIBA poll resolves to `APPROVED` or `REJECTED`; the `PUSHED` state below lives in the client component while `pollCibaToken` is running.

1. `IDLE` (DB: `PENDING`) — `[ Send approval request ]` pill button.
2. `PUSHED` (DB: `PENDING`, polling active) — `📱 Push sent to Ing. <Name> · <elapsed> waiting…` with a pulsing 3-dot progress. A collapsible `▸ Show binding message` reveals the exact CIBA binding_message for transparency.
3. `APPROVED` (DB: `APPROVED`) — `✓ Approved by Ing. <Name> at <timestamp>` — card glows green briefly, stats tiles re-animate.
4. `REJECTED` (DB: `REJECTED`) — `✗ Rejected — reason: <reason>` in burgundy.
5. `EXPIRED` (DB: `EXPIRED`) — `⏱ Push expired — request a new approval` with an `IDLE`-style button to retry.

### 6.6 Batch approval

Triggered by `Approve all · X kg ↓`. Opens a modal that lists the N substitutions, shows the exact single binding_message that will be sent, and provides one `[ Send single CIBA push ]` button. Approving one push approves all N; rejecting rejects all N.

On resolution, the N cards animate to `APPROVED` in sequence (150 ms stagger) and the summary tiles re-animate.

### 6.7 Empty state (no suggestions)

```
Agent found no substitutions that meet your current thresholds.
The BOM has been logged as reviewed. [ Export audit record ]
```

`Export audit record` is a stub for the MVP.

---

## 7. Visual system (adapted from One Click LCA)

Design tokens sourced from oneclicklca.com to inherit the visual authority of the category leader in embodied-carbon software. No dark mode in the MVP.

### 7.1 Palette

| Token | Hex | Role |
|---|---|---|
| `bg-canvas` | `#F0EDE6` | Warm cream — page background |
| `bg-card` | `#FFFFFF` | Card surfaces |
| `bg-dark` | `#154B3E` | Deep forest — footer, inverted sections |
| `ink` | `#000000` | Strong text |
| `muted` | `#999999` | Secondary text |
| `brand-primary` | `#006726` | Forest green — brand, headings accent |
| `brand-accent` | `#00C04B` | Bright mint green — CTAs, APPROVED badges, positive deltas |
| `brand-teal` | `#0C7B5F` | Secondary brand, chart accents |
| `warning` | `#A86B00` | SLA < 24h, risk notes |
| `danger` | `#8B1A1A` | REJECTED, overdue |
| `hotspot` | `#C2410C` | 🔥 row accents in BOM table |

### 7.2 Typography

| Family | Weights | Role |
|---|---|---|
| Sora | 400/500/600 | Display — hero titles, section headings, large carbon numbers |
| Inter | 400/500/600 | Body — paragraphs, tables, labels |
| Poppins | 600 | Interactive — pill buttons, chips |
| JetBrains Mono | 400 | Technical codes only — `auth_req_id`, material codes |

Loaded via `next/font/google` with `display: swap`.

Scale:

```
hero-title     text-5xl  font-medium  tracking-tight    Sora
hero-sub       text-lg   font-normal                    Inter
h1 section     text-3xl  font-medium  tracking-tight    Sora
h2 section     text-xl   font-medium                    Sora
body           text-sm   font-normal                    Inter (default)
body-lg        text-base font-normal                    Inter
numeric-hero   text-4xl  font-medium                    Sora (for carbon deltas)
label          text-xs   font-medium  uppercase tracking-wider  Inter
```

### 7.3 Signature visual moves (the "stolen" identity)

1. **Pill buttons** — `rounded-full`, `px-6 py-2.5`, `font-weight: 600`, Poppins. Full rounded, not rectangular.
2. **Cream background + white cards** — explicit non-white canvas (`#F0EDE6`) distinguishes the app from generic Tailwind defaults.
3. **Green as the only saturated accent** — ~95% of the UI is cream/white/ink/gray. Bright green `#00C04B` appears only on primary CTAs, APPROVED state, and positive carbon deltas.
4. **Headings use `brand-primary` `#006726`**, not pure black — matches One Click LCA's warmth.

### 7.4 Density

Medium-high. Compliance software shows a lot of data and power users move fast.

- `py-6 px-8` on cards.
- `gap-3` in vertical lists.
- 40 px row height in the BOM table.
- No decorative whitespace — each card is a dense block surrounded by breathing room.

### 7.5 Iconography

`lucide-react` at `strokeWidth={1.75}`. Status icons carry color; decorative icons are `muted` gray. `🔥` hotspot marker is an explicit emoji (not a lucide icon) — gives textural variety without bloating the icon set.

### 7.6 Motion (framer-motion)

- Easing `[0.16, 1, 0.3, 1]` for entrances; `easeOut` for hover/press.
- Durations: 200 ms for feedback, 600 ms for celebrations (approval applied).
- `AnimatedKg` uses `useMotionValue` + `useTransform(v => Math.round(v).toLocaleString())`, duration 800 ms. Re-triggers when target changes.
- Batch-approval cascade: 150 ms stagger between sibling cards.

### 7.7 Container widths

```
max-w-6xl mx-auto px-6 py-8    /app/*
max-w-4xl mx-auto px-6         hero, 404, content pages
```

---

## 8. Demo script (3 min video)

### 8.1 Structure

```
0:00–0:15   Cold open — problem statement
0:15–0:35   Product intro — landing hero + log in
0:35–2:20   Demo end-to-end — inbox → BOM detail → approval → batch
2:20–2:45   Why CIBA matters + close
```

### 8.2 Key beats

- **Cold open**: black screen, Sora 600 text types on: "Buildings are 37% of global CO₂ emissions. Most of it is decided before construction starts — at the Bill of Materials."
- **Product intro**: cut to `/`, hold 2 s on the animated suggestion card, voiceover explains the CIBA-bound approval model. Click `Log in with Auth0`.
- **Inbox**: pan the stats row (`AWAITING`, `SAVED`, `DUE < 24h`), hover on the URGENT card, click into Torre Núñez.
- **BOM detail**: scroll to the hotspots, then to the first suggestion (CEM I → CEM III/A). Voiceover calls out the rationale and the risk flag.
- **Individual approve**: click `Send approval request` — card pulses PUSHED, picture-in-picture shows the Guardian push with the full binding_message. Approve on phone → card cascades to APPROVED, stats re-animate.
- **Batch approve**: click `Approve all`, modal shows the aggregated binding_message. One push, three approvals. Staggered cascade.
- **Close**: three lines on a simple screen — "Agent does the math. / Human owns the decision. / Auth0 CIBA binds one to the other." Voiceover closes on the broader thesis (agents + regulated domains + human-signed decisions). End card with credits.

### 8.3 Production notes

- OBS Studio, 1080p60. Multi-source: screen + phone screen via scrcpy or static phone mockup overlay.
- Voiceover recorded separately with a decent mic; mixed in post.
- Background music: quiet, 50% under voice. Free tracks from YouTube Audio Library — "ambient piano 80 bpm".
- Burned-in English subtitles (judges may watch muted).
- Second take wins — first take is for debugging.

---

## 9. Explicit non-goals for this MVP

- **Dark mode**. One Click LCA is light-only; we inherit that.
- **Real multi-user approver routing**. The push goes to the logged-in user; the UI reads the approver from a string field on `Project`. FK-based routing is post-submission.
- **BOM upload (CSV/XLSX)**. Seeded projects only. The upload control is a stub with a "coming soon" tooltip.
- **Portfolio dashboard / `Reports` route**. Stubs in nav; no underlying page.
- **Exporting audit records** (for CSRD/SB 253 evidence). Button placeholder only.
- **Snowflake live emission factors**. `EMISSIONS_SOURCE=mock` continues to power the demo. Swap is a flag flip, not in scope.

---

## 10. Risk register (design-specific)

| # | Risk | Mitigation |
|---|---|---|
| 1 | Visual system extraction takes longer than 1h and blocks layout work. | Tokens and config are exactly specified in §7. Tailwind config + `next/font` setup should be ≤45 min. |
| 2 | Batch approval cascade animation looks janky (4 cards stagger + stats re-animate at once). | Keep stagger at 150 ms, ease-out. If it still reads bad, drop the stagger and just animate stats. |
| 3 | Phone picture-in-picture in the demo requires real Guardian push timing. | Pre-record a 10 s Guardian video once the flow works locally; overlay as a static clip in the video. |
| 4 | New routes (`/app`, `/app/projects/[id]`) break existing session handling. | Both are protected via the same `auth0.getSession()` pattern already used on `/`. No new middleware. |
| 5 | Seed script idempotency breaks if schema changes. | Seed uses `upsert` on stable slug keys (`project.slug`). Any new field gets a sensible default. |

---

## 11. Out of scope — captured for v2

- Multi-tenancy / organizations.
- Real responsible-approver mapping with per-project user FK.
- CSV/XLSX BOM upload.
- CSRD / SB 253 evidence export bundle.
- Portfolio dashboard with cross-project analytics.
- Dark mode toggle.
- I18n (Spanish toggle on the landing).
- Snowflake live emission factors.
