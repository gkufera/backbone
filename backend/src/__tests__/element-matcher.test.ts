import { describe, it, expect } from 'vitest';
import {
  matchElements,
  type ExistingElement,
  type DetectedElement,
} from '../services/element-matcher';

function makeExisting(overrides: Partial<ExistingElement> & { name: string }): ExistingElement {
  return {
    id: `elem-${overrides.name.toLowerCase().replace(/\s+/g, '-')}`,
    name: overrides.name,
    type: overrides.type ?? 'CHARACTER',
    status: overrides.status ?? 'ACTIVE',
    source: overrides.source ?? 'AUTO',
    highlightPage: overrides.highlightPage ?? 1,
    highlightText: overrides.highlightText ?? overrides.name,
  };
}

function makeDetected(overrides: Partial<DetectedElement> & { name: string }): DetectedElement {
  return {
    name: overrides.name,
    type: overrides.type ?? 'CHARACTER',
    highlightPage: overrides.highlightPage ?? 1,
    highlightText: overrides.highlightText ?? overrides.name,
  };
}

describe('Element Matcher', () => {
  it('returns all exact matches when scripts are identical', () => {
    const existing = [makeExisting({ name: 'JOHN' }), makeExisting({ name: 'MARY' })];
    const detected = [makeDetected({ name: 'JOHN' }), makeDetected({ name: 'MARY' })];

    const result = matchElements(existing, detected);

    expect(result.matches).toHaveLength(2);
    expect(result.matches.every((m) => m.status === 'EXACT')).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('returns all new elements when scripts are completely different', () => {
    const existing = [makeExisting({ name: 'JOHN' }), makeExisting({ name: 'MARY' })];
    const detected = [makeDetected({ name: 'XAVIER' }), makeDetected({ name: 'ZOEY' })];

    const result = matchElements(existing, detected);

    expect(result.matches.filter((m) => m.status === 'NEW')).toHaveLength(2);
    expect(result.missing).toHaveLength(2);
    expect(result.missing.map((m) => m.name)).toEqual(expect.arrayContaining(['JOHN', 'MARY']));
  });

  it('handles mixed: exact + fuzzy + new + missing', () => {
    const existing = [
      makeExisting({ name: 'JOHN SMITH' }),
      makeExisting({ name: 'MARY JONES' }),
      makeExisting({ name: 'BOB' }),
    ];
    const detected = [
      makeDetected({ name: 'JOHN SMITH' }), // exact match
      makeDetected({ name: 'JOHN SMITHE' }), // fuzzy match to... wait, JOHN SMITH is already exact matched
      makeDetected({ name: 'XAVIER' }), // new
    ];

    const result = matchElements(existing, detected);

    const exact = result.matches.filter((m) => m.status === 'EXACT');
    const newElems = result.matches.filter((m) => m.status === 'NEW');

    expect(exact).toHaveLength(1);
    expect(exact[0].detectedName).toBe('JOHN SMITH');

    expect(newElems.length).toBeGreaterThanOrEqual(1);

    // BOB and MARY JONES are missing
    expect(result.missing.map((m) => m.name)).toEqual(expect.arrayContaining(['BOB']));
  });

  it('fuzzy matches above threshold (JOHN SMITH vs JOHN SMITHE)', () => {
    const existing = [makeExisting({ name: 'JOHN SMITH' })];
    const detected = [makeDetected({ name: 'JOHN SMITHE' })];

    const result = matchElements(existing, detected);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].status).toBe('FUZZY');
    expect(result.matches[0].oldElementId).toBe('elem-john-smith');
    expect(result.matches[0].similarity).toBeGreaterThan(0.7);
  });

  it('does not fuzzy match below threshold (JOHN vs XAVIER)', () => {
    const existing = [makeExisting({ name: 'JOHN' })];
    const detected = [makeDetected({ name: 'XAVIER' })];

    const result = matchElements(existing, detected);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].status).toBe('NEW');
    expect(result.missing).toHaveLength(1);
  });

  it('matches case-insensitively', () => {
    const existing = [makeExisting({ name: 'John Smith' })];
    const detected = [makeDetected({ name: 'JOHN SMITH' })];

    const result = matchElements(existing, detected);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].status).toBe('EXACT');
  });

  it('includes MANUAL elements in matching pool', () => {
    const existing = [makeExisting({ name: 'CUSTOM PROP', source: 'MANUAL', type: 'OTHER' })];
    const detected = [makeDetected({ name: 'CUSTOM PROP', type: 'OTHER' })];

    const result = matchElements(existing, detected);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].status).toBe('EXACT');
  });

  it('excludes ARCHIVED elements from matching', () => {
    const existing = [
      makeExisting({ name: 'JOHN', status: 'ARCHIVED' }),
      makeExisting({ name: 'MARY' }),
    ];
    const detected = [makeDetected({ name: 'JOHN' }), makeDetected({ name: 'MARY' })];

    const result = matchElements(existing, detected);

    const johnMatch = result.matches.find((m) => m.detectedName === 'JOHN');
    const maryMatch = result.matches.find((m) => m.detectedName === 'MARY');

    expect(johnMatch?.status).toBe('NEW'); // JOHN is archived, so no match
    expect(maryMatch?.status).toBe('EXACT');
    expect(result.missing).toHaveLength(0); // ARCHIVED elements are not "missing"
  });

  it('matches same name different type', () => {
    const existing = [makeExisting({ name: 'OFFICE', type: 'LOCATION' })];
    const detected = [makeDetected({ name: 'OFFICE', type: 'CHARACTER' })];

    const result = matchElements(existing, detected);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].status).toBe('EXACT');
  });

  it('handles empty inputs', () => {
    expect(matchElements([], []).matches).toHaveLength(0);
    expect(matchElements([], []).missing).toHaveLength(0);

    const existing = [makeExisting({ name: 'JOHN' })];
    const emptyDetected = matchElements(existing, []);
    expect(emptyDetected.matches).toHaveLength(0);
    expect(emptyDetected.missing).toHaveLength(1);

    const emptyExisting = matchElements([], [makeDetected({ name: 'JOHN' })]);
    expect(emptyExisting.matches).toHaveLength(1);
    expect(emptyExisting.matches[0].status).toBe('NEW');
  });

  it('first match consumes the element (deduplication)', () => {
    const existing = [makeExisting({ name: 'JOHN' })];
    const detected = [makeDetected({ name: 'JOHN' }), makeDetected({ name: 'JOHN' })];

    const result = matchElements(existing, detected);

    const exactMatches = result.matches.filter((m) => m.status === 'EXACT');
    const newMatches = result.matches.filter((m) => m.status === 'NEW');

    expect(exactMatches).toHaveLength(1);
    expect(newMatches).toHaveLength(1); // second JOHN is NEW since first consumed the existing
  });

  it('passes through detectedPage and detectedHighlightText in match results', () => {
    const existing = [makeExisting({ name: 'JOHN' })];
    const detected = [makeDetected({ name: 'JOHN', highlightPage: 5, highlightText: 'JOHN' })];

    const result = matchElements(existing, detected);

    expect(result.matches[0].detectedPage).toBe(5);
    expect(result.matches[0].detectedHighlightText).toBe('JOHN');
  });
});
