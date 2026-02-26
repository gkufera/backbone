import { describe, it, expect } from 'vitest';
import { parseFdx } from '../services/fdx-parser';

// Minimal FDX structure for testing
function wrapFdx(content: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="5">
  <Content>
    ${content}
  </Content>
</FinalDraft>`;
}

function makeParagraph(type: string, text: string): string {
  return `<Paragraph Type="${type}"><Text>${text}</Text></Paragraph>`;
}

describe('FDX Parser', () => {
  it('extracts Scene Heading paragraphs', () => {
    const xml = wrapFdx(makeParagraph('Scene Heading', 'INT. OFFICE - DAY'));
    const result = parseFdx(Buffer.from(xml));

    expect(result.paragraphs).toContainEqual(
      expect.objectContaining({ type: 'Scene Heading', text: 'INT. OFFICE - DAY' }),
    );
  });

  it('extracts Character paragraphs', () => {
    const xml = wrapFdx(makeParagraph('Character', 'JOHN'));
    const result = parseFdx(Buffer.from(xml));

    expect(result.paragraphs).toContainEqual(
      expect.objectContaining({ type: 'Character', text: 'JOHN' }),
    );
  });

  it('extracts Action, Dialogue, Parenthetical, and Transition paragraphs', () => {
    const xml = wrapFdx([
      makeParagraph('Action', 'The door opens slowly.'),
      makeParagraph('Dialogue', 'Hello, world.'),
      makeParagraph('Parenthetical', '(whispering)'),
      makeParagraph('Transition', 'CUT TO:'),
    ].join('\n'));
    const result = parseFdx(Buffer.from(xml));

    const types = result.paragraphs.map((p) => p.type);
    expect(types).toContain('Action');
    expect(types).toContain('Dialogue');
    expect(types).toContain('Parenthetical');
    expect(types).toContain('Transition');
  });

  it('extracts TagData categories (Props, Wardrobe, Vehicles)', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="5">
  <Content>
    ${makeParagraph('Scene Heading', 'INT. OFFICE - DAY')}
  </Content>
  <TagData>
    <TagCategory Name="Props">
      <Tag Name="Briefcase" />
      <Tag Name="Coffee Mug" />
    </TagCategory>
    <TagCategory Name="Wardrobe">
      <Tag Name="Red Dress" />
    </TagCategory>
    <TagCategory Name="Vehicles">
      <Tag Name="Police Car" />
    </TagCategory>
  </TagData>
</FinalDraft>`;

    const result = parseFdx(Buffer.from(xml));

    expect(result.taggedElements).toContainEqual({ category: 'Props', name: 'Briefcase' });
    expect(result.taggedElements).toContainEqual({ category: 'Props', name: 'Coffee Mug' });
    expect(result.taggedElements).toContainEqual({ category: 'Wardrobe', name: 'Red Dress' });
    expect(result.taggedElements).toContainEqual({ category: 'Vehicles', name: 'Police Car' });
  });

  it('handles empty/minimal FDX gracefully', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="5">
  <Content></Content>
</FinalDraft>`;

    const result = parseFdx(Buffer.from(xml));
    expect(result.paragraphs).toEqual([]);
    expect(result.taggedElements).toEqual([]);
    expect(result.pageCount).toBe(1);
  });

  it('throws on invalid XML', () => {
    expect(() => parseFdx(Buffer.from('not xml at all <<<<'))).toThrow();
  });

  it('returns correct page count from page breaks', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="5">
  <Content>
    ${makeParagraph('Scene Heading', 'INT. OFFICE - DAY')}
    ${makeParagraph('Action', 'John enters.')}
    <Paragraph Type="Action" StartsNewPage="Yes"><Text>Page 2 starts here.</Text></Paragraph>
    <Paragraph Type="Action" StartsNewPage="Yes"><Text>Page 3 starts here.</Text></Paragraph>
  </Content>
</FinalDraft>`;

    const result = parseFdx(Buffer.from(xml));
    expect(result.pageCount).toBe(3);
  });

  it('rejects XXE payloads — entities are not expanded', () => {
    const xxePayload = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<FinalDraft DocumentType="Script" Template="No" Version="5">
  <Content>
    <Paragraph Type="Action"><Text>&xxe;</Text></Paragraph>
  </Content>
</FinalDraft>`;

    // Should either throw or return without expanding the entity
    let result;
    try {
      result = parseFdx(Buffer.from(xxePayload));
    } catch {
      // Throwing is acceptable — entity processing blocked
      return;
    }

    // If it doesn't throw, the entity must not have been expanded
    const allText = result.paragraphs.map((p) => p.text).join(' ');
    expect(allText).not.toContain('root:');
    expect(allText).not.toContain('/bin/');
  });

  it('handles null #text nodes without producing "null" string', () => {
    // When fast-xml-parser returns null for #text, String(null) produces "null"
    // The parser should treat null as empty string
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="5">
  <Content>
    <Paragraph Type="Action"><Text Style="Bold"></Text><Text>Real text here.</Text></Paragraph>
  </Content>
</FinalDraft>`;

    const result = parseFdx(Buffer.from(xml));

    // Should not contain "null" string from String(null)
    for (const p of result.paragraphs) {
      expect(p.text).not.toContain('null');
    }
    expect(result.paragraphs[0]?.text).toBe('Real text here.');
  });

  it('concatenates multiple Text nodes within a single paragraph', () => {
    const xml = wrapFdx(
      `<Paragraph Type="Action"><Text>The door </Text><Text Style="Bold">opens</Text><Text> slowly.</Text></Paragraph>`,
    );
    const result = parseFdx(Buffer.from(xml));

    expect(result.paragraphs[0].text).toBe('The door opens slowly.');
  });
});
