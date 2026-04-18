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

## Sat 2026-04-18, 00:40 — Auth0 MCP instead of dashboard clicking

Turns out Auth0 ships an **official MCP server** (`@auth0/auth0-mcp-server`,
beta). Which means M1 — the "thirty minutes of clicking in the dashboard"
part — can largely be done by the agent itself. Installed it, authorized it
against the tenant with device code `QRLQ-FLPT`, and approved a scope set
covering clients, resource_servers, client_grants, actions, logs, and forms.

Small gotcha: the MCP's `init` command writes to Claude Desktop's config
path (`~/.config/Claude/claude_desktop_config.json`), not Claude Code's
(`~/.claude/settings.json`). Moved the server block manually, pinned it to
the Node 24 binaries I actually have installed.

Meta-observation worth keeping for the post: the project itself is about
agent-with-human-in-the-loop. And here I am using *an agent* to set up the
authentication infrastructure *for the agent I'm building*. Turtles all the
way down, but in a useful way — the tenant-setup work is exactly the kind of
deterministic config-plumbing that doesn't need a human decision, while the
*runtime* decisions (approving a material substitution) absolutely do. Two
different shapes of agent work, one project.

Still on me: install Guardian on the phone, enroll the user. That enrollment
is *physically* out of scope for any MCP — and that's the right design.

## Sat 2026-04-18, 01:00 — The wall

First sign of trouble. Asked the MCP to flip the M2M client's `grant_types`
to include `urn:openid:params:grant-type:ciba`. Auth0 answered with a wall:

> *Upgrade your subscription to enable Client Initiated Backchannel Authentication.*

Pricing pages confirmed it: CIBA is **Enterprise**, listed at custom pricing
that third-party trackers peg at ~$30k/year. The 22-day Enterprise trial was
the obvious move — except my Auth0 account is years old and burned that trial
long ago. No promo, no hackathon code, no path through.

I sat with this for a minute. The plan named MFA OOB Push as the documented
fallback (Risk #1). It still uses Auth0, still goes through Guardian, still
puts a human in the loop. But the prize category literally says "Auth0 for
Agents" and the canonical Auth0-for-Agents primitive is CIBA, not MFA OOB.
Pivoting was the safe call. The narrative cost was real.

## Sat 2026-04-18, 01:15 — The escape hatch

Before pivoting, one more pass through the docs. Found this in Auth0's
March 2026 GA announcement for **Auth0 for AI Agents**:

> *"Our free tier includes two connected apps in Token Vault, async
> authorization, and all the core features you need to start building."*

Async authorization is CIBA. So the Free tier *of the AI Agents product*
includes the thing the Free tier of regular Auth0 explicitly excludes. Same
company, same protocol, different product packaging. Not stated anywhere on
the main pricing page.

The catch: my old tenant was provisioned through the regular onboarding flow
years ago, so it doesn't have the AI Agents flag. The fix is to spin up a new
tenant from inside the existing account.

## Sat 2026-04-18, 01:30 — Tenant migration

Created tenant `greengate.us.auth0.com` from the dashboard. Re-ran the MCP
`init` flow so the device-code auth would target the new tenant instead of
the old. First attempt picked up the old tenant anyway — the device flow
follows the active browser session, which still had the old tenant selected.
Logout + fresh browser pointed at `manage.auth0.com/dashboard/us/greengate`,
re-init, and the MCP came up against the new tenant.

Recreated everything in the new tenant via MCP, in parallel:
- API `https://api.greengate.local` with one scope `audit:propose`
- Regular Web App `GreenGate Web` for Universal Login
- M2M `GreenGate CIBA Client` for the agent
- Application grant linking the M2M to the API

## Sat 2026-04-18, 01:40 — A different error

Re-tried the grant_types flip. Different error — that was the good news:

> *Application must have at least one channel configured in
> `async_approval_notification_channels` when CIBA is enabled.*

This is a config error, not a plan error. CIBA is available; I just need to
declare a channel. The MCP server is beta and doesn't expose that field, so
I dropped to the dashboard: Application → Advanced Settings → Grant Types
→ enable CIBA → Save → then a new "Client Initiated Backchannel
Authentication" section appears below where you select `guardian-push` as the
channel.

Surprise that I'm noting because it's worth flagging in the post: in the new
tenant, the **MFA factor tiles are all labeled "ENTERPRISE MFA" or "PRO MFA"
in the dashboard** — including Guardian Push. The labels appear to be
inherited from the regular Auth0 packaging and aren't accurate for the AI
Agents product. The factor enables and works on Free anyway. Worth a heads-up
to anyone trying to repro this.

## Sat 2026-04-18, 01:55 — M2 — the round trip

`POST /bc-authorize` from `curl`, with `client_id`, `client_secret`,
`audience`, `scope=openid audit:propose`, a `binding_message`, and a
`login_hint` of the form
`{"format":"iss_sub","iss":"<tenant>","sub":"<user_id>"}`.

First attempt rejected: binding_message can only contain alphanumerics,
whitespace, and `+-_.,:#` — the `()` in my test string broke it. Fixed,
re-sent.

Response:

```json
{"auth_req_id":"atx_3tnNo46Qa22basx5mnPPcQE3bWoT","expires_in":300,"interval":5}
```

Phone buzzed. Notification from Auth0 Guardian. Approved on the device.
Polled `/oauth/token` with `grant_type=urn:openid:params:grant-type:ciba` and
the `auth_req_id`, got back a real RS256 access token with `sub` =
the user, `aud` = the API, `scope` = `openid audit:propose`. End-to-end
roundtrip in under a minute.

To answer the Risk #1 question — does Guardian render the `binding_message`?
— I sent a second push with the binding message `PIZZA HAWAIANA #42 BANANA
TRACTOR`. Absurd-on-purpose so there'd be no ambiguity.

It rendered. The literal text appeared on the approval screen.

That's the prize narrative landing intact: the *text describing the action*
that the user is approving is shown on the approval surface itself,
cryptographically bound to the request the agent initiated. The user knows
exactly what they're saying yes to — not "Allow login" but "replace cement
with GGBS, -180 kg CO2e."

M1 + M2 done. Onto M3 (`@auth0/nextjs-auth0`).

<!-- Future entries go below. Keep them short, honest, and specific. -->
