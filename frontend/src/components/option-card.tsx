'use client';

import type { OptionResponse, ApprovalResponse } from '../lib/api';
import { ApprovalButtons } from './approval-buttons';
import { ApprovalHistory } from './approval-history';

interface OptionCardProps {
  option: OptionResponse;
  onToggleReady: (optionId: string) => void;
  onArchive: (optionId: string) => void;
  latestDecision?: string;
  onApprove?: (optionId: string, decision: string, note?: string) => void;
  approvals?: ApprovalResponse[];
  disableApproval?: boolean;
  onConfirmApproval?: (approvalId: string) => void;
}

const decisionBadge: Record<string, string> = {
  APPROVED: 'badge badge-approved',
  REJECTED: 'badge badge-rejected',
  MAYBE: 'badge badge-maybe',
};

export function OptionCard({
  option,
  onToggleReady,
  onArchive,
  latestDecision,
  onApprove,
  approvals,
  disableApproval,
  onConfirmApproval,
}: OptionCardProps) {
  return (
    <div className="border border-black p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="badge badge-default">
          {option.mediaType}
        </span>
        {option.readyForReview && (
          <span className="badge badge-ready">
            Ready
          </span>
        )}
        {latestDecision && (
          <span className={decisionBadge[latestDecision] || 'badge badge-default'}>
            {latestDecision}
          </span>
        )}
      </div>

      {option.description && <p className="mb-2 text-sm">{option.description}</p>}

      {option.fileName && <p className="mb-2 text-xs font-mono text-black">{option.fileName}</p>}

      {option.externalUrl && (
        <a
          href={option.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 block text-xs font-mono underline"
        >
          {option.externalUrl}
        </a>
      )}

      {onApprove && (
        <div className="mb-2">
          <ApprovalButtons
            onSubmit={(decision, note) => onApprove(option.id, decision, note)}
            currentDecision={latestDecision}
            disabled={disableApproval}
          />
        </div>
      )}

      {approvals && approvals.length > 0 && <ApprovalHistory approvals={approvals} />}

      {onConfirmApproval &&
        approvals?.filter((a) => a.tentative).map((a) => (
          <button
            key={a.id}
            onClick={() => onConfirmApproval(a.id)}
            className="mt-1 bg-black px-2 py-0.5 text-xs text-white hover:bg-white hover:text-black"
            aria-label={`Confirm ${a.decision.toLowerCase()} by ${a.user?.name || 'member'}`}
          >
            Confirm {a.decision.toLowerCase()}
          </button>
        ))}

      <div className="flex gap-2">
        <button
          onClick={() => onToggleReady(option.id)}
          className="text-xs underline"
          aria-label={option.readyForReview ? 'Mark not ready' : 'Mark ready'}
        >
          {option.readyForReview ? 'Unmark Ready' : 'Mark Ready'}
        </button>
        <button
          onClick={() => onArchive(option.id)}
          className="text-xs underline"
          aria-label={`Archive ${option.description || 'option'}`}
        >
          Archive
        </button>
      </div>
    </div>
  );
}
