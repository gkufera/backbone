import { describe, it, expect } from 'vitest';
import { parseFdx } from '../services/fdx-parser';
import { detectFdxElements } from '../services/fdx-element-detector';
import { generateScreenplayPdf } from '../services/screenplay-pdf-generator';

// Full FDX document simulating a real Final Draft export
const FULL_FDX = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="5">
  <Content>
    <Paragraph Type="Scene Heading"><Text>INT. POLICE STATION - DAY</Text></Paragraph>
    <Paragraph Type="Action"><Text>A busy precinct. Officers hustle between desks.</Text></Paragraph>
    <Paragraph Type="Character"><Text>DETECTIVE MARIA SANTOS</Text></Paragraph>
    <Paragraph Type="Dialogue"><Text>We got a lead on the warehouse case.</Text></Paragraph>
    <Paragraph Type="Character"><Text>CAPTAIN REEVES</Text></Paragraph>
    <Paragraph Type="Parenthetical"><Text>(leaning back)</Text></Paragraph>
    <Paragraph Type="Dialogue"><Text>Take Rodriguez with you. And be careful.</Text></Paragraph>
    <Paragraph Type="Transition"><Text>CUT TO:</Text></Paragraph>
    <Paragraph Type="Scene Heading" StartsNewPage="Yes"><Text>EXT. ABANDONED WAREHOUSE - NIGHT</Text></Paragraph>
    <Paragraph Type="Action"><Text>Rain hammers the tin roof. Santos approaches with her weapon drawn.</Text></Paragraph>
    <Paragraph Type="Character"><Text>DETECTIVE MARIA SANTOS</Text></Paragraph>
    <Paragraph Type="Dialogue"><Text>Police! Come out with your hands up!</Text></Paragraph>
    <Paragraph Type="Character"><Text>RODRIGUEZ (V.O.)</Text></Paragraph>
    <Paragraph Type="Dialogue"><Text>I've got the back covered.</Text></Paragraph>
  </Content>
  <TagData>
    <TagCategory Name="Props">
      <Tag Name="Handgun" />
      <Tag Name="Police Badge" />
    </TagCategory>
    <TagCategory Name="Wardrobe">
      <Tag Name="Detective Suit" />
      <Tag Name="Rain Jacket" />
    </TagCategory>
    <TagCategory Name="Vehicles">
      <Tag Name="Police Cruiser" />
    </TagCategory>
  </TagData>
</FinalDraft>`;

const UNTAGGED_FDX = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="5">
  <Content>
    <Paragraph Type="Scene Heading"><Text>INT. COFFEE SHOP - MORNING</Text></Paragraph>
    <Paragraph Type="Character"><Text>ALEX</Text></Paragraph>
    <Paragraph Type="Dialogue"><Text>Two coffees, please.</Text></Paragraph>
    <Paragraph Type="Character"><Text>BARISTA</Text></Paragraph>
    <Paragraph Type="Dialogue"><Text>Coming right up.</Text></Paragraph>
  </Content>
</FinalDraft>`;

describe('FDX Integration: full pipeline', () => {
  it('parses XML → detects elements → generates PDF', async () => {
    // Step 1: Parse
    const parsed = parseFdx(Buffer.from(FULL_FDX));
    expect(parsed.paragraphs.length).toBeGreaterThan(0);
    expect(parsed.taggedElements.length).toBe(5);
    expect(parsed.pageCount).toBe(2);

    // Step 2: Detect elements
    const { elements, sceneData } = detectFdxElements(parsed);

    // Locations
    const locations = elements.filter((e) => e.type === 'LOCATION');
    expect(locations.length).toBe(2);
    expect(locations.map((l) => l.name)).toContain('INT. POLICE STATION - DAY');
    expect(locations.map((l) => l.name)).toContain('EXT. ABANDONED WAREHOUSE - NIGHT');

    // Characters (deduplicated, parenthetical stripped)
    const characters = elements.filter((e) => e.type === 'CHARACTER');
    expect(characters.map((c) => c.name)).toContain('DETECTIVE MARIA SANTOS');
    expect(characters.map((c) => c.name)).toContain('CAPTAIN REEVES');
    expect(characters.map((c) => c.name)).toContain('RODRIGUEZ');

    // Tagged elements (props, wardrobe, vehicles)
    const taggedNames = elements
      .filter((e) => e.type === 'OTHER')
      .map((e) => e.name);
    expect(taggedNames).toContain('HANDGUN');
    expect(taggedNames).toContain('POLICE BADGE');
    expect(taggedNames).toContain('DETECTIVE SUIT');
    expect(taggedNames).toContain('RAIN JACKET');
    expect(taggedNames).toContain('POLICE CRUISER');

    // Scene data
    expect(sceneData).toHaveLength(2);
    expect(sceneData[0].characters).toContain('DETECTIVE MARIA SANTOS');
    expect(sceneData[0].characters).toContain('CAPTAIN REEVES');
    expect(sceneData[1].characters).toContain('DETECTIVE MARIA SANTOS');
    expect(sceneData[1].characters).toContain('RODRIGUEZ');

    // Step 3: Generate PDF
    const pdf = await generateScreenplayPdf(parsed.paragraphs);
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(500);
  });

  it('untagged FDX still produces character/location elements', () => {
    const parsed = parseFdx(Buffer.from(UNTAGGED_FDX));
    const { elements } = detectFdxElements(parsed);

    const names = elements.map((e) => e.name);
    expect(names).toContain('INT. COFFEE SHOP - MORNING');
    expect(names).toContain('ALEX');
    expect(names).toContain('BARISTA');
  });
});
