import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

/**
 * Load .env.local into process.env at config load time so that vitest
 * can access it without needing a separate setup script.
 * Falls back to .env if .env.local is missing.
 */
function loadEnvFile(): Record<string, string> {
  const envPath = existsSync('.env.local') ? '.env.local' : '.env';
  if (!existsSync(envPath)) return {};
  const content = readFileSync(envPath, 'utf-8');
  const env: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = value;
  }
  return env;
}

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    env: {
      ...loadEnvFile(),
    },
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
