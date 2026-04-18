import Link from "next/link";
import type { SessionData } from "@auth0/nextjs-auth0/types";

export function TopBar({ session }: { session: SessionData }) {
  const email = session.user.email ?? session.user.sub;
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/app" className="font-[var(--font-display)] text-lg font-semibold text-brand-primary">
            GreenGate
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium">
            <Link href="/app" className="text-ink hover:text-brand-primary">Inbox</Link>
            <span
              title="coming soon"
              className="cursor-not-allowed text-muted"
            >
              Projects
            </span>
            <span
              title="coming soon"
              className="cursor-not-allowed text-muted"
            >
              Reports
            </span>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted">{email}</span>
          <Link
            href="/auth/logout"
            className="rounded-full border border-border px-3 py-1 text-ink hover:bg-canvas"
          >
            Log out
          </Link>
        </div>
      </div>
    </header>
  );
}
