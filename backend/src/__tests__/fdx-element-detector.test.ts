import { describe, it, expect } from 'vitest';
import { detectFdxElements } from '../services/fdx-element-detector';
import { ElementType } from '@backbone/shared/types';
import type { ParsedFdx } from '../services/fdx-parser';

function makeParsedFdx(overrides: Partial<ParsedFdx> = {}): ParsedFdx {
  return {
    paragraphs: [],
    taggedElements: [],
    pageCount: 1,
    ...overrides,
  };
}

describe('FDX Element Detector', () => {
  it('detects locations from Scene Heading paragraphs', () => {
    const parsed = makeParsedFdx({
      paragraphs: [
        { type: 'Scene Heading', text: 'INT. OFFICE - DAY', page: 1 },
        { type: 'Scene Heading', text: 'EXT. PARK - NIGHT', page: 3 },
      ],
    });

    const { elements } = detectFdxElements(parsed);
    const locations = elements.filter((e) => e.type === ElementType.LOCATION);

    expect(locations).toHaveLength(2);
    expect(locations[0].name).toBe('INT. OFFICE - DAY');
    expect(locations[0].highlightPage).toBe(1);
    expect(locations[1].name).toBe('EXT. PARK - NIGHT');
    expect(locations[1].highlightPage).toBe(3);
  });

  it('detects characters from Character paragraphs', () => {
    const parsed = makeParsedFdx({
      paragraphs: [
        { type: 'Scene Heading', text: 'INT. OFFICE - DAY', page: 1 },
        { type: 'Character', text: 'JOHN', page: 1 },
        { type: 'Character', text: 'MARY', page: 2 },
      ],
    });

    const { elements } = detectFdxElements(parsed);
    const characters = elements.filter((e) => e.type === ElementType.CHARACTER);

    expect(characters).toHaveLength(2);
    expect(characters[0].name).toBe('JOHN');
    expect(characters[1].name).toBe('MARY');
  });

  it('detects props from TagData Props category', () => {
    const parsed = makeParsedFdx({
      taggedElements: [
        { category: 'Props', name: 'Briefcase' },
        { category: 'Props', name: 'Coffee Mug' },
      ],
    });

    const { elements } = detectFdxElements(parsed);
    const props = elements.filter((e) => e.suggestedDepartment === 'Props');

    expect(props).toHaveLength(2);
    expect(props[0].name).toBe('BRIEFCASE');
    expect(props[1].name).toBe('COFFEE MUG');
  });

  it('detects wardrobe from TagData Wardrobe/Costume category', () => {
    const parsed = makeParsedFdx({
      taggedElements: [
        { category: 'Wardrobe', name: 'Red Dress' },
        { category: 'Costume', name: 'Suit' },
      ],
    });

    const { elements } = detectFdxElements(parsed);
    const wardrobe = elements.filter((e) => e.suggestedDepartment === 'Costume');

    expect(wardrobe).toHaveLength(2);
    expect(wardrobe[0].name).toBe('RED DRESS');
    expect(wardrobe[1].name).toBe('SUIT');
  });

  it('maps tag categories to departments (Vehicles→Props, Hair→Hair & Makeup)', () => {
    const parsed = makeParsedFdx({
      taggedElements: [
        { category: 'Vehicles', name: 'Police Car' },
        { category: 'Hair', name: 'Wig' },
      ],
    });

    const { elements } = detectFdxElements(parsed);

    const vehicle = elements.find((e) => e.name === 'POLICE CAR');
    expect(vehicle?.suggestedDepartment).toBe('Props');

    const hair = elements.find((e) => e.name === 'WIG');
    expect(hair?.suggestedDepartment).toBe('Hair & Makeup');
  });

  it('deduplicates elements', () => {
    const parsed = makeParsedFdx({
      paragraphs: [
        { type: 'Character', text: 'JOHN', page: 1 },
        { type: 'Character', text: 'JOHN', page: 3 },
      ],
    });

    const { elements } = detectFdxElements(parsed);
    const johns = elements.filter((e) => e.name === 'JOHN');

    expect(johns).toHaveLength(1);
    expect(johns[0].highlightPage).toBe(1); // first occurrence
  });

  it('builds sceneData with character-scene mapping', () => {
    const parsed = makeParsedFdx({
      paragraphs: [
        { type: 'Scene Heading', text: 'INT. OFFICE - DAY', page: 1 },
        { type: 'Character', text: 'JOHN', page: 1 },
        { type: 'Character', text: 'MARY', page: 1 },
        { type: 'Scene Heading', text: 'EXT. PARK - NIGHT', page: 3 },
        { type: 'Character', text: 'JOHN', page: 3 },
      ],
    });

    const { sceneData } = detectFdxElements(parsed);

    expect(sceneData).toHaveLength(2);
    expect(sceneData[0]).toEqual({
      sceneNumber: 1,
      location: 'INT. OFFICE - DAY',
      characters: ['JOHN', 'MARY'],
    });
    expect(sceneData[1]).toEqual({
      sceneNumber: 2,
      location: 'EXT. PARK - NIGHT',
      characters: ['JOHN'],
    });
  });

  it('handles untagged FDX (paragraph-only detection)', () => {
    const parsed = makeParsedFdx({
      paragraphs: [
        { type: 'Scene Heading', text: 'INT. OFFICE - DAY', page: 1 },
        { type: 'Character', text: 'JOHN', page: 1 },
        { type: 'Dialogue', text: 'Hello there.', page: 1 },
        { type: 'Action', text: 'John picks up the briefcase.', page: 1 },
      ],
      taggedElements: [],
    });

    const { elements } = detectFdxElements(parsed);

    expect(elements.some((e) => e.name === 'INT. OFFICE - DAY')).toBe(true);
    expect(elements.some((e) => e.name === 'JOHN')).toBe(true);
  });

  it('returns same interface as PDF detector', () => {
    const parsed = makeParsedFdx({
      paragraphs: [
        { type: 'Scene Heading', text: 'INT. OFFICE - DAY', page: 1 },
        { type: 'Character', text: 'JOHN', page: 1 },
      ],
    });

    const result = detectFdxElements(parsed);

    // Verify the interface shape matches DetectionResult
    expect(result).toHaveProperty('elements');
    expect(result).toHaveProperty('sceneData');
    expect(Array.isArray(result.elements)).toBe(true);
    expect(Array.isArray(result.sceneData)).toBe(true);

    // Each element has required fields
    for (const elem of result.elements) {
      expect(elem).toHaveProperty('name');
      expect(elem).toHaveProperty('type');
      expect(elem).toHaveProperty('highlightPage');
      expect(elem).toHaveProperty('highlightText');
      expect(elem).toHaveProperty('suggestedDepartment');
    }
  });

  it('strips parenthetical extensions from character names', () => {
    const parsed = makeParsedFdx({
      paragraphs: [
        { type: 'Character', text: 'JOHN (V.O.)', page: 1 },
        { type: 'Character', text: "MARY (CONT'D)", page: 2 },
      ],
    });

    const { elements } = detectFdxElements(parsed);
    const names = elements.map((e) => e.name);

    expect(names).toContain('JOHN');
    expect(names).toContain('MARY');
    expect(names).not.toContain('JOHN (V.O.)');
    expect(names).not.toContain("MARY (CONT'D)");
  });
});
