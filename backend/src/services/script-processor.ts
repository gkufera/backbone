import { prisma } from '../lib/prisma';
import { getFileBuffer, putFileBuffer } from '../lib/s3';
import { parsePdf } from './pdf-parser';
import { parseFdx } from './fdx-parser';
import { detectElements } from './element-detector';
import { detectFdxElements } from './fdx-element-detector';
import { generateScreenplayPdf } from './screenplay-pdf-generator';
import { setProgress, clearProgress } from './processing-progress';
import { ElementStatus, ElementSource, ScriptStatus, ScriptFormat } from '@backbone/shared/types';
import type { DetectionResult } from './element-detector';
import type { FdxParagraph } from './fdx-parser';

function isFdx(s3Key: string): boolean {
  return s3Key.toLowerCase().endsWith('.fdx');
}

export async function parseAndDetect(
  buffer: Buffer,
  s3Key: string,
  scriptId: string,
  extractElements = true,
): Promise<{ result: DetectionResult; pageCount: number; fdxParagraphs?: FdxParagraph[] }> {
  if (isFdx(s3Key)) {
    setProgress(scriptId, 30, 'Parsing FDX');
    const parsed = parseFdx(buffer);

    setProgress(scriptId, 60, 'Detecting elements');
    // FDX always uses structured detection (characters + locations + tagger tags)
    const result = detectFdxElements(parsed);

    return { result, pageCount: parsed.pageCount, fdxParagraphs: parsed.paragraphs };
  } else {
    setProgress(scriptId, 30, 'Parsing PDF');
    const { pages, pageCount } = await parsePdf(buffer);

    if (extractElements) {
      setProgress(scriptId, 60, 'Detecting elements');
      const result = detectElements(pages);
      return { result, pageCount };
    } else {
      // Skip element detection for PDF — just get page count
      return { result: { elements: [], sceneData: [] }, pageCount };
    }
  }
}

export async function processScript(scriptId: string, s3Key: string, extractElements = true): Promise<void> {
  try {
    setProgress(scriptId, 10, 'Fetching PDF');

    // Step 1: Fetch file from S3
    const buffer = await getFileBuffer(s3Key);

    // Step 2+3: Parse and detect elements (format-specific)
    const { result, pageCount, fdxParagraphs } = await parseAndDetect(buffer, s3Key, scriptId, extractElements);
    const { elements: detectedElements, sceneData } = result;

    // Step 3.5: For FDX files, generate PDF and upload to S3
    let finalS3Key = s3Key;
    let sourceS3Key: string | undefined;
    let format: ScriptFormat | undefined;

    if (isFdx(s3Key) && fdxParagraphs) {
      setProgress(scriptId, 70, 'Generating PDF');
      const pdfBuffer = await generateScreenplayPdf(fdxParagraphs);
      const pdfS3Key = s3Key.replace(/\.fdx$/i, '.pdf');
      await putFileBuffer(pdfS3Key, pdfBuffer, 'application/pdf');
      finalS3Key = pdfS3Key;
      sourceS3Key = s3Key;
      format = ScriptFormat.FDX;
    }

    // Step 4: Look up production departments for department assignment
    const script = await prisma.script.findUnique({
      where: { id: scriptId },
      select: { productionId: true, parentScriptId: true },
    });

    let departmentMap: Map<string, string> | null = null;
    if (script?.productionId) {
      const departments = await prisma.department.findMany({
        where: { productionId: script.productionId, deletedAt: null },
        select: { id: true, name: true },
      });
      departmentMap = new Map(departments.map((d) => [d.name, d.id]));
    }

    setProgress(scriptId, 80, 'Saving elements');

    // Step 5: Save elements to database
    if (detectedElements.length > 0) {
      await prisma.element.createMany({
        data: detectedElements.map((elem) => ({
          scriptId,
          name: elem.name,
          type: elem.type,
          highlightPage: elem.highlightPage,
          highlightText: elem.highlightText,
          departmentId:
            elem.suggestedDepartment && departmentMap
              ? departmentMap.get(elem.suggestedDepartment) ?? null
              : null,
          status: ElementStatus.ACTIVE,
          source: ElementSource.AUTO,
        })),
      });
    }

    setProgress(scriptId, 100, 'Complete');

    // Step 6: Determine final status
    // New scripts (no parent) → REVIEWING for wizard
    // Revisions are handled by revision-processor.ts
    const finalStatus = script?.parentScriptId ? ScriptStatus.READY : ScriptStatus.REVIEWING;

    await prisma.script.update({
      where: { id: scriptId },
      data: {
        status: finalStatus,
        pageCount,
        sceneData: sceneData.length > 0 ? sceneData : undefined,
        ...(finalS3Key !== s3Key ? { s3Key: finalS3Key } : {}),
        ...(sourceS3Key ? { sourceS3Key } : {}),
        ...(format ? { format } : {}),
      },
    });

    clearProgress(scriptId);
  } catch (error) {
    console.error(`Script processing error for ${scriptId}:`, error);
    clearProgress(scriptId);

    // Update script status to ERROR
    try {
      await prisma.script.update({
        where: { id: scriptId },
        data: { status: ScriptStatus.ERROR },
      });
    } catch (updateError) {
      console.error(`Failed to set ERROR status for ${scriptId}:`, updateError);
    }
  }
}
