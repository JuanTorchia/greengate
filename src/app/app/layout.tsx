import { auth0 } from "@/lib/auth0";
import { TopBar } from "@/features/inbox/components/top-bar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Middleware already gates /app/*; by the time we get here a session exists.
  // Don't redirect again from the layout — that was racing with middleware and
  // clearing the session cookie on some navigations.
  const session = await auth0.getSession();

  return (
    <div className="min-h-screen bg-canvas">
      {session && <TopBar session={session} />}
      <div className="mx-auto max-w-6xl px-6 py-10">{children}</div>
    </div>
  );
}
