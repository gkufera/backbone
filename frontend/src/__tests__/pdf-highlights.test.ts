import { describe, it, expect, beforeEach } from 'vitest';
import {
  findTextInLayer,
  applyHighlightStyle,
  clearHighlights,
  getHighlightElementId,
} from '../lib/pdf-highlights';

function createTextLayer(texts: string[]): HTMLElement {
  const container = document.createElement('div');
  for (const text of texts) {
    const span = document.createElement('span');
    span.textContent = text;
    container.appendChild(span);
  }
  return container;
}

describe('pdf-highlights utilities', () => {
  describe('findTextInLayer', () => {
    it('returns matching span when text is found', () => {
      const layer = createTextLayer(['Hello world', 'INT. OFFICE - DAY', 'Some other text']);

      const result = findTextInLayer(layer, 'INT. OFFICE - DAY');
      expect(result).not.toBeNull();
      expect(result!.textContent).toBe('INT. OFFICE - DAY');
    });

    it('matches case-insensitively', () => {
      const layer = createTextLayer(['JOHN walks in']);

      const result = findTextInLayer(layer, 'john');
      expect(result).not.toBeNull();
      expect(result!.textContent).toBe('JOHN walks in');
    });

    it('matches partial content', () => {
      const layer = createTextLayer(['JOHN walks in quietly']);

      const result = findTextInLayer(layer, 'JOHN');
      expect(result).not.toBeNull();
    });

    it('returns null when text is not found', () => {
      const layer = createTextLayer(['Hello world']);

      const result = findTextInLayer(layer, 'MISSING');
      expect(result).toBeNull();
    });

    it('returns null for empty search text', () => {
      const layer = createTextLayer(['Hello world']);

      const result = findTextInLayer(layer, '');
      expect(result).toBeNull();
    });
  });

  describe('applyHighlightStyle', () => {
    let span: HTMLElement;

    beforeEach(() => {
      span = document.createElement('span');
      span.textContent = 'test';
    });

    it('applies active highlight style (inverted)', () => {
      applyHighlightStyle(span, 'elem-1', true);

      expect(span.getAttribute('data-highlight-element-id')).toBe('elem-1');
      expect(span.style.backgroundColor).toBe('rgb(0, 0, 0)');
      expect(span.style.color).toBe('rgb(255, 255, 255)');
      expect(span.style.cursor).toBe('pointer');
    });

    it('applies inactive highlight style (translucent fill, no dashed border)', () => {
      applyHighlightStyle(span, 'elem-2', false);

      expect(span.getAttribute('data-highlight-element-id')).toBe('elem-2');
      // Inactive highlights use a translucent background, not transparent
      expect(span.style.backgroundColor).not.toBe('transparent');
      expect(span.style.backgroundColor).toContain('rgba');
      // No dashed border on inactive highlights
      expect(span.style.border).not.toContain('dashed');
      expect(span.style.cursor).toBe('pointer');
    });

    it('uses department color when provided', () => {
      applyHighlightStyle(span, 'elem-1', true, '#E63946');

      expect(span.style.backgroundColor).toBe('rgb(230, 57, 70)');
      expect(span.style.color).toBe('rgb(255, 255, 255)');
    });

    it('uses department color as translucent fill for inactive highlight', () => {
      applyHighlightStyle(span, 'elem-1', false, '#2A9D8F');

      // Should use rgba version of the department color
      expect(span.style.backgroundColor).toContain('rgba(42, 157, 143');
      expect(span.style.border).not.toContain('dashed');
    });

    it('falls back to black when no color provided', () => {
      applyHighlightStyle(span, 'elem-1', true);

      expect(span.style.backgroundColor).toBe('rgb(0, 0, 0)');
    });

    it('switches from active to inactive', () => {
      applyHighlightStyle(span, 'elem-1', true);
      applyHighlightStyle(span, 'elem-1', false);

      // After switching, should have translucent fill (not transparent)
      expect(span.style.backgroundColor).toContain('rgba');
      expect(span.classList.contains('pdf-highlight-active')).toBe(false);
      expect(span.classList.contains('pdf-highlight-inactive')).toBe(true);
    });
  });

  describe('clearHighlights', () => {
    it('removes all highlight styles', () => {
      const layer = createTextLayer(['JOHN', 'MARY']);
      const spans = layer.querySelectorAll('span');

      applyHighlightStyle(spans[0] as HTMLElement, 'elem-1', true);
      applyHighlightStyle(spans[1] as HTMLElement, 'elem-2', false);

      clearHighlights(layer);

      for (const span of spans) {
        expect(span.getAttribute('data-highlight-element-id')).toBeNull();
        expect((span as HTMLElement).style.backgroundColor).toBe('');
        expect((span as HTMLElement).style.cursor).toBe('');
      }
    });

    it('resets border property', () => {
      const layer = createTextLayer(['JOHN']);
      const span = layer.querySelector('span') as HTMLElement;

      applyHighlightStyle(span, 'elem-1', true, '#E63946');
      expect(span.style.border).not.toBe('');

      clearHighlights(layer);
      expect(span.style.border).toBe('');
    });
  });

  describe('getHighlightElementId', () => {
    it('returns element ID from highlighted span', () => {
      const span = document.createElement('span');
      applyHighlightStyle(span, 'elem-1', true);

      expect(getHighlightElementId(span)).toBe('elem-1');
    });

    it('returns null from non-highlighted span', () => {
      const span = document.createElement('span');

      expect(getHighlightElementId(span)).toBeNull();
    });
  });
});
