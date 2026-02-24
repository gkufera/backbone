'use client';

import type { ApprovalResponse } from '../lib/api';

interface ApprovalHistoryProps {
  approvals: ApprovalResponse[];
}

const decisionColors: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  MAYBE: 'bg-yellow-100 text-yellow-800',
};

export function ApprovalHistory({ approvals }: ApprovalHistoryProps) {
  if (approvals.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 space-y-1">
      {approvals.map((approval) => (
        <div key={approval.id} className="flex items-start gap-2 text-xs">
          <span
            className={`rounded px-1.5 py-0.5 font-medium ${decisionColors[approval.decision] || ''}`}
          >
            {approval.decision}
          </span>
          {approval.tentative && (
            <span className="rounded bg-orange-100 px-1.5 py-0.5 font-medium text-orange-800">
              Tentative
            </span>
          )}
          <span className="text-zinc-600">{approval.user?.name}</span>
          {approval.note && <span className="text-zinc-500">— {approval.note}</span>}
        </div>
      ))}
    </div>
  );
}
