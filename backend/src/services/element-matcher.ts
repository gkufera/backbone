export interface ExistingElement {
  id: string;
  name: string;
  type: string;
  status: string;
  source: string;
  highlightPage: number | null;
  highlightText: string | null;
}

export interface DetectedElement {
  name: string;
  type: string;
  highlightPage: number | null;
  highlightText: string | null;
}

export interface MatchResult {
  detectedName: string;
  detectedType: string;
  detectedPage: number | null;
  detectedHighlightText: string | null;
  status: 'EXACT' | 'FUZZY' | 'NEW';
  oldElementId?: string;
  similarity?: number;
}

export interface MissingElement {
  id: string;
  name: string;
  type: string;
}

export interface MatchReport {
  matches: MatchResult[];
  missing: MissingElement[];
}

function normalize(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, ' ');
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

const FUZZY_THRESHOLD = 0.7;

export function matchElements(
  existing: ExistingElement[],
  detected: DetectedElement[],
): MatchReport {
  // Filter out ARCHIVED elements
  const pool = existing.filter((e) => e.status !== 'ARCHIVED');

  // Track which existing elements have been consumed
  const consumed = new Set<string>();

  // Build a map of normalized name → existing element for exact matching
  const normalizedMap = new Map<string, ExistingElement>();
  for (const elem of pool) {
    const key = normalize(elem.name);
    if (!normalizedMap.has(key)) {
      normalizedMap.set(key, elem);
    }
  }

  const matches: MatchResult[] = [];

  for (const det of detected) {
    const normDet = normalize(det.name);

    // Try exact match first
    const exactMatch = normalizedMap.get(normDet);
    if (exactMatch && !consumed.has(exactMatch.id)) {
      consumed.add(exactMatch.id);
      matches.push({
        detectedName: det.name,
        detectedType: det.type,
        detectedPage: det.highlightPage,
        detectedHighlightText: det.highlightText,
        status: 'EXACT',
        oldElementId: exactMatch.id,
        similarity: 1,
      });
      continue;
    }

    // Try fuzzy match against unconsumed elements
    let bestMatch: ExistingElement | null = null;
    let bestSim = 0;

    for (const elem of pool) {
      if (consumed.has(elem.id)) continue;
      const sim = similarity(normDet, normalize(elem.name));
      if (sim >= FUZZY_THRESHOLD && sim > bestSim) {
        bestSim = sim;
        bestMatch = elem;
      }
    }

    if (bestMatch) {
      consumed.add(bestMatch.id);
      matches.push({
        detectedName: det.name,
        detectedType: det.type,
        detectedPage: det.highlightPage,
        detectedHighlightText: det.highlightText,
        status: 'FUZZY',
        oldElementId: bestMatch.id,
        similarity: bestSim,
      });
    } else {
      matches.push({
        detectedName: det.name,
        detectedType: det.type,
        detectedPage: det.highlightPage,
        detectedHighlightText: det.highlightText,
        status: 'NEW',
      });
    }
  }

  // Remaining unconsumed elements are MISSING
  const missing: MissingElement[] = pool
    .filter((e) => !consumed.has(e.id))
    .map((e) => ({ id: e.id, name: e.name, type: e.type }));

  return { matches, missing };
}
