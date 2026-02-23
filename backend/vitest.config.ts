import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.integration.test.ts'],
  },
  resolve: {
    alias: {
      '@backbone/shared': path.resolve(__dirname, '../shared'),
    },
  },
});
