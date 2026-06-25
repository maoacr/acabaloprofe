import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}', 'tests/integration/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/app/**/page.tsx',
        'src/app/**/layout.tsx',
        'src/lib/constants.ts',
        'src/interface/components/ui/**',
        'src/**/*.d.ts',
        'src/infrastructure/env.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
