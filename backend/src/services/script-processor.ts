import { prisma } from '../lib/prisma.js';
import { getFileBuffer } from '../lib/s3.js';
import { parsePdf } from './pdf-parser.js';
import { detectElements } from './element-detector.js';

export async function processScript(scriptId: string, s3Key: string): Promise<void> {
  try {
    // Step 1: Fetch PDF from S3
    const buffer = await getFileBuffer(s3Key);

    // Step 2: Parse PDF text (returns per-page data)
    const { pages, pageCount } = await parsePdf(buffer);

    // Step 3: Detect elements from per-page text
    const detectedElements = detectElements(pages);

    // Step 4: Look up production departments for department assignment
    const script = await prisma.script.findUnique({
      where: { id: scriptId },
      select: { productionId: true },
    });

    let departmentMap: Map<string, string> | null = null;
    if (script?.productionId) {
      const departments = await prisma.department.findMany({
        where: { productionId: script.productionId },
        select: { id: true, name: true },
      });
      departmentMap = new Map(departments.map((d) => [d.name, d.id]));
    }

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

    // Step 6: Update script status to READY
    await prisma.script.update({
      where: { id: scriptId },
      data: {
        status: 'READY',
        pageCount,
      },
    });
  } catch (error) {
    console.error(`Script processing error for ${scriptId}:`, error);

    // Update script status to ERROR
    await prisma.script.update({
      where: { id: scriptId },
      data: { status: 'ERROR' },
    });
  }
}
