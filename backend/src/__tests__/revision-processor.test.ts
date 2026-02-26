import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../lib/prisma', () => ({
  prisma: {
    script: {
      update: vi.fn(),
    },
    element: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
    revisionMatch: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
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
import { detectFdxElements } from '../services/fdx-element-detector';
import { generateScreenplayPdf } from '../services/screenplay-pdf-generator';
import { processRevision } from '../services/revision-processor';

const mockedPrisma = vi.mocked(prisma);
const mockedGetFileBuffer = vi.mocked(getFileBuffer);
const mockedPutFileBuffer = vi.mocked(putFileBuffer);
const mockedParsePdf = vi.mocked(parsePdf);
const mockedParseFdx = vi.mocked(parseFdx);
const mockedDetectFdxElements = vi.mocked(detectFdxElements);
const mockedGenerateScreenplayPdf = vi.mocked(generateScreenplayPdf);

describe('Revision Processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: element.update resolves
    mockedPrisma.element.update.mockResolvedValue({} as any);
    mockedPrisma.element.createMany.mockResolvedValue({ count: 0 });
    mockedPrisma.revisionMatch.createMany.mockResolvedValue({ count: 0 });
    // $transaction passes through to the same mocked prisma client
    mockedPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockedPrisma));
  });

  it('all exact matches → elements migrated, script READY', async () => {
    mockedGetFileBuffer.mockResolvedValue(Buffer.from('fake pdf'));
    mockedParsePdf.mockResolvedValue({
      text: 'INT. OFFICE - DAY\n\nJOHN\nHello.',
      pageCount: 1,
      pages: [{ pageNumber: 1, text: 'INT. OFFICE - DAY\n\nJOHN\nHello.' }],
    });

    // Existing elements from parent script
    mockedPrisma.element.findMany.mockResolvedValue([
      {
        id: 'elem-1',
        name: 'JOHN',
        type: 'CHARACTER',
        status: 'ACTIVE',
        source: 'AUTO',
        highlightPage: 1,
        highlightText: 'JOHN',
        scriptId: 'parent-script',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'elem-2',
        name: 'INT. OFFICE - DAY',
        type: 'LOCATION',
        status: 'ACTIVE',
        source: 'AUTO',
        highlightPage: 1,
        highlightText: 'INT. OFFICE - DAY',
        scriptId: 'parent-script',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processRevision('new-script', 'parent-script', 'scripts/uuid/v2.pdf');

    // Elements should be migrated (updated scriptId + highlight data)
    expect(mockedPrisma.element.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'elem-1' },
        data: expect.objectContaining({ scriptId: 'new-script' }),
      }),
    );
    expect(mockedPrisma.element.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'elem-2' },
        data: expect.objectContaining({ scriptId: 'new-script' }),
      }),
    );

    // Script should be set to READY (no fuzzy/missing)
    expect(mockedPrisma.script.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'new-script' },
        data: expect.objectContaining({ status: 'READY' }),
      }),
    );

    // No revision matches should be created
    expect(mockedPrisma.revisionMatch.createMany).not.toHaveBeenCalled();
  });

  it('fuzzy matches present → RevisionMatch records created, script RECONCILING', async () => {
    mockedGetFileBuffer.mockResolvedValue(Buffer.from('fake pdf'));
    mockedParsePdf.mockResolvedValue({
      text: 'JOHN SMITHE\nHello.',
      pageCount: 1,
      pages: [{ pageNumber: 1, text: 'JOHN SMITHE\nHello.' }],
    });

    mockedPrisma.element.findMany.mockResolvedValue([
      {
        id: 'elem-1',
        name: 'JOHN SMITH',
        type: 'CHARACTER',
        status: 'ACTIVE',
        source: 'AUTO',
        highlightPage: 1,
        highlightText: 'JOHN SMITH',
        scriptId: 'parent-script',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processRevision('new-script', 'parent-script', 'scripts/uuid/v2.pdf');

    // RevisionMatch should be created for fuzzy match
    expect(mockedPrisma.revisionMatch.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            newScriptId: 'new-script',
            matchStatus: 'FUZZY',
            detectedName: 'JOHN SMITHE',
            oldElementId: 'elem-1',
          }),
        ]),
      }),
    );

    // Script should be RECONCILING
    expect(mockedPrisma.script.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'new-script' },
        data: expect.objectContaining({ status: 'RECONCILING' }),
      }),
    );
  });

  it('all new (no parent elements) → new elements created, script READY', async () => {
    mockedGetFileBuffer.mockResolvedValue(Buffer.from('fake pdf'));
    mockedParsePdf.mockResolvedValue({
      text: 'XAVIER\nHello.\n\nZOEY\nHi.',
      pageCount: 1,
      pages: [{ pageNumber: 1, text: 'XAVIER\nHello.\n\nZOEY\nHi.' }],
    });

    // No existing elements
    mockedPrisma.element.findMany.mockResolvedValue([]);
    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processRevision('new-script', 'parent-script', 'scripts/uuid/v2.pdf');

    // New elements should be created
    expect(mockedPrisma.element.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            scriptId: 'new-script',
            name: 'XAVIER',
          }),
          expect.objectContaining({
            scriptId: 'new-script',
            name: 'ZOEY',
          }),
        ]),
      }),
    );

    // Script should be READY
    expect(mockedPrisma.script.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'new-script' },
        data: expect.objectContaining({ status: 'READY' }),
      }),
    );
  });

  it('error during S3 fetch → script ERROR', async () => {
    mockedGetFileBuffer.mockRejectedValue(new Error('S3 error'));
    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processRevision('new-script', 'parent-script', 'scripts/uuid/v2.pdf');

    expect(mockedPrisma.script.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'new-script' },
        data: expect.objectContaining({ status: 'ERROR' }),
      }),
    );
  });

  it('mixed scenario: correct counts in each bucket', async () => {
    mockedGetFileBuffer.mockResolvedValue(Buffer.from('fake pdf'));
    mockedParsePdf.mockResolvedValue({
      text: 'JOHN\nHello.\n\nJOHN SMITHE\nHi.\n\nXAVIER\nHey.',
      pageCount: 1,
      pages: [{ pageNumber: 1, text: 'JOHN\nHello.\n\nJOHN SMITHE\nHi.\n\nXAVIER\nHey.' }],
    });

    mockedPrisma.element.findMany.mockResolvedValue([
      {
        id: 'elem-1',
        name: 'JOHN',
        type: 'CHARACTER',
        status: 'ACTIVE',
        source: 'AUTO',
        highlightPage: 1,
        highlightText: 'JOHN',
        scriptId: 'parent-script',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'elem-2',
        name: 'JOHN SMITH',
        type: 'CHARACTER',
        status: 'ACTIVE',
        source: 'AUTO',
        highlightPage: 1,
        highlightText: 'JOHN SMITH',
        scriptId: 'parent-script',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'elem-3',
        name: 'BOB',
        type: 'CHARACTER',
        status: 'ACTIVE',
        source: 'AUTO',
        highlightPage: 1,
        highlightText: 'BOB',
        scriptId: 'parent-script',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processRevision('new-script', 'parent-script', 'scripts/uuid/v2.pdf');

    // JOHN = exact match → element migrated
    expect(mockedPrisma.element.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'elem-1' } }),
    );

    // Has fuzzy + missing → RECONCILING
    expect(mockedPrisma.script.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'new-script' },
        data: expect.objectContaining({ status: 'RECONCILING' }),
      }),
    );

    // RevisionMatch records for fuzzy (JOHN SMITHE), new (XAVIER), and missing (BOB)
    expect(mockedPrisma.revisionMatch.createMany).toHaveBeenCalled();
  });

  it('uses transaction for auto-resolution of exact matches and new elements', async () => {
    mockedGetFileBuffer.mockResolvedValue(Buffer.from('fake pdf'));
    mockedParsePdf.mockResolvedValue({
      text: 'JOHN\nHello.\n\nXAVIER\nHey.',
      pageCount: 1,
      pages: [{ pageNumber: 1, text: 'JOHN\nHello.\n\nXAVIER\nHey.' }],
    });

    // Existing element for exact match
    mockedPrisma.element.findMany.mockResolvedValue([
      {
        id: 'elem-1',
        name: 'JOHN',
        type: 'CHARACTER',
        status: 'ACTIVE',
        source: 'AUTO',
        highlightPage: 1,
        highlightText: 'JOHN',
        scriptId: 'parent-script',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    mockedPrisma.script.update.mockResolvedValue({} as any);
    // Mock $transaction to execute the callback with the prisma client
    mockedPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockedPrisma));

    await processRevision('new-script', 'parent-script', 'scripts/uuid/v2.pdf');

    // $transaction should have been called
    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
  });

  it('MANUAL elements included in matching', async () => {
    mockedGetFileBuffer.mockResolvedValue(Buffer.from('fake pdf'));
    mockedParsePdf.mockResolvedValue({
      text: 'CUSTOM PROP\nUsed in scene.',
      pageCount: 1,
      pages: [{ pageNumber: 1, text: 'CUSTOM PROP\nUsed in scene.' }],
    });

    mockedPrisma.element.findMany.mockResolvedValue([
      {
        id: 'elem-manual',
        name: 'CUSTOM PROP',
        type: 'OTHER',
        status: 'ACTIVE',
        source: 'MANUAL',
        highlightPage: null,
        highlightText: null,
        scriptId: 'parent-script',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processRevision('new-script', 'parent-script', 'scripts/uuid/v2.pdf');

    // CUSTOM PROP should exact match and migrate
    expect(mockedPrisma.element.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'elem-manual' },
        data: expect.objectContaining({ scriptId: 'new-script' }),
      }),
    );
  });

  it('processes FDX revision correctly using FDX parser', async () => {
    mockedGetFileBuffer.mockResolvedValue(Buffer.from('<FinalDraft/>'));
    mockedParseFdx.mockReturnValue({
      paragraphs: [
        { type: 'Scene Heading', text: 'INT. OFFICE - DAY', page: 1 },
        { type: 'Character', text: 'JOHN', page: 1 },
      ],
      taggedElements: [],
      pageCount: 1,
    });
    mockedDetectFdxElements.mockReturnValue({
      elements: [
        { name: 'INT. OFFICE - DAY', type: 'LOCATION' as any, highlightPage: 1, highlightText: 'INT. OFFICE - DAY', suggestedDepartment: 'Locations' },
        { name: 'JOHN', type: 'CHARACTER' as any, highlightPage: 1, highlightText: 'JOHN', suggestedDepartment: 'Cast' },
      ],
      sceneData: [{ sceneNumber: 1, location: 'INT. OFFICE - DAY', characters: ['JOHN'] }],
    });

    // Existing elements match exactly
    mockedPrisma.element.findMany.mockResolvedValue([
      { id: 'elem-1', name: 'JOHN', type: 'CHARACTER', status: 'ACTIVE', source: 'AUTO', highlightPage: 1, highlightText: 'JOHN', scriptId: 'parent-script', createdAt: new Date(), updatedAt: new Date() },
      { id: 'elem-2', name: 'INT. OFFICE - DAY', type: 'LOCATION', status: 'ACTIVE', source: 'AUTO', highlightPage: 1, highlightText: 'INT. OFFICE - DAY', scriptId: 'parent-script', createdAt: new Date(), updatedAt: new Date() },
    ] as any);

    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processRevision('new-script', 'parent-script', 'scripts/uuid/v2.fdx');

    // Should use FDX parser, not PDF parser
    expect(mockedParseFdx).toHaveBeenCalled();
    expect(mockedParsePdf).not.toHaveBeenCalled();

    // Elements should be migrated
    expect(mockedPrisma.element.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'elem-1' },
        data: expect.objectContaining({ scriptId: 'new-script' }),
      }),
    );

    // Script should be READY (all exact matches)
    expect(mockedPrisma.script.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'new-script' },
        data: expect.objectContaining({ status: 'READY' }),
      }),
    );
  });

  it('FDX revision generates PDF and uploads to S3', async () => {
    mockedGetFileBuffer.mockResolvedValue(Buffer.from('<FinalDraft/>'));
    mockedParseFdx.mockReturnValue({
      paragraphs: [
        { type: 'Scene Heading', text: 'INT. OFFICE - DAY', page: 1 },
        { type: 'Character', text: 'JOHN', page: 1 },
      ],
      taggedElements: [],
      pageCount: 1,
    });
    mockedDetectFdxElements.mockReturnValue({
      elements: [
        { name: 'JOHN', type: 'CHARACTER' as any, highlightPage: 1, highlightText: 'JOHN', suggestedDepartment: 'Cast' },
      ],
      sceneData: [],
    });
    const fakePdfBuffer = Buffer.from('fake-pdf-content');
    mockedGenerateScreenplayPdf.mockResolvedValue(fakePdfBuffer);
    mockedPutFileBuffer.mockResolvedValue();

    mockedPrisma.element.findMany.mockResolvedValue([
      { id: 'elem-1', name: 'JOHN', type: 'CHARACTER', status: 'ACTIVE', source: 'AUTO', highlightPage: 1, highlightText: 'JOHN', scriptId: 'parent-script', createdAt: new Date(), updatedAt: new Date() },
    ] as any);
    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processRevision('new-script', 'parent-script', 'scripts/uuid/v2.fdx');

    // Should generate PDF from FDX paragraphs
    expect(mockedGenerateScreenplayPdf).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: 'Scene Heading', text: 'INT. OFFICE - DAY' }),
      ]),
    );

    // Should upload generated PDF to S3
    expect(mockedPutFileBuffer).toHaveBeenCalledWith(
      'scripts/uuid/v2.pdf',
      fakePdfBuffer,
      'application/pdf',
    );
  });

  it('FDX revision stores sourceS3Key, format, and s3Key', async () => {
    mockedGetFileBuffer.mockResolvedValue(Buffer.from('<FinalDraft/>'));
    mockedParseFdx.mockReturnValue({
      paragraphs: [
        { type: 'Character', text: 'JOHN', page: 1 },
      ],
      taggedElements: [],
      pageCount: 1,
    });
    mockedDetectFdxElements.mockReturnValue({
      elements: [
        { name: 'JOHN', type: 'CHARACTER' as any, highlightPage: 1, highlightText: 'JOHN', suggestedDepartment: 'Cast' },
      ],
      sceneData: [],
    });
    mockedGenerateScreenplayPdf.mockResolvedValue(Buffer.from('pdf'));
    mockedPutFileBuffer.mockResolvedValue();

    mockedPrisma.element.findMany.mockResolvedValue([
      { id: 'elem-1', name: 'JOHN', type: 'CHARACTER', status: 'ACTIVE', source: 'AUTO', highlightPage: 1, highlightText: 'JOHN', scriptId: 'parent-script', createdAt: new Date(), updatedAt: new Date() },
    ] as any);
    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processRevision('new-script', 'parent-script', 'scripts/uuid/v2.fdx');

    // Script update should include FDX metadata
    expect(mockedPrisma.script.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'new-script' },
        data: expect.objectContaining({
          status: 'READY',
          sourceS3Key: 'scripts/uuid/v2.fdx',
          format: 'FDX',
          s3Key: 'scripts/uuid/v2.pdf',
        }),
      }),
    );
  });

  it('FDX revision stores sceneData', async () => {
    mockedGetFileBuffer.mockResolvedValue(Buffer.from('<FinalDraft/>'));
    mockedParseFdx.mockReturnValue({
      paragraphs: [
        { type: 'Scene Heading', text: 'INT. OFFICE - DAY', page: 1 },
        { type: 'Character', text: 'JOHN', page: 1 },
      ],
      taggedElements: [],
      pageCount: 1,
    });
    const sceneData = [{ sceneNumber: 1, location: 'INT. OFFICE - DAY', characters: ['JOHN'] }];
    mockedDetectFdxElements.mockReturnValue({
      elements: [
        { name: 'JOHN', type: 'CHARACTER' as any, highlightPage: 1, highlightText: 'JOHN', suggestedDepartment: 'Cast' },
      ],
      sceneData,
    });
    mockedGenerateScreenplayPdf.mockResolvedValue(Buffer.from('pdf'));
    mockedPutFileBuffer.mockResolvedValue();

    mockedPrisma.element.findMany.mockResolvedValue([
      { id: 'elem-1', name: 'JOHN', type: 'CHARACTER', status: 'ACTIVE', source: 'AUTO', highlightPage: 1, highlightText: 'JOHN', scriptId: 'parent-script', createdAt: new Date(), updatedAt: new Date() },
    ] as any);
    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processRevision('new-script', 'parent-script', 'scripts/uuid/v2.fdx');

    expect(mockedPrisma.script.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'new-script' },
        data: expect.objectContaining({
          sceneData,
        }),
      }),
    );
  });

  it('FDX revision with RECONCILING status stores FDX metadata', async () => {
    mockedGetFileBuffer.mockResolvedValue(Buffer.from('<FinalDraft/>'));
    mockedParseFdx.mockReturnValue({
      paragraphs: [
        { type: 'Character', text: 'JOHN SMITHE', page: 1 },
      ],
      taggedElements: [],
      pageCount: 1,
    });
    mockedDetectFdxElements.mockReturnValue({
      elements: [
        { name: 'JOHN SMITHE', type: 'CHARACTER' as any, highlightPage: 1, highlightText: 'JOHN SMITHE', suggestedDepartment: 'Cast' },
      ],
      sceneData: [],
    });
    mockedGenerateScreenplayPdf.mockResolvedValue(Buffer.from('pdf'));
    mockedPutFileBuffer.mockResolvedValue();

    // Existing element triggers fuzzy match → RECONCILING
    mockedPrisma.element.findMany.mockResolvedValue([
      { id: 'elem-1', name: 'JOHN SMITH', type: 'CHARACTER', status: 'ACTIVE', source: 'AUTO', highlightPage: 1, highlightText: 'JOHN SMITH', scriptId: 'parent-script', createdAt: new Date(), updatedAt: new Date() },
    ] as any);
    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processRevision('new-script', 'parent-script', 'scripts/uuid/v2.fdx');

    // Even in RECONCILING branch, FDX metadata should be stored
    expect(mockedPrisma.script.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'new-script' },
        data: expect.objectContaining({
          status: 'RECONCILING',
          sourceS3Key: 'scripts/uuid/v2.fdx',
          format: 'FDX',
          s3Key: 'scripts/uuid/v2.pdf',
        }),
      }),
    );
  });

  it('FDX revision element matching works with detected elements', async () => {
    mockedGetFileBuffer.mockResolvedValue(Buffer.from('<FinalDraft/>'));
    mockedParseFdx.mockReturnValue({
      paragraphs: [
        { type: 'Character', text: 'JANE', page: 1 },
      ],
      taggedElements: [],
      pageCount: 1,
    });
    mockedDetectFdxElements.mockReturnValue({
      elements: [
        { name: 'JANE', type: 'CHARACTER' as any, highlightPage: 1, highlightText: 'JANE', suggestedDepartment: 'Cast' },
      ],
      sceneData: [],
    });

    // No existing elements → all NEW
    mockedPrisma.element.findMany.mockResolvedValue([]);
    mockedPrisma.script.update.mockResolvedValue({} as any);

    await processRevision('new-script', 'parent-script', 'scripts/uuid/v2.fdx');

    // New elements should be created
    expect(mockedPrisma.element.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ scriptId: 'new-script', name: 'JANE' }),
        ]),
      }),
    );

    expect(mockedPrisma.script.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'new-script' },
        data: expect.objectContaining({ status: 'READY' }),
      }),
    );
  });
});
