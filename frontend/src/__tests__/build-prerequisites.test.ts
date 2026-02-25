import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * These tests verify prerequisites for a successful production build.
 * They catch the two root causes of CI build failures:
 * 1. Missing local font files (when Google Fonts was unreachable)
 * 2. Shared module imports with .js extensions (breaks Turbopack)
 */

const fontsDir = resolve(__dirname, '../fonts');
const sharedDir = resolve(__dirname, '../../../shared');

describe('Build prerequisites', () => {
  describe('Local font files', () => {
    it('has VT323-Regular.woff2', () => {
      expect(existsSync(resolve(fontsDir, 'VT323-Regular.woff2'))).toBe(true);
    });

    it('has CourierPrime-Regular.woff2', () => {
      expect(existsSync(resolve(fontsDir, 'CourierPrime-Regular.woff2'))).toBe(true);
    });

    it('has CourierPrime-Bold.woff2', () => {
      expect(existsSync(resolve(fontsDir, 'CourierPrime-Bold.woff2'))).toBe(true);
    });
  });

  describe('Shared module imports use extensionless paths', () => {
    it('shared/constants/index.ts has no .js imports', async () => {
      const { readFileSync } = await import('fs');
      const content = readFileSync(resolve(sharedDir, 'constants/index.ts'), 'utf-8');
      const jsImports = content.match(/from\s+['"][^'"]*\.js['"]/g);
      expect(jsImports).toBeNull();
    });

    it('shared/types/index.ts has no .js imports', async () => {
      const { readFileSync } = await import('fs');
      const content = readFileSync(resolve(sharedDir, 'types/index.ts'), 'utf-8');
      const jsImports = content.match(/from\s+['"][^'"]*\.js['"]/g);
      expect(jsImports).toBeNull();
    });
  });
});
