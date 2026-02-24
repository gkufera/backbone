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
      className={`border-2 border-black p-4 ${hasApproved ? 'border-l-8' : ''}`}
    >
      {isFuzzy && (
        <>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <span className="font-semibold">{match.detectedName}</span>
              <span className="ml-2 text-sm text-black">
                {Math.round((match.similarity ?? 0) * 100)}% match
              </span>
            </div>
            <span className="badge badge-fuzzy">
              FUZZY
            </span>
          </div>
          {match.oldElement && (
            <div className="mb-3 text-sm text-black">
              Best match: <strong>{match.oldElement.name}</strong> ({optionCount} option
              {optionCount !== 1 ? 's' : ''})
              {hasApproved && (
                <span className="badge badge-approved ml-2">
                  Has Approved
                </span>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onDecision(match.id, 'map')}
              className={`px-3 py-1 text-sm ${
                decision === 'map' ? 'bg-black text-white' : 'bg-white text-black'
              }`}
              aria-label="Map to Existing"
            >
              Map to Existing
            </button>
            <button
              type="button"
              onClick={() => onDecision(match.id, 'create_new')}
              className={`px-3 py-1 text-sm ${
                decision === 'create_new' ? 'bg-black text-white' : 'bg-white text-black'
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
            <span className="badge badge-missing">
              MISSING
            </span>
          </div>
          {match.oldElement && (
            <div className="mb-3 text-sm text-black">
              {optionCount} option{optionCount !== 1 ? 's' : ''}
              {hasApproved && (
                <span className="badge badge-approved ml-2">
                  Has Approved
                </span>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onDecision(match.id, 'keep')}
              className={`px-3 py-1 text-sm ${
                decision === 'keep' ? 'bg-black text-white' : 'bg-white text-black'
              }`}
              aria-label="Keep"
            >
              Keep
            </button>
            <button
              type="button"
              onClick={() => onDecision(match.id, 'archive')}
              className={`px-3 py-1 text-sm ${
                decision === 'archive' ? 'bg-black text-white' : 'bg-white text-black'
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
