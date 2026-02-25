import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Scans all .tsx files in the frontend source tree and checks for
 * design-system violations (1-bit Macintosh aesthetic).
 */

function collectTsxFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === 'node_modules' || entry === '.next') continue;
    if (statSync(full).isDirectory()) {
      files.push(...collectTsxFiles(full));
    } else if (full.endsWith('.tsx')) {
      files.push(full);
    }
  }
  return files;
}

const SRC_DIR = join(__dirname, '..');
const tsxFiles = collectTsxFiles(SRC_DIR);

describe('Design System Compliance', () => {
  it('no bg-opacity usage (except disabled:opacity-50)', () => {
    const violations: string[] = [];
    for (const file of tsxFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        // Match bg-opacity-* but exclude disabled:opacity-50
        if (/bg-opacity-/.test(line)) {
          violations.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(violations).toEqual([]);
  });

  it('no prohibited color classes (only bg-white, bg-black, text-white, text-black allowed)', () => {
    // Colors that are NEVER allowed in component files
    const prohibitedPatterns = [
      /\bbg-(?:red|green|blue|yellow|orange|purple|pink|indigo|teal|cyan|emerald|lime|amber|violet|fuchsia|rose|sky|slate|gray|zinc|neutral|stone)-\d/,
      /\btext-(?:red|green|blue|yellow|orange|purple|pink|indigo|teal|cyan|emerald|lime|amber|violet|fuchsia|rose|sky|slate|gray|zinc|neutral|stone)-\d/,
      /\bborder-(?:red|green|blue|yellow|orange|purple|pink|indigo|teal|cyan|emerald|lime|amber|violet|fuchsia|rose|sky|slate|gray|zinc|neutral|stone)-\d/,
    ];

    const violations: string[] = [];
    for (const file of tsxFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        // Skip comments and imports
        if (line.trim().startsWith('//') || line.trim().startsWith('import')) return;
        for (const pattern of prohibitedPatterns) {
          if (pattern.test(line)) {
            violations.push(`${file}:${i + 1}: ${line.trim()}`);
          }
        }
      });
    }
    expect(violations).toEqual([]);
  });

  it('no rounded corners (no rounded-* classes)', () => {
    const violations: string[] = [];
    for (const file of tsxFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.trim().startsWith('//') || line.trim().startsWith('import')) return;
        if (/\brounded(?:-sm|-md|-lg|-xl|-2xl|-3xl|-full)?\b/.test(line)) {
          violations.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(violations).toEqual([]);
  });

  it('no shadow classes', () => {
    const violations: string[] = [];
    for (const file of tsxFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.trim().startsWith('//') || line.trim().startsWith('import')) return;
        if (/\bshadow(?:-sm|-md|-lg|-xl|-2xl|-inner|-none)?\b/.test(line) && !/box-shadow/.test(line)) {
          violations.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(violations).toEqual([]);
  });

  it('globals.css contains only #000 and #fff hex colors', () => {
    const globalsPath = join(__dirname, '..', 'app', 'globals.css');
    const content = readFileSync(globalsPath, 'utf-8');
    const lines = content.split('\n');
    const violations: string[] = [];

    // Match hex colors: #RGB, #RRGGBB, #RGBA, #RRGGBBAA
    const hexColorPattern = /#(?:[0-9a-fA-F]{3,8})\b/g;
    const allowedColors = new Set(['#000', '#000000', '#fff', '#ffffff']);

    lines.forEach((line, i) => {
      // Skip CSS comments
      if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) return;

      let match;
      hexColorPattern.lastIndex = 0;
      while ((match = hexColorPattern.exec(line)) !== null) {
        const color = match[0].toLowerCase();
        if (!allowedColors.has(color)) {
          violations.push(`globals.css:${i + 1}: ${match[0]} in "${line.trim()}"`);
        }
      }
    });

    expect(violations).toEqual([]);
  });

  it('no dark mode variants', () => {
    const violations: string[] = [];
    for (const file of tsxFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.trim().startsWith('//') || line.trim().startsWith('import')) return;
        if (/\bdark:/.test(line)) {
          violations.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(violations).toEqual([]);
  });
});
