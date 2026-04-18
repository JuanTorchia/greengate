import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { Hero } from "@/features/landing/components/hero";
import { Pillars } from "@/features/landing/components/pillars";
import { HowItWorks } from "@/features/landing/components/how-it-works";
import { LandingFooter } from "@/features/landing/components/landing-footer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth0.getSession();
  if (session) redirect("/app");

  return (
    <main className="min-h-screen">
      <Hero />
      <Pillars />
      <HowItWorks />
      <LandingFooter />
    </main>
  );
}
