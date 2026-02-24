/**
 * Deployment failure prevention test.
 *
 * Next.js requires useSearchParams() to be wrapped in a <Suspense> boundary,
 * otherwise static generation fails during `next build`. This test verifies
 * that all pages using useSearchParams have the Suspense wrapper.
 *
 * Root cause: commit 2308b26 fixed a build failure where 3 pages used
 * useSearchParams() without Suspense, causing `next build` to fail.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const PAGES_DIR = path.resolve(__dirname, '../app');

function findPagesWithUseSearchParams(dir: string): string[] {
  const results: string[] = [];

  function walk(d: string) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (content.includes('useSearchParams')) {
          results.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return results;
}

describe('Suspense wrapping for useSearchParams pages', () => {
  const pages = findPagesWithUseSearchParams(PAGES_DIR);

  it('finds pages that use useSearchParams', () => {
    // Sanity check: we should find at least the 3 known pages
    expect(pages.length).toBeGreaterThanOrEqual(3);
  });

  it.each(pages)('%s wraps useSearchParams in a Suspense boundary', (pagePath) => {
    const content = fs.readFileSync(pagePath, 'utf-8');
    const relativePath = path.relative(PAGES_DIR, pagePath);

    // The page must import Suspense
    expect(content).toMatch(
      /import\s+\{[^}]*Suspense[^}]*\}\s+from\s+['"]react['"]/,
    );

    // The page must use <Suspense in JSX
    expect(content).toContain('<Suspense');

    // The useSearchParams call must NOT be in the default export function directly.
    // It should be in a separate inner component that is wrapped by Suspense.
    // Verify: the default export function contains <Suspense
    const defaultExportMatch = content.match(
      /export\s+default\s+function\s+\w+\([^)]*\)\s*\{([\s\S]*)\}\s*$/,
    );
    expect(
      defaultExportMatch,
      `${relativePath}: must have a default export function`,
    ).toBeTruthy();

    expect(
      defaultExportMatch![1],
      `${relativePath}: default export must contain <Suspense wrapper`,
    ).toContain('<Suspense');
  });
});
