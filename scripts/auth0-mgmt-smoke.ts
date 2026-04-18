/**
 * Smoke test for the Auth0 Management API client.
 *
 *   npm run auth0:smoke
 *
 * Loads env via `tsx --env-file=.env` — add another `--env-file=.env.local` if
 * you keep per-machine secrets there.
 *
 * Verifies that env vars are set, that a fresh token can be minted, and that
 * the token is reused on the second call within the same process.
 */

import { getManagementToken } from "../src/lib/auth0/mgmt";
import { listActions } from "../src/lib/auth0/mgmt-client";

async function main() {
  const t1 = await getManagementToken();
  const preview = `${t1.slice(0, 12)}…${t1.slice(-6)}`;
  console.log(`[1/3] got token ${preview}`);

  const t2 = await getManagementToken();
  if (t1 !== t2) throw new Error("expected cached token on second call");
  console.log("[2/3] second call served from cache");

  const { total, actions } = await listActions({ deployed: true });
  console.log(`[3/3] listed ${actions.length} deployed actions (total=${total})`);
  for (const a of actions.slice(0, 5)) {
    console.log(`  - ${a.name}  triggers=[${a.supported_triggers.map((t) => t.id).join(",")}]`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
