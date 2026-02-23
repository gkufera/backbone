'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  scriptsApi,
  elementsApi,
  type ScriptResponse,
  type ElementWithCountResponse,
} from '../../../../../lib/api';
import { ElementList } from '../../../../../components/element-list';

type ScriptDetail = ScriptResponse & { elements: ElementWithCountResponse[] };

export default function ScriptViewerPage() {
  const params = useParams();
  const productionId = params.id as string;
  const scriptId = params.scriptId as string;

  const [script, setScript] = useState<ScriptDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newElementName, setNewElementName] = useState('');
  const [newElementType, setNewElementType] = useState('CHARACTER');

  useEffect(() => {
    loadScript();
  }, [productionId, scriptId]);

  async function loadScript() {
    try {
      const { script: data } = await scriptsApi.get(productionId, scriptId);
      setScript(data);
    } catch {
      setError('Failed to load script');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleArchive(elementId: string) {
    try {
      await elementsApi.update(elementId, { status: 'ARCHIVED' });
      await loadScript();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive element');
    }
  }

  async function handleAddElement(e: React.FormEvent) {
    e.preventDefault();
    if (!newElementName.trim()) return;

    try {
      await elementsApi.create(scriptId, {
        name: newElementName.trim(),
        type: newElementType,
      });

      setNewElementName('');
      setShowAddForm(false);
      await loadScript();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add element');
    }
  }

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!script) {
    return <div className="p-6">Script not found.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{script.title}</h1>
          {script.version && (
            <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
              v{script.version}
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="rounded bg-zinc-200 px-2 py-1 text-xs font-medium uppercase">
            {script.status}
          </span>
          {script.pageCount && (
            <span className="text-sm text-zinc-500">{script.pageCount} pages</span>
          )}
          <span className="text-sm text-zinc-400">{script.fileName}</span>
          <Link
            href={`/productions/${productionId}/scripts/${scriptId}/versions`}
            className="text-sm text-blue-600 hover:underline"
          >
            Version History
          </Link>
        </div>
      </div>

      {script.status === 'PROCESSING' && (
        <div className="mb-6 rounded border border-yellow-300 bg-yellow-50 p-4">
          <p className="text-yellow-800">
            Script is processing. Elements will appear once extraction is complete.
          </p>
        </div>
      )}

      {script.status === 'RECONCILING' && (
        <div className="mb-6 rounded border border-orange-300 bg-orange-50 p-4">
          <p className="text-orange-800">
            This script revision needs reconciliation. Some elements could not be auto-matched.
          </p>
          <Link
            href={`/productions/${productionId}/scripts/${scriptId}/reconcile`}
            className="mt-2 inline-block text-sm font-medium text-orange-700 underline"
          >
            Review and Reconcile
          </Link>
        </div>
      )}

      {script.status === 'READY' && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Elements ({script.elements.length})</h2>
            <div className="flex gap-2">
              <Link
                href={`/productions/${productionId}/scripts/${scriptId}/revisions/upload`}
                className="rounded border border-black px-3 py-1 text-sm"
              >
                Upload New Draft
              </Link>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="rounded bg-black px-3 py-1 text-sm text-white"
              >
                Add Element
              </button>
            </div>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddElement} className="mb-4 flex gap-2 rounded border p-3">
              <input
                type="text"
                placeholder="Element name"
                value={newElementName}
                onChange={(e) => setNewElementName(e.target.value)}
                className="flex-1 rounded border p-2 text-sm"
                required
              />
              <select
                value={newElementType}
                onChange={(e) => setNewElementType(e.target.value)}
                className="rounded border p-2 text-sm"
              >
                <option value="CHARACTER">Character</option>
                <option value="LOCATION">Location</option>
                <option value="OTHER">Other</option>
              </select>
              <button type="submit" className="rounded bg-black px-3 py-1 text-sm text-white">
                Add
              </button>
            </form>
          )}

          {script.elements.length === 0 ? (
            <p className="text-zinc-500">No elements detected.</p>
          ) : (
            <ElementList
              elements={script.elements}
              onArchive={handleArchive}
              productionId={productionId}
              scriptId={scriptId}
            />
          )}
        </section>
      )}
    </div>
  );
}
