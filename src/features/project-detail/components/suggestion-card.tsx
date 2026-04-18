import { ApprovalButton } from "@/features/audit/components/approval-button";

export interface SuggestionCardData {
  id: string;
  originalCode: string;
  originalName: string;
  proposedCode: string;
  proposedName: string;
  kgCo2eSaved: number;
  technicalRationale: string;
  riskNotes: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  approverName: string;
  approverRole: string;
  approvedBy?: { name: string; at: Date } | null;
  rejectedReason?: string | null;
}

const statusColor: Record<SuggestionCardData["status"], string> = {
  PENDING: "text-muted",
  APPROVED: "text-brand-primary",
  REJECTED: "text-danger",
  EXPIRED: "text-warning",
};

export function SuggestionCard({ data }: { data: SuggestionCardData }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-baseline justify-between">
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${statusColor[data.status]}`}>
          {data.status}
        </span>
        <span className="font-[var(--font-mono)] text-[10px] text-muted">#{data.id.slice(-6)}</span>
      </div>

      <div className="mt-3 space-y-1 text-sm">
        <p>
          <span className="text-muted">Replace</span>{" "}
          <span className="font-medium text-ink">{data.originalName}</span>
        </p>
        <p>
          <span className="text-muted">With</span>{" "}
          <span className="font-medium text-ink">{data.proposedName}</span>
        </p>
      </div>

      <p className="mt-6 font-[var(--font-display)] text-4xl font-medium tracking-tight text-brand-primary">
        − {Math.round(data.kgCo2eSaved).toLocaleString()}
        <span className="ml-2 text-lg text-muted">kg CO₂e</span>
      </p>

      <p className="mt-6 text-sm text-ink/80">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Rationale</span>{" "}
        {data.technicalRationale}
      </p>
      {data.riskNotes && (
        <p className="mt-2 text-sm text-warning">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider">Risk</span>{" "}
          {data.riskNotes}
        </p>
      )}

      <div className="mt-6 border-t border-border pt-4">
        {data.status === "PENDING" && (
          <ApprovalButton
            suggestionId={data.id}
            approverName={data.approverName}
            approverRole={data.approverRole}
            saved={data.kgCo2eSaved}
            originalCode={data.originalCode}
            proposedCode={data.proposedCode}
          />
        )}
        {data.status === "APPROVED" && data.approvedBy && (
          <p className="text-sm text-brand-primary">
            ✓ Approved by {data.approvedBy.name} at {data.approvedBy.at.toISOString()}
          </p>
        )}
        {data.status === "REJECTED" && (
          <p className="text-sm text-danger">
            ✗ Rejected{data.rejectedReason ? ` — ${data.rejectedReason}` : ""}
          </p>
        )}
        {data.status === "EXPIRED" && (
          <p className="text-sm text-warning">⏱ Push expired — request a new approval.</p>
        )}
      </div>
    </div>
  );
}
