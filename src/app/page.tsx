import { auth0 } from "@/lib/auth0";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await auth0.getSession();

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-4xl font-semibold tracking-tight">GreenGate</h1>
      <p className="mt-4 text-muted-foreground">
        Agent-driven embodied-carbon audit for construction BOMs.
      </p>

      <section className="mt-10 rounded-lg border p-6">
        <h2 className="text-xl font-medium">Session</h2>
        {session ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm">
              Signed in as <strong>{session.user.email ?? session.user.sub}</strong>
            </p>
            <pre className="overflow-auto rounded bg-muted p-3 text-xs">
              {JSON.stringify(session.user, null, 2)}
            </pre>
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
    </main>
  );
}
