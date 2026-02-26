import PDFDocument from 'pdfkit';
import type { FdxParagraph } from './fdx-parser';

// Screenplay formatting constants (in points, 72pt = 1 inch)
const PAGE_WIDTH = 612; // US Letter
const PAGE_HEIGHT = 792;
const MARGIN_LEFT = 108; // 1.5 inches
const MARGIN_RIGHT = 72; // 1 inch
const MARGIN_TOP = 72; // 1 inch
const MARGIN_BOTTOM = 72;
const FONT_SIZE = 12;
const LINE_HEIGHT = 12;

// Screenplay element positioning
const ACTION_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // Full width
const CHARACTER_INDENT = 252; // 3.5" from left edge
const DIALOGUE_INDENT = 180; // 2.5" from left edge
const DIALOGUE_WIDTH = 252; // 3.5" wide
const PARENTHETICAL_INDENT = 223; // ~3.1" from left edge
const PARENTHETICAL_WIDTH = 144; // 2" wide
const TRANSITION_RIGHT_MARGIN = MARGIN_RIGHT;

export async function generateScreenplayPdf(paragraphs: FdxParagraph[]): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Uint8Array[] = [];

    const doc = new PDFDocument({
      size: 'LETTER',
      margins: {
        top: MARGIN_TOP,
        bottom: MARGIN_BOTTOM,
        left: MARGIN_LEFT,
        right: MARGIN_RIGHT,
      },
    });

    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Courier').fontSize(FONT_SIZE);

    for (const para of paragraphs) {
      // Check if we need a new page
      if (doc.y > PAGE_HEIGHT - MARGIN_BOTTOM - LINE_HEIGHT * 2) {
        doc.addPage();
      }

      switch (para.type) {
        case 'Scene Heading':
          doc.moveDown(1);
          doc.font('Courier-Bold').fontSize(FONT_SIZE);
          doc.text(para.text.toUpperCase(), MARGIN_LEFT, undefined, {
            width: ACTION_WIDTH,
          });
          doc.font('Courier').fontSize(FONT_SIZE);
          doc.moveDown(0.5);
          break;

        case 'Character':
          doc.moveDown(0.5);
          doc.text(para.text.toUpperCase(), CHARACTER_INDENT, undefined, {
            width: ACTION_WIDTH,
          });
          break;

        case 'Dialogue':
          doc.text(para.text, DIALOGUE_INDENT, undefined, {
            width: DIALOGUE_WIDTH,
          });
          doc.moveDown(0.5);
          break;

        case 'Parenthetical':
          doc.text(para.text, PARENTHETICAL_INDENT, undefined, {
            width: PARENTHETICAL_WIDTH,
          });
          break;

        case 'Transition':
          doc.moveDown(0.5);
          doc.text(para.text.toUpperCase(), MARGIN_LEFT, undefined, {
            width: ACTION_WIDTH,
            align: 'right',
          });
          doc.moveDown(0.5);
          break;

        case 'Action':
        default:
          doc.text(para.text, MARGIN_LEFT, undefined, {
            width: ACTION_WIDTH,
          });
          doc.moveDown(0.5);
          break;
      }
    }

    doc.end();
  });
}
