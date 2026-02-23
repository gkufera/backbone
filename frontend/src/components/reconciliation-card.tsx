'use client';

import type { RevisionMatchResponse } from '../lib/api';

interface ReconciliationCardProps {
  match: RevisionMatchResponse;
  decision: string | null;
  onDecision: (matchId: string, decision: string) => void;
}

export function ReconciliationCard({ match, decision, onDecision }: ReconciliationCardProps) {
  const isFuzzy = match.matchStatus === 'FUZZY';
  const isMissing = match.matchStatus === 'MISSING';

  const hasApproved = match.oldElement?.options?.some((o) =>
    o.approvals.some((a) => a.decision === 'APPROVED'),
  );

  const optionCount = match.oldElement?._count?.options ?? 0;

  return (
    <div
      className={`rounded border p-4 ${hasApproved ? 'border-yellow-400 bg-yellow-50' : 'border-zinc-200'}`}
    >
      {isFuzzy && (
        <>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <span className="font-semibold">{match.detectedName}</span>
              <span className="ml-2 text-sm text-zinc-500">
                {Math.round((match.similarity ?? 0) * 100)}% match
              </span>
            </div>
            <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
              FUZZY
            </span>
          </div>
          {match.oldElement && (
            <div className="mb-3 text-sm text-zinc-600">
              Best match: <strong>{match.oldElement.name}</strong> ({optionCount} option
              {optionCount !== 1 ? 's' : ''})
              {hasApproved && (
                <span className="ml-2 rounded bg-yellow-200 px-1.5 py-0.5 text-xs font-medium text-yellow-800">
                  Has Approved
                </span>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onDecision(match.id, 'map')}
              className={`rounded px-3 py-1 text-sm ${
                decision === 'map' ? 'bg-black text-white' : 'border border-zinc-300'
              }`}
              aria-label="Map to Existing"
            >
              Map to Existing
            </button>
            <button
              type="button"
              onClick={() => onDecision(match.id, 'create_new')}
              className={`rounded px-3 py-1 text-sm ${
                decision === 'create_new' ? 'bg-black text-white' : 'border border-zinc-300'
              }`}
              aria-label="Create as New"
            >
              Create as New
            </button>
          </div>
        </>
      )}

      {isMissing && (
        <>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <span className="font-semibold">{match.detectedName}</span>
            </div>
            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              MISSING
            </span>
          </div>
          {match.oldElement && (
            <div className="mb-3 text-sm text-zinc-600">
              {optionCount} option{optionCount !== 1 ? 's' : ''}
              {hasApproved && (
                <span className="ml-2 rounded bg-yellow-200 px-1.5 py-0.5 text-xs font-medium text-yellow-800">
                  Has Approved
                </span>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onDecision(match.id, 'keep')}
              className={`rounded px-3 py-1 text-sm ${
                decision === 'keep' ? 'bg-black text-white' : 'border border-zinc-300'
              }`}
              aria-label="Keep"
            >
              Keep
            </button>
            <button
              type="button"
              onClick={() => onDecision(match.id, 'archive')}
              className={`rounded px-3 py-1 text-sm ${
                decision === 'archive' ? 'bg-black text-white' : 'border border-zinc-300'
              }`}
              aria-label="Archive"
            >
              Archive
            </button>
          </div>
        </>
      )}
    </div>
  );
}
