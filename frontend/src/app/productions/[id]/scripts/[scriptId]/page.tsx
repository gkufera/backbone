'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  scriptsApi,
  elementsApi,
  departmentsApi,
  productionsApi,
  type ScriptResponse,
  type ElementWithCountResponse,
  type DepartmentResponse,
} from '../../../../../lib/api';
import { useAuth } from '../../../../../lib/auth-context';
import { ElementList } from '../../../../../components/element-list';
import { ElementDetailPanel } from '../../../../../components/element-detail-panel';
import { DirectorNotesPanel } from '../../../../../components/director-notes-panel';
import { ProcessingProgress } from '../../../../../components/processing-progress';
import { ElementWizard } from '../../../../../components/element-wizard';
import type { HighlightInfo } from '../../../../../lib/pdf-highlights';
import type { SceneInfo } from '@backbone/shared/types';
import { SkeletonCard } from '../../../../../components/skeleton';

const PdfViewer = dynamic(
  () => import('../../../../../components/pdf-viewer').then((m) => ({ default: m.PdfViewer })),
  { ssr: false, loading: () => <div className="p-6">Loading PDF viewer...</div> },
);

type ScriptDetail = ScriptResponse & {
  elements: ElementWithCountResponse[];
  sceneData?: SceneInfo[] | null;
};

export default function ScriptViewerPage() {
  const params = useParams();
  const productionId = params.id as string;
  const scriptId = params.scriptId as string;
  const { user } = useAuth();

  const [script, setScript] = useState<ScriptDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newElementName, setNewElementName] = useState('');
  const [newElementType, setNewElementType] = useState('CHARACTER');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [scrollToHighlight, setScrollToHighlight] = useState<{
    page: number;
    text: string;
  } | null>(null);
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [rightPanel, setRightPanel] = useState<'elements' | 'notes'>('elements');
  const [userRole, setUserRole] = useState<string>('MEMBER');

  const elementListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadScript();
  }, [productionId, scriptId]);

  async function loadScript() {
    try {
      const { script: data } = await scriptsApi.get(productionId, scriptId);
      setScript(data);

      // Fetch production to get user role
      try {
        const { production } = await productionsApi.get(productionId);
        if (production.memberRole) setUserRole(production.memberRole);
      } catch {
        // Optional
      }

      // Fetch departments for wizard and filters
      if (data.status === 'REVIEWING' || data.status === 'READY') {
        try {
          const { departments: depts } = await departmentsApi.list(productionId);
          setDepartments(depts);
        } catch {
          // Departments are optional
        }
      }

      // Fetch PDF download URL if script is ready
      if (data.status === 'READY' || data.status === 'REVIEWING') {
        try {
          const { downloadUrl } = await scriptsApi.getDownloadUrl(scriptId);
          setPdfUrl(downloadUrl);
        } catch {
          // PDF URL is optional — viewer still works without it
        }
      }
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

  // Build highlights from elements
  const highlights: HighlightInfo[] = useMemo(() => {
    if (!script) return [];
    return script.elements
      .filter((e) => e.highlightPage != null && e.highlightText != null)
      .map((e) => ({
        elementId: e.id,
        page: e.highlightPage!,
        text: e.highlightText!,
        departmentColor: e.department?.color ?? null,
      }));
  }, [script]);

  // When a highlight in the PDF is clicked, open the element detail panel
  function handleHighlightClick(elementId: string) {
    setActiveElementId(elementId);
    setSelectedElementId(elementId);
  }

  // When an element is clicked in the list, open the detail panel and scroll PDF to its highlight
  function handleElementClick(elementId: string) {
    setActiveElementId(elementId);
    setSelectedElementId(elementId);

    const element = script?.elements.find((e) => e.id === elementId);
    if (element?.highlightPage != null && element?.highlightText != null) {
      setScrollToHighlight({ page: element.highlightPage, text: element.highlightText });
    }
  }

  // Handle text selection in PDF for manual element creation
  function handleTextSelect(page: number, selectedText: string) {
    setNewElementName(selectedText);
    setShowAddForm(true);
  }

  const handleProcessingComplete = useCallback(
    (newStatus: string) => {
      loadScript();
    },
    [productionId, scriptId],
  );

  function handleWizardComplete() {
    loadScript();
  }

  if (isLoading) {
    return <div className="p-6"><SkeletonCard /></div>;
  }

  if (error) {
    return <div className="p-6 text-black font-bold">{error}</div>;
  }

  if (!script) {
    return <div className="p-6">Script not found.</div>;
  }

  // PROCESSING state: show progress bar
  if (script.status === 'PROCESSING') {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <ScriptHeader script={script} productionId={productionId} scriptId={scriptId} />
        <ProcessingProgress scriptId={scriptId} onComplete={handleProcessingComplete} />
      </div>
    );
  }

  // REVIEWING state: show wizard
  if (script.status === 'REVIEWING') {
    return (
      <div>
        <ElementWizard
          scriptId={scriptId}
          elements={script.elements}
          sceneData={script.sceneData ?? null}
          departments={departments}
          onComplete={handleWizardComplete}
        />
      </div>
    );
  }

  // Non-READY states (RECONCILING, ERROR): show single-column
  if (script.status !== 'READY') {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <ScriptHeader script={script} productionId={productionId} scriptId={scriptId} />

        {script.status === 'RECONCILING' && (
          <div className="mac-alert mb-6">
            <p className="text-black">
              This script revision needs reconciliation. Some elements could not be auto-matched.
            </p>
            <Link
              href={`/productions/${productionId}/scripts/${scriptId}/reconcile`}
              className="mt-2 inline-block text-sm underline"
            >
              Review and Reconcile
            </Link>
          </div>
        )}
      </div>
    );
  }

  // READY state: split-view layout
  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      {/* Left panel: PDF viewer */}
      <div className="order-2 h-1/2 border-b-2 border-black lg:order-1 lg:h-full lg:w-1/2 lg:border-b-0 lg:border-r-2">
        {pdfUrl ? (
          <PdfViewer
            pdfUrl={pdfUrl}
            highlights={highlights}
            activeElementId={activeElementId}
            onHighlightClick={handleHighlightClick}
            onTextSelect={handleTextSelect}
            scrollToHighlight={scrollToHighlight}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <p className="text-black">Loading PDF...</p>
          </div>
        )}
      </div>

      {/* Right panel: script metadata + elements OR detail panel */}
      <div className="order-1 h-1/2 overflow-y-auto lg:order-2 lg:h-full lg:w-1/2" ref={elementListRef}>
        {selectedElementId ? (
          <ElementDetailPanel
            elementId={selectedElementId}
            scriptId={scriptId}
            productionId={productionId}
            onBack={() => setSelectedElementId(null)}
          />
        ) : (
          <div className="p-4">
            <ScriptHeader script={script} productionId={productionId} scriptId={scriptId} />

            {/* Panel toggle */}
            {script.sceneData && script.sceneData.length > 0 && (
              <div className="mb-4 flex gap-2">
                <button
                  className={`px-3 py-1 text-sm ${
                    rightPanel === 'elements' ? 'bg-black text-white' : 'bg-white text-black border-2 border-black'
                  }`}
                  onClick={() => setRightPanel('elements')}
                >
                  Elements
                </button>
                <button
                  className={`px-3 py-1 text-sm ${
                    rightPanel === 'notes' ? 'bg-black text-white' : 'bg-white text-black border-2 border-black'
                  }`}
                  onClick={() => setRightPanel('notes')}
                >
                  Director&apos;s Notes
                </button>
              </div>
            )}

            {rightPanel === 'notes' && script.sceneData ? (
              <DirectorNotesPanel
                scriptId={scriptId}
                sceneData={script.sceneData}
                userRole={userRole}
                userId={user?.id ?? ''}
              />
            ) : (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl">Elements ({script.elements.length})</h2>
                <div className="flex gap-2">
                  <Link
                    href={`/productions/${productionId}/scripts/${scriptId}/revisions/upload`}
                    className="mac-btn-secondary px-3 py-1 text-sm"
                  >
                    Upload New Draft
                  </Link>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="mac-btn-primary px-3 py-1 text-sm"
                  >
                    Add Element
                  </button>
                </div>
              </div>

              {showAddForm && (
                <form noValidate onSubmit={handleAddElement} className="mb-4 flex gap-2 border-2 border-black p-3">
                  <input
                    type="text"
                    placeholder="Element name"
                    value={newElementName}
                    onChange={(e) => setNewElementName(e.target.value)}
                    className="flex-1 border-2 border-black p-2 text-sm"
                    required
                  />
                  <select
                    value={newElementType}
                    onChange={(e) => setNewElementType(e.target.value)}
                    className="border-2 border-black p-2 text-sm"
                  >
                    <option value="CHARACTER">Character</option>
                    <option value="LOCATION">Location</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <button type="submit" className="mac-btn-primary px-3 py-1 text-sm">
                    Add
                  </button>
                </form>
              )}

              {script.elements.length === 0 ? (
                <p className="text-black">No elements detected.</p>
              ) : (
                <ElementList
                  elements={script.elements}
                  onArchive={handleArchive}
                  productionId={productionId}
                  scriptId={scriptId}
                  activeElementId={activeElementId}
                  onElementClick={handleElementClick}
                />
              )}
            </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Reusable script header showing title, version, status badge, and links. */
function ScriptHeader({
  script,
  productionId,
  scriptId,
}: {
  script: ScriptDetail;
  productionId: string;
  scriptId: string;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl">{script.title}</h1>
        {script.version && <span className="badge badge-default">v{script.version}</span>}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <span className="badge badge-default uppercase">{script.status}</span>
        {script.pageCount && (
          <span className="text-sm text-black font-mono">{script.pageCount} pages</span>
        )}
        <span className="text-sm text-black font-mono">{script.fileName}</span>
        <Link
          href={`/productions/${productionId}/scripts/${scriptId}/versions`}
          className="text-sm underline"
        >
          Version History
        </Link>
      </div>
    </div>
  );
}
