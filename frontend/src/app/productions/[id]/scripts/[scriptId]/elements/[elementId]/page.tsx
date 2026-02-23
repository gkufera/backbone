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

    try {
      await optionsApi.update(optionId, { readyForReview: !option.readyForReview });
      await refreshOptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update option');
    }
  }

  async function handleArchiveOption(optionId: string) {
    try {
      await optionsApi.update(optionId, { status: 'ARCHIVED' });
      await refreshOptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive option');
    }
  }

  async function handleApprove(optionId: string, decision: string, note?: string) {
    try {
      await approvalsApi.create(optionId, { decision, note });
      await refreshOptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit approval');
    }
  }

  async function handleOptionCreated() {
    setShowUploadForm(false);
    await refreshOptions();
  }

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!element) {
    return <div className="p-6">Element not found.</div>;
  }

  const optionCount = options.length;
  const optionLabel = optionCount === 1 ? '1 option' : `${optionCount} options`;

  const isLocked = options.some((opt) => {
    const approval = optionApprovals[opt.id];
    return approval?.latestDecision === 'APPROVED';
  });

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{element.name}</h1>
        <div className="mt-2 flex items-center gap-3">
          <span className="rounded bg-zinc-200 px-2 py-1 text-xs font-medium uppercase">
            {element.type}
          </span>
          <span className="text-sm text-zinc-500">Pages: {element.pageNumbers.join(', ')}</span>
        </div>
      </div>

      {isLocked && (
        <div className="mb-4 rounded bg-green-50 border border-green-200 p-3 text-sm text-green-800">
          Element is locked — an option has been approved.
        </div>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Options ({optionLabel})</h2>
          {!isLocked && (
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="rounded bg-black px-3 py-1 text-sm text-white"
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
        />
      </section>
    </div>
  );
}
