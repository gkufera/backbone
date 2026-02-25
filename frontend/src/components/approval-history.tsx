'use client';

import type { ApprovalResponse } from '../lib/api';

interface ApprovalHistoryProps {
  approvals: ApprovalResponse[];
}

const decisionBadge: Record<string, string> = {
  APPROVED: 'badge badge-approved',
  REJECTED: 'badge badge-rejected',
  MAYBE: 'badge badge-maybe',
};

export function ApprovalHistory({ approvals }: ApprovalHistoryProps) {
  if (approvals.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 space-y-1">
      {approvals.map((approval) => (
        <div key={approval.id} className="flex items-start gap-2 text-xs">
          <span className={decisionBadge[approval.decision] || 'badge badge-default'}>
            {approval.decision}
          </span>
          {approval.tentative && (
            <span className="border-2 border-black px-1.5 py-0.5 text-black">
              Tentative
            </span>
          )}
          <span className="font-mono text-black">{approval.user?.name}</span>
          {approval.note && <span className="font-mono text-black">— {approval.note}</span>}
        </div>
      ))}
    </div>
  );
}
