import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

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

describe('Root layout structure', () => {
  it('main element has min-h-0 class to prevent flex overflow', () => {
    // Read the layout source to verify structural classes
    const layoutSource = fs.readFileSync(
      path.resolve(__dirname, '../app/layout.tsx'),
      'utf-8',
    );
    // main should have min-h-0 to prevent flex overflow on full-height pages
    expect(layoutSource).toMatch(/<main[^>]*min-h-0/);
  });
});
