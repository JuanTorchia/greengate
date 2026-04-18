import { auth0 } from "@/lib/auth0";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { ProposalButton } from "@/features/audit/components/proposal-button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth0.getSession();

  const recentApprovals = session
    ? await prisma.approval.findMany({
        orderBy: { decidedAt: "desc" },
        take: 5,
        include: { suggestion: true },
      })
    : [];

  return (
    <main className="mx-auto max-w-3xl space-y-10 p-8">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">GreenGate</h1>
        <p className="mt-4 text-muted-foreground">
          Agent-driven embodied-carbon audit for construction BOMs. Every
          substitution is gated by an Auth0 CIBA push.
        </p>
      </header>

      <section className="rounded-lg border p-6">
        <h2 className="text-xl font-medium">Session</h2>
        {session ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm">
              Signed in as{" "}
              <strong>{session.user.email ?? session.user.sub}</strong>
            </p>
            <Button asChild variant="outline">
              <a href="/auth/logout">Log out</a>
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Not signed in.</p>
            <Button asChild>
              <a href="/auth/login">Log in with Auth0</a>
            </Button>
          </div>
        )}
      </section>

      {session && (
        <section className="rounded-lg border p-6">
          <h2 className="text-xl font-medium">Propose a test change</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Triggers Auth0 CIBA against your enrolled Guardian device. The
            push carries the proposed substitution as a binding message.
          </p>
          <div className="mt-4">
            <ProposalButton />
          </div>
        </section>
      )}

      {session && (
        <section className="rounded-lg border p-6">
          <h2 className="text-xl font-medium">Recent approvals</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Persisted to the <code>Approval</code> table with{" "}
            <code>auth_req_id</code>, user, decision, and timestamp.
          </p>
          {recentApprovals.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No approvals yet — click the button above.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {recentApprovals.map((a) => (
                <li
                  key={a.id}
                  className="rounded border bg-muted/40 p-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={
                        a.decision === "APPROVED"
                          ? "font-medium text-emerald-600 dark:text-emerald-400"
                          : a.decision === "REJECTED"
                            ? "font-medium text-rose-600 dark:text-rose-400"
                            : "font-medium text-amber-600 dark:text-amber-400"
                      }
                    >
                      {a.decision}
                    </span>
                    <span className="text-muted-foreground">
                      {a.decidedAt.toISOString()}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                    auth_req_id: {a.authReqId}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {a.suggestion.proposedMaterialName} (saves{" "}
                    {a.suggestion.kgCo2eSaved} kg CO₂e)
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
