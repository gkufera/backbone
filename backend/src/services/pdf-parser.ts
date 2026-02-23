import pdfParse from 'pdf-parse';

export interface ParsedPdf {
  text: string;
  pageCount: number;
}

export async function parsePdf(buffer: Buffer): Promise<ParsedPdf> {
  const result = await pdfParse(buffer);

  return {
    text: result.text,
    pageCount: result.numpages,
  };
}
