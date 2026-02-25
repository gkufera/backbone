import { describe, it, expect, vi } from 'vitest';

// Mock pdf-parse with the v2 class-based API
vi.mock('pdf-parse', () => {
  const MockPDFParse = vi.fn();
  MockPDFParse.prototype.getText = vi.fn();
  MockPDFParse.prototype.destroy = vi.fn().mockResolvedValue(undefined);
  return { PDFParse: MockPDFParse };
});

import { PDFParse } from 'pdf-parse';
import { parsePdf } from '../services/pdf-parser';

const MockedPDFParse = vi.mocked(PDFParse);

describe('PDF Parser', () => {
  it('extracts text from buffer', async () => {
    const mockGetText = vi.fn().mockResolvedValue({
      text: 'INT. OFFICE - DAY\n\nJOHN\nHello world.',
      total: 5,
      pages: [],
    });
    MockedPDFParse.prototype.getText = mockGetText;

    const result = await parsePdf(Buffer.from('%PDF-1.4 fake pdf content'));

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

    const result = await parsePdf(Buffer.from('%PDF-1.4 fake pdf content'));

    expect(result.pageCount).toBe(120);
  });

  it('handles errors gracefully', async () => {
    const mockGetText = vi.fn().mockRejectedValue(new Error('Corrupted PDF'));
    MockedPDFParse.prototype.getText = mockGetText;

    await expect(parsePdf(Buffer.from('%PDF-1.4 bad data'))).rejects.toThrow('Corrupted PDF');
  });

  it('returns per-page text when pages data is available', async () => {
    const mockGetText = vi.fn().mockResolvedValue({
      text: 'Page 1 content\n\nPage 2 content',
      total: 2,
      pages: [
        { num: 1, text: 'Page 1 content' },
        { num: 2, text: 'Page 2 content' },
      ],
    });
    MockedPDFParse.prototype.getText = mockGetText;

    const result = await parsePdf(Buffer.from('%PDF-1.4 fake pdf content'));

    expect(result.pageCount).toBe(2);
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0]).toEqual({ pageNumber: 1, text: 'Page 1 content' });
    expect(result.pages[1]).toEqual({ pageNumber: 2, text: 'Page 2 content' });
  });

  it('falls back to single page when pages array is empty', async () => {
    const mockGetText = vi.fn().mockResolvedValue({
      text: 'All text content',
      total: 3,
      pages: [],
    });
    MockedPDFParse.prototype.getText = mockGetText;

    const result = await parsePdf(Buffer.from('%PDF-1.4 fake pdf content'));

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]).toEqual({ pageNumber: 1, text: 'All text content' });
  });

  it('rejects non-PDF buffer (S11: magic byte validation)', async () => {
    // PNG file header
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    await expect(parsePdf(pngBuffer)).rejects.toThrow(/Invalid PDF.*magic bytes/);
  });

  it('rejects empty buffer (S11: magic byte validation)', async () => {
    await expect(parsePdf(Buffer.alloc(0))).rejects.toThrow(/Invalid PDF.*magic bytes/);
  });

  it('calls destroy after parsing', async () => {
    const mockDestroy = vi.fn().mockResolvedValue(undefined);
    MockedPDFParse.prototype.getText = vi.fn().mockResolvedValue({
      text: 'text',
      total: 1,
      pages: [],
    });
    MockedPDFParse.prototype.destroy = mockDestroy;

    await parsePdf(Buffer.from('%PDF-1.4 fake pdf content'));

    expect(mockDestroy).toHaveBeenCalled();
  });
});
