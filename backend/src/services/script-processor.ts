import { prisma } from '../lib/prisma.js';
import { getFileBuffer } from '../lib/s3.js';
import { parsePdf } from './pdf-parser.js';
import { detectElements } from './element-detector.js';

export async function processScript(scriptId: string, s3Key: string): Promise<void> {
  try {
    // Step 1: Fetch PDF from S3
    const buffer = await getFileBuffer(s3Key);

    // Step 2: Parse PDF text
    const { text, pageCount } = await parsePdf(buffer);

    // Step 3: Split text into pages (simple heuristic: treat entire text as page 1 for now)
    // In a real scenario, pdf-parse gives us per-page text
    const pages = [{ pageNumber: 1, text }];

    // Step 4: Detect elements
    const detectedElements = detectElements(pages);

    // Step 5: Save elements to database
    if (detectedElements.length > 0) {
      await prisma.element.createMany({
        data: detectedElements.map((elem) => ({
          scriptId,
          name: elem.name,
          type: elem.type,
          pageNumbers: elem.pageNumbers,
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
