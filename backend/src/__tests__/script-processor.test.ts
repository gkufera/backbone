import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    script: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    element: {
      createMany: vi.fn(),
    },
    department: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../lib/s3.js', () => ({
  getFileBuffer: vi.fn(),
}));

vi.mock('../services/pdf-parser.js', () => ({
  parsePdf: vi.fn(),
}));

vi.mock('../services/processing-progress.js', () => ({
  setProgress: vi.fn(),
  clearProgress: vi.fn(),
}));

import { prisma } from '../lib/prisma.js';
import { getFileBuffer } from '../lib/s3.js';
import { parsePdf } from '../services/pdf-parser.js';
import { processScript } from '../services/script-processor.js';
import { setProgress, clearProgress } from '../services/processing-progress.js';

const mockedPrisma = vi.mocked(prisma);
const mockedGetFileBuffer = vi.mocked(getFileBuffer);
const mockedParsePdf = vi.mocked(parsePdf);

describe('Script Processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: script lookup returns a new script (no parent)
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      parentScriptId: null,
    } as any);
    // Default: no departments
    mockedPrisma.department.findMany.mockResolvedValue([]);
  });

  it('full pipeline: fetch → parse → detect → save elements', async () => {
    const buffer = Buffer.from('fake pdf');
    mockedGetFileBuffer.mockResolvedValue(buffer);

    mockedParsePdf.mockResolvedValue({
      text: 'INT. OFFICE - DAY\n\nJOHN\nHello.\n\nMARY\nHi.',
      pageCount: 1,
      pages: [{ pageNumber: 1, text: 'INT. OFFICE - DAY\n\nJOHN\nHello.\n\nMARY\nHi.' }],
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

    // Elements should have highlightPage/highlightText instead of pageNumbers
    const john = createCall.data.find((d: any) => d.name === 'JOHN');
    expect(john.highlightPage).toBe(1);
    expect(john.highlightText).toBe('JOHN');
  });

  it('sets script status to REVIEWING after processing new script', async () => {
    mockedGetFileBuffer.mockResolvedValue(Buffer.from('fake pdf'));
    mockedParsePdf.mockResolvedValue({
      text: 'INT. OFFICE - DAY\n\nJOHN\nHello.',
      pageCount: 1,
      pages: [{ pageNumber: 1, text: 'INT. OFFICE - DAY\n\nJOHN\nHello.' }],
    });
    mockedPrisma.element.createMany.mockResolvedValue({ count: 2 });
    mockedPrisma.script.update.mockResolvedValue({} as any);

    // New script - no parentScriptId
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      parentScriptId: null,
    } as any);

    await processScript('script-1', 'scripts/uuid/test.pdf');

    expect(mockedPrisma.script.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'REVIEWING' }),
      }),
    );
  });

  it('stores sceneData on script after processing', async () => {
    mockedGetFileBuffer.mockResolvedValue(Buffer.from('fake pdf'));
    mockedParsePdf.mockResolvedValue({
      text: 'INT. OFFICE - DAY\n\nJOHN\nHello.',
      pageCount: 1,
      pages: [{ pageNumber: 1, text: 'INT. OFFICE - DAY\n\nJOHN\nHello.' }],
    });
    mockedPrisma.element.createMany.mockResolvedValue({ count: 2 });
    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processScript('script-1', 'scripts/uuid/test.pdf');

    expect(mockedPrisma.script.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sceneData: expect.arrayContaining([
            expect.objectContaining({
              sceneNumber: 1,
              location: 'INT. OFFICE - DAY',
              characters: ['JOHN'],
            }),
          ]),
        }),
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
    mockedParsePdf.mockResolvedValue({
      text: 'Content',
      pageCount: 42,
      pages: [{ pageNumber: 1, text: 'Content' }],
    });
    mockedPrisma.element.createMany.mockResolvedValue({ count: 0 });
    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processScript('script-1', 'scripts/uuid/test.pdf');

    expect(mockedPrisma.script.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pageCount: 42 }),
      }),
    );
  });

  it('assigns department IDs when production has matching departments', async () => {
    mockedGetFileBuffer.mockResolvedValue(Buffer.from('fake pdf'));
    mockedParsePdf.mockResolvedValue({
      text: 'INT. OFFICE - DAY\n\nJOHN\nHello.',
      pageCount: 1,
      pages: [{ pageNumber: 1, text: 'INT. OFFICE - DAY\n\nJOHN\nHello.' }],
    });

    mockedPrisma.department.findMany.mockResolvedValue([
      { id: 'dept-cast', name: 'Cast' },
      { id: 'dept-loc', name: 'Locations' },
    ] as any);

    mockedPrisma.element.createMany.mockResolvedValue({ count: 2 });
    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processScript('script-1', 'scripts/uuid/test.pdf');

    const createCall = mockedPrisma.element.createMany.mock.calls[0][0] as any;
    const john = createCall.data.find((d: any) => d.name === 'JOHN');
    const office = createCall.data.find((d: any) => d.name === 'INT. OFFICE - DAY');

    expect(john.departmentId).toBe('dept-cast');
    expect(office.departmentId).toBe('dept-loc');
  });

  it('calls setProgress at each step and clearProgress at end', async () => {
    mockedGetFileBuffer.mockResolvedValue(Buffer.from('fake pdf'));
    mockedParsePdf.mockResolvedValue({
      text: 'Some text',
      pageCount: 1,
      pages: [{ pageNumber: 1, text: 'Some text' }],
    });
    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processScript('script-1', 'scripts/uuid/test.pdf');

    expect(setProgress).toHaveBeenCalledWith('script-1', 10, 'Fetching PDF');
    expect(setProgress).toHaveBeenCalledWith('script-1', 30, 'Parsing PDF');
    expect(setProgress).toHaveBeenCalledWith('script-1', 60, 'Detecting elements');
    expect(setProgress).toHaveBeenCalledWith('script-1', 80, 'Saving elements');
    expect(setProgress).toHaveBeenCalledWith('script-1', 100, 'Complete');
    expect(clearProgress).toHaveBeenCalledWith('script-1');
  });
});
