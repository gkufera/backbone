import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../lib/prisma', () => ({
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

vi.mock('../lib/s3', () => ({
  getFileBuffer: vi.fn(),
  putFileBuffer: vi.fn(),
}));

vi.mock('../services/pdf-parser', () => ({
  parsePdf: vi.fn(),
}));

vi.mock('../services/fdx-parser', () => ({
  parseFdx: vi.fn(),
}));

vi.mock('../services/fdx-element-detector', () => ({
  detectFdxElements: vi.fn(),
  detectFdxPropsFromActions: vi.fn(),
}));

vi.mock('../services/screenplay-pdf-generator', () => ({
  generateScreenplayPdf: vi.fn(),
}));

vi.mock('../services/processing-progress', () => ({
  setProgress: vi.fn(),
  clearProgress: vi.fn(),
}));

import { prisma } from '../lib/prisma';
import { getFileBuffer, putFileBuffer } from '../lib/s3';
import { parsePdf } from '../services/pdf-parser';
import { parseFdx } from '../services/fdx-parser';
import { detectFdxElements, detectFdxPropsFromActions } from '../services/fdx-element-detector';
import { generateScreenplayPdf } from '../services/screenplay-pdf-generator';
import { processScript } from '../services/script-processor';
import { setProgress, clearProgress } from '../services/processing-progress';

const mockedPrisma = vi.mocked(prisma);
const mockedGetFileBuffer = vi.mocked(getFileBuffer);
const mockedPutFileBuffer = vi.mocked(putFileBuffer);
const mockedParsePdf = vi.mocked(parsePdf);
const mockedParseFdx = vi.mocked(parseFdx);
const mockedDetectFdxElements = vi.mocked(detectFdxElements);
const mockedDetectFdxPropsFromActions = vi.mocked(detectFdxPropsFromActions);
const mockedGenerateScreenplayPdf = vi.mocked(generateScreenplayPdf);

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
    // Default: no props from action text
    mockedDetectFdxPropsFromActions.mockReturnValue([]);
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

  it('does not throw when ERROR status update also fails', async () => {
    mockedGetFileBuffer.mockRejectedValue(new Error('S3 error'));
    mockedPrisma.script.update.mockRejectedValue(new Error('DB connection lost'));

    // Should not throw — the error should be caught internally
    await expect(processScript('script-1', 'scripts/uuid/test.pdf')).resolves.toBeUndefined();
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

  it('routes to FDX parser when s3Key ends with .fdx', async () => {
    const buffer = Buffer.from('<FinalDraft/>');
    mockedGetFileBuffer.mockResolvedValue(buffer);
    mockedParseFdx.mockReturnValue({
      paragraphs: [{ type: 'Scene Heading', text: 'INT. OFFICE - DAY', page: 1 }],
      taggedElements: [],
      pageCount: 5,
    });
    mockedDetectFdxElements.mockReturnValue({
      elements: [{ name: 'INT. OFFICE - DAY', type: 'LOCATION' as any, highlightPage: 1, highlightText: 'INT. OFFICE - DAY', suggestedDepartment: 'Locations' }],
      sceneData: [{ sceneNumber: 1, location: 'INT. OFFICE - DAY', characters: [] }],
    });
    mockedGenerateScreenplayPdf.mockResolvedValue(Buffer.from('%PDF-fake'));
    mockedPutFileBuffer.mockResolvedValue(undefined);
    mockedPrisma.element.createMany.mockResolvedValue({ count: 1 });
    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processScript('script-1', 'scripts/uuid/test.fdx');

    expect(mockedParseFdx).toHaveBeenCalledWith(buffer);
    expect(mockedParsePdf).not.toHaveBeenCalled();
  });

  it('routes to PDF parser when s3Key ends with .pdf', async () => {
    const buffer = Buffer.from('fake pdf');
    mockedGetFileBuffer.mockResolvedValue(buffer);
    mockedParsePdf.mockResolvedValue({
      text: 'INT. OFFICE - DAY',
      pageCount: 1,
      pages: [{ pageNumber: 1, text: 'INT. OFFICE - DAY' }],
    });
    mockedPrisma.element.createMany.mockResolvedValue({ count: 1 });
    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processScript('script-1', 'scripts/uuid/test.pdf');

    expect(mockedParsePdf).toHaveBeenCalledWith(buffer);
    expect(mockedParseFdx).not.toHaveBeenCalled();
  });

  it('generates PDF and uploads to S3 for FDX scripts', async () => {
    mockedGetFileBuffer.mockResolvedValue(Buffer.from('<FinalDraft/>'));
    mockedParseFdx.mockReturnValue({
      paragraphs: [{ type: 'Scene Heading', text: 'INT. OFFICE - DAY', page: 1 }],
      taggedElements: [],
      pageCount: 1,
    });
    mockedDetectFdxElements.mockReturnValue({
      elements: [],
      sceneData: [],
    });
    const pdfBuffer = Buffer.from('%PDF-generated');
    mockedGenerateScreenplayPdf.mockResolvedValue(pdfBuffer);
    mockedPutFileBuffer.mockResolvedValue(undefined);
    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processScript('script-1', 'scripts/uuid/test.fdx');

    expect(mockedGenerateScreenplayPdf).toHaveBeenCalled();
    expect(mockedPutFileBuffer).toHaveBeenCalledWith(
      expect.stringContaining('.pdf'),
      pdfBuffer,
      'application/pdf',
    );
  });

  it('updates script record with generated PDF s3Key and FDX metadata', async () => {
    mockedGetFileBuffer.mockResolvedValue(Buffer.from('<FinalDraft/>'));
    mockedParseFdx.mockReturnValue({
      paragraphs: [{ type: 'Scene Heading', text: 'INT. OFFICE - DAY', page: 1 }],
      taggedElements: [],
      pageCount: 3,
    });
    mockedDetectFdxElements.mockReturnValue({
      elements: [],
      sceneData: [],
    });
    mockedGenerateScreenplayPdf.mockResolvedValue(Buffer.from('%PDF-gen'));
    mockedPutFileBuffer.mockResolvedValue(undefined);
    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processScript('script-1', 'scripts/uuid/test.fdx');

    // Should update script with sourceS3Key (original FDX) and format
    expect(mockedPrisma.script.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceS3Key: 'scripts/uuid/test.fdx',
          format: 'FDX',
        }),
      }),
    );
  });

  it('PDF with extractElements=false skips element detection and saving', async () => {
    const buffer = Buffer.from('fake pdf');
    mockedGetFileBuffer.mockResolvedValue(buffer);
    mockedParsePdf.mockResolvedValue({
      text: 'INT. OFFICE - DAY\n\nJOHN\nHello.',
      pageCount: 5,
      pages: [{ pageNumber: 1, text: 'INT. OFFICE - DAY\n\nJOHN\nHello.' }],
    });
    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processScript('script-1', 'scripts/uuid/test.pdf', false);

    // Should NOT call element.createMany
    expect(mockedPrisma.element.createMany).not.toHaveBeenCalled();
    // But should still save pageCount
    expect(mockedPrisma.script.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pageCount: 5 }),
      }),
    );
  });

  it('FDX with extractElements=false still detects structured FDX elements', async () => {
    const buffer = Buffer.from('<FinalDraft/>');
    mockedGetFileBuffer.mockResolvedValue(buffer);
    mockedParseFdx.mockReturnValue({
      paragraphs: [
        { type: 'Scene Heading', text: 'INT. OFFICE - DAY', page: 1 },
        { type: 'Character', text: 'JOHN', page: 1 },
      ],
      taggedElements: [],
      pageCount: 3,
    });
    mockedDetectFdxElements.mockReturnValue({
      elements: [
        { name: 'INT. OFFICE - DAY', type: 'LOCATION' as any, highlightPage: 1, highlightText: 'INT. OFFICE - DAY', suggestedDepartment: 'Locations' },
        { name: 'JOHN', type: 'CHARACTER' as any, highlightPage: 1, highlightText: 'JOHN', suggestedDepartment: 'Cast' },
      ],
      sceneData: [{ sceneNumber: 1, location: 'INT. OFFICE - DAY', characters: ['JOHN'] }],
    });
    mockedGenerateScreenplayPdf.mockResolvedValue(Buffer.from('%PDF-'));
    mockedPutFileBuffer.mockResolvedValue(undefined);
    mockedPrisma.element.createMany.mockResolvedValue({ count: 2 });
    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processScript('script-1', 'scripts/uuid/test.fdx', false);

    // detectFdxElements should still be called
    expect(mockedDetectFdxElements).toHaveBeenCalled();
    // Elements should still be saved
    expect(mockedPrisma.element.createMany).toHaveBeenCalled();
  });

  it('PDF with extractElements=true detects elements (current behavior)', async () => {
    const buffer = Buffer.from('fake pdf');
    mockedGetFileBuffer.mockResolvedValue(buffer);
    mockedParsePdf.mockResolvedValue({
      text: 'INT. OFFICE - DAY\n\nJOHN\nHello.',
      pageCount: 1,
      pages: [{ pageNumber: 1, text: 'INT. OFFICE - DAY\n\nJOHN\nHello.' }],
    });
    mockedPrisma.element.createMany.mockResolvedValue({ count: 2 });
    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processScript('script-1', 'scripts/uuid/test.pdf', true);

    expect(mockedPrisma.element.createMany).toHaveBeenCalled();
  });

  it('shows "Parsing FDX" progress message for FDX files', async () => {
    mockedGetFileBuffer.mockResolvedValue(Buffer.from('<FinalDraft/>'));
    mockedParseFdx.mockReturnValue({
      paragraphs: [],
      taggedElements: [],
      pageCount: 1,
    });
    mockedDetectFdxElements.mockReturnValue({ elements: [], sceneData: [] });
    mockedGenerateScreenplayPdf.mockResolvedValue(Buffer.from('%PDF-'));
    mockedPutFileBuffer.mockResolvedValue(undefined);
    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processScript('script-1', 'scripts/uuid/test.fdx');

    expect(setProgress).toHaveBeenCalledWith('script-1', 30, 'Parsing FDX');
  });
});
