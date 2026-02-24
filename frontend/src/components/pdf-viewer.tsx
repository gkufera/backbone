'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  findTextInLayer,
  applyHighlightStyle,
  clearHighlights,
  getHighlightElementId,
  type HighlightInfo,
} from '../lib/pdf-highlights';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export interface PdfViewerProps {
  pdfUrl: string;
  highlights: HighlightInfo[];
  activeElementId: string | null;
  onHighlightClick: (elementId: string) => void;
  onTextSelect?: (page: number, selectedText: string) => void;
  scrollToHighlight?: { page: number; text: string } | null;
}

export function PdfViewer({
  pdfUrl,
  highlights,
  activeElementId,
  onHighlightClick,
  onTextSelect,
  scrollToHighlight,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  function onDocumentLoadSuccess({ numPages: n }: { numPages: number }) {
    setNumPages(n);
    setLoadError(null);
  }

  function onDocumentLoadError() {
    setLoadError('Failed to load PDF');
  }

  // Apply highlights after each page text layer renders
  const applyPageHighlights = useCallback(
    (pageNumber: number) => {
      const pageEl = pageRefs.current.get(pageNumber);
      if (!pageEl) return;

      const textLayer = pageEl.querySelector('.react-pdf__Page__textContent');
      if (!textLayer) return;

      clearHighlights(textLayer as HTMLElement);

      const pageHighlights = highlights.filter((h) => h.page === pageNumber);
      for (const h of pageHighlights) {
        const span = findTextInLayer(textLayer as HTMLElement, h.text);
        if (span) {
          applyHighlightStyle(span, h.elementId, h.elementId === activeElementId);
        }
      }
    },
    [highlights, activeElementId],
  );

  // Re-apply highlights when active element changes
  useEffect(() => {
    if (!numPages) return;
    for (let i = 1; i <= numPages; i++) {
      applyPageHighlights(i);
    }
  }, [numPages, applyPageHighlights]);

  // Scroll to highlight when requested
  useEffect(() => {
    if (!scrollToHighlight || !containerRef.current) return;

    const pageEl = pageRefs.current.get(scrollToHighlight.page);
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Flash the highlight
      const textLayer = pageEl.querySelector('.react-pdf__Page__textContent');
      if (textLayer) {
        const span = findTextInLayer(textLayer as HTMLElement, scrollToHighlight.text);
        if (span) {
          span.style.outline = '3px solid #000';
          setTimeout(() => {
            span.style.outline = '';
          }, 1500);
        }
      }
    }
  }, [scrollToHighlight]);

  // Handle clicks on highlighted text
  function handleClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const elementId = getHighlightElementId(target);
    if (elementId) {
      onHighlightClick(elementId);
    }
  }

  // Handle text selection for manual element creation
  function handleMouseUp() {
    if (!onTextSelect) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    // Determine which page the selection is in
    const anchorNode = selection.anchorNode;
    if (!anchorNode) return;

    const pageEl = (anchorNode as HTMLElement).closest?.('.react-pdf__Page')
      ?? (anchorNode.parentElement as HTMLElement)?.closest?.('.react-pdf__Page');

    if (pageEl) {
      const pageNum = parseInt(pageEl.getAttribute('data-page-number') ?? '0', 10);
      if (pageNum > 0) {
        onTextSelect(pageNum, selectedText);
      }
    }
  }

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-black font-bold">{loadError}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto"
      onClick={handleClick}
      onMouseUp={handleMouseUp}
      data-testid="pdf-viewer"
    >
      <Document
        file={pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading={<div className="p-6">Loading PDF...</div>}
      >
        {numPages &&
          Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
            <div
              key={pageNumber}
              ref={(el) => {
                if (el) pageRefs.current.set(pageNumber, el);
              }}
              className="mb-4 border-2 border-black"
            >
              <Page
                pageNumber={pageNumber}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                width={600}
                onRenderTextLayerSuccess={() => applyPageHighlights(pageNumber)}
              />
            </div>
          ))}
      </Document>
    </div>
  );
}
