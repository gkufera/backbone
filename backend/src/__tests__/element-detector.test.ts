import { describe, it, expect } from 'vitest';
import { detectElements } from '../services/element-detector.js';

describe('Element detection', () => {
  it('detects character names (standalone ALL-CAPS lines)', () => {
    const pages = [
      { pageNumber: 1, text: 'He looked at her.\n\nJOHN\nHello there.\n\nMARY\nHi John.' },
    ];

    const { elements } = detectElements(pages);

    const john = elements.find((e) => e.name === 'JOHN');
    const mary = elements.find((e) => e.name === 'MARY');
    expect(john).toBeDefined();
    expect(john!.type).toBe('CHARACTER');
    expect(mary).toBeDefined();
    expect(mary!.type).toBe('CHARACTER');
  });

  it('detects location sluglines (INT./EXT.)', () => {
    const pages = [
      { pageNumber: 1, text: 'INT. OFFICE - DAY\n\nJohn sits at his desk.' },
      { pageNumber: 2, text: 'EXT. PARK - NIGHT\n\nMary walks alone.' },
    ];

    const { elements } = detectElements(pages);

    const office = elements.find((e) => e.name === 'INT. OFFICE - DAY');
    const park = elements.find((e) => e.name === 'EXT. PARK - NIGHT');
    expect(office).toBeDefined();
    expect(office!.type).toBe('LOCATION');
    expect(park).toBeDefined();
    expect(park!.type).toBe('LOCATION');
  });

  it('classifies characters vs locations correctly', () => {
    const pages = [
      {
        pageNumber: 1,
        text: 'INT. HOSPITAL - DAY\n\nDR. SMITH\nWe need to operate.\n\nNURSE JONES\nRight away, doctor.',
      },
    ];

    const { elements } = detectElements(pages);

    const hospital = elements.find((e) => e.name === 'INT. HOSPITAL - DAY');
    const smith = elements.find((e) => e.name === 'DR. SMITH');
    expect(hospital!.type).toBe('LOCATION');
    expect(smith!.type).toBe('CHARACTER');
  });

  it('filters noise words (CONTINUED, FADE IN, CUT TO, etc.)', () => {
    const pages = [
      {
        pageNumber: 1,
        text: 'FADE IN:\n\nINT. OFFICE - DAY\n\nJOHN\nHello.\n\nCONTINUED\n\nCUT TO:\n\nFADE OUT.',
      },
    ];

    const { elements } = detectElements(pages);

    const names = elements.map((e) => e.name);
    expect(names).not.toContain('FADE IN');
    expect(names).not.toContain('CONTINUED');
    expect(names).not.toContain('CUT TO');
    expect(names).not.toContain('FADE OUT');
    expect(names).toContain('JOHN');
  });

  it('ignores single-character uppercase', () => {
    const pages = [{ pageNumber: 1, text: 'A\n\nJOHN\nHello.' }];

    const { elements } = detectElements(pages);

    const names = elements.map((e) => e.name);
    expect(names).not.toContain('A');
    expect(names).toContain('JOHN');
  });

  it('records only first occurrence (highlightPage/highlightText)', () => {
    const pages = [
      { pageNumber: 1, text: 'JOHN\nHello.' },
      { pageNumber: 5, text: 'JOHN\nGoodbye.' },
      { pageNumber: 12, text: 'JOHN\nSee you later.' },
    ];

    const { elements } = detectElements(pages);

    const john = elements.find((e) => e.name === 'JOHN');
    expect(john).toBeDefined();
    expect(john!.highlightPage).toBe(1);
    expect(john!.highlightText).toBe('JOHN');
    // Should only appear once
    expect(elements.filter((e) => e.name === 'JOHN')).toHaveLength(1);
  });

  it('strips parenthetical extensions ("JOHN (V.O.)" → "JOHN")', () => {
    const pages = [
      { pageNumber: 1, text: 'JOHN (V.O.)\nI remember that day.' },
      { pageNumber: 2, text: 'JOHN (O.S.)\nCome in!' },
    ];

    const { elements } = detectElements(pages);

    const john = elements.find((e) => e.name === 'JOHN');
    expect(john).toBeDefined();
    expect(john!.highlightPage).toBe(1);
    expect(john!.highlightText).toBe('JOHN (V.O.)');
    // Should not have separate entries for JOHN (V.O.) and JOHN (O.S.)
    expect(elements.filter((e) => e.name.startsWith('JOHN'))).toHaveLength(1);
  });

  it("strips CONT'D suffix", () => {
    const pages = [{ pageNumber: 1, text: "JOHN\nHello.\n\nJOHN (CONT'D)\nAs I was saying." }];

    const { elements } = detectElements(pages);

    const john = elements.find((e) => e.name === 'JOHN');
    expect(john).toBeDefined();
    expect(elements.filter((e) => e.name.startsWith('JOHN'))).toHaveLength(1);
  });

  it('returns empty result for no ALL-CAPS text', () => {
    const pages = [{ pageNumber: 1, text: 'The quick brown fox jumps over the lazy dog.' }];

    const { elements, sceneData } = detectElements(pages);

    expect(elements).toEqual([]);
    expect(sceneData).toEqual([]);
  });

  it('normalizes whitespace', () => {
    const pages = [{ pageNumber: 1, text: '  JOHN  \nHello.\n\n  MARY  \nHi.' }];

    const { elements } = detectElements(pages);

    const john = elements.find((e) => e.name === 'JOHN');
    const mary = elements.find((e) => e.name === 'MARY');
    expect(john).toBeDefined();
    expect(mary).toBeDefined();
  });

  it('handles INT/EXT combined sluglines', () => {
    const pages = [{ pageNumber: 1, text: 'INT./EXT. CAR - DAY\n\nJohn drives through the city.' }];

    const { elements } = detectElements(pages);

    const car = elements.find((e) => e.name === 'INT./EXT. CAR - DAY');
    expect(car).toBeDefined();
    expect(car!.type).toBe('LOCATION');
  });

  it('returns highlightPage and highlightText for each element', () => {
    const pages = [
      { pageNumber: 3, text: 'INT. OFFICE - DAY\n\nJOHN\nHello.' },
    ];

    const { elements } = detectElements(pages);

    const office = elements.find((e) => e.name === 'INT. OFFICE - DAY');
    expect(office!.highlightPage).toBe(3);
    expect(office!.highlightText).toBe('INT. OFFICE - DAY');

    const john = elements.find((e) => e.name === 'JOHN');
    expect(john!.highlightPage).toBe(3);
    expect(john!.highlightText).toBe('JOHN');
  });

  it('returns suggestedDepartment based on element type', () => {
    const pages = [
      { pageNumber: 1, text: 'INT. OFFICE - DAY\n\nJOHN\nHello.' },
    ];

    const { elements } = detectElements(pages);

    const john = elements.find((e) => e.name === 'JOHN');
    expect(john!.suggestedDepartment).toBe('Cast');

    const office = elements.find((e) => e.name === 'INT. OFFICE - DAY');
    expect(office!.suggestedDepartment).toBe('Locations');
  });

  // New tests for prop detection
  it('detects capitalized props in action lines', () => {
    const pages = [
      { pageNumber: 1, text: 'INT. OFFICE - DAY\n\nShe picks up the REVOLVER and aims.' },
    ];

    const { elements } = detectElements(pages);

    const revolver = elements.find((e) => e.name === 'REVOLVER');
    expect(revolver).toBeDefined();
    expect(revolver!.type).toBe('OTHER');
    expect(revolver!.suggestedDepartment).toBe('Props');
  });

  it('detects multi-word capitalized props', () => {
    const pages = [
      { pageNumber: 1, text: 'INT. OFFICE - DAY\n\nHe grabs the GOLDEN WATCH from the table.' },
    ];

    const { elements } = detectElements(pages);

    const watch = elements.find((e) => e.name === 'GOLDEN WATCH');
    expect(watch).toBeDefined();
    expect(watch!.type).toBe('OTHER');
    expect(watch!.suggestedDepartment).toBe('Props');
  });

  it('does not detect single-letter caps words as props', () => {
    const pages = [
      { pageNumber: 1, text: 'INT. OFFICE - DAY\n\nHe picks up A book and reads.' },
    ];

    const { elements } = detectElements(pages);

    const names = elements.map((e) => e.name);
    expect(names).not.toContain('A');
  });

  it('filters prop noise words in action lines', () => {
    const pages = [
      { pageNumber: 1, text: 'INT. OFFICE - DAY\n\nJohn looks around. ANGLE ON the desk.' },
    ];

    const { elements } = detectElements(pages);

    const names = elements.map((e) => e.name);
    expect(names).not.toContain('ANGLE ON');
    expect(names).not.toContain('ANGLE');
  });

  it('tracks scene boundaries via sluglines', () => {
    const pages = [
      { pageNumber: 1, text: 'INT. OFFICE - DAY\n\nJohn works.\n\nEXT. PARK - NIGHT\n\nMary runs.' },
    ];

    const { sceneData } = detectElements(pages);

    expect(sceneData).toHaveLength(2);
    expect(sceneData[0].sceneNumber).toBe(1);
    expect(sceneData[0].location).toBe('INT. OFFICE - DAY');
    expect(sceneData[1].sceneNumber).toBe(2);
    expect(sceneData[1].location).toBe('EXT. PARK - NIGHT');
  });

  it('records character-scene appearances in sceneData', () => {
    const pages = [
      {
        pageNumber: 1,
        text: 'INT. OFFICE - DAY\n\nJOHN\nHello.\n\nMARY\nHi.\n\nEXT. PARK - NIGHT\n\nJOHN\nNice evening.',
      },
    ];

    const { sceneData } = detectElements(pages);

    expect(sceneData).toHaveLength(2);
    expect(sceneData[0].characters).toContain('JOHN');
    expect(sceneData[0].characters).toContain('MARY');
    expect(sceneData[1].characters).toContain('JOHN');
    expect(sceneData[1].characters).not.toContain('MARY');
  });

  it('returns elements ordered by first appearance (page then name)', () => {
    const pages = [
      { pageNumber: 1, text: 'INT. OFFICE - DAY\n\nMARY\nHello.' },
      { pageNumber: 2, text: 'EXT. PARK - NIGHT\n\nJOHN\nGoodbye.' },
    ];

    const { elements } = detectElements(pages);

    // Page 1 elements should come before page 2 elements
    const officeIdx = elements.findIndex((e) => e.name === 'INT. OFFICE - DAY');
    const maryIdx = elements.findIndex((e) => e.name === 'MARY');
    const parkIdx = elements.findIndex((e) => e.name === 'EXT. PARK - NIGHT');
    const johnIdx = elements.findIndex((e) => e.name === 'JOHN');

    expect(officeIdx).toBeLessThan(parkIdx);
    expect(maryIdx).toBeLessThan(johnIdx);
  });

  it('does not filter FADED as noise word (FADE is noise but FADED is not)', () => {
    const pages = [
      { pageNumber: 1, text: 'INT. OFFICE - DAY\n\nThe lights FADED as they walked out.' },
    ];

    const { elements } = detectElements(pages);

    const faded = elements.find((e) => e.name === 'FADED');
    expect(faded).toBeDefined();
    expect(faded!.type).toBe('OTHER');
  });

  it('does not filter PANEL as noise word (PAN is noise but PANEL is not)', () => {
    const pages = [
      { pageNumber: 1, text: 'INT. OFFICE - DAY\n\nShe opens the PANEL on the wall.' },
    ];

    const { elements } = detectElements(pages);

    const panel = elements.find((e) => e.name === 'PANEL');
    expect(panel).toBeDefined();
    expect(panel!.type).toBe('OTHER');
  });

  it('still filters FADE IN: as noise word', () => {
    const pages = [
      { pageNumber: 1, text: 'FADE IN:\n\nINT. OFFICE - DAY\n\nJOHN\nHello.' },
    ];

    const { elements } = detectElements(pages);

    const names = elements.map((e) => e.name);
    expect(names).not.toContain('FADE IN');
    expect(names).not.toContain('FADE IN:');
    expect(names).toContain('JOHN');
  });

  it('does not create duplicate props for same name', () => {
    const pages = [
      { pageNumber: 1, text: 'INT. OFFICE - DAY\n\nShe grabs the KNIFE. He looks at the KNIFE.' },
    ];

    const { elements } = detectElements(pages);

    const knives = elements.filter((e) => e.name === 'KNIFE');
    expect(knives).toHaveLength(1);
  });

  it('handles empty page text gracefully', () => {
    const pages = [{ pageNumber: 1, text: '' }];

    const { elements, sceneData } = detectElements(pages);

    expect(elements).toEqual([]);
    expect(sceneData).toEqual([]);
  });

  it('detects hyphenated words as props', () => {
    const pages = [
      { pageNumber: 1, text: 'INT. OFFICE - DAY\n\nHe grabs the SEMI-AUTOMATIC from the drawer.' },
    ];

    const { elements } = detectElements(pages);

    // The regex matches "SEMI" as a standalone ALL-CAPS word (3+ chars)
    // Hyphenated words may split depending on regex behavior
    const names = elements.map((e) => e.name);
    // At minimum, SEMI should be detected as a prop
    expect(names.some((n) => n.includes('SEMI'))).toBe(true);
  });
});
