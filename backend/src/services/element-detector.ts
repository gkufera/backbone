import { ElementType } from '@backbone/shared/types';
import { ELEMENT_TYPE_DEPARTMENT_MAP } from '@backbone/shared/constants';

export interface PageText {
  pageNumber: number;
  text: string;
}

export interface DetectedElement {
  name: string;
  type: ElementType.CHARACTER | ElementType.LOCATION;
  highlightPage: number;
  highlightText: string;
  suggestedDepartment: string | null;
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
]);

// Regex for slugline detection: INT. / EXT. / INT./EXT.
const SLUGLINE_REGEX = /^\s*(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)\s+/i;

// Regex for ALL-CAPS line: at least 2 uppercase letters, no lowercase
const ALL_CAPS_REGEX = /^[A-Z][A-Z\s.'\-,]+$/;

// Regex for parenthetical extensions: (V.O.), (O.S.), (CONT'D), etc.
const PARENTHETICAL_REGEX = /\s*\(.*?\)\s*$/;

// Regex for CONT'D suffix
const CONTD_REGEX = /\s*\(?\s*CONT['']D\s*\)?\s*$/i;

export function detectElements(pages: PageText[]): DetectedElement[] {
  const elementMap = new Map<string, DetectedElement>();

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
      }
    }
  }

  return Array.from(elementMap.values());
}

function addElement(
  map: Map<string, DetectedElement>,
  name: string,
  type: ElementType.CHARACTER | ElementType.LOCATION,
  pageNumber: number,
  lineText: string,
): void {
  // Only record first occurrence
  if (map.has(name)) return;

  map.set(name, {
    name,
    type,
    highlightPage: pageNumber,
    highlightText: lineText,
    suggestedDepartment: ELEMENT_TYPE_DEPARTMENT_MAP[type] ?? null,
  });
}

function isNoiseWord(word: string): boolean {
  // Check exact match
  if (NOISE_WORDS.has(word)) return true;

  // Check if it starts with a noise word (e.g., "FADE IN:")
  for (const noise of NOISE_WORDS) {
    if (word.startsWith(noise)) return true;
  }

  return false;
}
