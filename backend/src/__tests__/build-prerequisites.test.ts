import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

/**
 * These tests verify prerequisites for a successful production build.
 * They catch .js extensions in TypeScript import paths which are
 * inconsistent with the frontend and shared packages.
 */

const srcDir = resolve(__dirname, '..');

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory() && entry !== 'node_modules' && entry !== 'dist') {
      files.push(...getAllTsFiles(fullPath));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('Build prerequisites', () => {
  describe('Backend imports use extensionless paths', () => {
    it('no .ts files have .js extensions in import/export/mock paths', () => {
      const tsFiles = getAllTsFiles(srcDir);
      const violations: { file: string; lines: string[] }[] = [];

      // Match: from '...\', from "...\", vi.mock('...\', vi.mock("...\"
      const jsExtPattern =
        /(?:from\s+['"][^'"]*\.js['"]|vi\.mock\(\s*['"][^'"]*\.js['"])/g;

      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        const matches = content.match(jsExtPattern);
        if (matches) {
          const relativePath = file.replace(srcDir + '/', '');
          violations.push({ file: relativePath, lines: matches });
        }
      }

      const totalViolations = violations.reduce(
        (sum, v) => sum + v.lines.length,
        0
      );

      expect(violations).toEqual([]);
      expect(totalViolations).toBe(0);
    });
  });
});
