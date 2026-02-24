'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  revisionMatchesApi,
  departmentsApi,
  type RevisionMatchResponse,
  type DepartmentResponse,
} from '../../../../../../lib/api';
import { ReconciliationCard } from '../../../../../../components/reconciliation-card';
import { ELEMENT_TYPE_DEPARTMENT_MAP } from '@backbone/shared/constants/departments';
import { SkeletonCard } from '../../../../../../components/skeleton';

export default function ReconcilePage() {
  const router = useRouter();
  const params = useParams();
  const productionId = params.id as string;
  const scriptId = params.scriptId as string;

  const [matches, setMatches] = useState<RevisionMatchResponse[]>([]);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [departmentChoices, setDepartmentChoices] = useState<Record<string, string | null>>({});
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      revisionMatchesApi.get(scriptId),
      departmentsApi.list(productionId),
    ])
      .then(([matchesData, deptData]) => {
        const loadedMatches = matchesData.matches;
        const loadedDepts = deptData.departments;
        setMatches(loadedMatches);
        setDepartments(loadedDepts);

        // Pre-fill department choices based on element type → department mapping
        const defaultDepts: Record<string, string | null> = {};
        for (const m of loadedMatches) {
          const suggestedDeptName = ELEMENT_TYPE_DEPARTMENT_MAP[m.detectedType] ?? null;
          if (suggestedDeptName) {
            const dept = loadedDepts.find((d) => d.name === suggestedDeptName);
            if (dept) {
              defaultDepts[m.id] = dept.id;
            }
          }
        }
        setDepartmentChoices(defaultDepts);
      })
      .catch(() => {
        setError('Failed to load reconciliation data');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [scriptId, productionId]);

  function handleDecision(matchId: string, decision: string) {
    setDecisions((prev) => ({ ...prev, [matchId]: decision }));
  }

  function handleDepartmentChange(matchId: string, departmentId: string | null) {
    setDepartmentChoices((prev) => ({ ...prev, [matchId]: departmentId }));
  }

  const fuzzyMatches = matches.filter((m) => m.matchStatus === 'FUZZY');
  const missingMatches = matches.filter((m) => m.matchStatus === 'MISSING');
  const allDecided = matches.length > 0 && matches.every((m) => decisions[m.id]);

  async function handleConfirm() {
    setIsSubmitting(true);
    setError(null);

    try {
      const decisionList = matches.map((m) => ({
        matchId: m.id,
        decision: decisions[m.id] as 'map' | 'create_new' | 'keep' | 'archive',
        departmentId: departmentChoices[m.id] ?? undefined,
      }));

      await revisionMatchesApi.resolve(scriptId, decisionList);
      router.push(`/productions/${productionId}/scripts/${scriptId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit reconciliation');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <div className="p-6"><SkeletonCard /></div>;
  }

  if (error) {
    return <div className="p-6 text-black font-bold">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-2 text-2xl">Reconcile Script Revision</h1>

      <div className="mb-6 flex gap-4 text-sm text-black">
        {fuzzyMatches.length > 0 && <span>{fuzzyMatches.length} fuzzy</span>}
        {missingMatches.length > 0 && <span>{missingMatches.length} missing</span>}
      </div>

      {fuzzyMatches.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg">Fuzzy Matches</h2>
          <p className="mb-4 text-sm text-black">
            These elements were detected but couldn&apos;t be exactly matched. Choose whether to map
            them to existing elements or create new ones.
          </p>
          <div className="space-y-3">
            {fuzzyMatches.map((match) => (
              <ReconciliationCard
                key={match.id}
                match={match}
                decision={decisions[match.id] ?? null}
                onDecision={handleDecision}
                departments={departments}
                selectedDepartmentId={departmentChoices[match.id] ?? null}
                onDepartmentChange={handleDepartmentChange}
              />
            ))}
          </div>
        </section>
      )}

      {missingMatches.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg">Missing Elements</h2>
          <p className="mb-4 text-sm text-black">
            These elements exist in the previous script but were not found in the new draft. Choose
            whether to keep them or archive them.
          </p>
          <div className="space-y-3">
            {missingMatches.map((match) => (
              <ReconciliationCard
                key={match.id}
                match={match}
                decision={decisions[match.id] ?? null}
                onDecision={handleDecision}
              />
            ))}
          </div>
        </section>
      )}

      <div className="sticky bottom-0 border-t-2 border-black bg-white pt-4">
        <button
          onClick={handleConfirm}
          disabled={!allDecided || isSubmitting}
          className="mac-btn-primary disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Confirm All'}
        </button>
      </div>
    </div>
  );
}
