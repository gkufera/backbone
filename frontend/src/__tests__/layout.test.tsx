import { describe, it, expect, vi } from 'vitest';

// Mock next/font/google since fonts aren't available in test
vi.mock('next/font/google', () => ({
  VT323: () => ({ variable: '--font-vt323' }),
  Courier_Prime: () => ({ variable: '--font-courier-prime' }),
}));

import { metadata } from '../app/layout';

describe('Root layout metadata', () => {
  it('has title set to Slug Max', () => {
    expect(metadata.title).toBe('Slug Max');
  });

  it('has description mentioning production collaboration', () => {
    expect(metadata.description).toMatch(/production collaboration/i);
  });
});
