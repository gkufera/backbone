'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  elementsApi,
  optionsApi,
  type ElementResponse,
  type OptionResponse,
} from '../../../../../../../lib/api';
import { OptionGallery } from '../../../../../../../components/option-gallery';
import { OptionUploadForm } from '../../../../../../../components/option-upload-form';

export default function ElementDetailPage() {
  const params = useParams();
  const elementId = params.elementId as string;

  const [element, setElement] = useState<ElementResponse | null>(null);
  const [options, setOptions] = useState<OptionResponse[]>([]);
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
    } catch {
      setError('Failed to load element');
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshOptions() {
    const { options: opts } = await optionsApi.list(elementId);
    setOptions(opts);
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

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Options ({optionLabel})</h2>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="rounded bg-black px-3 py-1 text-sm text-white"
          >
            Add Option
          </button>
        </div>

        {showUploadForm && (
          <div className="mb-4">
            <OptionUploadForm elementId={elementId} onOptionCreated={handleOptionCreated} />
          </div>
        )}

        <OptionGallery
          options={options}
          onToggleReady={handleToggleReady}
          onArchive={handleArchiveOption}
        />
      </section>
    </div>
  );
}
