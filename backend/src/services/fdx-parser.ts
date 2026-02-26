import { XMLParser } from 'fast-xml-parser';

export interface FdxParagraph {
  type: string;
  text: string;
  page: number;
}

export interface FdxTaggedElement {
  category: string;
  name: string;
}

export interface ParsedFdx {
  paragraphs: FdxParagraph[];
  taggedElements: FdxTaggedElement[];
  pageCount: number;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: false,
  isArray: (tagName) => tagName === 'Paragraph' || tagName === 'Text' || tagName === 'TagCategory' || tagName === 'Tag',
});

export function parseFdx(buffer: Buffer): ParsedFdx {
  const xmlString = buffer.toString('utf-8');
  const doc = parser.parse(xmlString);

  const finalDraft = doc.FinalDraft;
  if (!finalDraft) {
    throw new Error('Invalid FDX: missing FinalDraft root element');
  }

  const paragraphs: FdxParagraph[] = [];
  let currentPage = 1;

  const content = finalDraft.Content;
  const rawParagraphs: any[] = content?.Paragraph ?? [];

  for (const para of rawParagraphs) {
    const type = para['@_Type'] ?? '';
    const startsNewPage = para['@_StartsNewPage'];

    if (startsNewPage === 'Yes') {
      currentPage++;
    }

    // Concatenate all Text nodes within the paragraph
    const textNodes: any[] = para.Text ?? [];
    let fullText = '';
    for (const textNode of textNodes) {
      if (typeof textNode === 'string') {
        fullText += textNode;
      } else if (typeof textNode === 'object' && textNode !== null) {
        // Text node with attributes (e.g., Style="Bold")
        // The text content is in #text
        const content = textNode['#text'] ?? '';
        fullText += String(content);
      }
    }

    fullText = fullText.trim();
    if (!type || !fullText) continue;

    paragraphs.push({ type, text: fullText, page: currentPage });
  }

  // Extract TagData
  const taggedElements: FdxTaggedElement[] = [];
  const tagData = finalDraft.TagData;
  if (tagData) {
    const categories: any[] = tagData.TagCategory ?? [];
    for (const category of categories) {
      const categoryName = category['@_Name'] ?? '';
      const tags: any[] = category.Tag ?? [];
      for (const tag of tags) {
        const tagName = tag['@_Name'] ?? '';
        if (categoryName && tagName) {
          taggedElements.push({ category: categoryName, name: tagName });
        }
      }
    }
  }

  return {
    paragraphs,
    taggedElements,
    pageCount: Math.max(1, currentPage),
  };
}
