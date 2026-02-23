import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Bundle shared types (resolved via TypeScript path alias)
  noExternal: [/^@backbone\/shared/],
  tsconfig: 'tsconfig.json',
});
