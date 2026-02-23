import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    script: {
      update: vi.fn(),
    },
    element: {
      createMany: vi.fn(),
    },
  },
}));

vi.mock('../lib/s3.js', () => ({
  getFileBuffer: vi.fn(),
}));

vi.mock('../services/pdf-parser.js', () => ({
  parsePdf: vi.fn(),
}));

import { prisma } from '../lib/prisma.js';
import { getFileBuffer } from '../lib/s3.js';
import { parsePdf } from '../services/pdf-parser.js';
import { processScript } from '../services/script-processor.js';

const mockedPrisma = vi.mocked(prisma);
const mockedGetFileBuffer = vi.mocked(getFileBuffer);
const mockedParsePdf = vi.mocked(parsePdf);

describe('Script Processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('full pipeline: fetch → parse → detect → save elements', async () => {
    const buffer = Buffer.from('fake pdf');
    mockedGetFileBuffer.mockResolvedValue(buffer);

    mockedParsePdf.mockResolvedValue({
      text: 'INT. OFFICE - DAY\n\nJOHN\nHello.\n\nMARY\nHi.',
      pageCount: 1,
    });

    mockedPrisma.element.createMany.mockResolvedValue({ count: 3 });
    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processScript('script-1', 'scripts/uuid/test.pdf');

    // Should have fetched file from S3
    expect(mockedGetFileBuffer).toHaveBeenCalledWith('scripts/uuid/test.pdf');

    // Should have parsed the PDF
    expect(mockedParsePdf).toHaveBeenCalledWith(buffer);

    // Should have saved elements
    expect(mockedPrisma.element.createMany).toHaveBeenCalled();
    const createCall = mockedPrisma.element.createMany.mock.calls[0][0] as any;
    const names = createCall.data.map((d: any) => d.name);
    expect(names).toContain('INT. OFFICE - DAY');
    expect(names).toContain('JOHN');
    expect(names).toContain('MARY');

    // Should have updated script status to READY
    expect(mockedPrisma.script.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'script-1' },
        data: expect.objectContaining({
          status: 'READY',
          pageCount: 1,
        }),
      }),
    );
  });

  it('updates script status to READY on success', async () => {
    mockedGetFileBuffer.mockResolvedValue(Buffer.from('fake pdf'));
    mockedParsePdf.mockResolvedValue({ text: 'Some text', pageCount: 5 });
    mockedPrisma.element.createMany.mockResolvedValue({ count: 0 });
    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processScript('script-1', 'scripts/uuid/test.pdf');

    expect(mockedPrisma.script.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'READY' }),
      }),
    );
  });

  it('updates script status to ERROR on failure', async () => {
    mockedGetFileBuffer.mockRejectedValue(new Error('S3 error'));
    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processScript('script-1', 'scripts/uuid/test.pdf');

    expect(mockedPrisma.script.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ERROR' }),
      }),
    );
  });

  it('stores page count on script', async () => {
    mockedGetFileBuffer.mockResolvedValue(Buffer.from('fake pdf'));
    mockedParsePdf.mockResolvedValue({ text: 'Content', pageCount: 42 });
    mockedPrisma.element.createMany.mockResolvedValue({ count: 0 });
    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processScript('script-1', 'scripts/uuid/test.pdf');

    expect(mockedPrisma.script.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pageCount: 42 }),
      }),
    );
  });
});
