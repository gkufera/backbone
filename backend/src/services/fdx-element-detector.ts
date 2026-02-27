import { ElementType } from '@backbone/shared/types';
import { ELEMENT_TYPE_DEPARTMENT_MAP } from '@backbone/shared/constants';
import type { SceneInfo } from '@backbone/shared/types';
import { detectProps } from './element-detector';
import type { DetectedElement, DetectionResult } from './element-detector';
import type { ParsedFdx } from './fdx-parser';

// Map FDX TagData category names to production departments
const TAG_CATEGORY_DEPARTMENT_MAP: Record<string, string> = {
  Props: 'Props',
  Vehicles: 'Props',
  Wardrobe: 'Costume',
  Costume: 'Costume',
  Hair: 'Hair & Makeup',
  Makeup: 'Hair & Makeup',
  'Hair & Makeup': 'Hair & Makeup',
  'Set Dressing': 'Set Design',
  'Special Effects': 'VFX',
  'Visual Effects': 'VFX',
  'Sound Effects': 'Sound',
  Music: 'Sound',
};

// Parenthetical extensions like (V.O.), (O.S.), (CONT'D)
const PARENTHETICAL_REGEX = /\s*\(.*?\)\s*$/;

export function detectFdxElements(parsed: ParsedFdx): DetectionResult {
  const elementMap = new Map<string, DetectedElement>();
  const sceneData: SceneInfo[] = [];
  let currentScene: SceneInfo | null = null;

  // Process structured paragraphs
  for (const para of parsed.paragraphs) {
    switch (para.type) {
      case 'Scene Heading': {
        const name = para.text.trim();
        if (!name) break;

        addElement(elementMap, name, ElementType.LOCATION, para.page, para.text);

        currentScene = {
          sceneNumber: sceneData.length + 1,
          location: name,
          characters: [],
        };
        sceneData.push(currentScene);
        break;
      }

      case 'Character': {
        // Strip parenthetical extensions: (V.O.), (O.S.), (CONT'D)
        let name = para.text.trim().replace(PARENTHETICAL_REGEX, '').trim();
        if (!name) break;

        addElement(elementMap, name, ElementType.CHARACTER, para.page, para.text);

        if (currentScene && !currentScene.characters.includes(name)) {
          currentScene.characters.push(name);
        }
        break;
      }

      // Action, Dialogue, Parenthetical, Transition — no element detection needed
      default:
        break;
    }
  }

  // Process TagData tagged elements
  for (const tag of parsed.taggedElements) {
    const department = TAG_CATEGORY_DEPARTMENT_MAP[tag.category] ?? null;
    const name = tag.name.toUpperCase();

    if (elementMap.has(name)) continue;

    // Search paragraphs for the tag name to find its actual page
    let foundPage = 1;
    const tagNameLower = tag.name.toLowerCase();
    for (const para of parsed.paragraphs) {
      if (para.text.toLowerCase().includes(tagNameLower)) {
        foundPage = para.page;
        break;
      }
    }

    elementMap.set(name, {
      name,
      type: ElementType.OTHER,
      highlightPage: foundPage,
      highlightText: name,
      suggestedDepartment: department,
    });
  }

  const elements = Array.from(elementMap.values()).sort((a, b) => {
    if (a.highlightPage !== b.highlightPage) return a.highlightPage - b.highlightPage;
    return a.name.localeCompare(b.name);
  });

  return { elements, sceneData };
}

export function detectFdxPropsFromActions(parsed: ParsedFdx): DetectedElement[] {
  const propMap = new Map<string, DetectedElement>();

  for (const para of parsed.paragraphs) {
    if (para.type !== 'Action') continue;

    // Scan each line in the action paragraph for embedded ALL-CAPS words
    const lines = para.text.split('\n');
    for (const line of lines) {
      detectProps(propMap, line, para.page);
    }
  }

  return Array.from(propMap.values());
}

function addElement(
  map: Map<string, DetectedElement>,
  name: string,
  type: ElementType.CHARACTER | ElementType.LOCATION,
  page: number,
  lineText: string,
): void {
  if (map.has(name)) return;

  map.set(name, {
    name,
    type,
    highlightPage: page,
    highlightText: lineText,
    suggestedDepartment: ELEMENT_TYPE_DEPARTMENT_MAP[type] ?? null,
  });
}
