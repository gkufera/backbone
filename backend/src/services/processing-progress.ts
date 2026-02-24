export interface ProgressInfo {
  percent: number;
  step: string;
}

const progressStore = new Map<string, ProgressInfo>();

export function setProgress(scriptId: string, percent: number, step: string): void {
  progressStore.set(scriptId, { percent, step });
}

export function getProgress(scriptId: string): ProgressInfo | null {
  return progressStore.get(scriptId) ?? null;
}

export function clearProgress(scriptId: string): void {
  progressStore.delete(scriptId);
}
