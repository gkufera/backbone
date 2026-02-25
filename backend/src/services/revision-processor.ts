import { prisma } from '../lib/prisma';
import { getFileBuffer } from '../lib/s3';
import { parsePdf } from './pdf-parser';
import { detectElements } from './element-detector';
import { matchElements } from './element-matcher';
import { ElementType, ElementStatus, ElementSource, RevisionMatchStatus, ScriptStatus } from '@backbone/shared/types';

export async function processRevision(
  newScriptId: string,
  parentScriptId: string,
  s3Key: string,
): Promise<void> {
  try {
    // Step 1: Fetch PDF from S3 and parse (returns per-page data)
    const buffer = await getFileBuffer(s3Key);
    const { pages, pageCount } = await parsePdf(buffer);

    // Step 2: Detect elements from new script (per-page)
    const { elements: detectedElements } = detectElements(pages);

    // Step 3: Load existing elements from parent script
    const existingElements = await prisma.element.findMany({
      where: { scriptId: parentScriptId, deletedAt: null },
    });

    // Step 4: Run element matcher
    const report = matchElements(
      existingElements.map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        status: e.status,
        source: e.source,
        highlightPage: e.highlightPage,
        highlightText: e.highlightText,
      })),
      detectedElements.map((d) => ({
        name: d.name,
        type: d.type,
        highlightPage: d.highlightPage,
        highlightText: d.highlightText,
      })),
    );

    // Steps 5-7 wrapped in a transaction to prevent partial migrations
    await prisma.$transaction(async (tx) => {
      // Step 5: Auto-resolve EXACT matches — update element.scriptId to new script
      const exactMatches = report.matches.filter((m) => m.status === RevisionMatchStatus.EXACT);
      for (const match of exactMatches) {
        if (match.oldElementId) {
          await tx.element.update({
            where: { id: match.oldElementId },
            data: {
              scriptId: newScriptId,
              highlightPage: match.detectedPage,
              highlightText: match.detectedHighlightText,
            },
          });
        }
      }

      // Step 6: Auto-create NEW elements
      const newElements = report.matches.filter((m) => m.status === RevisionMatchStatus.NEW);
      if (newElements.length > 0) {
        await tx.element.createMany({
          data: newElements.map((elem) => ({
            scriptId: newScriptId,
            name: elem.detectedName,
            type: elem.detectedType as ElementType,
            highlightPage: elem.detectedPage,
            highlightText: elem.detectedHighlightText,
            status: ElementStatus.ACTIVE,
            source: ElementSource.AUTO,
          })),
        });
      }

      // Step 7: Check if reconciliation is needed
      const fuzzyMatches = report.matches.filter((m) => m.status === RevisionMatchStatus.FUZZY);
      const missingElements = report.missing;

      if (fuzzyMatches.length > 0 || missingElements.length > 0) {
        // Create RevisionMatch records for items needing user decisions
        const matchRecords = [
          ...fuzzyMatches.map((m) => ({
            newScriptId,
            detectedName: m.detectedName,
            detectedType: m.detectedType as ElementType,
            detectedPage: m.detectedPage,
            detectedHighlightText: m.detectedHighlightText,
            matchStatus: RevisionMatchStatus.FUZZY as const,
            oldElementId: m.oldElementId ?? null,
            similarity: m.similarity ?? null,
            resolved: false,
          })),
          ...missingElements.map((m) => ({
            newScriptId,
            detectedName: m.name,
            detectedType: m.type as ElementType,
            detectedPage: null,
            detectedHighlightText: null,
            matchStatus: RevisionMatchStatus.MISSING as const,
            oldElementId: m.id,
            similarity: null,
            resolved: false,
          })),
        ];

        await tx.revisionMatch.createMany({ data: matchRecords });

        // Set script to RECONCILING
        await tx.script.update({
          where: { id: newScriptId },
          data: { status: ScriptStatus.RECONCILING, pageCount },
        });
      } else {
        // No reconciliation needed — script is READY
        await tx.script.update({
          where: { id: newScriptId },
          data: { status: ScriptStatus.READY, pageCount },
        });
      }
    });
  } catch (error) {
    console.error(`Revision processing error for ${newScriptId}:`, error);

    await prisma.script.update({
      where: { id: newScriptId },
      data: { status: ScriptStatus.ERROR },
    });
  }
}
