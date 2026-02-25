import { describe, it, expect, vi } from 'vitest';

// Mock next/font/local since font files aren't loaded in test
vi.mock('next/font/local', () => ({
  default: () => ({ variable: '--font-mock' }),
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
