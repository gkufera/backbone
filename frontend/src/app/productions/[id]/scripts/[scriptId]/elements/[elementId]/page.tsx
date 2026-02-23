'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  elementsApi,
  optionsApi,
  type ElementResponse,
  type OptionResponse,
} from '../../../../../../../lib/api';

export default function ElementDetailPage() {
  const params = useParams();
  const elementId = params.elementId as string;

  const [element, setElement] = useState<ElementResponse | null>(null);
  const [options, setOptions] = useState<OptionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [elementId]);

  async function loadData() {
    try {
      // Find element from the elements list (using the script's element list)
      const { elements } = await elementsApi.list(params.scriptId as string, true);
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
          <button className="rounded bg-black px-3 py-1 text-sm text-white">Add Option</button>
        </div>

        {options.length === 0 ? (
          <p className="text-zinc-500">No options yet. Add an option to get started.</p>
        ) : (
          <ul className="space-y-2">
            {options.map((opt) => (
              <li key={opt.id} className="rounded border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium">
                      {opt.mediaType}
                    </span>
                    {opt.description && <span className="ml-2 text-sm">{opt.description}</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
