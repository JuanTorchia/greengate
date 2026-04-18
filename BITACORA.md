# Bitácora — GreenGate

Running log of the weekend sprint. Raw material for the DEV.to submission post.

Each entry: timestamp (AR, UTC-3) + scene + decision/insight. Written in the
first person so it reads as narrative, not documentation. The post is drafted
from this file — not rewritten from scratch at the end.

---

## Fri 2026-04-17, 23:58 — The pitch

Hackathon kickoff. DEV.to Weekend Challenge, Earth Day Edition. The category
I'm chasing is **"Best Use of Auth0 for Agents."** Not because of the $100 —
because the category description happens to describe the exact shape of the
problem I've been wanting to work on.

Buildings are ~37% of global energy-related CO₂ emissions (UNEP Global Status
Report). Most of that footprint is decided at the Bill-of-Materials stage,
before anything is poured or welded. Auditing a BOM for embodied carbon is a
lot of spreadsheet math against peer-reviewed emission factors — a good job
for an agent.

But the *consequence* of the audit — "replace Portland cement CEM I with
CEM III/A in 12 items" — is not a decision a bot should take. Structural
class, fire rating, supply chain, local building code: none of those are in
the prompt. The right shape is **agent does the work, human takes the
decision.** That's CIBA.

The project is called **GreenGate**.

## Sat 2026-04-18, 00:10 — Initial scaffold

Commit `474af1e`. The scaffold is deliberately opinionated:

- **Next.js 16 App Router, TypeScript strict** with `noUncheckedIndexedAccess`.
  If I'm going to trust structured output from an LLM, I want the type system
  to be paranoid about indexed access.
- **Feature-first folder layout** (`src/features/audit/...`), not MVC. The
  agent, the audit, and the approvals form a domain — they belong together.
- **Prisma for the operational state** (users, projects, BOM, audit runs,
  approvals), **Snowflake for the emission factors**. This split matters:
  emission factors are LCA research data — versioned, queryable, shareable
  across projects. Postgres is the wrong place. Snowflake is where this kind
  of data belongs.
- **`Approval.authReqId` is `@unique` and required**. The CIBA request ID is
  the audit trail. It's what lets anyone reconstruct who approved what,
  when. Judges will look at this; more importantly, real site managers would.

Decisions I'm deliberately not making yet:
- No multi-tenancy. No file upload. No manual BOM edits. Scope is aggressively
  cut so Phase 1 can actually finish.

## Sat 2026-04-18, 00:30 — Priority shift: Auth0 first

Reordered the plan. The original draft attacked Snowflake → Gemini → Auth0.
Flipping it to **Auth0 first**.

Reasoning: Auth0 CIBA is the one part of the project that, if it doesn't work,
the submission doesn't qualify for its primary prize category. Snowflake and
Gemini, if they don't work, degrade gracefully (mock factors, hand-crafted
suggestion). So the high-risk, prize-carrying piece goes first, while I'm
alert.

Working mode for the rest of the weekend: continuous. No hour-by-hour schedule.
Sleep only when I have to.

## Sat 2026-04-18, 00:35 — Risk I'm watching

The single unknown in the CIBA flow: whether **Auth0 Guardian actually renders
the `binding_message`** on the push. The protocol says it's supposed to —
RFC 9126 defines it — but "push supports binding message" has not been a
documented Guardian feature historically. The *earliest* thing to check at
M2 is a bare `POST /bc-authorize` from `curl`, unlocked phone next to me,
looking for the binding message to show up on the notification.

If it doesn't, the fallback is **MFA OOB Push**: same Auth0 tenant, same
Guardian app, different endpoint (`/mfa/challenge` + grant `mfa-oob`). Still
human-in-the-loop, still agent-initiated, still an Auth0 prize story — just
not the canonical CIBA one.

I'm not going to burn hours on the CIBA/Guardian question. If two attempts
don't succeed, I flip the fallback and move on.

---

<!-- Future entries go below. Keep them short, honest, and specific. -->
