import { describe, it, expect, vi } from 'vitest';

// Mock next/font/google since fonts aren't available in test
vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono' }),
}));

import { metadata } from '../app/layout';

describe('Root layout metadata', () => {
  it('has title set to Backbone', () => {
    expect(metadata.title).toBe('Backbone');
  });

  it('has description mentioning production collaboration', () => {
    expect(metadata.description).toMatch(/production collaboration/i);
  });
});
