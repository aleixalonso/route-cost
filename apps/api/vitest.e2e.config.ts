import { resolve } from 'node:path';

import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@route-cost/contracts': resolve(
        __dirname,
        '../../packages/contracts/src/index.ts',
      ),
      '@route-cost/domain': resolve(
        __dirname,
        '../../packages/domain/src/index.ts',
      ),
      '@route-cost/geocoding': resolve(
        __dirname,
        '../../packages/geocoding/src/index.ts',
      ),
      '@route-cost/routing': resolve(
        __dirname,
        '../../packages/routing/src/index.ts',
      ),
      '@route-cost/vehicle-data': resolve(
        __dirname,
        '../../packages/vehicle-data/src/index.ts',
      ),
    },
  },
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { decoratorMetadata: true },
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['test/**/*.int.test.ts', 'src/**/*.int.test.ts'],
    testTimeout: 20_000,
  },
});
