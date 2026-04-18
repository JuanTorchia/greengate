const pillars = [
  {
    icon: "🧮",
    title: "Auditable by construction",
    body:
      "Every suggestion is pinned to an ICE Database factor and a materialized kg CO₂e delta. No hallucinated numbers.",
  },
  {
    icon: "🔐",
    title: "Signed by the human",
    body:
      "Substitutions require a CIBA-bound approval from the responsible engineer. Audit trail (auth_req_id, timestamp, user) persisted for CSRD / SB 253.",
  },
  {
    icon: "📐",
    title: "Built on real BOMs",
    body:
      "Works on line-item BOMs from architect specs, not on whole-building estimators.",
  },
];

export function Pillars() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="grid gap-6 md:grid-cols-3">
        {pillars.map((p) => (
          <div key={p.title} className="rounded-2xl border border-border bg-card p-6">
            <div className="text-2xl">{p.icon}</div>
            <h3 className="mt-3 text-lg font-medium text-brand-primary">{p.title}</h3>
            <p className="mt-2 text-sm text-ink/80">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
