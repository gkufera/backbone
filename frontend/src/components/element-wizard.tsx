'use client';

import { useState } from 'react';
import {
  scriptsApi,
  elementsApi,
  type ElementWithCountResponse,
  type DepartmentResponse,
} from '../lib/api';
import type { SceneInfo } from '@backbone/shared/types';

interface ElementWizardProps {
  scriptId: string;
  elements: ElementWithCountResponse[];
  sceneData: SceneInfo[] | null;
  departments: DepartmentResponse[];
  onComplete: () => void;
}

export function ElementWizard({
  scriptId,
  elements,
  sceneData,
  departments,
  onComplete,
}: ElementWizardProps) {
  const [step, setStep] = useState(1);
  const [checkedElements, setCheckedElements] = useState<Set<string>>(
    new Set(elements.map((e) => e.id)),
  );
  const [elementDepts, setElementDepts] = useState<Record<string, string>>(
    Object.fromEntries(elements.filter((e) => e.departmentId).map((e) => [e.id, e.departmentId!])),
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentElements, setCurrentElements] = useState(elements);
  const [error, setError] = useState<string | null>(null);

  const hasCharacters =
    sceneData && sceneData.some((s) => s.characters && s.characters.length > 0);

  async function handleStep1Next() {
    setIsProcessing(true);
    setError(null);
    try {
      // Delete unchecked elements
      const toDelete = elements.filter((e) => !checkedElements.has(e.id));
      for (const elem of toDelete) {
        await elementsApi.hardDelete(elem.id);
      }
      setCurrentElements(elements.filter((e) => checkedElements.has(e.id)));
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleGenerateImplied(mode: 'per-scene' | 'per-character') {
    setIsProcessing(true);
    setError(null);
    try {
      await scriptsApi.generateImplied(scriptId, mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleStep2Next() {
    setIsProcessing(true);
    setError(null);
    try {
      // Update department assignments
      for (const [elemId, deptId] of Object.entries(elementDepts)) {
        const original = elements.find((e) => e.id === elemId);
        if (original && original.departmentId !== deptId) {
          await elementsApi.update(elemId, { departmentId: deptId });
        }
      }
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleAccept() {
    setIsProcessing(true);
    setError(null);
    try {
      await scriptsApi.acceptElements(scriptId);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  }

  function toggleElement(id: string) {
    setCheckedElements((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl">Review Detected Elements</h1>

      {error && <div className="mac-alert-error p-3 text-sm mb-4">{error}</div>}

      {/* Step indicator */}
      <div className="mb-6 flex gap-4">
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className={`badge ${step === s ? 'badge-approved' : 'badge-default'}`}
          >
            Step {s}
          </span>
        ))}
      </div>

      {step === 1 && (
        <div>
          <h2 className="mb-4 text-xl">Step 1: Review Elements</h2>
          <p className="mb-4 text-sm font-mono">
            This is the only time you can delete elements. After accepting, you can only archive.
          </p>

          <div className="mac-window mb-4">
            <div className="mac-window-title">
              <span>Detected Elements ({elements.length})</span>
            </div>
            <div className="mac-window-body">
              <ul className="divide-y divide-black">
                {elements.map((elem) => (
                  <li key={elem.id} className="flex items-center gap-3 py-2 px-3">
                    <input
                      type="checkbox"
                      checked={checkedElements.has(elem.id)}
                      onChange={() => toggleElement(elem.id)}
                      className="h-4 w-4"
                    />
                    <span className="font-mono text-sm">{elem.name}</span>
                    <span className="badge badge-default text-xs">{elem.type}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {hasCharacters && (
            <div className="mac-window mb-4">
              <div className="mac-window-title">
                <span>Implied Elements (Wardrobe & H&M)</span>
              </div>
              <div className="mac-window-body p-3">
                <p className="mb-3 text-sm font-mono">
                  Generate wardrobe and hair & makeup elements for detected characters.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleGenerateImplied('per-scene')}
                    disabled={isProcessing}
                    className="mac-btn-secondary px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Per Scene (detailed)
                  </button>
                  <button
                    onClick={() => handleGenerateImplied('per-character')}
                    disabled={isProcessing}
                    className="mac-btn-secondary px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Per Character (compact)
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleStep1Next}
            disabled={isProcessing}
            className="mac-btn-primary px-4 py-2 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="mb-4 text-xl">Step 2: Review Departments</h2>

          <div className="mac-window mb-4">
            <div className="mac-window-title">
              <span>Department Assignments</span>
            </div>
            <div className="mac-window-body">
              <ul className="divide-y divide-black">
                {currentElements.map((elem) => (
                  <li key={elem.id} className="flex items-center justify-between py-2 px-3">
                    <span className="font-mono text-sm">{elem.name}</span>
                    <select
                      value={elementDepts[elem.id] || ''}
                      onChange={(e) =>
                        setElementDepts((prev) => ({ ...prev, [elem.id]: e.target.value }))
                      }
                      className="border-2 border-black p-1 text-sm"
                    >
                      <option value="">No department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={handleStep2Next}
            disabled={isProcessing}
            className="mac-btn-primary px-4 py-2 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="mb-4 text-xl">Step 3: Accept</h2>
          <p className="mb-4 font-mono">
            You&apos;re all set! You can always add more elements from the script viewer.
          </p>
          <button
            onClick={handleAccept}
            disabled={isProcessing}
            className="mac-btn-primary px-4 py-2 disabled:opacity-50"
          >
            Accept & View Script
          </button>
        </div>
      )}
    </div>
  );
}
