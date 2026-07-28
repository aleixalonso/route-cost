import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@route-cost/fuel-prices': '../../packages/fuel-prices/src/index.ts',
    },
  },
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['dist/**', 'coverage/**', '**/*.config.ts'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
