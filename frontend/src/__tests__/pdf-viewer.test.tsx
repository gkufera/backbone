import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock react-pdf
vi.mock('react-pdf', () => ({
  Document: ({ children, onLoadSuccess, loading }: any) => {
    // Simulate successful load after render
    setTimeout(() => onLoadSuccess?.({ numPages: 2 }), 0);
    return <div data-testid="mock-document">{loading}{children}</div>;
  },
  Page: ({ pageNumber, onRenderTextLayerSuccess }: any) => {
    setTimeout(() => onRenderTextLayerSuccess?.(), 0);
    return (
      <div className="react-pdf__Page" data-page-number={pageNumber}>
        <div className="react-pdf__Page__textContent">
          <span>Page {pageNumber} text</span>
        </div>
      </div>
    );
  },
  pdfjs: {
    GlobalWorkerOptions: { workerSrc: '' },
  },
}));

// Mock CSS imports
vi.mock('react-pdf/dist/Page/AnnotationLayer.css', () => ({}));
vi.mock('react-pdf/dist/Page/TextLayer.css', () => ({}));

import { PdfViewer } from '../components/pdf-viewer';

describe('PdfViewer', () => {
  const defaultProps = {
    pdfUrl: 'https://example.com/test.pdf',
    highlights: [],
    activeElementId: null,
    onHighlightClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the pdf viewer container', () => {
    render(<PdfViewer {...defaultProps} />);

    expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<PdfViewer {...defaultProps} />);

    expect(screen.getByText('Loading PDF...')).toBeInTheDocument();
  });

  it('calls onHighlightClick when a highlighted span is clicked', () => {
    const onHighlightClick = vi.fn();
    render(<PdfViewer {...defaultProps} onHighlightClick={onHighlightClick} />);

    // Simulate clicking on a span with the highlight attribute
    const container = screen.getByTestId('pdf-viewer');
    const span = document.createElement('span');
    span.setAttribute('data-highlight-element-id', 'elem-1');
    container.appendChild(span);

    fireEvent.click(span);

    expect(onHighlightClick).toHaveBeenCalledWith('elem-1');
  });

  it('does not call onHighlightClick for non-highlighted elements', () => {
    const onHighlightClick = vi.fn();
    render(<PdfViewer {...defaultProps} onHighlightClick={onHighlightClick} />);

    const container = screen.getByTestId('pdf-viewer');
    fireEvent.click(container);

    expect(onHighlightClick).not.toHaveBeenCalled();
  });

  it('calls onTextSelect when text is selected in the PDF', () => {
    const onTextSelect = vi.fn();
    render(<PdfViewer {...defaultProps} onTextSelect={onTextSelect} />);

    // Create a mock page element in the viewer for selection context
    const container = screen.getByTestId('pdf-viewer');
    const pageDiv = document.createElement('div');
    pageDiv.className = 'react-pdf__Page';
    pageDiv.setAttribute('data-page-number', '2');
    const textSpan = document.createElement('span');
    textSpan.textContent = 'Selected text';
    pageDiv.appendChild(textSpan);
    container.appendChild(pageDiv);

    // Mock window.getSelection
    const mockSelection = {
      isCollapsed: false,
      toString: () => 'Selected text',
      anchorNode: textSpan,
    };
    vi.spyOn(window, 'getSelection').mockReturnValue(mockSelection as any);

    fireEvent.mouseUp(container);

    expect(onTextSelect).toHaveBeenCalledWith(2, 'Selected text');
  });

  it('does not call onTextSelect when selection is empty', () => {
    const onTextSelect = vi.fn();
    render(<PdfViewer {...defaultProps} onTextSelect={onTextSelect} />);

    const mockSelection = {
      isCollapsed: true,
      toString: () => '',
      anchorNode: null,
    };
    vi.spyOn(window, 'getSelection').mockReturnValue(mockSelection as any);

    const container = screen.getByTestId('pdf-viewer');
    fireEvent.mouseUp(container);

    expect(onTextSelect).not.toHaveBeenCalled();
  });

  it('renders with highlights prop', () => {
    const highlights = [
      { elementId: 'elem-1', page: 1, text: 'JOHN' },
      { elementId: 'elem-2', page: 2, text: 'INT. OFFICE' },
    ];

    // Should not throw
    render(<PdfViewer {...defaultProps} highlights={highlights} activeElementId="elem-1" />);

    expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
  });
});
