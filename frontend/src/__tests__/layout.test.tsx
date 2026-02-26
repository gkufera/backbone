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
  // Reading source because RootLayout renders <html> which cannot be rendered in jsdom.
  // We use simple string checks instead of brittle regex patterns.
  const layoutSource = fs.readFileSync(
    path.resolve(__dirname, '../app/layout.tsx'),
    'utf-8',
  );

  it('main element has min-h-0 to prevent flex overflow', () => {
    expect(layoutSource).toContain('min-h-0');
  });

  it('body uses flex column layout for sticky footer', () => {
    expect(layoutSource).toContain('flex');
    expect(layoutSource).toContain('min-h-screen');
    expect(layoutSource).toContain('flex-col');
  });
});
