import { describe, it, expect } from 'vitest';
import { detectElements } from '../services/element-detector.js';

describe('Element detection', () => {
  it('detects character names (standalone ALL-CAPS lines)', () => {
    const pages = [
      { pageNumber: 1, text: 'He looked at her.\n\nJOHN\nHello there.\n\nMARY\nHi John.' },
    ];

    const elements = detectElements(pages);

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

    const elements = detectElements(pages);

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

    const elements = detectElements(pages);

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

    const elements = detectElements(pages);

    const names = elements.map((e) => e.name);
    expect(names).not.toContain('FADE IN');
    expect(names).not.toContain('CONTINUED');
    expect(names).not.toContain('CUT TO');
    expect(names).not.toContain('FADE OUT');
    expect(names).toContain('JOHN');
  });

  it('ignores single-character uppercase', () => {
    const pages = [{ pageNumber: 1, text: 'A\n\nJOHN\nHello.' }];

    const elements = detectElements(pages);

    const names = elements.map((e) => e.name);
    expect(names).not.toContain('A');
    expect(names).toContain('JOHN');
  });

  it('deduplicates across pages and tracks all page numbers', () => {
    const pages = [
      { pageNumber: 1, text: 'JOHN\nHello.' },
      { pageNumber: 5, text: 'JOHN\nGoodbye.' },
      { pageNumber: 12, text: 'JOHN\nSee you later.' },
    ];

    const elements = detectElements(pages);

    const john = elements.find((e) => e.name === 'JOHN');
    expect(john).toBeDefined();
    expect(john!.pageNumbers).toEqual([1, 5, 12]);
    // Should only appear once
    expect(elements.filter((e) => e.name === 'JOHN')).toHaveLength(1);
  });

  it('strips parenthetical extensions ("JOHN (V.O.)" → "JOHN")', () => {
    const pages = [
      { pageNumber: 1, text: 'JOHN (V.O.)\nI remember that day.' },
      { pageNumber: 2, text: 'JOHN (O.S.)\nCome in!' },
    ];

    const elements = detectElements(pages);

    const john = elements.find((e) => e.name === 'JOHN');
    expect(john).toBeDefined();
    expect(john!.pageNumbers).toEqual([1, 2]);
    // Should not have separate entries for JOHN (V.O.) and JOHN (O.S.)
    expect(elements.filter((e) => e.name.startsWith('JOHN'))).toHaveLength(1);
  });

  it("strips CONT'D suffix", () => {
    const pages = [{ pageNumber: 1, text: "JOHN\nHello.\n\nJOHN (CONT'D)\nAs I was saying." }];

    const elements = detectElements(pages);

    const john = elements.find((e) => e.name === 'JOHN');
    expect(john).toBeDefined();
    expect(elements.filter((e) => e.name.startsWith('JOHN'))).toHaveLength(1);
  });

  it('returns empty array for no ALL-CAPS text', () => {
    const pages = [{ pageNumber: 1, text: 'The quick brown fox jumps over the lazy dog.' }];

    const elements = detectElements(pages);

    expect(elements).toEqual([]);
  });

  it('normalizes whitespace', () => {
    const pages = [{ pageNumber: 1, text: '  JOHN  \nHello.\n\n  MARY  \nHi.' }];

    const elements = detectElements(pages);

    const john = elements.find((e) => e.name === 'JOHN');
    const mary = elements.find((e) => e.name === 'MARY');
    expect(john).toBeDefined();
    expect(mary).toBeDefined();
  });

  it('handles INT/EXT combined sluglines', () => {
    const pages = [{ pageNumber: 1, text: 'INT./EXT. CAR - DAY\n\nJohn drives through the city.' }];

    const elements = detectElements(pages);

    const car = elements.find((e) => e.name === 'INT./EXT. CAR - DAY');
    expect(car).toBeDefined();
    expect(car!.type).toBe('LOCATION');
  });
});
