import { PillButton } from "@/components/ui/pill-button";
import { LiveSuggestionCard } from "./live-suggestion-card";

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-20 pb-16">
      <div className="grid gap-12 md:grid-cols-2 md:items-center">
        <div>
          <h1 className="text-5xl font-medium tracking-tight text-brand-primary">
            Audit embodied carbon on every BOM. Keep the human in the loop.
          </h1>
          <p className="mt-6 text-lg text-ink/80 max-w-xl">
            Construction is 37% of global energy-related CO₂ — most of it decided at the
            Bill-of-Materials stage. GreenGate&apos;s agent audits each BOM against the ICE Database
            and proposes lower-carbon substitutions. The responsible engineer approves each swap
            with a single push on their phone — cryptographically bound to the decision via Auth0 CIBA.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <PillButton asChild size="lg">
              <a href="/auth/login">Log in with Auth0 →</a>
            </PillButton>
            <PillButton asChild size="lg" variant="outline">
              <a href="#how-it-works">See how it works</a>
            </PillButton>
          </div>
        </div>
        <div className="flex justify-center md:justify-end">
          <LiveSuggestionCard />
        </div>
      </div>
    </section>
  );
}
