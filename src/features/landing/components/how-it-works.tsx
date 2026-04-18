const steps = [
  {
    n: "01",
    title: "Agent runs the audit",
    body:
      "GreenGate parses the BOM, matches each line to an ICE Database emission factor, and ranks hotspots by kg CO₂e.",
  },
  {
    n: "02",
    title: "Substitutions get proposed",
    body:
      "Gemini proposes lower-carbon alternatives with a technical rationale and a risk flag. Every proposal carries a signed delta.",
  },
  {
    n: "03",
    title: "A human signs off",
    body:
      "The responsible engineer receives a CIBA push on their phone with the exact substitution description. One approval binds the decision cryptographically.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-16">
      <h2 className="text-3xl font-medium tracking-tight text-brand-primary">How it works</h2>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} className="rounded-2xl border border-border bg-card p-6">
            <span className="font-[var(--font-mono)] text-xs text-muted">{s.n}</span>
            <h3 className="mt-2 text-lg font-medium text-ink">{s.title}</h3>
            <p className="mt-2 text-sm text-ink/80">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
