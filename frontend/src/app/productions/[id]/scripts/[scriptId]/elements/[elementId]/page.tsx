'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  elementsApi,
  optionsApi,
  approvalsApi,
  type ElementResponse,
  type OptionResponse,
  type ApprovalResponse,
} from '../../../../../../../lib/api';
import { OptionGallery } from '../../../../../../../components/option-gallery';
import { OptionUploadForm } from '../../../../../../../components/option-upload-form';

export default function ElementDetailPage() {
  const params = useParams();
  const elementId = params.elementId as string;

  const [element, setElement] = useState<ElementResponse | null>(null);
  const [options, setOptions] = useState<OptionResponse[]>([]);
  const [optionApprovals, setOptionApprovals] = useState<
    Record<string, { latestDecision?: string; approvals: ApprovalResponse[] }>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);

  useEffect(() => {
    loadData();
  }, [elementId]);

  async function loadData() {
    try {
      const { elements } = await elementsApi.list(params.scriptId as string);
      const found = elements.find((e) => e.id === elementId);
      if (!found) {
        setError('Element not found');
        return;
      }
      setElement(found);

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
      // Check if option already has approvals inline (from feed-style response)
      const optAny = opt as OptionResponse & { approvals?: ApprovalResponse[] };
      if (optAny.approvals && optAny.approvals.length > 0) {
        approvalMap[opt.id] = {
          latestDecision: optAny.approvals[0].decision,
          approvals: optAny.approvals,
        };
      } else if (opt.readyForReview) {
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

  async function handleToggleReady(optionId: string) {
    const option = options.find((o) => o.id === optionId);
    if (!option) return;

    setError(null);
    try {
      await optionsApi.update(optionId, { readyForReview: !option.readyForReview });
      await refreshOptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update option');
    }
  }

  async function handleArchiveOption(optionId: string) {
    setError(null);
    try {
      await optionsApi.update(optionId, { status: 'ARCHIVED' });
      await refreshOptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive option');
    }
  }

  async function handleApprove(optionId: string, decision: string, note?: string) {
    setError(null);
    try {
      setSubmittingApproval(true);
      await approvalsApi.create(optionId, { decision, note });
      await refreshOptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit approval');
    } finally {
      setSubmittingApproval(false);
    }
  }

  async function handleOptionCreated() {
    setShowUploadForm(false);
    await refreshOptions();
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

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-black font-bold">{error}</div>;
  }

  if (!element) {
    return <div className="p-6">Element not found.</div>;
  }

  const optionCount = options.length;
  const optionLabel = optionCount === 1 ? '1 option' : `${optionCount} options`;

  const isLocked = options.some((opt) => {
    const approvalData = optionApprovals[opt.id];
    return approvalData?.approvals?.some((a) => a.decision === 'APPROVED' && !a.tentative);
  });

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl">{element.name}</h1>
        <div className="mt-2 flex items-center gap-3">
          <span className="badge badge-default uppercase">
            {element.type}
          </span>
          <span className="text-sm text-black">Pages: {element.pageNumbers.join(', ')}</span>
        </div>
      </div>

      {isLocked && (
        <div className="mac-alert mb-4">
          Element is locked — an option has been approved.
        </div>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl">Options ({optionLabel})</h2>
          {!isLocked && (
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="mac-btn-primary px-3 py-1 text-sm"
            >
              Add Option
            </button>
          )}
        </div>

        {showUploadForm && !isLocked && (
          <div className="mb-4">
            <OptionUploadForm elementId={elementId} onOptionCreated={handleOptionCreated} />
          </div>
        )}

        <OptionGallery
          options={options}
          onToggleReady={handleToggleReady}
          onArchive={handleArchiveOption}
          optionApprovals={optionApprovals}
          onApprove={handleApprove}
          disableApproval={submittingApproval}
          onConfirmApproval={handleConfirmApproval}
        />
      </section>
    </div>
  );
}
