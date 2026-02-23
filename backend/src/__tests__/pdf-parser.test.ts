import { describe, it, expect, vi } from 'vitest';

// Mock pdf-parse with the v2 class-based API
vi.mock('pdf-parse', () => {
  const MockPDFParse = vi.fn();
  MockPDFParse.prototype.getText = vi.fn();
  MockPDFParse.prototype.destroy = vi.fn().mockResolvedValue(undefined);
  return { PDFParse: MockPDFParse };
});

import { PDFParse } from 'pdf-parse';
import { parsePdf } from '../services/pdf-parser.js';

const MockedPDFParse = vi.mocked(PDFParse);

describe('PDF Parser', () => {
  it('extracts text from buffer', async () => {
    const mockGetText = vi.fn().mockResolvedValue({
      text: 'INT. OFFICE - DAY\n\nJOHN\nHello world.',
      total: 5,
      pages: [],
    });
    MockedPDFParse.prototype.getText = mockGetText;

    const result = await parsePdf(Buffer.from('fake pdf'));

    expect(result.text).toContain('INT. OFFICE');
    expect(result.text).toContain('JOHN');
  });

  it('returns page count', async () => {
    const mockGetText = vi.fn().mockResolvedValue({
      text: 'Some text',
      total: 120,
      pages: [],
    });
    MockedPDFParse.prototype.getText = mockGetText;

    const result = await parsePdf(Buffer.from('fake pdf'));

    expect(result.pageCount).toBe(120);
  });

  it('handles errors gracefully', async () => {
    const mockGetText = vi.fn().mockRejectedValue(new Error('Corrupted PDF'));
    MockedPDFParse.prototype.getText = mockGetText;

    await expect(parsePdf(Buffer.from('bad data'))).rejects.toThrow('Corrupted PDF');
  });

  it('splits text into pages when available', async () => {
    const mockGetText = vi.fn().mockResolvedValue({
      text: 'Page 1 content\n\nPage 2 content',
      total: 2,
      pages: [
        { num: 1, text: 'Page 1 content' },
        { num: 2, text: 'Page 2 content' },
      ],
    });
    MockedPDFParse.prototype.getText = mockGetText;

    const result = await parsePdf(Buffer.from('fake pdf'));

    expect(result.pageCount).toBe(2);
    expect(result.text).toBeTruthy();
  });

  it('calls destroy after parsing', async () => {
    const mockDestroy = vi.fn().mockResolvedValue(undefined);
    MockedPDFParse.prototype.getText = vi.fn().mockResolvedValue({
      text: 'text',
      total: 1,
      pages: [],
    });
    MockedPDFParse.prototype.destroy = mockDestroy;

    await parsePdf(Buffer.from('fake pdf'));

    expect(mockDestroy).toHaveBeenCalled();
  });
});
