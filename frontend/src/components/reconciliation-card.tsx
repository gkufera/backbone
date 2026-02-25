'use client';

import type { RevisionMatchResponse, DepartmentResponse } from '../lib/api';
import { RevisionMatchDecision } from '@backbone/shared/types';

interface ReconciliationCardProps {
  match: RevisionMatchResponse;
  decision: string | null;
  onDecision: (matchId: string, decision: string) => void;
  departments?: DepartmentResponse[];
  selectedDepartmentId?: string | null;
  onDepartmentChange?: (matchId: string, departmentId: string | null) => void;
}

export function ReconciliationCard({
  match,
  decision,
  onDecision,
  departments,
  selectedDepartmentId,
  onDepartmentChange,
}: ReconciliationCardProps) {
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
              <span>{match.detectedName}</span>
              <span className="ml-2 text-sm font-mono text-black">
                {Math.round((match.similarity ?? 0) * 100)}% match
              </span>
            </div>
            <span className="badge badge-fuzzy">
              FUZZY
            </span>
          </div>
          {match.oldElement && (
            <div className="mb-3 text-sm font-mono text-black">
              Best match: <strong>{match.oldElement.name}</strong> ({optionCount} option
              {optionCount !== 1 ? 's' : ''})
              {hasApproved && (
                <span className="badge badge-approved ml-2">
                  Has Approved
                </span>
              )}
            </div>
          )}
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => onDecision(match.id, RevisionMatchDecision.MAP)}
              className={`px-3 py-1 text-sm ${
                decision === RevisionMatchDecision.MAP ? 'bg-black text-white' : 'bg-white text-black'
              }`}
              aria-label="Map to Existing"
            >
              Map to Existing
            </button>
            <button
              type="button"
              onClick={() => onDecision(match.id, RevisionMatchDecision.CREATE_NEW)}
              className={`px-3 py-1 text-sm ${
                decision === RevisionMatchDecision.CREATE_NEW ? 'bg-black text-white' : 'bg-white text-black'
              }`}
              aria-label="Create as New"
            >
              Create as New
            </button>
          </div>
          {departments && departments.length > 0 && onDepartmentChange && (
            <DepartmentSelector
              matchId={match.id}
              departments={departments}
              selectedDepartmentId={selectedDepartmentId ?? null}
              onDepartmentChange={onDepartmentChange}
            />
          )}
        </>
      )}

      {isMissing && (
        <>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <span>{match.detectedName}</span>
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
              onClick={() => onDecision(match.id, RevisionMatchDecision.KEEP)}
              className={`px-3 py-1 text-sm ${
                decision === RevisionMatchDecision.KEEP ? 'bg-black text-white' : 'bg-white text-black'
              }`}
              aria-label="Keep"
            >
              Keep
            </button>
            <button
              type="button"
              onClick={() => onDecision(match.id, RevisionMatchDecision.ARCHIVE)}
              className={`px-3 py-1 text-sm ${
                decision === RevisionMatchDecision.ARCHIVE ? 'bg-black text-white' : 'bg-white text-black'
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

function DepartmentSelector({
  matchId,
  departments,
  selectedDepartmentId,
  onDepartmentChange,
}: {
  matchId: string;
  departments: DepartmentResponse[];
  selectedDepartmentId: string | null;
  onDepartmentChange: (matchId: string, departmentId: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm">Department:</label>
      <select
        value={selectedDepartmentId ?? ''}
        onChange={(e) => onDepartmentChange(matchId, e.target.value || null)}
        className="border-2 border-black p-1 text-sm"
        aria-label="Department"
      >
        <option value="">None</option>
        {departments.map((dept) => (
          <option key={dept.id} value={dept.id}>
            {dept.name}
          </option>
        ))}
      </select>
    </div>
  );
}
