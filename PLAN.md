# GreenGate — Hackathon Sprint Plan

**Submission target**: DEV.to Weekend Challenge — Earth Day Edition
**Primary prize category**: Best Use of Auth0 for Agents ($100 + DEV++ + badge)
**Secondary categories**: Snowflake, Google Gemini
**Deadline**: Monday 2026-04-20, 06:59 UTC (03:59 AR, UTC-3)
**Sprint window**: Friday 2026-04-17 23:58 AR → Monday 2026-04-20 03:59 AR (~52h wall-clock)
**Effective work time**: ~27h (52h minus 16h sleep, 5h meals/breaks, 4h submission tasks)

> All times in this plan are **Argentina (UTC-3)** unless stated otherwise.
> CP = Critical Path (hard stop). B = Buffer (absorbable slip).

---

## Schedule

### Day 0 — Friday night (sprint kickoff)

| Time (AR)       | Duration | Task                                                                | CP/B |
|-----------------|----------|---------------------------------------------------------------------|------|
| 23:58 → 01:30   | 1h30m    | Review PLAN.md, approve scaffold + skeletons, `git init`, push repo | CP   |
| 01:30 → 09:30   | 8h       | Sleep                                                               | —    |

### Day 1 — Saturday

| Time (AR)       | Duration | Task                                                                                              | CP/B |
|-----------------|----------|---------------------------------------------------------------------------------------------------|------|
| 09:30 → 10:00   | 30m      | Breakfast                                                                                         | —    |
| 10:00 → 12:30   | 2h30m    | `npm install`, Prisma migrate + seed, local `next dev` green, Auth0 Universal Login wired         | CP   |
| 12:30 → 13:30   | 1h       | Lunch                                                                                             | —    |
| 13:30 → 16:00   | 2h30m    | Snowflake trial signup + ICE Database v3.0 CSV upload via Snowsight + verify query in Snowsight   | CP   |
| 16:00 → 16:30   | 30m      | Break                                                                                             | —    |
| 16:30 → 17:30   | 1h       | Wire `snowflake-sdk` in `src/lib/snowflake/client.ts`, integration test from Node REPL            | CP   |
| 17:30 → 21:00   | 3h30m    | Gemini: API key, `@google/generative-ai`, prompt + structured output + Zod validation, end-to-end with mock hotspots | CP |
| 21:00 → 22:00   | 1h       | Dinner                                                                                            | —    |
| 22:00 → 01:00   | 3h       | Auth0 tenant, CIBA app config, install Guardian on phone, first successful `/bc-authorize` → push → response from local server | **CP (critical)** |
| 01:00 → 09:00   | 8h       | Sleep                                                                                             | —    |

### Day 2 — Sunday

| Time (AR)       | Duration | Task                                                                                              | CP/B |
|-----------------|----------|---------------------------------------------------------------------------------------------------|------|
| 09:00 → 09:30   | 30m      | Breakfast                                                                                         | —    |
| 09:30 → 13:00   | 3h30m    | Audit orchestrator: fetch BOM → Snowflake factors → hotspots → Gemini → CIBA → persist approval → BOM update | **CP (critical)** |
| 13:00 → 14:00   | 1h       | Lunch                                                                                             | —    |
| 14:00 → 17:30   | 3h30m    | UI: dashboard, BOM table, suggestions panel, approval status indicator, Framer Motion carbon delta | CP   |
| 17:30 → 18:00   | 30m      | Break                                                                                             | —    |
| 18:00 → 21:00   | 3h       | Deploy to Railway (env vars, Postgres addon, domain), e2e smoke test in prod                      | **CP (critical)** |
| 21:00 → 22:00   | 1h       | Dinner                                                                                            | —    |
| 22:00 → 00:30   | 2h30m    | Record demo video (2 takes, edit winning one)                                                     | CP   |
| 00:30 → 02:30   | 2h       | Write DEV.to post, prepare submission                                                             | CP   |
| 02:30 → 03:30   | 1h       | Final polish + submission buffer                                                                  | B    |
| **03:59 Mon**   | —        | **SUBMISSION DEADLINE (06:59 UTC)**                                                               | —    |

### Critical-path hard stops

| Deadline (AR) | Must be true                                                |
|---------------|-------------------------------------------------------------|
| Sat 13:00     | Local stack boots, seed succeeds, Auth0 login works         |
| Sat 17:30     | Snowflake returns factors to Node                           |
| Sat 21:00     | Gemini returns valid structured JSON end-to-end             |
| Sun 01:00     | CIBA push arrives on Guardian, token returned to server     |
| Sun 13:00     | Full orchestrator wired end-to-end against real services    |
| Sun 18:00     | **Feature freeze.** No new code after this — only polish.   |
| Sun 21:00     | Deployed URL live and responding                            |
| Mon 02:30     | Submission draft complete                                   |

---

## Risk register

| # | Risk                                                                    | Prob | Impact   | Mitigation                                                                                 | Fallback                                                                                               |
|---|-------------------------------------------------------------------------|------|----------|--------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| 1 | Auth0 Guardian does not render the CIBA `binding_message` as expected   | Med  | Critical | Verify docs at start of Sat 22:00 block before coding; test bare `/bc-authorize` first     | Auth0 MFA OOB Push (`/mfa/challenge` + `/oauth/token` grant `mfa-oob`). Still Auth0, still async, still human-in-the-loop. |
| 2 | Snowflake trial signup delays (phone verification, account provisioning)| Low  | High     | Start signup at 13:30 Sat sharp; have ICE CSV ready offline                                | Use Postgres `emission_factors` table with same schema. README explains "prod uses Snowflake".         |
| 3 | Gemini structured-output JSON drifts off Zod schema                     | Med  | Med      | Zod runtime validation; retry-with-reprompt on parse failure; keep schema tight            | Two-call pattern: freeform → JSON-extraction call with `response_mime_type: application/json`.         |
| 4 | Railway deploy fails (build error, env var, cold start, Postgres conn)  | Med  | High     | Deploy continuously from Sat afternoon — don't leave deploy to Sun night                   | Vercel deploy as hot backup (Postgres stays on Railway, point `DATABASE_URL` across).                  |
| 5 | Demo video recording eats into submission time                          | Med  | High     | Pre-write script during Sat UI block; single-screen OBS setup ready Sat evening            | Fall back to annotated screenshots + narration in DEV.to post.                                         |

---

## Go / No-Go checkpoints

| When (AR)   | Check                                                                        | No-go action                                                                 |
|-------------|------------------------------------------------------------------------------|------------------------------------------------------------------------------|
| Sat 16:00   | Snowflake ingested ICE data and queryable via Snowsight?                     | Switch to Postgres fallback (Risk #2). Carry on.                             |
| Sat 20:00   | Gemini returning valid JSON matching Zod schema 3 times in a row?            | Switch to two-call extraction pattern.                                       |
| Sun 01:00   | Phone received Guardian push with correct binding message?                   | Switch to MFA OOB Push flow. Update DEV.to narrative accordingly.            |
| Sun 13:00   | End-to-end audit flow works locally (button → suggestion → push → apply)?    | Cut audit-run history list. Keep core flow only.                             |
| Sun 18:00   | **Feature freeze.** Working locally end-to-end?                              | If NO: cut suggestions panel animation, ship static. If YES: deploy only.    |
| Sun 21:00   | Deployed URL responds and demo flow works in prod?                           | Submit with local screencast + README caveat + promise of deployed URL in comments. |

---

## Order of attack for the 3 highest-risk integrations

Chosen order: **Snowflake → Gemini → Auth0 CIBA**.

Reasoning:
- **Snowflake** is non-interactive infra. Unlocks the data layer so Gemini has something real to work with.
- **Gemini** is fully local dev (no external human action required). Fastest feedback loop.
- **Auth0 CIBA** is the demo centerpiece and requires phone + Guardian. Best tackled with a clear head, after dinner, with all other integrations verified so nothing else can distract or block.

If you want to flip this (e.g., attack Auth0 first because it's the prize), raise it before Sat 10:00.

---

## Parallel-work opportunities

Whenever blocked on external work (Snowflake query running, CIBA polling, Gemini request), switch to:
- README content
- DEV.to post draft
- Demo-video shot list
- Prisma seed data review

Never sit idle waiting on an external service.

---

## Non-negotiables (from brief, restated)

- English-only in all code, comments, commits, docs, DEV.to post.
- No fake emission factors. Empty table + `TODO: load from ICE Database` placeholder.
- No invented APIs. `// VERIFY:` + docs URL for anything uncertain.
- Zero extra dependencies beyond those listed in the scaffold.
- Gemini system prompt + schema live in `src/lib/gemini/prompts/audit-suggestion.ts` as versioned constants.
- Every CIBA approval persists `auth_req_id`, timestamp, decision, user ID — judges will read this.
