export interface ProgressInfo {
  percent: number;
  step: string;
}

interface ProgressEntry extends ProgressInfo {
  createdAt: number;
}

const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

const progressStore = new Map<string, ProgressEntry>();

function evictStale(): void {
  const now = Date.now();
  for (const [key, entry] of progressStore) {
    if (now - entry.createdAt > STALE_THRESHOLD_MS) {
      progressStore.delete(key);
    }
  }
}

export function setProgress(scriptId: string, percent: number, step: string): void {
  evictStale();
  progressStore.set(scriptId, { percent, step, createdAt: Date.now() });
}

export function getProgress(scriptId: string): ProgressInfo | null {
  const entry = progressStore.get(scriptId);
  if (!entry) return null;

  // Check staleness
  if (Date.now() - entry.createdAt > STALE_THRESHOLD_MS) {
    progressStore.delete(scriptId);
    return null;
  }

  return { percent: entry.percent, step: entry.step };
}

export function clearProgress(scriptId: string): void {
  progressStore.delete(scriptId);
}
