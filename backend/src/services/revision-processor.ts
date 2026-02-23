import { prisma } from '../lib/prisma.js';
import { getFileBuffer } from '../lib/s3.js';
import { parsePdf } from './pdf-parser.js';
import { detectElements } from './element-detector.js';
import { matchElements } from './element-matcher.js';

export async function processRevision(
  newScriptId: string,
  parentScriptId: string,
  s3Key: string,
): Promise<void> {
  try {
    // Step 1: Fetch PDF from S3 and parse
    const buffer = await getFileBuffer(s3Key);
    const { text, pageCount } = await parsePdf(buffer);

    // Step 2: Detect elements from new script
    const pages = [{ pageNumber: 1, text }];
    const detectedElements = detectElements(pages);

    // Step 3: Load existing elements from parent script (ACTIVE only for matching,
    // but ARCHIVED are excluded inside matchElements)
    const existingElements = await prisma.element.findMany({
      where: { scriptId: parentScriptId },
    });

    // Step 4: Run element matcher
    const report = matchElements(
      existingElements.map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        status: e.status,
        source: e.source,
        pageNumbers: e.pageNumbers,
      })),
      detectedElements.map((d) => ({
        name: d.name,
        type: d.type,
        pageNumbers: d.pageNumbers,
      })),
    );

    // Step 5: Auto-resolve EXACT matches — update element.scriptId to new script
    const exactMatches = report.matches.filter((m) => m.status === 'EXACT');
    for (const match of exactMatches) {
      if (match.oldElementId) {
        await prisma.element.update({
          where: { id: match.oldElementId },
          data: {
            scriptId: newScriptId,
            pageNumbers: match.detectedPages,
          },
        });
      }
    }

    // Step 6: Auto-create NEW elements
    const newElements = report.matches.filter((m) => m.status === 'NEW');
    if (newElements.length > 0) {
      await prisma.element.createMany({
        data: newElements.map((elem) => ({
          scriptId: newScriptId,
          name: elem.detectedName,
          type: elem.detectedType as any,
          pageNumbers: elem.detectedPages,
          status: 'ACTIVE',
          source: 'AUTO',
        })),
      });
    }

    // Step 7: Check if reconciliation is needed
    const fuzzyMatches = report.matches.filter((m) => m.status === 'FUZZY');
    const missingElements = report.missing;

    if (fuzzyMatches.length > 0 || missingElements.length > 0) {
      // Create RevisionMatch records for items needing user decisions
      const matchRecords = [
        ...fuzzyMatches.map((m) => ({
          newScriptId,
          detectedName: m.detectedName,
          detectedType: m.detectedType as any,
          detectedPages: m.detectedPages,
          matchStatus: 'FUZZY' as const,
          oldElementId: m.oldElementId ?? null,
          similarity: m.similarity ?? null,
          resolved: false,
        })),
        ...missingElements.map((m) => ({
          newScriptId,
          detectedName: m.name,
          detectedType: m.type as any,
          detectedPages: [] as number[],
          matchStatus: 'MISSING' as const,
          oldElementId: m.id,
          similarity: null,
          resolved: false,
        })),
      ];

      await prisma.revisionMatch.createMany({ data: matchRecords });

      // Set script to RECONCILING
      await prisma.script.update({
        where: { id: newScriptId },
        data: { status: 'RECONCILING', pageCount },
      });
    } else {
      // No reconciliation needed — script is READY
      await prisma.script.update({
        where: { id: newScriptId },
        data: { status: 'READY', pageCount },
      });
    }
  } catch (error) {
    console.error(`Revision processing error for ${newScriptId}:`, error);

    await prisma.script.update({
      where: { id: newScriptId },
      data: { status: 'ERROR' },
    });
  }
}
