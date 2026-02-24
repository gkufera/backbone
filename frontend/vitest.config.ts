import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@backbone/shared': path.resolve(__dirname, '../shared'),
      // Stubs so vite import-analysis resolves react-pdf even when the
      // package is not installed.  Tests override via vi.mock().
      'react-pdf/dist/Page/AnnotationLayer.css': path.resolve(
        __dirname,
        './src/__mocks__/react-pdf-annotation.css.ts',
      ),
      'react-pdf/dist/Page/TextLayer.css': path.resolve(
        __dirname,
        './src/__mocks__/react-pdf-text.css.ts',
      ),
      'react-pdf': path.resolve(__dirname, './src/__mocks__/react-pdf.ts'),
    },
  },
});
