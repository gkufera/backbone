import { describe, it, expect } from 'vitest';
import { generateScreenplayPdf } from '../services/screenplay-pdf-generator';
import type { FdxParagraph } from '../services/fdx-parser';

function makeParagraphs(...items: Array<[string, string]>): FdxParagraph[] {
  return items.map(([type, text]) => ({ type, text, page: 1 }));
}

describe('Screenplay PDF Generator', () => {
  it('generates valid PDF buffer (starts with %PDF- magic bytes)', async () => {
    const paragraphs = makeParagraphs(
      ['Scene Heading', 'INT. OFFICE - DAY'],
      ['Action', 'The room is empty.'],
    );

    const buffer = await generateScreenplayPdf(paragraphs);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('uses Courier font (screenplay standard)', async () => {
    const paragraphs = makeParagraphs(['Action', 'Hello world.']);

    const buffer = await generateScreenplayPdf(paragraphs);
    const pdfText = buffer.toString('latin1');

    // PDFKit embeds font name references in the PDF
    expect(pdfText).toContain('Courier');
  });

  it('generates larger PDF for more content', async () => {
    const short = await generateScreenplayPdf(
      makeParagraphs(['Action', 'Short.']),
    );
    const long = await generateScreenplayPdf(
      makeParagraphs(
        ['Scene Heading', 'INT. LABORATORY - NIGHT'],
        ['Action', 'Dr. Smith enters the darkened laboratory. Beakers line the shelves.'],
        ['Character', 'DR. SMITH'],
        ['Dialogue', 'The experiment is ready.'],
        ['Action', 'She flips a switch. The room hums with electricity.'],
        ['Transition', 'CUT TO:'],
        ['Scene Heading', 'EXT. PARKING LOT - NIGHT'],
        ['Action', 'Rain pours down on the empty lot.'],
      ),
    );

    expect(long.length).toBeGreaterThan(short.length);
  });

  it('handles all paragraph types without error', async () => {
    const paragraphs = makeParagraphs(
      ['Scene Heading', 'INT. OFFICE - DAY'],
      ['Character', 'MARY'],
      ['Parenthetical', '(smiling)'],
      ['Dialogue', 'Good morning.'],
      ['Action', 'She sits down.'],
      ['Transition', 'CUT TO:'],
    );

    const buffer = await generateScreenplayPdf(paragraphs);

    expect(buffer.length).toBeGreaterThan(100);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('returns non-empty Buffer for empty input', async () => {
    const buffer = await generateScreenplayPdf([]);

    // Even empty PDF has valid header
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
