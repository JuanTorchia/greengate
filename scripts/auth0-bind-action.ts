/**
 * Idempotent binder for the GreenGate CIBA-claim-enrichment Action.
 *
 *   npm run auth0:bind
 *
 * Exercises mgmtFetch end-to-end (list + patch) and acts as a disaster-recovery
 * script: re-attaches the Action to the credentials-exchange trigger if someone
 * (or a tenant re-create) detaches it.
 */

import {
  listActions,
  getTriggerBindings,
  updateTriggerBindings,
} from "../src/lib/auth0/mgmt-client";

const ACTION_NAME = "GreenGate — enrich CIBA access_token";
const TRIGGER_ID = "credentials-exchange";

async function main() {
  const { actions } = await listActions({ triggerId: TRIGGER_ID, deployed: true });
  const action = actions.find((a) => a.name === ACTION_NAME);
  if (!action) {
    throw new Error(
      `Action "${ACTION_NAME}" not found on trigger "${TRIGGER_ID}" (deployed=true). ` +
        `Create and deploy it in the dashboard first.`,
    );
  }
  console.log(`[ok] found deployed action ${action.id} "${action.name}"`);

  const { bindings } = await getTriggerBindings(TRIGGER_ID);
  console.log(`[ok] current bindings: ${bindings.length}`);
  for (const b of bindings) console.log(`     - ${b.action.name} (${b.action.id})`);

  const alreadyBound = bindings.some((b) => b.action.id === action.id);
  if (alreadyBound) {
    console.log("[skip] action already bound — nothing to do");
    return;
  }

  const next = [
    ...bindings.map((b) => ({
      ref: { type: "action_id" as const, value: b.action.id },
      display_name: b.display_name,
    })),
    { ref: { type: "action_id" as const, value: action.id }, display_name: action.name },
  ];

  const res = await updateTriggerBindings(TRIGGER_ID, next);
  console.log(`[done] bindings after patch: ${res.bindings.length}`);
  for (const b of res.bindings) console.log(`     - ${b.action.name}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
