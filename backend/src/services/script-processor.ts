import { prisma } from '../lib/prisma.js';
import { getFileBuffer } from '../lib/s3.js';
import { parsePdf } from './pdf-parser.js';
import { detectElements } from './element-detector.js';
import { setProgress, clearProgress } from './processing-progress.js';

export async function processScript(scriptId: string, s3Key: string): Promise<void> {
  try {
    setProgress(scriptId, 10, 'Fetching PDF');

    // Step 1: Fetch PDF from S3
    const buffer = await getFileBuffer(s3Key);

    setProgress(scriptId, 30, 'Parsing PDF');

    // Step 2: Parse PDF text (returns per-page data)
    const { pages, pageCount } = await parsePdf(buffer);

    setProgress(scriptId, 60, 'Detecting elements');

    // Step 3: Detect elements from per-page text
    const { elements: detectedElements, sceneData } = detectElements(pages);

    // Step 4: Look up production departments for department assignment
    const script = await prisma.script.findUnique({
      where: { id: scriptId },
      select: { productionId: true, parentScriptId: true },
    });

    let departmentMap: Map<string, string> | null = null;
    if (script?.productionId) {
      const departments = await prisma.department.findMany({
        where: { productionId: script.productionId },
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
          status: 'ACTIVE',
          source: 'AUTO',
        })),
      });
    }

    setProgress(scriptId, 100, 'Complete');

    // Step 6: Determine final status
    // New scripts (no parent) → REVIEWING for wizard
    // Revisions are handled by revision-processor.ts
    const finalStatus = script?.parentScriptId ? 'READY' : 'REVIEWING';

    await prisma.script.update({
      where: { id: scriptId },
      data: {
        status: finalStatus,
        pageCount,
        sceneData: sceneData.length > 0 ? sceneData : undefined,
      },
    });

    clearProgress(scriptId);
  } catch (error) {
    console.error(`Script processing error for ${scriptId}:`, error);
    clearProgress(scriptId);

    // Update script status to ERROR
    await prisma.script.update({
      where: { id: scriptId },
      data: { status: 'ERROR' },
    });
  }
}
