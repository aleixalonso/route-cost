import { resolve } from 'node:path';

import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  clean: true,
  banner: { js: '#!/usr/bin/env node' },
  esbuildOptions(options) {
    options.alias = Object.fromEntries(
      [
        'contracts',
        'domain',
        'fuel-prices',
        'geocoding',
        'routing',
        'vehicle-data',
      ].map((name) => [
        `@route-cost/${name}`,
        resolve(import.meta.dirname, `../../packages/${name}/src/index.ts`),
      ]),
    );
  },
  noExternal: [/^@route-cost\//],
});
