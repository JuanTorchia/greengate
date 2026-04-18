import { auth0 } from "@/lib/auth0";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { RunAuditButton } from "@/features/audit/components/run-audit-button";
import { ApprovalButton } from "@/features/audit/components/approval-button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth0.getSession();

  const latestRun = session
    ? await prisma.auditRun.findFirst({
        where: { status: "COMPLETED" },
        orderBy: { startedAt: "desc" },
        include: {
          project: true,
          suggestions: {
            orderBy: { kgCo2eSaved: "desc" },
            include: { originalItem: { include: { material: true } } },
          },
        },
      })
    : null;

  const recentApprovals = session
    ? await prisma.approval.findMany({
        orderBy: { decidedAt: "desc" },
        take: 5,
        include: {
          suggestion: { include: { originalItem: { include: { material: true } } } },
        },
      })
    : [];

  return (
    <main className="mx-auto max-w-4xl space-y-10 p-8">
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
          <h2 className="text-xl font-medium">Audit</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Loads your BOM, applies ICE Database emission factors, picks the
            top hotspots, and asks Gemini for lower-carbon substitutions.
          </p>
          <div className="mt-4">
            <RunAuditButton />
          </div>
        </section>
      )}

      {session && latestRun && (
        <section className="rounded-lg border p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-medium">Latest run — {latestRun.project.name}</h2>
            <span className="text-xs text-muted-foreground">
              {latestRun.startedAt.toISOString()}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Total embodied carbon:{" "}
            <strong className="text-foreground">
              {Math.round(latestRun.totalKgCo2e ?? 0).toLocaleString()} kg CO₂e
            </strong>{" "}
            · {latestRun.hotspotCount ?? 0} hotspot
            {latestRun.hotspotCount === 1 ? "" : "s"} · {latestRun.suggestions.length} suggestion
            {latestRun.suggestions.length === 1 ? "" : "s"}
          </p>

          {latestRun.suggestions.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Gemini did not propose any substitutions for this run.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {latestRun.suggestions.map((s) => (
                <li key={s.id} className="rounded border p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {s.originalItem.material.code}
                      </span>{" "}
                      <span className="text-muted-foreground">→</span>{" "}
                      <span className="font-mono text-xs">{s.proposedMaterialCode}</span>
                    </div>
                    <span
                      className={
                        s.status === "APPROVED"
                          ? "text-xs font-medium text-emerald-600 dark:text-emerald-400"
                          : s.status === "REJECTED"
                            ? "text-xs font-medium text-rose-600 dark:text-rose-400"
                            : s.status === "EXPIRED"
                              ? "text-xs font-medium text-amber-600 dark:text-amber-400"
                              : "text-xs font-medium text-muted-foreground"
                      }
                    >
                      {s.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">
                    Replace <strong>{s.originalItem.material.name}</strong> with{" "}
                    <strong>{s.proposedMaterialName}</strong> — saves{" "}
                    <strong>{Math.round(s.kgCo2eSaved).toLocaleString()} kg CO₂e</strong>
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {s.technicalRationale}
                  </p>
                  {s.riskNotes && (
                    <p className="mt-1 text-xs italic text-amber-700 dark:text-amber-400">
                      Risk: {s.riskNotes}
                    </p>
                  )}
                  {s.status === "PENDING" && (
                    <div className="mt-3">
                      <ApprovalButton suggestionId={s.id} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
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
            <p className="mt-4 text-sm text-muted-foreground">No approvals yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {recentApprovals.map((a) => (
                <li key={a.id} className="rounded border bg-muted/40 p-3 text-xs">
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
                    {a.suggestion.originalItem.material.code} →{" "}
                    {a.suggestion.proposedMaterialCode} (saves{" "}
                    {Math.round(a.suggestion.kgCo2eSaved).toLocaleString()} kg CO₂e)
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
