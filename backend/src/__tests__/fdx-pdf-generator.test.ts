import { describe, it, expect } from 'vitest';
import { generateScreenplayPdf } from '../services/screenplay-pdf-generator';
import { parsePdf } from '../services/pdf-parser';
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

  it('adds page numbers on page 2+ (format: "2.")', async () => {
    // Generate enough content to force multiple pages
    const paragraphs: FdxParagraph[] = [];
    for (let i = 0; i < 60; i++) {
      paragraphs.push({
        type: 'Scene Heading',
        text: `INT. LOCATION ${i} - DAY`,
        page: 1,
      });
      paragraphs.push({
        type: 'Action',
        text: 'A long action paragraph that takes up space on the page to ensure we get multiple pages in the output.',
        page: 1,
      });
    }

    const buffer = await generateScreenplayPdf(paragraphs);
    const parsed = await parsePdf(buffer);

    // Should produce multiple pages
    expect(parsed.pageCount).toBeGreaterThan(1);
    // Page 2+ should contain page numbers like "2."
    const page2 = parsed.pages.find((p) => p.pageNumber === 2);
    expect(page2).toBeDefined();
    expect(page2!.text).toContain('2.');
  });

  it('generates valid PDF with long character name (no crash)', async () => {
    const paragraphs = makeParagraphs(
      ['Scene Heading', 'INT. OFFICE - DAY'],
      ['Character', 'EXTREMELY LONG CHARACTER NAME THAT MIGHT OVERFLOW'],
      ['Dialogue', 'Hello there.'],
    );

    const buffer = await generateScreenplayPdf(paragraphs);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
