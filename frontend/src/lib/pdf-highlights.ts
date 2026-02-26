/**
 * Pure utility functions for PDF text layer highlighting.
 * These work with the text layer DOM rendered by react-pdf.
 */

function hexToRgba(hex: string, alpha: number): string {
  // Handle both #RGB and #RRGGBB formats
  let r: number, g: number, b: number;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const HIGHLIGHT_ATTR = 'data-highlight-element-id';
const ACTIVE_CLASS = 'pdf-highlight-active';
const INACTIVE_CLASS = 'pdf-highlight-inactive';

export interface HighlightInfo {
  elementId: string;
  page: number;
  text: string;
  departmentColor?: string | null;
}

/**
 * Find a span in a text layer whose textContent contains the search text (case-insensitive).
 * Returns the first matching span or null.
 */
export function findTextInLayer(
  textLayerEl: HTMLElement,
  searchText: string,
): HTMLElement | null {
  if (!searchText) return null;

  const spans = textLayerEl.querySelectorAll('span');
  const needle = searchText.toLowerCase();

  // Collect all matching spans
  const matches: HTMLElement[] = [];
  for (const span of spans) {
    const content = span.textContent?.toLowerCase() ?? '';
    if (content.includes(needle)) {
      matches.push(span as HTMLElement);
    }
  }

  if (matches.length === 0) return null;

  // Prefer exact match (case-insensitive)
  const exactMatch = matches.find(
    (span) => span.textContent?.toLowerCase() === needle,
  );
  if (exactMatch) return exactMatch;

  // Otherwise return the most specific (shortest textContent) match
  matches.sort(
    (a, b) => (a.textContent?.length ?? 0) - (b.textContent?.length ?? 0),
  );
  return matches[0];
}

/**
 * Apply highlight styling to a span element.
 * Active highlights are inverted (bg-black text-white).
 * Inactive highlights have a translucent background fill.
 */
export function applyHighlightStyle(
  span: HTMLElement,
  elementId: string,
  isActive: boolean,
  departmentColor?: string | null,
): void {
  const color = departmentColor || '#000000';

  span.setAttribute(HIGHLIGHT_ATTR, elementId);
  span.style.cursor = 'pointer';

  if (isActive) {
    span.classList.remove(INACTIVE_CLASS);
    span.classList.add(ACTIVE_CLASS);
    span.style.backgroundColor = color;
    span.style.color = '#fff';
    span.style.border = `2px solid ${color}`;
  } else {
    span.classList.remove(ACTIVE_CLASS);
    span.classList.add(INACTIVE_CLASS);
    span.style.backgroundColor = hexToRgba(color, 0.3);
    span.style.color = '#000';
    span.style.border = 'none';
  }
}

/**
 * Remove all highlight styles from a text layer.
 */
export function clearHighlights(textLayerEl: HTMLElement): void {
  const highlighted = textLayerEl.querySelectorAll(`[${HIGHLIGHT_ATTR}]`);
  for (const el of highlighted) {
    const span = el as HTMLElement;
    span.removeAttribute(HIGHLIGHT_ATTR);
    span.classList.remove(ACTIVE_CLASS, INACTIVE_CLASS);
    span.style.backgroundColor = '';
    span.style.color = '';
    span.style.border = '';
    span.style.cursor = '';
  }
}

/**
 * Get the element ID from a highlighted span (if any).
 */
export function getHighlightElementId(span: HTMLElement): string | null {
  return span.getAttribute(HIGHLIGHT_ATTR);
}
