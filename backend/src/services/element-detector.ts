import { ElementType } from '@backbone/shared/types';
import { ELEMENT_TYPE_DEPARTMENT_MAP } from '@backbone/shared/constants';
import type { SceneInfo } from '@backbone/shared/types';

export interface PageText {
  pageNumber: number;
  text: string;
}

export interface DetectedElement {
  name: string;
  type: ElementType.CHARACTER | ElementType.LOCATION | ElementType.OTHER;
  highlightPage: number;
  highlightText: string;
  suggestedDepartment: string | null;
}

export interface DetectionResult {
  elements: DetectedElement[];
  sceneData: SceneInfo[];
}

// Words that appear as ALL-CAPS in scripts but aren't real elements
const NOISE_WORDS = new Set([
  'CONTINUED',
  'FADE IN',
  'FADE OUT',
  'CUT TO',
  'CUT TO BLACK',
  'DISSOLVE TO',
  'SMASH CUT TO',
  'MATCH CUT TO',
  'INTERCUT',
  'FLASHBACK',
  'END FLASHBACK',
  'MONTAGE',
  'END MONTAGE',
  'SERIES OF SHOTS',
  'BACK TO SCENE',
  'LATER',
  'MOMENTS LATER',
  'SUPER',
  'TITLE CARD',
  'THE END',
  'MORE',
  'ANGLE ON',
  'CLOSE ON',
  'CLOSE UP',
  'WIDE SHOT',
  'INSERT',
  'PRELAP',
  'BEAT',
  'PAUSE',
  'SILENCE',
  'END CREDITS',
  'OPENING CREDITS',
  'TIME CUT',
  'JUMP CUT TO',
  // Additional noise for prop detection in action lines
  'ANGLE',
  'POV',
  'REVERSE',
  'TWO SHOT',
  'TRACKING SHOT',
  'PAN',
  'ZOOM',
  'TIGHT ON',
  'PULL BACK',
  'PUSH IN',
  'ESTABLISHING',
  'CONTINUOUS',
  'RESUME',
  'OMITTED',
  'THE',
  'THIS',
  'THAT',
  'THEN',
  'WITH',
  'FROM',
  'INTO',
  'OVER',
  'BACK',
  'SUDDENLY',
]);

// Regex for slugline detection: INT. / EXT. / INT./EXT.
const SLUGLINE_REGEX = /^\s*(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)\s+/i;

// Regex for ALL-CAPS line: at least 2 uppercase letters, no lowercase
const ALL_CAPS_REGEX = /^[A-Z][A-Z\s.'\-,]+$/;

// Regex for parenthetical extensions: (V.O.), (O.S.), (CONT'D), etc.
const PARENTHETICAL_REGEX = /\s*\(.*?\)\s*$/;

// Regex for CONT'D suffix
const CONTD_REGEX = /\s*\(?\s*CONT['']D\s*\)?\s*$/i;

// Regex for embedded ALL-CAPS words in mixed-case lines (props)
// Matches sequences of 2+ ALL-CAPS words or single words of 3+ chars
const EMBEDDED_CAPS_REGEX = /\b([A-Z]{3,}(?:\s+[A-Z]{2,})*)\b/g;

export function detectElements(pages: PageText[]): DetectionResult {
  const elementMap = new Map<string, DetectedElement>();
  const sceneData: SceneInfo[] = [];
  let currentScene: SceneInfo | null = null;

  for (const page of pages) {
    const lines = page.text.split('\n');

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line || line.length < 2) continue;

      // Check for slugline (location)
      if (SLUGLINE_REGEX.test(line)) {
        // Clean up the slugline - remove trailing colons or numbers
        const cleanName = line.replace(/:\s*$/, '').trim();
        addElement(elementMap, cleanName, ElementType.LOCATION, page.pageNumber, line);

        // Track scene
        currentScene = {
          sceneNumber: sceneData.length + 1,
          location: cleanName,
          characters: [],
        };
        sceneData.push(currentScene);
        continue;
      }

      // Check for ALL-CAPS line (character)
      // First strip parenthetical extensions and CONT'D
      let cleanedLine = line.replace(PARENTHETICAL_REGEX, '').trim();
      cleanedLine = cleanedLine.replace(CONTD_REGEX, '').trim();

      if (!cleanedLine || cleanedLine.length < 2) continue;

      if (ALL_CAPS_REGEX.test(cleanedLine)) {
        // Filter noise words
        const normalized = cleanedLine.replace(/[:\s]+$/, '').trim();

        if (isNoiseWord(normalized)) continue;

        addElement(elementMap, normalized, ElementType.CHARACTER, page.pageNumber, line);

        // Track character in current scene
        if (currentScene && !currentScene.characters.includes(normalized)) {
          currentScene.characters.push(normalized);
        }
        continue;
      }

      // Check for embedded ALL-CAPS props in mixed-case lines
      detectProps(elementMap, line, page.pageNumber);
    }
  }

  // Sort elements by first appearance (page ASC, name ASC within same page)
  const elements = Array.from(elementMap.values()).sort((a, b) => {
    if (a.highlightPage !== b.highlightPage) return a.highlightPage - b.highlightPage;
    return a.name.localeCompare(b.name);
  });

  return { elements, sceneData };
}

export function detectProps(
  map: Map<string, DetectedElement>,
  line: string,
  pageNumber: number,
): void {
  // Only detect props in mixed-case action lines (not all-caps lines)
  const trimmed = line.trim();
  if (ALL_CAPS_REGEX.test(trimmed)) return;
  if (SLUGLINE_REGEX.test(trimmed)) return;

  let match;
  EMBEDDED_CAPS_REGEX.lastIndex = 0;
  while ((match = EMBEDDED_CAPS_REGEX.exec(line)) !== null) {
    const propName = match[1].trim();

    // Skip noise words
    if (isNoiseWord(propName)) continue;

    // Skip single words shorter than 3 chars
    if (propName.length < 3) continue;

    // Skip if it starts with INT. or EXT.
    if (/^(INT\.|EXT\.|I\/E\.)/.test(propName)) continue;

    addElement(map, propName, ElementType.OTHER, pageNumber, line);
  }
}

function addElement(
  map: Map<string, DetectedElement>,
  name: string,
  type: ElementType.CHARACTER | ElementType.LOCATION | ElementType.OTHER,
  pageNumber: number,
  lineText: string,
): void {
  // Only record first occurrence
  if (map.has(name)) return;

  const suggestedDepartment =
    type === ElementType.OTHER
      ? 'Props'
      : ELEMENT_TYPE_DEPARTMENT_MAP[type] ?? null;

  map.set(name, {
    name,
    type,
    highlightPage: pageNumber,
    highlightText: lineText,
    suggestedDepartment,
  });
}

function isNoiseWord(word: string): boolean {
  // Check exact match
  if (NOISE_WORDS.has(word)) return true;

  // Check if it starts with a noise word followed by a space or colon (e.g., "FADE IN:", "CUT TO:")
  // This avoids false positives like "PANEL" matching "PAN"
  for (const noise of NOISE_WORDS) {
    if (word.startsWith(noise + ' ') || word.startsWith(noise + ':')) return true;
  }

  return false;
}
