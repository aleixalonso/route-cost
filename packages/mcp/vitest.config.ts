import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: Object.fromEntries(
      [
        'contracts',
        'domain',
        'fuel-prices',
        'geocoding',
        'routing',
        'vehicle-data',
      ].map((name) => [
        `@route-cost/${name}`,
        resolve(__dirname, `../../packages/${name}/src/index.ts`),
      ]),
    ),
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['dist/**', 'coverage/**', '**/*.config.ts', 'src/main.ts'],
      thresholds: { statements: 80, branches: 75, functions: 80, lines: 80 },
    },
  },
});
