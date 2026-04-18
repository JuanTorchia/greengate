import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { TopBar } from "@/features/inbox/components/top-bar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login");

  return (
    <div className="min-h-screen bg-canvas">
      <TopBar session={session} />
      <div className="mx-auto max-w-6xl px-6 py-10">{children}</div>
    </div>
  );
}
