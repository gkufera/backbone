import { PDFParse } from 'pdf-parse';

export interface ParsedPdf {
  text: string;
  pageCount: number;
}

export async function parsePdf(buffer: Buffer): Promise<ParsedPdf> {
  const parser = new PDFParse({ data: buffer });
  const textResult = await parser.getText();
  const result = {
    text: textResult.text,
    pageCount: textResult.total,
  };
  await parser.destroy();
  return result;
}
