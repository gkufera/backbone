'use client';

import { useState, useEffect } from 'react';
import {
  elementsApi,
  optionsApi,
  approvalsApi,
  departmentsApi,
  type ElementResponse,
  type OptionResponse,
  type ApprovalResponse,
  type DepartmentResponse,
} from '../lib/api';
import { DiscussionBox } from './discussion-box';
import { OptionThumbnail } from './option-thumbnail';
import { OptionLightbox } from './option-lightbox';
import { OptionUploadForm } from './option-upload-form';

interface ElementDetailPanelProps {
  elementId: string;
  scriptId: string;
  productionId: string;
  onBack: () => void;
}

export function ElementDetailPanel({
  elementId,
  scriptId,
  productionId,
  onBack,
}: ElementDetailPanelProps) {
  const [element, setElement] = useState<ElementResponse | null>(null);
  const [options, setOptions] = useState<OptionResponse[]>([]);
  const [optionApprovals, setOptionApprovals] = useState<
    Record<string, { latestDecision?: string; approvals: ApprovalResponse[] }>
  >({});
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [lightboxOption, setLightboxOption] = useState<OptionResponse | null>(null);
  const [submittingApproval, setSubmittingApproval] = useState(false);

  useEffect(() => {
    setLightboxOption(null);
    setShowUploadForm(false);
    setError(null);
    setIsLoading(true);
    loadData();
  }, [elementId]);

  async function loadData() {
    try {
      const [elemResult, deptResult] = await Promise.all([
        elementsApi.list(scriptId),
        departmentsApi.list(productionId),
      ]);

      const found = elemResult.elements.find((e: ElementResponse) => e.id === elementId);
      if (!found) {
        setError('Element not found');
        return;
      }
      setElement(found);
      setDepartments(deptResult.departments);

      const { options: opts } = await optionsApi.list(elementId);
      setOptions(opts);

      await loadApprovals(opts);
    } catch {
      setError('Failed to load element');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadApprovals(opts: OptionResponse[]) {
    const approvalMap: Record<string, { latestDecision?: string; approvals: ApprovalResponse[] }> =
      {};

    for (const opt of opts) {
      if (opt.readyForReview) {
        try {
          const { approvals } = await approvalsApi.list(opt.id);
          approvalMap[opt.id] = {
            latestDecision: approvals.length > 0 ? approvals[0].decision : undefined,
            approvals,
          };
        } catch {
          approvalMap[opt.id] = { approvals: [] };
        }
      }
    }

    setOptionApprovals(approvalMap);
  }

  async function refreshOptions() {
    const { options: opts } = await optionsApi.list(elementId);
    setOptions(opts);
    await loadApprovals(opts);
  }

  async function handleApprove(decision: string, note?: string) {
    if (!lightboxOption) return;
    setError(null);
    try {
      setSubmittingApproval(true);
      await approvalsApi.create(lightboxOption.id, { decision, note });
      await refreshOptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit approval');
    } finally {
      setSubmittingApproval(false);
    }
  }

  async function handleConfirmApproval(approvalId: string) {
    setError(null);
    try {
      await approvalsApi.confirm(approvalId);
      await refreshOptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm approval');
    }
  }

  async function handleThumbnailApprove(optionId: string, decision: string) {
    setError(null);
    try {
      await approvalsApi.create(optionId, { decision });
      await refreshOptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit approval');
    }
  }

  async function handleDepartmentChange(departmentId: string | null) {
    setError(null);
    try {
      const { element: updated } = await elementsApi.update(elementId, { departmentId });
      setElement(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update department');
    }
  }

  async function handleOptionCreated() {
    setShowUploadForm(false);
    await refreshOptions();
  }

  function getApprovalState(optionId: string): 'APPROVED' | 'MAYBE' | 'REJECTED' | null {
    const data = optionApprovals[optionId];
    if (!data?.latestDecision) return null;
    return data.latestDecision as 'APPROVED' | 'MAYBE' | 'REJECTED';
  }

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error && !element) {
    return <div className="p-6 text-black font-bold">{error}</div>;
  }

  if (!element) {
    return <div className="p-6">Element not found.</div>;
  }

  return (
    <div className="p-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="mb-4 text-sm underline"
        aria-label="Back to Elements"
      >
        ← Elements
      </button>

      {/* Element header */}
      <div className="mb-4">
        <h2 className="text-2xl">{element.name}</h2>
        <div className="mt-1 flex items-center gap-3">
          <span className="badge badge-default uppercase">{element.type}</span>
          {element.highlightPage != null && (
            <span className="text-sm font-mono">p. {element.highlightPage}</span>
          )}
        </div>
        {departments.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <label className="text-sm">Department:</label>
            <select
              value={element.departmentId ?? ''}
              onChange={(e) => handleDepartmentChange(e.target.value || null)}
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
        )}
      </div>

      {error && <div className="mac-alert-error p-3 text-sm mb-4">{error}</div>}

      {/* Discussion */}
      <div className="mb-4">
        <DiscussionBox elementId={elementId} />
      </div>

      {/* Options section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg">Options ({options.length})</h3>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="mac-btn-primary px-3 py-1 text-sm"
          >
            Add Option
          </button>
        </div>

        {showUploadForm && (
          <div className="mb-3">
            <OptionUploadForm elementId={elementId} onOptionCreated={handleOptionCreated} />
          </div>
        )}

        {options.length === 0 ? (
          <p className="text-sm">No options yet.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {options.map((opt) => (
              <OptionThumbnail
                key={opt.id}
                option={opt}
                approvalState={getApprovalState(opt.id)}
                onClick={() => setLightboxOption(opt)}
                onApprove={(decision) => handleThumbnailApprove(opt.id, decision)}
                readyForReview={opt.readyForReview ?? false}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOption && (
        <OptionLightbox
          option={lightboxOption}
          onClose={() => setLightboxOption(null)}
          onApprove={handleApprove}
          disableApproval={submittingApproval}
          approvals={optionApprovals[lightboxOption.id]?.approvals}
          onConfirmApproval={handleConfirmApproval}
        />
      )}
    </div>
  );
}
