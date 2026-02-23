'use client';

import type { OptionResponse } from '../lib/api';
import { ApprovalButtons } from './approval-buttons';

interface OptionCardProps {
  option: OptionResponse;
  onToggleReady: (optionId: string) => void;
  onArchive: (optionId: string) => void;
  latestDecision?: string;
  onApprove?: (optionId: string, decision: string, note?: string) => void;
}

const decisionColors: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  MAYBE: 'bg-yellow-100 text-yellow-800',
};

export function OptionCard({
  option,
  onToggleReady,
  onArchive,
  latestDecision,
  onApprove,
}: OptionCardProps) {
  return (
    <div className="rounded border p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium">
          {option.mediaType}
        </span>
        {option.readyForReview && (
          <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            Ready
          </span>
        )}
        {latestDecision && (
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${decisionColors[latestDecision] || ''}`}
          >
            {latestDecision}
          </span>
        )}
      </div>

      {option.description && <p className="mb-2 text-sm">{option.description}</p>}

      {option.fileName && <p className="mb-2 text-xs text-zinc-400">{option.fileName}</p>}

      {option.externalUrl && (
        <a
          href={option.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 block text-xs text-blue-600 underline"
        >
          {option.externalUrl}
        </a>
      )}

      {onApprove && (
        <div className="mb-2">
          <ApprovalButtons
            onSubmit={(decision, note) => onApprove(option.id, decision, note)}
            currentDecision={latestDecision}
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onToggleReady(option.id)}
          className="text-xs text-blue-600 hover:text-blue-800"
          aria-label={option.readyForReview ? 'Mark not ready' : 'Mark ready'}
        >
          {option.readyForReview ? 'Unmark Ready' : 'Mark Ready'}
        </button>
        <button
          onClick={() => onArchive(option.id)}
          className="text-xs text-red-500 hover:text-red-700"
          aria-label={`Archive ${option.description || 'option'}`}
        >
          Archive
        </button>
      </div>
    </div>
  );
}
