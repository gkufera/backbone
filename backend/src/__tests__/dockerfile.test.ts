/**
 * Deployment failure prevention test.
 *
 * The backend Dockerfile production stage must use --ignore-scripts when
 * running `npm ci --omit=dev` to prevent the postinstall script (prisma
 * generate) from failing — the Prisma schema isn't available yet at that
 * stage because it's copied later from the builder.
 *
 * Root cause: commit 2308b26 fixed a Railway build failure where
 * `npm ci --omit=dev` triggered `postinstall: prisma generate` before
 * the schema was copied into the production container.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Dockerfile production stage', () => {
  const dockerfilePath = path.resolve(__dirname, '../../..', 'backend', 'Dockerfile');

  it('uses --ignore-scripts on all npm ci --omit=dev commands', () => {
    const content = fs.readFileSync(dockerfilePath, 'utf-8');
    const lines = content.split('\n');

    // Find all lines with `npm ci --omit=dev` (production installs)
    const prodInstallLines = lines.filter((line) =>
      line.includes('npm ci') && line.includes('--omit=dev'),
    );

    expect(prodInstallLines.length).toBeGreaterThan(0);

    for (const line of prodInstallLines) {
      expect(
        line,
        `Production npm ci must include --ignore-scripts to prevent postinstall failures: ${line.trim()}`,
      ).toContain('--ignore-scripts');
    }
  });
});
