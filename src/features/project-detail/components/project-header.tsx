import { StatusBadge, type StatusKind } from "@/components/ui/status-badge";

export function ProjectHeader({
  name,
  description,
  approverName,
  approverRole,
  status,
  slaLabel,
}: {
  name: string;
  description: string | null;
  approverName: string;
  approverRole: string;
  status: StatusKind;
  slaLabel: string;
}) {
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-medium tracking-tight text-brand-primary">{name}</h1>
      {description && <p className="text-sm text-muted">{description}</p>}
      <div className="flex flex-wrap items-center gap-4 pt-2 text-sm">
        <span className="text-ink">
          <span className="text-muted">Approver:</span> 👤 {approverName} — {approverRole}
        </span>
        <StatusBadge kind={status} />
        <span className="text-muted">{slaLabel}</span>
      </div>
    </div>
  );
}
