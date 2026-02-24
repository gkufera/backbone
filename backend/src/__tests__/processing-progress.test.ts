import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setProgress, getProgress, clearProgress } from '../services/processing-progress.js';

describe('Processing progress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Clean up any leftover entries
    clearProgress('test-1');
    clearProgress('test-2');
  });

  it('getProgress returns fresh entries normally', () => {
    setProgress('test-1', 50, 'Parsing');

    const result = getProgress('test-1');
    expect(result).toEqual({ percent: 50, step: 'Parsing' });
  });

  it('evicts stale entries older than 10 minutes', () => {
    setProgress('test-1', 50, 'Parsing');

    // Advance 11 minutes
    vi.advanceTimersByTime(11 * 60 * 1000);

    const result = getProgress('test-1');
    expect(result).toBeNull();
  });

  it('does not evict entries within 10 minutes', () => {
    setProgress('test-1', 50, 'Parsing');

    // Advance 9 minutes
    vi.advanceTimersByTime(9 * 60 * 1000);

    const result = getProgress('test-1');
    expect(result).toEqual({ percent: 50, step: 'Parsing' });
  });
});
