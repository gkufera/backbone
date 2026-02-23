import { describe, it, expect, vi } from 'vitest';

// Mock pdf-parse
vi.mock('pdf-parse', () => ({
  default: vi.fn(),
}));

import pdfParse from 'pdf-parse';
import { parsePdf } from '../services/pdf-parser.js';

const mockedPdfParse = vi.mocked(pdfParse);

describe('PDF Parser', () => {
  it('extracts text from buffer', async () => {
    mockedPdfParse.mockResolvedValue({
      text: 'INT. OFFICE - DAY\n\nJOHN\nHello world.',
      numpages: 5,
      numrender: 5,
      info: {},
      metadata: null,
      version: '1.0',
    } as any);

    const result = await parsePdf(Buffer.from('fake pdf'));

    expect(result.text).toContain('INT. OFFICE');
    expect(result.text).toContain('JOHN');
  });

  it('returns page count', async () => {
    mockedPdfParse.mockResolvedValue({
      text: 'Some text',
      numpages: 120,
      numrender: 120,
      info: {},
      metadata: null,
      version: '1.0',
    } as any);

    const result = await parsePdf(Buffer.from('fake pdf'));

    expect(result.pageCount).toBe(120);
  });

  it('handles errors gracefully', async () => {
    mockedPdfParse.mockRejectedValue(new Error('Corrupted PDF'));

    await expect(parsePdf(Buffer.from('bad data'))).rejects.toThrow('Corrupted PDF');
  });

  it('splits text into pages when available', async () => {
    mockedPdfParse.mockResolvedValue({
      text: 'Page 1 content\n\nPage 2 content',
      numpages: 2,
      numrender: 2,
      info: {},
      metadata: null,
      version: '1.0',
    } as any);

    const result = await parsePdf(Buffer.from('fake pdf'));

    expect(result.pageCount).toBe(2);
    expect(result.text).toBeTruthy();
  });
});
