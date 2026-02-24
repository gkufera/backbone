import { PDFParse } from 'pdf-parse';

export interface PageText {
  pageNumber: number;
  text: string;
}

export interface ParsedPdf {
  text: string;
  pageCount: number;
  pages: PageText[];
}

export async function parsePdf(buffer: Buffer): Promise<ParsedPdf> {
  const parser = new PDFParse({ data: buffer });
  const textResult = await parser.getText();

  // Build per-page text array from the pages data
  const pages: PageText[] =
    textResult.pages && textResult.pages.length > 0
      ? textResult.pages.map((p: { num: number; text: string }) => ({
          pageNumber: p.num,
          text: p.text,
        }))
      : [{ pageNumber: 1, text: textResult.text }];

  const result: ParsedPdf = {
    text: textResult.text,
    pageCount: textResult.total,
    pages,
  };
  await parser.destroy();
  return result;
}
