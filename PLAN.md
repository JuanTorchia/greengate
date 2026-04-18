# GreenGate — Sprint Plan (revised)

**Submission**: DEV.to Weekend Challenge — Earth Day Edition
**Primary prize**: Best Use of Auth0 for Agents
**Deadline**: Monday 2026-04-20, 06:59 UTC (03:59 AR, UTC-3)
**Working mode**: continuous, sleep only when required

> Phases replace the hour-by-hour schedule. Phase 1 ships the submission on its
> own — Phases 2 and 3 make it richer, but they are additive.

---

## Priorities

1. **Auth0 CIBA end-to-end.** This is the prize narrative. Ship it first.
2. **Real data behind the flow** (Snowflake + Gemini). Elevates the demo,
   but Phase 1 must already feel complete without them.
3. **Polish + deploy + demo video + DEV.to post.** The post is the main
   artifact the judges read — it's backed by the bitácora, not rewritten
   from scratch.

---

## Phase 1 — Auth0 CIBA end-to-end (top priority)

Strict-order milestones:

- **M1** — Auth0 tenant ready. Regular Web App configured for Universal Login.
  M2M application configured with the CIBA grant. Auth0 Guardian installed on
  phone and enrolled. *(Human action — see checklist below.)*
- **M2** — Bare `/bc-authorize` POST (from `curl` or Node REPL) returns an
  `auth_req_id` and the phone shows the `binding_message`. **This is the
  earliest risk-killer.** If Guardian does not render the binding message,
  switch to MFA OOB Push immediately (Risk #1) — do not loop on CIBA docs.
- **M3** — `@auth0/nextjs-auth0` wired. User logs in with Universal Login.
  Session is readable from server actions.
- **M4** — `initiateCiba` + `pollCibaToken` implemented. A dummy server action
  (`proposeDummyChange`) triggers a push, polls, receives the decision, and
  persists an `Approval` row with `auth_req_id`, `userId`, timestamp, decision.
- **M5** — Minimal UI: "Propose a test change" button, pending/approved/denied
  state, the persisted Approval record visible in the page for honesty.

**Phase 1 is independently demo-able.** If Phase 2 derails, Phase 1 alone is a
credible submission for the Auth0 prize category.

### M1 action checklist (has to be you, not code)

1. Create an Auth0 tenant (free dev tenant is fine):
   https://auth0.com/signup
2. Regular Web App for Universal Login:
   - Callback URL: `http://localhost:3000/auth/callback`
   - Logout URL: `http://localhost:3000`
   - Copy `Domain`, `Client ID`, `Client Secret` → `.env`
3. Enable CIBA on the tenant:
   - Dashboard → Authentication → Authentication Profile → turn on
     "Client-Initiated Backchannel Authentication (CIBA)"
   - Configure an authenticator (Guardian push) at Tenant Settings → MFA.
4. Create a second application for the CIBA grant:
   - Type: Machine-to-Machine
   - Grant types: include `urn:openid:params:grant-type:ciba`
   - Authorize it for an API (create one if you don't have it; set Audience)
   - Copy `Client ID`, `Client Secret`, `Audience` → `.env` under
     `AUTH0_CIBA_*`
5. Install **Auth0 Guardian** on your phone and enroll the user you'll use for
   the demo (enroll under the same Auth0 tenant, via Universal Login MFA).

When all five are done, M1 is complete.

---

## Phase 2 — Real data (only after Phase 1 is green)

Picked greedily. Skip blocked items rather than waiting.

- **Snowflake**: trial signup, ICE Database v3.0 CSV upload via Snowsight,
  `snowflake-sdk` client implemented, query from Node verified.
- **Gemini**: API key, structured output with `responseMimeType: application/json`
  and `responseSchema`, Zod validation at the boundary.
- **Audit orchestrator**: combine BOM × factors → hotspots → Gemini →
  `initiateCiba` with a real, human-readable binding message. Replaces the
  Phase 1 dummy suggestion.

Fallbacks (applied on first sign of slip):
- Snowflake slips → `EMISSIONS_SOURCE=mock` with a small ICE subset.
  The BOM math + Gemini call still work. README explains it honestly.
- Gemini slips → hand-craft one realistic substitution server-side and note the
  architectural seam. The CIBA roundtrip is still real.

---

## Phase 3 — Ship it

- Dashboard UI: BOM table, hotspot highlights, suggestions panel, approval
  status, Framer Motion carbon-delta animation on approval.
- **Railway deploy early and often.** Do not leave deploy to the last hour.
- Demo video: OBS/Loom. Script is pre-written from the bitácora. Record once
  the deployed flow works end-to-end; second take wins.
- DEV.to post: drafted from `BITACORA.md`. Opens on embodied-carbon as a
  neglected problem, closes on why human-in-the-loop is the right pattern for
  agents in regulated domains.

---

## Risk register

| # | Risk                                                                     | Prob | Impact   | Mitigation                                                                                 | Fallback                                                                                               |
|---|--------------------------------------------------------------------------|------|----------|--------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| 1 | Auth0 Guardian does not render CIBA `binding_message`                    | Med  | Critical | Verify at M2 with a bare POST before writing any integration code                         | Auth0 MFA OOB Push (`/mfa/challenge` + grant `mfa-oob`). Still Auth0, still async, still human-in-the-loop. |
| 2 | Snowflake trial signup delays (phone/email verification)                 | Low  | Med      | Only hit when Phase 2 starts; ICE CSV is ready offline                                    | Postgres `emission_factors` table with same schema + `EMISSIONS_SOURCE=mock`.                         |
| 3 | Gemini structured-output JSON drifts off Zod schema                      | Med  | Low      | Zod runtime validation; retry-with-reprompt on parse failure                              | Two-call pattern (freeform → JSON extraction), or hard-coded fallback substitution.                   |
| 4 | Railway deploy issues surface late                                       | Med  | High     | Deploy during Phase 1 once login works — don't wait                                       | Vercel as hot backup (DB stays on Railway; `DATABASE_URL` points across).                             |
| 5 | Demo video recording eats into submission time                           | Med  | High     | Script written during UI work; single OBS scene ready before first take                   | Annotated screenshots + narration in the post.                                                        |

---

## Go / No-Go checkpoints

Triggered off milestones and the absolute deadline (03:59 AR Mon).

- **M2 fails** → switch to MFA OOB Push. Don't spend more than two attempts on CIBA docs.
- **M4 fails 3× in a row** → stop, re-read the Auth0 CIBA flow end-to-end before retrying.
- **12h before deadline, Phase 1 incomplete** → cut Phase 2, ship Phase 1 with one
  staged/hypothetical substitution, be explicit in the post about what shipped.
- **6h before deadline** → feature freeze. Only deploy, video, post.
- **2h before deadline** → submit whatever works. No new commits.

---

## Non-negotiables (restated)

- English-only in code, comments, commits, docs, DEV.to post.
- No fabricated emission factors. ICE Database or nothing.
- No invented APIs. `// VERIFY:` + docs URL for anything uncertain.
- Zero extra dependencies beyond those already scaffolded.
- Every approval persists `auth_req_id` + userId + timestamp + decision.
- BITACORA.md is updated on every meaningful decision or milestone.
